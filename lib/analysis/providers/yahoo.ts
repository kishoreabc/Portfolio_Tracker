/**
 * lib/analysis/providers/yahoo.ts
 *
 * Yahoo Finance provider adapter for the Research module.
 * Reuses the existing Yahoo Finance infrastructure in the project.
 *
 * Data sourced exclusively from Yahoo Finance's public quoteSummary API.
 * This is the primary data provider for price, profile, and fundamental data.
 *
 * NOTE: Yahoo Finance does NOT provide Indian-market-specific data such as:
 * - Detailed quarterly financial statements in INR (Screener format)
 * - Shareholding patterns (promoter/FII/DII breakdown)
 * - NSE/BSE corporate filings
 * - Annual reports, investor presentations
 *
 * For those, the fixture/manual provider is used until an authorized
 * source is integrated. See the openscreener compliance notes in
 * lib/analysis/providers/screener-notes.ts
 */

import type {
  CompanyProfile,
  ResearchQuote,
  ValuationMetrics,
  ProfitabilityMetrics,
  SolvencyMetrics,
  FinancialTable,
  PeersData,
  PeerEntry,
  DataSourceMeta,
  GrowthMetrics,
} from '@/types/research';
import { safeRound, safeDivide } from '../calculations';

const SOURCE = 'Yahoo Finance';

function freshMeta(): DataSourceMeta {
  return {
    source: SOURCE,
    fetchedAt: new Date().toISOString(),
    lastSuccessfulRefresh: new Date().toISOString(),
    status: 'fresh',
  };
}

function unavailableMeta(source = SOURCE): DataSourceMeta {
  return {
    source,
    fetchedAt: null,
    lastSuccessfulRefresh: null,
    status: 'unavailable',
  };
}

async function getYahooFinance(): Promise<any> {
  const yfModule = await import('yahoo-finance2');
  const YahooFinance = yfModule.default || yfModule;
  return new (YahooFinance as any)({ suppressNotices: ['yahooSurvey'] });
}

/**
 * Resolves the best Yahoo Finance symbol for an NSE-listed stock.
 * Tries SYMBOL.NS first, then SYMBOL.BO.
 */
export async function resolveYahooSymbol(symbol: string): Promise<string | null> {
  const yf = await getYahooFinance();
  const candidates = symbol.includes('.')
    ? [symbol]
    : [`${symbol}.NS`, `${symbol}.BO`];

  for (const candidate of candidates) {
    try {
      const quote = await yf.quote(candidate, {}, { validateResult: false });
      if (quote?.regularMarketPrice) return candidate;
    } catch {
      // try next
    }
  }
  return null;
}

/**
 * Fetches company profile from Yahoo Finance quoteSummary.
 */
export async function fetchYahooProfile(symbol: string): Promise<CompanyProfile> {
  const yahooSymbol = await resolveYahooSymbol(symbol);
  if (!yahooSymbol) {
    return {
      symbol,
      name: symbol,
      exchange: 'NSE',
      currency: 'INR',
      reportingMode: 'consolidated',
      meta: unavailableMeta(),
    };
  }

  try {
    const yf = await getYahooFinance();
    const summary = await yf.quoteSummary(
      yahooSymbol,
      { modules: ['assetProfile', 'summaryProfile', 'summaryDetail', 'price'] },
      { validateResult: false }
    );

    const profile = summary?.assetProfile || summary?.summaryProfile || {};
    const price = summary?.price || {};

    return {
      symbol,
      yahooSymbol,
      name: price?.longName || price?.shortName || symbol,
      shortName: price?.shortName,
      sector: profile?.sector || price?.sectorDisp,
      industry: profile?.industry || price?.industryDisp,
      exchange: yahooSymbol.endsWith('.NS') ? 'NSE' : 'BSE',
      currency: price?.currency || 'INR',
      website: profile?.website,
      description: profile?.longBusinessSummary,
      headquarters: [profile?.city, profile?.state, profile?.country].filter(Boolean).join(', ') || undefined,
      employees: typeof profile?.fullTimeEmployees === 'number' ? profile.fullTimeEmployees : undefined,
      reportingMode: 'consolidated',
      meta: freshMeta(),
    };
  } catch (err) {
    console.warn('[YahooProvider] Failed to fetch profile for', symbol, err);
    return {
      symbol,
      yahooSymbol,
      name: symbol,
      exchange: yahooSymbol.endsWith('.NS') ? 'NSE' : 'BSE',
      currency: 'INR',
      reportingMode: 'consolidated',
      meta: { source: SOURCE, fetchedAt: new Date().toISOString(), lastSuccessfulRefresh: null, status: 'error' },
    };
  }
}

/**
 * Fetches quote data from Yahoo Finance.
 */
export async function fetchYahooQuote(symbol: string): Promise<ResearchQuote> {
  const yahooSymbol = await resolveYahooSymbol(symbol);

  if (!yahooSymbol) {
    return buildEmptyQuote(symbol);
  }

  try {
    const yf = await getYahooFinance();
    const q = await yf.quote(yahooSymbol, {}, { validateResult: false });

    if (!q) return buildEmptyQuote(symbol);

    const divRate = q.dividendRate != null ? Number(q.dividendRate) : (q.trailingAnnualDividendRate != null ? Number(q.trailingAnnualDividendRate) : null);
    const cmp = typeof q.regularMarketPrice === 'number' && q.regularMarketPrice > 0 ? q.regularMarketPrice : null;
    const divYield = divRate != null && cmp != null && cmp > 0 ? safeRound((divRate / cmp) * 100) : (q.dividendYield != null ? safeRound(Number(q.dividendYield)) : null);

    return {
      symbol,
      price: typeof q.regularMarketPrice === 'number' ? q.regularMarketPrice : null,
      change: typeof q.regularMarketChange === 'number' ? safeRound(q.regularMarketChange) : null,
      changePct: typeof q.regularMarketChangePercent === 'number' ? safeRound(q.regularMarketChangePercent) : null,
      open: typeof q.regularMarketOpen === 'number' ? q.regularMarketOpen : null,
      high: typeof q.regularMarketDayHigh === 'number' ? q.regularMarketDayHigh : null,
      low: typeof q.regularMarketDayLow === 'number' ? q.regularMarketDayLow : null,
      prevClose: typeof q.regularMarketPreviousClose === 'number' ? q.regularMarketPreviousClose : null,
      volume: typeof q.regularMarketVolume === 'number' ? q.regularMarketVolume : null,
      avgVolume: typeof q.averageDailyVolume3Month === 'number' ? q.averageDailyVolume3Month : null,
      marketCap: typeof q.marketCap === 'number' ? q.marketCap : null,
      week52High: typeof q.fiftyTwoWeekHigh === 'number' ? q.fiftyTwoWeekHigh : null,
      week52Low: typeof q.fiftyTwoWeekLow === 'number' ? q.fiftyTwoWeekLow : null,
      trailingPE: typeof q.trailingPE === 'number' ? safeRound(q.trailingPE) : null,
      forwardPE: typeof q.forwardPE === 'number' ? safeRound(q.forwardPE) : null,
      priceToBook: typeof q.priceToBook === 'number' ? safeRound(q.priceToBook) : null,
      trailingEps: typeof q.trailingEps === 'number' ? safeRound(q.trailingEps) : null,
      dividendRate: divRate,
      dividendYield: divYield,
      beta: typeof q.beta === 'number' ? safeRound(q.beta) : null,
      timestamp: q.regularMarketTime ? new Date(Number(q.regularMarketTime) * 1000).toISOString() : new Date().toISOString(),
      meta: freshMeta(),
    };
  } catch (err) {
    console.warn('[YahooProvider] Quote fetch failed for', symbol, err);
    return buildEmptyQuote(symbol);
  }
}

function buildEmptyQuote(symbol: string): ResearchQuote {
  return {
    symbol,
    price: null, change: null, changePct: null, open: null, high: null,
    low: null, prevClose: null, volume: null, avgVolume: null, marketCap: null,
    week52High: null, week52Low: null, trailingPE: null, forwardPE: null,
    priceToBook: null, trailingEps: null, dividendRate: null, dividendYield: null,
    beta: null, timestamp: null,
    meta: unavailableMeta(),
  };
}

/**
 * Fetches valuation, profitability, and financial summary metrics.
 * Uses Yahoo Finance quoteSummary with multiple modules.
 */
export async function fetchYahooFundamentals(symbol: string): Promise<{
  valuation: ValuationMetrics;
  profitability: ProfitabilityMetrics;
  solvency: SolvencyMetrics;
  growth: GrowthMetrics;
}> {
  const yahooSymbol = await resolveYahooSymbol(symbol);

  const emptyResult = {
    valuation: buildEmptyValuation(),
    profitability: buildEmptyProfitability(),
    solvency: buildEmptySolvency(),
    growth: buildEmptyGrowth(),
  };

  if (!yahooSymbol) return emptyResult;

  try {
    const yf = await getYahooFinance();
    const summary = await yf.quoteSummary(
      yahooSymbol,
      {
        modules: [
          'summaryDetail',
          'defaultKeyStatistics',
          'financialData',
          'earningsTrend',
        ],
      },
      { validateResult: false }
    );

    const sd = summary?.summaryDetail || {};
    const ks = summary?.defaultKeyStatistics || {};
    const fd = summary?.financialData || {};

    // Valuation
    const valuation: ValuationMetrics = {
      pe: typeof sd.trailingPE === 'number' ? safeRound(sd.trailingPE) : null,
      forwardPe: typeof sd.forwardPE === 'number' ? safeRound(sd.forwardPE) : null,
      pb: typeof ks.priceToBook === 'number' ? safeRound(ks.priceToBook) : null,
      evToEbitda: typeof ks.enterpriseToEbitda === 'number' ? safeRound(ks.enterpriseToEbitda) : null,
      evToSales: typeof ks.enterpriseToRevenue === 'number' ? safeRound(ks.enterpriseToRevenue) : null,
      priceSales: typeof sd.priceToSalesTrailing12Months === 'number' ? safeRound(sd.priceToSalesTrailing12Months) : null,
      pegRatio: typeof ks.pegRatio === 'number' ? safeRound(ks.pegRatio) : null,
      dividendYield: typeof sd.dividendYield === 'number' ? safeRound(sd.dividendYield * 100) : null,
      meta: freshMeta(),
    };

    // Profitability
    const profitability: ProfitabilityMetrics = {
      roe: typeof fd.returnOnEquity === 'number' ? safeRound(fd.returnOnEquity * 100) : null,
      roce: null, // Not directly available from Yahoo; requires balance sheet calculation
      roa: typeof fd.returnOnAssets === 'number' ? safeRound(fd.returnOnAssets * 100) : null,
      grossMargin: typeof fd.grossMargins === 'number' ? safeRound(fd.grossMargins * 100) : null,
      operatingMargin: typeof fd.operatingMargins === 'number' ? safeRound(fd.operatingMargins * 100) : null,
      netMargin: typeof fd.profitMargins === 'number' ? safeRound(fd.profitMargins * 100) : null,
      meta: freshMeta(),
    };

    // Solvency
    const solvency: SolvencyMetrics = {
      debtToEquity: typeof fd.debtToEquity === 'number' ? safeRound(fd.debtToEquity / 100) : null, // Yahoo gives as %, convert
      netDebtToEbitda: null,
      interestCoverage: null,
      currentRatio: typeof fd.currentRatio === 'number' ? safeRound(fd.currentRatio) : null,
      quickRatio: typeof fd.quickRatio === 'number' ? safeRound(fd.quickRatio) : null,
      meta: freshMeta(),
    };

    // Growth — Yahoo earningsTrend gives forward estimates, not historical CAGR
    const et = summary?.earningsTrend?.trend || [];
    const annualGrowth = et.find((t: any) => t?.period === '+1y');
    const growth: GrowthMetrics = {
      revenue: {
        oneYear: annualGrowth?.revenueEstimate?.growth != null ? safeRound(annualGrowth.revenueEstimate.growth * 100) : null,
        threeYear: null, fiveYear: null, tenYear: null,
      },
      profit: {
        oneYear: annualGrowth?.earningsEstimate?.growth != null ? safeRound(annualGrowth.earningsEstimate.growth * 100) : null,
        threeYear: null, fiveYear: null, tenYear: null,
      },
      eps: {
        oneYear: typeof ks.trailingEps === 'number' && typeof ks.forwardEps === 'number'
          ? safeRound(safeDivide(ks.forwardEps - ks.trailingEps, Math.abs(ks.trailingEps))! * 100)
          : null,
        threeYear: typeof ks.earningsQuarterlyGrowth === 'number' ? safeRound(ks.earningsQuarterlyGrowth * 100) : null,
        fiveYear: null, tenYear: null,
      },
      fcf: { oneYear: null, threeYear: null, fiveYear: null, tenYear: null },
      meta: freshMeta(),
    };

    return { valuation, profitability, solvency, growth };
  } catch (err) {
    console.warn('[YahooProvider] Fundamentals fetch failed for', symbol, err);
    return emptyResult;
  }
}

/**
 * Fetches peer comparison data using sector-based search from Yahoo Finance.
 */
export async function fetchYahooPeers(symbol: string, sector?: string): Promise<PeersData> {
  try {
    const yf = await getYahooFinance();

    // Use Yahoo Finance quoteSummary to get recommendationKey peers or sector peers
    const yahooSymbol = await resolveYahooSymbol(symbol);
    if (!yahooSymbol) return { peers: [], meta: unavailableMeta() };

    // Get the full company data to find competitors
    const summary = await yf.quoteSummary(
      yahooSymbol,
      { modules: ['recommendationTrend', 'defaultKeyStatistics', 'summaryDetail'] },
      { validateResult: false }
    );

    // Yahoo doesn't directly expose competitors, so we search by sector
    const searchQuery = sector || '';
    if (!searchQuery) return { peers: [], meta: freshMeta() };

    const searchResult = await yf.search(searchQuery, {}, { validateResult: false });
    const peerSymbols = (searchResult?.quotes || [])
      .filter((q: any) => q.symbol && q.symbol !== yahooSymbol && q.quoteType === 'EQUITY')
      .slice(0, 6)
      .map((q: any) => q.symbol);

    const peers: PeerEntry[] = [];

    for (const peerYahooSym of peerSymbols) {
      try {
        const peerQ = await yf.quote(peerYahooSym, {}, { validateResult: false });
        if (!peerQ?.regularMarketPrice) continue;

        const cleanSym = peerYahooSym.replace(/\.(NS|BO)$/, '');
        let pb: number | null = typeof peerQ.priceToBook === 'number' ? safeRound(peerQ.priceToBook) : null;
        let roe: number | null = null;
        let debtToEquity: number | null = null;

        try {
          const qs = await yf.quoteSummary(
            peerYahooSym,
            { modules: ['defaultKeyStatistics', 'financialData'] },
            { validateResult: false }
          );
          if (pb == null && typeof qs?.defaultKeyStatistics?.priceToBook === 'number') {
            pb = safeRound(qs.defaultKeyStatistics.priceToBook);
          }
          if (typeof qs?.financialData?.returnOnEquity === 'number') {
            roe = safeRound(qs.financialData.returnOnEquity * 100);
          }
          if (typeof qs?.financialData?.debtToEquity === 'number') {
            debtToEquity = safeRound(qs.financialData.debtToEquity / 100);
          }
        } catch {
          // ignore quoteSummary failure and proceed with quote data
        }

        peers.push({
          symbol: cleanSym,
          name: peerQ.shortName || peerQ.longName || cleanSym,
          marketCap: typeof peerQ.marketCap === 'number' ? peerQ.marketCap : null,
          pe: typeof peerQ.trailingPE === 'number' ? safeRound(peerQ.trailingPE) : null,
          pb,
          roe,
          roce: roe, // Approximation if ROCE is unavailable on Yahoo
          revenueGrowth: null,
          profitGrowth: null,
          debtToEquity,
          dividendYield: typeof peerQ.dividendYield === 'number' ? safeRound(peerQ.dividendYield * 100) : null,
        });
      } catch {
        // skip this peer
      }
    }

    return { peers, meta: freshMeta() };
  } catch (err) {
    console.warn('[YahooProvider] Peers fetch failed for', symbol, err);
    return { peers: [], meta: { source: SOURCE, fetchedAt: new Date().toISOString(), lastSuccessfulRefresh: null, status: 'error' } };
  }
}

// ─── Empty builders ────────────────────────────────────────────────────────────

function buildEmptyValuation(): ValuationMetrics {
  return { pe: null, forwardPe: null, pb: null, evToEbitda: null, evToSales: null, priceSales: null, pegRatio: null, dividendYield: null, meta: unavailableMeta() };
}
function buildEmptyProfitability(): ProfitabilityMetrics {
  return { roe: null, roce: null, roa: null, grossMargin: null, operatingMargin: null, netMargin: null, meta: unavailableMeta() };
}
function buildEmptySolvency(): SolvencyMetrics {
  return { debtToEquity: null, netDebtToEbitda: null, interestCoverage: null, currentRatio: null, quickRatio: null, meta: unavailableMeta() };
}
function buildEmptyGrowth(): GrowthMetrics {
  const empty = { oneYear: null, threeYear: null, fiveYear: null, tenYear: null };
  return { revenue: empty, profit: empty, eps: empty, fcf: empty, meta: unavailableMeta() };
}
