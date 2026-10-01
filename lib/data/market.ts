/**
 * lib/data/market.ts
 *
 * MarketDataService — fetches all market data ONCE per pipeline run.
 * Principle: Fetch once, analyze many.
 *
 * This replaces the pattern where each engine independently calls Yahoo Finance.
 * Reduces API calls, latency, rate limits, and inconsistent timestamps.
 */

import type {
  MarketSnapshot,
  HoldingMarketData,
  IndexSnapshot,
  MacroQuote,
} from '@/types/portfolio-snapshot';

// ─── Yahoo Finance Adapter ──────────────────────────────────────────────────────

async function getYahooFinanceInstance(): Promise<any> {
  const yfModule = await import('yahoo-finance2');
  const YahooFinance = yfModule.default || yfModule;
  return new (YahooFinance as any)({ suppressNotices: ['yahooSurvey'] });
}

async function fetchQuoteSafe(yf: any, symbol: string): Promise<any | null> {
  try {
    const q = await yf.quote(symbol);
    if (q && typeof q.regularMarketPrice === 'number') return q;
  } catch {
    // silent fallback
  }

  // Fallback: direct chart API
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data.chart?.result?.[0]?.meta;
    if (!meta || typeof meta.regularMarketPrice !== 'number') return null;
    const change = meta.regularMarketPrice - (meta.chartPreviousClose || meta.regularMarketPrice);
    const changePct = meta.chartPreviousClose ? (change / meta.chartPreviousClose) * 100 : 0;
    return {
      regularMarketPrice: meta.regularMarketPrice,
      regularMarketChange: change,
      regularMarketChangePercent: changePct,
    };
  } catch {
    return null;
  }
}

function quoteToIndex(q: any): IndexSnapshot | undefined {
  if (!q || typeof q.regularMarketPrice !== 'number') return undefined;
  return {
    price: q.regularMarketPrice,
    change: typeof q.regularMarketChange === 'number' ? q.regularMarketChange : 0,
    changePct: typeof q.regularMarketChangePercent === 'number' ? q.regularMarketChangePercent : 0,
  };
}

function quoteToMacro(q: any): MacroQuote | undefined {
  if (!q || typeof q.regularMarketPrice !== 'number') return undefined;
  return {
    price: q.regularMarketPrice,
    change: typeof q.regularMarketChange === 'number' ? q.regularMarketChange : 0,
    changePct: typeof q.regularMarketChangePercent === 'number' ? q.regularMarketChangePercent : 0,
  };
}

// ─── Holding Data Fetcher ───────────────────────────────────────────────────────

interface HoldingInput {
  ticker: string;
  name: string;
  sector: string;
  currentValue: number;
  shares: number;
}

async function fetchHoldingData(
  yf: any,
  holding: HoldingInput
): Promise<HoldingMarketData | null> {
  const rawTicker = (holding.ticker || '').trim().toUpperCase();
  if (!rawTicker) return null;

  const candidates = rawTicker.includes('.')
    ? [rawTicker]
    : [`${rawTicker}.NS`, `${rawTicker}.BO`];

  let quote: any = null;
  for (const sym of candidates) {
    try {
      quote = await yf.quote(sym);
      if (quote && quote.regularMarketPrice) break;
    } catch {
      // try next
    }
  }

  if (!quote || !quote.regularMarketPrice) {
    return {
      ticker: holding.ticker,
      name: holding.name || holding.ticker,
      sector: holding.sector,
      currentPrice: holding.shares > 0 ? holding.currentValue / holding.shares : 0,
    };
  }

  const price = quote.regularMarketPrice;
  const fiftyDayAvg = typeof quote.fiftyDayAverage === 'number' ? quote.fiftyDayAverage : undefined;
  const twoHundredDayAvg = typeof quote.twoHundredDayAverage === 'number' ? quote.twoHundredDayAverage : undefined;
  const high52 = typeof quote.fiftyTwoWeekHigh === 'number' ? quote.fiftyTwoWeekHigh : undefined;
  const low52 = typeof quote.fiftyTwoWeekLow === 'number' ? quote.fiftyTwoWeekLow : undefined;

  return {
    ticker: holding.ticker,
    name: quote.shortName || quote.longName || holding.name || holding.ticker,
    sector: holding.sector,
    currentPrice: price,

    trailingPE: typeof quote.trailingPE === 'number' ? Math.round(quote.trailingPE * 10) / 10 : undefined,
    forwardPE: typeof quote.forwardPE === 'number' ? Math.round(quote.forwardPE * 10) / 10 : undefined,
    priceToBook: typeof quote.priceToBook === 'number' ? Math.round(quote.priceToBook * 10) / 10 : undefined,
    dividendYield: typeof quote.dividendYield === 'number' ? Math.round(quote.dividendYield * 1000) / 10 : undefined,

    fiftyDayAverage: fiftyDayAvg ? Math.round(fiftyDayAvg * 10) / 10 : undefined,
    twoHundredDayAverage: twoHundredDayAvg ? Math.round(twoHundredDayAvg * 10) / 10 : undefined,
    pctVs50DMA: fiftyDayAvg ? Math.round(((price - fiftyDayAvg) / fiftyDayAvg) * 1000) / 10 : undefined,
    pctVs200DMA: twoHundredDayAvg ? Math.round(((price - twoHundredDayAvg) / twoHundredDayAvg) * 1000) / 10 : undefined,

    fiftyTwoWeekHigh: high52,
    fiftyTwoWeekLow: low52,
    pctFrom52WHigh: high52 ? Math.round(((price - high52) / high52) * 1000) / 10 : undefined,
  };
}

// ─── Main Service ───────────────────────────────────────────────────────────────

/**
 * Fetches ALL market data in a single pass:
 * - Per-holding fundamental & technical metrics
 * - Index quotes (Nifty, Sensex)
 * - Macro quotes (USD/INR, Brent, Gold, US10Y)
 *
 * Returns a MarketSnapshot that all analytics engines consume.
 */
export async function fetchMarketSnapshot(
  holdings: HoldingInput[]
): Promise<MarketSnapshot> {
  const observedAt = new Date().toISOString();

  let yf: any;
  try {
    yf = await getYahooFinanceInstance();
  } catch (err) {
    console.warn('[MarketDataService] Failed to initialize Yahoo Finance:', (err as Error).message);
    return { observedAt, holdingData: [] };
  }

  // Fetch everything in parallel
  const [
    holdingResults,
    niftyQ,
    sensexQ,
    usdInrQ,
    brentQ,
    goldQ,
    us10yQ,
  ] = await Promise.all([
    // Holdings — all in parallel
    Promise.allSettled(holdings.map((h) => fetchHoldingData(yf, h))),
    // Indices & macro
    fetchQuoteSafe(yf, '^NSEI'),
    fetchQuoteSafe(yf, '^BSESN'),
    fetchQuoteSafe(yf, 'USDINR=X'),
    fetchQuoteSafe(yf, 'BZ=F'),
    fetchQuoteSafe(yf, 'GC=F'),
    fetchQuoteSafe(yf, '^TNX'),
  ]);

  const holdingData = holdingResults
    .filter((r): r is PromiseFulfilledResult<HoldingMarketData | null> => r.status === 'fulfilled' && r.value !== null)
    .map((r) => r.value!);

  console.log(
    `[MarketDataService] Fetched ${holdingData.length}/${holdings.length} holdings, ` +
    `Nifty: ${niftyQ ? '✓' : '✗'}, Sensex: ${sensexQ ? '✓' : '✗'}, ` +
    `USD/INR: ${usdInrQ ? '✓' : '✗'}, Brent: ${brentQ ? '✓' : '✗'}, ` +
    `Gold: ${goldQ ? '✓' : '✗'}, US10Y: ${us10yQ ? '✓' : '✗'}`
  );

  return {
    observedAt,
    holdingData,
    nifty: quoteToIndex(niftyQ),
    sensex: quoteToIndex(sensexQ),
    usdInr: quoteToMacro(usdInrQ),
    brentCrude: quoteToMacro(brentQ),
    gold: quoteToMacro(goldQ),
    us10y: quoteToMacro(us10yQ),
  };
}
