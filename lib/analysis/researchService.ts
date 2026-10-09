/**
 * lib/analysis/researchService.ts
 *
 * Main research service that orchestrates data fetching across providers.
 * Cache-first: returns cached Supabase data if fresh, fetches live only when stale.
 */

import type {
  ResearchData,
  CompanyProfile,
  ResearchQuote,
  KeyMetrics,
  ValuationMetrics,
  ProfitabilityMetrics,
  SolvencyMetrics,
  EfficiencyMetrics,
  GrowthMetrics,
  FinancialTable,
  ShareholdingData,
  PeersData,
  CorporateActionsData,
  DocumentsData,
  DataSourceMeta,
} from '@/types/research';

import {
  fetchYahooProfile,
  fetchYahooQuote,
  fetchYahooFundamentals,
  fetchYahooPeers,
} from './providers/yahoo';

import { scrapeScreenerData } from './providers/screenerScraper';
import { screenerDisabledNote } from './providers/screener-notes';
import { STOCK_FIXTURES } from './fixtures/stockData';

// ─── In-memory cache (per-process, resets on redeploy) ────────────────────────
// Key: symbol, Value: { data, ts }

const cache = new Map<string, { data: ResearchData; ts: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes for price data
const FUNDAMENTALS_TTL_MS = 30 * 60 * 1000; // 30 minutes for fundamentals

// Track active fetches to prevent duplicate concurrent requests
const pendingFetches = new Map<string, Promise<ResearchData>>();

// ─── Unavailable stubs ─────────────────────────────────────────────────────────

const NOTE = screenerDisabledNote();

function unavailableFinancialTable(label: string): FinancialTable {
  return {
    periods: [],
    rows: [],
    meta: {
      source: 'Unavailable',
      fetchedAt: null,
      lastSuccessfulRefresh: null,
      status: 'unavailable',
    },
  };
}

function unavailableShareholding(): ShareholdingData {
  return {
    history: [],
    latest: null,
    meta: {
      source: 'Unavailable — ' + NOTE,
      fetchedAt: null,
      lastSuccessfulRefresh: null,
      status: 'unavailable',
    },
  };
}

function unavailableCorporateActions(): CorporateActionsData {
  return {
    actions: [],
    meta: {
      source: 'Unavailable',
      fetchedAt: null,
      lastSuccessfulRefresh: null,
      status: 'unavailable',
    },
  };
}

function unavailableDocuments(): DocumentsData {
  return {
    documents: [],
    meta: {
      source: 'Unavailable',
      fetchedAt: null,
      lastSuccessfulRefresh: null,
      status: 'unavailable',
    },
  };
}

function unavailableEfficiency(): EfficiencyMetrics {
  return {
    assetTurnover: null,
    inventoryDays: null,
    receivableDays: null,
    payableDays: null,
    cashConversionCycle: null,
    meta: {
      source: 'Unavailable',
      fetchedAt: null,
      lastSuccessfulRefresh: null,
      status: 'unavailable',
    },
  };
}

// ─── Key Metrics Builder ───────────────────────────────────────────────────────

function buildKeyMetrics(quote: ResearchQuote, valuation: ValuationMetrics, profitability: ProfitabilityMetrics, solvency: SolvencyMetrics): KeyMetrics {
  return {
    marketCap: quote.marketCap,
    pe: quote.trailingPE ?? valuation.pe,
    pb: quote.priceToBook ?? valuation.pb,
    roe: profitability.roe,
    roce: profitability.roce,
    debtToEquity: solvency.debtToEquity,
    dividendYield: quote.dividendYield,
    week52High: quote.week52High,
    week52Low: quote.week52Low,
    operatingMargin: profitability.operatingMargin,
    netMargin: profitability.netMargin,
    eps: quote.trailingEps,
  };
}

// ─── Main Research Fetcher ─────────────────────────────────────────────────────

/**
 * Fetches all research data for a symbol.
 * Returns cached data if fresh, otherwise fetches from providers.
 */
export async function fetchResearchData(symbol: string): Promise<ResearchData> {
  const upperSymbol = symbol.toUpperCase().trim();

  // Check in-memory cache
  const cached = cache.get(upperSymbol);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }

  // Prevent duplicate concurrent fetches
  const existing = pendingFetches.get(upperSymbol);
  if (existing) return existing;

  const fetchPromise = doFetchResearchData(upperSymbol);
  pendingFetches.set(upperSymbol, fetchPromise);

  try {
    const result = await fetchPromise;
    cache.set(upperSymbol, { data: result, ts: Date.now() });
    return result;
  } finally {
    pendingFetches.delete(upperSymbol);
  }
}

async function doFetchResearchData(symbol: string): Promise<ResearchData> {
  const fetchedAt = new Date().toISOString();
  const fixture = STOCK_FIXTURES[symbol];

  // 1. Fetch live Screener data and Yahoo Finance in parallel
  const [screenerResult, profile, quote, fundamentals, peers] = await Promise.all([
    scrapeScreenerData(symbol).catch((err) => {
      console.warn('[ResearchService] Screener scrape failed for', symbol, err.message);
      return null;
    }),
    fetchYahooProfile(symbol).catch(() => buildFallbackProfile(symbol)),
    fetchYahooQuote(symbol).catch(() => buildFallbackQuote(symbol)),
    fetchYahooFundamentals(symbol).catch(() => ({
      valuation: buildEmptyValuation(),
      profitability: buildEmptyProfitability(),
      solvency: buildEmptySolvency(),
      growth: buildEmptyGrowth(),
    })),
    fetchYahooPeers(symbol).catch(() => ({ peers: [], meta: buildUnavailableMeta() })),
  ]);

  // 2. If Screener scraping succeeded and contains annual financials, use live scraped data
  if (screenerResult && screenerResult.annualFinancials && screenerResult.annualFinancials.periods.length > 0) {
    const sQuote = screenerResult.quote ?? buildFallbackQuote(symbol);
    const mergedQuote: ResearchQuote = {
      ...sQuote,
      // Overlay live Yahoo price / intraday change if available
      price: quote.price ?? sQuote.price ?? null,
      change: quote.change ?? null,
      changePct: quote.changePct ?? null,
      open: quote.open ?? null,
      prevClose: quote.prevClose ?? null,
      volume: quote.volume ?? null,
      avgVolume: quote.avgVolume ?? null,
      marketCap: sQuote.marketCap ?? quote.marketCap ?? null,
      week52High: sQuote.week52High ?? quote.week52High ?? null,
      week52Low: sQuote.week52Low ?? quote.week52Low ?? null,
      trailingPE: sQuote.trailingPE ?? quote.trailingPE ?? null,
      forwardPE: quote.forwardPE ?? null,
      priceToBook: sQuote.priceToBook ?? quote.priceToBook ?? null,
      trailingEps: sQuote.trailingEps ?? quote.trailingEps ?? null,
      dividendYield: sQuote.dividendYield ?? quote.dividendYield ?? null,
      beta: quote.beta ?? null,
      timestamp: quote.timestamp ?? fetchedAt,
      meta: quote.price != null ? quote.meta : sQuote.meta,
    };

    const sKeyMetrics = screenerResult.keyMetrics || {
      marketCap: mergedQuote.marketCap,
      pe: mergedQuote.trailingPE,
      pb: mergedQuote.priceToBook,
      roe: null,
      roce: null,
      debtToEquity: null,
      dividendYield: mergedQuote.dividendYield,
      week52High: mergedQuote.week52High,
      week52Low: mergedQuote.week52Low,
      operatingMargin: null,
      netMargin: null,
      eps: mergedQuote.trailingEps,
    };

    const keyMetrics: KeyMetrics = {
      marketCap: mergedQuote.marketCap,
      pe: mergedQuote.trailingPE,
      pb: mergedQuote.priceToBook,
      roe: sKeyMetrics.roe ?? fundamentals.profitability.roe ?? null,
      roce: sKeyMetrics.roce ?? fundamentals.profitability.roce ?? null,
      debtToEquity: sKeyMetrics.debtToEquity ?? fundamentals.solvency.debtToEquity ?? null,
      dividendYield: mergedQuote.dividendYield,
      week52High: mergedQuote.week52High,
      week52Low: mergedQuote.week52Low,
      operatingMargin: sKeyMetrics.operatingMargin ?? fundamentals.profitability.operatingMargin ?? null,
      netMargin: sKeyMetrics.netMargin ?? fundamentals.profitability.netMargin ?? null,
      eps: mergedQuote.trailingEps,
      bookValue: sKeyMetrics.bookValue ?? null,
      faceValue: sKeyMetrics.faceValue ?? null,
      cmpToFcf: sKeyMetrics.cmpToFcf ?? null,
      downFrom52wHigh: sKeyMetrics.downFrom52wHigh ?? null,
      pegRatio: sKeyMetrics.pegRatio ?? null,
    };

    const company: CompanyProfile = {
      ...(screenerResult.company ?? profile),
      sector: screenerResult.company?.sector || profile.sector,
      industry: screenerResult.company?.industry || profile.industry,
      website: screenerResult.company?.website || profile.website,
      aboutHtml: screenerResult.company?.aboutHtml,
      aboutCitations: screenerResult.company?.aboutCitations,
      keyPoints: screenerResult.company?.keyPoints,
      quickLinks: screenerResult.company?.quickLinks,
      headquarters: profile.headquarters,
      employees: profile.employees,
      meta: screenerResult.company?.meta ?? profile.meta,
    };

    const peersData: PeersData =
      screenerResult.peers && screenerResult.peers.peers.length > 0
        ? screenerResult.peers
        : (peers as PeersData);

    return {
      company,
      quote: mergedQuote,
      keyMetrics,
      valuation: {
        ...(screenerResult.valuation ?? fundamentals.valuation),
        forwardPe: fundamentals.valuation.forwardPe ?? null,
        pegRatio: screenerResult.valuation?.pegRatio ?? fundamentals.valuation.pegRatio ?? null,
        pb: screenerResult.valuation?.pb ?? mergedQuote.priceToBook ?? fundamentals.valuation.pb ?? null,
      },
      profitability: {
        ...(screenerResult.profitability ?? fundamentals.profitability),
        roa: screenerResult.profitability?.roa ?? fundamentals.profitability.roa ?? null,
        grossMargin: screenerResult.profitability?.grossMargin ?? fundamentals.profitability.grossMargin ?? null,
      },
      solvency: {
        ...(screenerResult.solvency ?? fundamentals.solvency),
        netDebtToEbitda: screenerResult.solvency?.netDebtToEbitda ?? fundamentals.solvency.netDebtToEbitda ?? null,
        interestCoverage: screenerResult.solvency?.interestCoverage ?? fundamentals.solvency.interestCoverage ?? null,
        currentRatio: screenerResult.solvency?.currentRatio ?? fundamentals.solvency.currentRatio ?? null,
        quickRatio: screenerResult.solvency?.quickRatio ?? fundamentals.solvency.quickRatio ?? null,
      },
      efficiency: screenerResult.efficiency ?? unavailableEfficiency(),
      growth: screenerResult.growth ?? fundamentals.growth,
      quarterlyFinancials: screenerResult.quarterlyFinancials ?? unavailableFinancialTable('Quarterly'),
      annualFinancials: screenerResult.annualFinancials,
      balanceSheet: screenerResult.balanceSheet ?? unavailableFinancialTable('Balance Sheet'),
      cashFlow: screenerResult.cashFlow ?? unavailableFinancialTable('Cash Flow'),
      shareholding: screenerResult.shareholding ?? unavailableShareholding(),
      peers: peersData,
      corporateActions: fixture?.corporateActions ?? unavailableCorporateActions(),
      documents: screenerResult.documents ?? fixture?.documents ?? unavailableDocuments(),
      pros: screenerResult.pros,
      cons: screenerResult.cons,
      extraRatios: screenerResult.extraRatios,
      keyPoints: screenerResult.keyPoints,
      quickLinks: screenerResult.quickLinks,
      fetchedAt,
    };
  }

  // 3. Fallback: use fixture if available
  if (fixture) {
    const mergedQuote: ResearchQuote = {
      ...(fixture.quote ?? buildFallbackQuote(symbol)),
      price: quote.price ?? fixture.quote?.price ?? null,
      change: quote.change ?? fixture.quote?.change ?? null,
      changePct: quote.changePct ?? fixture.quote?.changePct ?? null,
      marketCap: quote.marketCap ?? fixture.keyMetrics?.marketCap ?? fixture.quote?.marketCap ?? null,
      trailingPE: quote.trailingPE ?? fixture.keyMetrics?.pe ?? null,
      priceToBook: quote.priceToBook ?? fixture.keyMetrics?.pb ?? null,
      week52High: quote.week52High ?? fixture.keyMetrics?.week52High ?? null,
      week52Low: quote.week52Low ?? fixture.keyMetrics?.week52Low ?? null,
      dividendYield: quote.dividendYield ?? fixture.keyMetrics?.dividendYield ?? null,
      timestamp: quote.timestamp ?? fetchedAt,
      meta: quote.meta?.status === 'fresh' ? quote.meta : (fixture.company?.meta ?? buildUnavailableMeta()),
    };

    const keyMetrics: KeyMetrics = {
      marketCap: mergedQuote.marketCap ?? fixture.keyMetrics?.marketCap ?? null,
      pe: mergedQuote.trailingPE ?? fixture.keyMetrics?.pe ?? null,
      pb: mergedQuote.priceToBook ?? fixture.keyMetrics?.pb ?? null,
      roe: fixture.keyMetrics?.roe ?? fundamentals.profitability.roe ?? null,
      roce: fixture.keyMetrics?.roce ?? fundamentals.profitability.roce ?? null,
      debtToEquity: fixture.keyMetrics?.debtToEquity ?? fundamentals.solvency.debtToEquity ?? null,
      dividendYield: mergedQuote.dividendYield ?? fixture.keyMetrics?.dividendYield ?? null,
      week52High: mergedQuote.week52High ?? fixture.keyMetrics?.week52High ?? null,
      week52Low: mergedQuote.week52Low ?? fixture.keyMetrics?.week52Low ?? null,
      operatingMargin: fixture.keyMetrics?.operatingMargin ?? fundamentals.profitability.operatingMargin ?? null,
      netMargin: fixture.keyMetrics?.netMargin ?? fundamentals.profitability.netMargin ?? null,
      eps: mergedQuote.trailingEps ?? fixture.keyMetrics?.eps ?? null,
    };

    return {
      company: {
        ...(fixture.company ?? profile),
        meta: fixture.company?.meta ?? profile.meta,
      },
      quote: mergedQuote,
      keyMetrics,
      valuation: fixture.valuation ?? fundamentals.valuation,
      profitability: fixture.profitability ?? fundamentals.profitability,
      solvency: fixture.solvency ?? fundamentals.solvency,
      efficiency: fixture.efficiency ?? unavailableEfficiency(),
      growth: fixture.growth ?? fundamentals.growth,
      quarterlyFinancials: fixture.quarterlyFinancials ?? unavailableFinancialTable('Quarterly'),
      annualFinancials: fixture.annualFinancials ?? unavailableFinancialTable('Annual'),
      balanceSheet: fixture.balanceSheet ?? unavailableFinancialTable('Balance Sheet'),
      cashFlow: fixture.cashFlow ?? unavailableFinancialTable('Cash Flow'),
      shareholding: fixture.shareholding ?? unavailableShareholding(),
      peers: (fixture.peers && fixture.peers.peers.length > 0 ? fixture.peers : peers) as PeersData,
      corporateActions: fixture.corporateActions ?? unavailableCorporateActions(),
      documents: fixture.documents ?? unavailableDocuments(),
      pros: fixture.pros,
      cons: fixture.cons,
      extraRatios: fixture.extraRatios,
      keyPoints: fixture.company?.keyPoints ?? fixture.keyPoints,
      quickLinks: fixture.company?.quickLinks ?? fixture.quickLinks,
      fetchedAt,
    };
  }

  // 4. Default: Yahoo finance data with unavailable statements
  const keyMetrics = buildKeyMetrics(quote, fundamentals.valuation, fundamentals.profitability, fundamentals.solvency);

  return {
    company: profile,
    quote,
    keyMetrics,
    valuation: fundamentals.valuation,
    profitability: fundamentals.profitability,
    solvency: fundamentals.solvency,
    efficiency: unavailableEfficiency(),
    growth: fundamentals.growth,
    quarterlyFinancials: unavailableFinancialTable('Quarterly'),
    annualFinancials: unavailableFinancialTable('Annual'),
    balanceSheet: unavailableFinancialTable('Balance Sheet'),
    cashFlow: unavailableFinancialTable('Cash Flow'),
    shareholding: unavailableShareholding(),
    peers: peers as PeersData,
    corporateActions: unavailableCorporateActions(),
    documents: unavailableDocuments(),
    fetchedAt,
  };
}

// ─── Fallback builders ─────────────────────────────────────────────────────────

function buildFallbackProfile(symbol: string): CompanyProfile {
  return {
    symbol,
    name: symbol,
    exchange: 'NSE',
    currency: 'INR',
    reportingMode: 'consolidated',
    meta: { source: 'Unavailable', fetchedAt: null, lastSuccessfulRefresh: null, status: 'error' },
  };
}

function buildFallbackQuote(symbol: string): ResearchQuote {
  return {
    symbol, price: null, change: null, changePct: null, open: null, high: null,
    low: null, prevClose: null, volume: null, avgVolume: null, marketCap: null,
    week52High: null, week52Low: null, trailingPE: null, forwardPE: null,
    priceToBook: null, trailingEps: null, dividendRate: null, dividendYield: null,
    beta: null, timestamp: null,
    meta: { source: 'Unavailable', fetchedAt: null, lastSuccessfulRefresh: null, status: 'error' },
  };
}

function buildUnavailableMeta(): DataSourceMeta {
  return { source: 'Unavailable', fetchedAt: null, lastSuccessfulRefresh: null, status: 'unavailable' };
}

function buildEmptyValuation(): ValuationMetrics {
  return { pe: null, forwardPe: null, pb: null, evToEbitda: null, evToSales: null, priceSales: null, pegRatio: null, dividendYield: null, meta: buildUnavailableMeta() };
}

function buildEmptyProfitability(): ProfitabilityMetrics {
  return { roe: null, roce: null, roa: null, grossMargin: null, operatingMargin: null, netMargin: null, meta: buildUnavailableMeta() };
}

function buildEmptySolvency(): SolvencyMetrics {
  return { debtToEquity: null, netDebtToEbitda: null, interestCoverage: null, currentRatio: null, quickRatio: null, meta: buildUnavailableMeta() };
}

function buildEmptyGrowth(): GrowthMetrics {
  const e = { oneYear: null, threeYear: null, fiveYear: null, tenYear: null };
  return { revenue: e, profit: e, eps: e, fcf: e, meta: buildUnavailableMeta() };
}
