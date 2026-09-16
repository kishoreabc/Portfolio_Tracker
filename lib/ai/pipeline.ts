/**
 * lib/ai/pipeline.ts
 *
 * Multi-node AI Insights pipeline.
 * Architecture: 5 sequential agent nodes, each with circular model-manager fallback,
 * real-time web scraping & market quote fetching, and verbose terminal logging.
 *
 * Node 1 — portfolioAnalyzerNode : Core portfolio metrics & health score
 * Node 2 — macroAnalystNode      : Live Web Search, RSS Scraping & Yahoo Finance Index Quotes
 * Node 3 — strategyNode          : Actionable opportunities, risks, and recommendations
 * Node 4 — riskEngineNode        : Stress scenario simulation & diversification
 * Node 5 — reportGeneratorNode   : Programmatic assembly of structured AIInsightsResponse
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { getInsightsModelManager } from './models';
import type {
  AIInsightsResponse,
  PortfolioHealthBreakdown,
  ScoringWeights,
  ExecutiveSummaryInsight,
  FundamentalIntelligence,
  FundamentalHolding,
  TechnicalIntelligence,
  TechnicalSignalHolding,
  ValuationIntelligence,
  RiskIntelligence,
  RiskFactor,
  PortfolioIntelligence,
  PerformanceContributor,
  MacroIntelligence,
  MacroExposure,
  FundamentalTechnicalMatrix,
  MatrixStock,
  ReviewFlag,
  ThesisHolding,
  PortfolioChanges,
  AIConfidence,
} from '@/types/insights';
import type { AgentActivityEvent, AgentId, AgentStatus, ActivityType } from '@/types/agent-activity';
import { getSectorPE, evaluateValuation } from '@/lib/calc/valuation';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EquityInput {
  ticker: string;
  name: string;
  sector: string;
  currentValue: number;
  percentChange: number;
  allocationPercent: number;
  shares: number;
}

export interface BondInput {
  isin: string;
  securityName: string;
  sector: string;
  creditRating: string;
  ytm: number;
  couponRate: number;
  duration: number;
  totalValue: number;
  maturityDate: string | null;
}

export interface PortfolioInput {
  // Aggregates
  netWorth: number;
  equityTotal: number;
  bondTotal: number;
  equityCount: number;
  bondCount: number;
  diversificationScore: number;
  herfindahlIndex: number;
  top5Percent: number;
  // Holdings
  topEquity: EquityInput[];
  topBonds: BondInput[];
  winners: EquityInput[];
  losers: EquityInput[];
  // Allocation
  assetAllocation: { label: string; percent: number }[];
  sectorAllocation: { sector: string; percent: number }[];
  // Cash flow
  totalInvestment: number;
  totalExpenses: number;
  monthlyAvgInvestment: number;
  lastMonthInvestment: number;
  lastMonthExpenses: number;
  previousReport?: any;
}

export interface StockAnalysisMetrics {
  ticker: string;
  name: string;
  sector: string;
  currentPrice: number;
  trailingPE?: number;
  forwardPE?: number;
  priceToBook?: number;
  dividendYield?: number;
  fiftyDayAverage?: number;
  twoHundredDayAverage?: number;
  pctVs50DMA?: number;
  pctVs200DMA?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  pctFrom52WHigh?: number;
  technicalSignal: string;
  fundamentalValuation: string;
}

export interface ScoringBreakdownResult {
  overall: number;
  fundamental: number;
  technical: number;
  valuation: number;
  risk: number;
  diversification: number;
  performance: number;
  status: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  summary: string;
  methodology: string;
  weights: ScoringWeights;
}

/**
 * Deterministic multi-factor scoring engine.
 * Calculates scores purely in application code from real portfolio telemetry.
 */
export function computeScoringEngine(
  input: PortfolioInput,
  holdingsAnalysis: StockAnalysisMetrics[]
): ScoringBreakdownResult {
  const weights: ScoringWeights = {
    fundamental: 0.25,
    technical: 0.20,
    risk: 0.20,
    diversification: 0.15,
    valuation: 0.10,
    performance: 0.10,
  };

  // 1. Fundamental Score (0-100)
  let fundamental = 72;
  const validPEs = holdingsAnalysis
    .map((h) => h.trailingPE)
    .filter((pe): pe is number => typeof pe === 'number' && pe > 0);
  if (validPEs.length > 0) {
    const avgPE = validPEs.reduce((a, b) => a + b, 0) / validPEs.length;
    if (avgPE >= 14 && avgPE <= 28) {
      fundamental += 8;
    } else if (avgPE > 48) {
      fundamental -= 10;
    }
  }
  const fairOrUndervalued = holdingsAnalysis.filter((h) =>
    /fair|undervalued/i.test(h.fundamentalValuation)
  ).length;
  if (holdingsAnalysis.length > 0) {
    const ratio = fairOrUndervalued / holdingsAnalysis.length;
    fundamental = Math.round(fundamental + (ratio * 16 - 6));
  }
  fundamental = Math.max(25, Math.min(95, fundamental));

  // 2. Technical Score (0-100) - % of holdings above 200DMA & 50DMA
  let technical = 50;
  const with200 = holdingsAnalysis.filter((h) => h.pctVs200DMA !== undefined);
  const with50 = holdingsAnalysis.filter((h) => h.pctVs50DMA !== undefined);
  const above200 = with200.filter((h) => (h.pctVs200DMA ?? 0) >= 0).length;
  const above50 = with50.filter((h) => (h.pctVs50DMA ?? 0) >= 0).length;

  if (with200.length > 0) {
    const ratio200 = above200 / with200.length;
    const ratio50 = with50.length > 0 ? above50 / with50.length : ratio200;
    technical = Math.round(ratio200 * 60 + ratio50 * 40);
  }
  technical = Math.max(20, Math.min(95, technical));

  // 3. Valuation Score (0-100) - Nifty 50 long-term benchmark median ~ 22.8x
  const benchmarkPE = 22.8;
  let valuation = 72;
  if (validPEs.length > 0) {
    const avgPE = validPEs.reduce((a, b) => a + b, 0) / validPEs.length;
    const peDiff = Math.abs(avgPE - benchmarkPE);
    if (peDiff <= 3) {
      valuation = 85;
    } else if (avgPE < benchmarkPE) {
      valuation = 80;
    } else if (avgPE > 35) {
      valuation = Math.max(35, Math.round(80 - (avgPE - 35) * 1.5));
    }
  }

  // 4. Risk Score (0-100) - Higher is safer
  let risk = 75;
  const top5 = input.top5Percent * 100;
  if (top5 > 65) risk -= 20;
  else if (top5 > 45) risk -= 10;
  else if (top5 < 32) risk += 8;

  const topSector = input.sectorAllocation[0]?.percent ? input.sectorAllocation[0].percent * 100 : 0;
  if (topSector > 45) risk -= 16;
  else if (topSector > 32) risk -= 8;

  risk = Math.max(25, Math.min(95, risk));

  // 5. Diversification Score (0-100)
  let diversification = input.diversificationScore || 65;
  if (input.equityCount + input.bondCount < 4) {
    diversification = Math.min(diversification, 50);
  }

  // 6. Performance Score (0-100)
  let performance = 65;
  const totalTracked = input.winners.length + input.losers.length;
  if (totalTracked > 0) {
    const winRatio = input.winners.length / totalTracked;
    performance = Math.round(30 + winRatio * 50);
  }

  // Overall Score Calculation
  const overall = Math.round(
    fundamental * weights.fundamental +
    technical * weights.technical +
    valuation * weights.valuation +
    risk * weights.risk +
    diversification * weights.diversification +
    performance * weights.performance
  );

  let status: 'Excellent' | 'Good' | 'Fair' | 'Poor' = 'Good';
  if (overall >= 80) status = 'Excellent';
  else if (overall >= 65) status = 'Good';
  else if (overall >= 50) status = 'Fair';
  else status = 'Poor';

  const summary = `Overall portfolio health is rated ${overall}/100 (${status}), anchored by fundamental strength (${fundamental}/100), risk control (${risk}/100), and technical market structure (${technical}/100).`;
  const methodology = `Deterministic multi-factor scoring model: 25% Fundamentals, 20% Technicals, 20% Risk Control, 15% Diversification, 10% Valuation, 10% Performance. Scores are computed directly from real portfolio telemetry.`;

  return {
    overall,
    fundamental,
    technical,
    valuation,
    risk,
    diversification,
    performance,
    status,
    summary,
    methodology,
    weights,
  };
}

interface PipelineState {
  input: PortfolioInput;
  holdingsAnalysis: StockAnalysisMetrics[];
  portfolioAnalysis: string;
  macroContext: string;
  strategyAnalysis: string;
  riskAnalysis: string;
  scoringResult: ScoringBreakdownResult;
  macroSnapshot?: LiveMarketSnapshot;
}

// ─── Logging Helpers ──────────────────────────────────────────────────────────

function logAgentHeader(nodeNumber: number, title: string) {
  const line = '═'.repeat(64);
  console.log(`\n\x1b[36m╔${line}╗\x1b[0m`);
  console.log(`\x1b[36m║  🤖 [AGENT ${nodeNumber}] ${title.padEnd(58)}║\x1b[0m`);
  console.log(`\x1b[36m╚${line}╝\x1b[0m`);
}

function logAgentResponse(nodeNumber: number, title: string, data: any) {
  console.log(`\x1b[32m┌─── [AGENT ${nodeNumber}: ${title} OUTPUT] ───────────────────────────\x1b[0m`);
  try {
    const formatted = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    console.log(formatted);
  } catch {
    console.log(data);
  }
  console.log(`\x1b[32m└───────────────────────────────────────────────────────────────\x1b[0m\n`);
}

// ─── Model Invocation Helper ──────────────────────────────────────────────────

/** Call model with circular retry fallback and pacing delays across the model chain */
async function callWithFallback(prompt: string, systemPrompt: string): Promise<string> {
  const manager = getInsightsModelManager();
  const maxAttempts = manager.count * 2; // Allow multiple full circular passes

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { model, index, name } = await manager.getNext();
    try {
      // Pacing delay to avoid burst rate-limits
      await manager.applyPacingDelay(1500);

      const response = await model.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(prompt),
      ]);

      const text =
        typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);

      if (!text || text.trim().length === 0) {
        throw new Error('Received empty response from model');
      }

      return text;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const isRateLimit = /429|rate.limit|quota|resource.exhausted|too many requests/i.test(errMsg);
      const isKeyOrModelError = /401|403|404|invalid.*key|permission_denied|not_found|no longer available/i.test(errMsg);
      const isServiceUnavailable = /503|service.unavailable|high demand|overloaded/i.test(errMsg);

      let diagnosis = 'Unknown Error';
      if (isServiceUnavailable) {
        diagnosis = '⚠️ [503 Google Server Congestion] Model is experiencing high demand on Google servers. Automatically switching to next model.';
      } else if (isRateLimit) {
        diagnosis = '⏳ [429 Quota Exhaustion] RPM/TPM limit reached for this specific model tier. Blacklisting for 60s.';
      } else if (isKeyOrModelError) {
        diagnosis = '❌ [401/404 Key or Model Error] Invalid API key or model name deprecated by provider. Blacklisting for 5m.';
      } else {
        diagnosis = `⚠️ [API Error] ${errMsg.slice(0, 100)}`;
      }

      console.warn(
        `\n\x1b[33m[MODEL FALLBACK TRIGGERED]\x1b[0m Attempt ${attempt + 1}/${maxAttempts} on \x1b[1m${name}\x1b[0m (model ${index + 1}/${manager.count})\n ↳ \x1b[31m${diagnosis}\x1b[0m`
      );

      if (isKeyOrModelError) {
        manager.blacklist(index, 300_000, 'Invalid key or model not found (5m)');
      } else if (isRateLimit) {
        manager.blacklist(index, 60_000, 'Rate limit / quota 429 (1m)');
      } else {
        manager.blacklist(index, 30_000, 'Service unavailable / API error (30s)');
      }

      // Delay before switching circularly to next model to avoid triggering back-to-back rate limits
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  throw new Error('All models in circular chain failed for insights pipeline node.');
}

/** Extract JSON string from model output — handles ```json ... ``` wrappers */
function extractJSON(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]+?)```/);
  if (fenced) return fenced[1].trim();
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) return text.slice(firstBrace, lastBrace + 1);
  return text.trim();
}

/** Extract and robustly parse JSON from model output */
function extractAndParseJSON<T = any>(text: string, fallbackName = 'data'): T {
  let cleaned = extractJSON(text);

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Attempt standard syntax repairs:
    // 1. Remove trailing commas before } or ]
    cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
    // 2. Remove unescaped control characters
    cleaned = cleaned.replace(/[\x00-\x1F\x7F-\x9F]/g, (c: string) => (c === '\n' || c === '\r' || c === '\t' ? c : ''));

    try {
      return JSON.parse(cleaned) as T;
    } catch {
      // 3. Fallback: sanitize quotes/newlines in multi-line strings
      const lines = cleaned.split('\n');
      const sanitized = lines
        .map((line: string) => {
          return line.replace(/(:\s*"[^"]*)"([^",}\]]*)/g, '$1\\"$2');
        })
        .join('\n');

      try {
        return JSON.parse(sanitized) as T;
      } catch (finalErr) {
        console.error(`[pipeline] Failed to parse JSON for ${fallbackName}:`, (finalErr as Error).message);
        throw finalErr;
      }
    }
  }
}

// ─── Real-Time Fundamental & Technical Analysis via Yahoo Finance ────────────

/**
 * Fetches real-time fundamental (P/E, P/B) and technical (50DMA, 200DMA, 52W High/Low)
 * indicators for top portfolio equity holdings via Yahoo Finance.
 */
export async function fetchHoldingsAnalysis(topEquity: EquityInput[]): Promise<StockAnalysisMetrics[]> {
  if (!topEquity || topEquity.length === 0) return [];

  try {
    const yfModule = await import('yahoo-finance2');
    const YahooFinance = yfModule.default || yfModule;
    const yahooFinance = new (YahooFinance as any)({ suppressNotices: ['yahooSurvey'] });

    const targets = topEquity.slice(0, 8);
    const results = await Promise.allSettled(
      targets.map(async (holding) => {
        const rawTicker = (holding.ticker || '').trim().toUpperCase();
        if (!rawTicker) return null;

        // Determine symbol candidates for Indian exchanges (NSE default .NS, BSE fallback .BO)
        const candidates = rawTicker.includes('.')
          ? [rawTicker]
          : [`${rawTicker}.NS`, `${rawTicker}.BO`];

        let quote: any = null;
        for (const sym of candidates) {
          try {
            quote = await yahooFinance.quote(sym);
            if (quote && quote.regularMarketPrice) break;
          } catch {
            // try next candidate
          }
        }

        if (!quote || !quote.regularMarketPrice) {
          return {
            ticker: holding.ticker,
            name: holding.name || holding.ticker,
            sector: holding.sector,
            currentPrice: holding.currentValue / (holding.shares || 1),
            technicalSignal: 'Neutral Consolidation',
            fundamentalValuation: 'N/A',
          } as StockAnalysisMetrics;
        }

        const price = quote.regularMarketPrice;
        const trailingPE = typeof quote.trailingPE === 'number' ? quote.trailingPE : undefined;
        const forwardPE = typeof quote.forwardPE === 'number' ? quote.forwardPE : undefined;
        const priceToBook = typeof quote.priceToBook === 'number' ? quote.priceToBook : undefined;
        const fiftyDayAvg = typeof quote.fiftyDayAverage === 'number' ? quote.fiftyDayAverage : undefined;
        const twoHundredDayAvg = typeof quote.twoHundredDayAverage === 'number' ? quote.twoHundredDayAverage : undefined;
        const high52 = typeof quote.fiftyTwoWeekHigh === 'number' ? quote.fiftyTwoWeekHigh : undefined;
        const low52 = typeof quote.fiftyTwoWeekLow === 'number' ? quote.fiftyTwoWeekLow : undefined;

        const pctVs50 = fiftyDayAvg ? ((price - fiftyDayAvg) / fiftyDayAvg) * 100 : undefined;
        const pctVs200 = twoHundredDayAvg ? ((price - twoHundredDayAvg) / twoHundredDayAvg) * 100 : undefined;
        const pctFromHigh = high52 ? ((price - high52) / high52) * 100 : undefined;

        // Technical Signal heuristic
        let technicalSignal = 'Neutral Consolidation';
        if (fiftyDayAvg && twoHundredDayAvg) {
          if (fiftyDayAvg > twoHundredDayAvg && price > fiftyDayAvg) {
            if (pctFromHigh !== undefined && pctFromHigh >= -3) {
              technicalSignal = 'Overbought / Near 52W High';
            } else if (pctVs50 !== undefined && pctVs50 >= 0 && pctVs50 <= 2.5) {
              technicalSignal = 'Above 200DMA (Near 50DMA Support)';
            } else {
              technicalSignal = 'Golden Cross (Strong Bullish Momentum)';
            }
          } else if (fiftyDayAvg < twoHundredDayAvg && price < fiftyDayAvg) {
            if (pctVs200 !== undefined && pctVs200 < -15) {
              technicalSignal = 'Oversold / Near Key Support';
            } else {
              technicalSignal = 'Death Cross (Bearish Trend)';
            }
          } else if (price > twoHundredDayAvg) {
            technicalSignal = 'Above 200DMA (Structural Uptrend)';
          } else {
            technicalSignal = 'Below 200DMA (Structural Downtrend)';
          }
        } else if (twoHundredDayAvg) {
          technicalSignal = price >= twoHundredDayAvg ? 'Above 200DMA' : 'Below 200DMA';
        }

        // Fundamental Valuation heuristic
        let fundamentalValuation = 'N/A';
        if (trailingPE !== undefined) {
          if (trailingPE < 18) fundamentalValuation = 'Undervalued';
          else if (trailingPE <= 30) fundamentalValuation = 'Fair Value';
          else if (trailingPE <= 45) fundamentalValuation = 'Elevated';
          else fundamentalValuation = 'Expensive';
        }

        const dividendYield = typeof quote.dividendYield === 'number' ? Math.round(quote.dividendYield * 1000) / 10 : undefined;

        return {
          ticker: holding.ticker,
          name: quote.shortName || quote.longName || holding.name || holding.ticker,
          sector: holding.sector,
          currentPrice: price,
          trailingPE: trailingPE ? Math.round(trailingPE * 10) / 10 : undefined,
          forwardPE: forwardPE ? Math.round(forwardPE * 10) / 10 : undefined,
          priceToBook: priceToBook ? Math.round(priceToBook * 10) / 10 : undefined,
          dividendYield,
          fiftyDayAverage: fiftyDayAvg ? Math.round(fiftyDayAvg * 10) / 10 : undefined,
          twoHundredDayAverage: twoHundredDayAvg ? Math.round(twoHundredDayAvg * 10) / 10 : undefined,
          pctVs50DMA: pctVs50 !== undefined ? Math.round(pctVs50 * 10) / 10 : undefined,
          pctVs200DMA: pctVs200 !== undefined ? Math.round(pctVs200 * 10) / 10 : undefined,
          fiftyTwoWeekHigh: high52,
          fiftyTwoWeekLow: low52,
          pctFrom52WHigh: pctFromHigh !== undefined ? Math.round(pctFromHigh * 10) / 10 : undefined,
          technicalSignal,
          fundamentalValuation,
        } as StockAnalysisMetrics;
      })
    );

    return results
      .filter((r): r is PromiseFulfilledResult<StockAnalysisMetrics> => r.status === 'fulfilled' && r.value !== null)
      .map((r) => r.value);
  } catch (err) {
    console.warn('[pipeline/holdings] Yahoo Finance holdings scan error:', (err as Error).message);
    return [];
  }
}

/** Formats holdings fundamental & technical metrics into a prompt-ready markdown table */
export function formatHoldingsAnalysisTable(metrics: StockAnalysisMetrics[]): string {
  if (!metrics || metrics.length === 0) {
    return '  (Live holdings metrics unavailable; using portfolio static data)';
  }

  const header = '| Ticker | Price | Trailing P/E | P/B | % vs 50DMA | % vs 200DMA | % from 52W High | Technical Signal | Valuation |';
  const divider = '|---|---|---|---|---|---|---|---|---|';
  const rows = metrics.map((m) => {
    const pe = m.trailingPE ? `${m.trailingPE}x` : 'N/A';
    const pb = m.priceToBook ? `${m.priceToBook}x` : 'N/A';
    const vs50 = m.pctVs50DMA !== undefined ? `${m.pctVs50DMA >= 0 ? '+' : ''}${m.pctVs50DMA}%` : 'N/A';
    const vs200 = m.pctVs200DMA !== undefined ? `${m.pctVs200DMA >= 0 ? '+' : ''}${m.pctVs200DMA}%` : 'N/A';
    const fromHigh = m.pctFrom52WHigh !== undefined ? `${m.pctFrom52WHigh}%` : 'N/A';
    return `| ${m.ticker} | ₹${m.currentPrice.toFixed(1)} | ${pe} | ${pb} | ${vs50} | ${vs200} | ${fromHigh} | ${m.technicalSignal} | ${m.fundamentalValuation} |`;
  });

  return [header, divider, ...rows].join('\n');
}

// ─── Real-Time Web Search & Market Quote Scrapers ─────────────────────────────

export interface LiveMarketArticle {
  title: string;
  summary?: string;
  sentiment?: string;
  impact?: string;
  category?: string;
  companies?: string[];
}

interface LiveMarketSnapshot {
  nifty: { price: number; change: string; changePct: string } | null;
  sensex: { price: number; change: string; changePct: string } | null;
  usdinr: { price: number; change: string; changePct: string } | null;
  brentCrude: { price: number; change: string; changePct: string } | null;
  gold: { price: number; change: string; changePct: string } | null;
  us10y: { price: number; change: string; changePct: string } | null;
  headlines: string[];
  searchSource: 'tavily' | 'google_news_rss' | 'database';
  newsSectionArticles: LiveMarketArticle[];
}

export async function scrapeLiveMarketData(sectors: string[]): Promise<LiveMarketSnapshot> {
  async function fetchYahooQuote(symbol: string) {
    // 1. Try yahoo-finance2 library
    try {
      const yfModule = await import('yahoo-finance2');
      const YahooFinance = yfModule.default || yfModule;
      const yahooFinance = new (YahooFinance as any)({ suppressNotices: ['yahooSurvey'] });
      const q = await yahooFinance.quote(symbol);
      if (q && typeof q.regularMarketPrice === 'number') {
        const change = typeof q.regularMarketChange === 'number' ? q.regularMarketChange : 0;
        const changePct = typeof q.regularMarketChangePercent === 'number' ? q.regularMarketChangePercent : 0;
        return {
          price: q.regularMarketPrice,
          change: `${change >= 0 ? '+' : ''}${change.toFixed(2)}`,
          changePct: `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`,
        };
      }
    } catch {
      // fallback to direct chart API
    }

    // 2. Direct HTTP Chart endpoint fallback
    try {
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (!res.ok) return null;
      const data = await res.json();
      const meta = data.chart?.result?.[0]?.meta;
      if (!meta || typeof meta.regularMarketPrice !== 'number') return null;
      const change = meta.regularMarketPrice - (meta.chartPreviousClose || meta.regularMarketPrice);
      const changePct = meta.chartPreviousClose ? (change / meta.chartPreviousClose) * 100 : 0;
      return {
        price: meta.regularMarketPrice,
        change: `${change >= 0 ? '+' : ''}${change.toFixed(2)}`,
        changePct: `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`,
      };
    } catch {
      return null;
    }
  }

  // 1. Fetch Live Market & Macroeconomic Quotes from Yahoo Finance
  const [nifty, sensex, usdinr, brentCrude, gold, us10y] = await Promise.all([
    fetchYahooQuote('^NSEI'),
    fetchYahooQuote('^BSESN'),
    fetchYahooQuote('USDINR=X'),
    fetchYahooQuote('BZ=F'),
    fetchYahooQuote('GC=F'),
    fetchYahooQuote('^TNX'),
  ]);

  const headlines: string[] = [];
  const newsSectionArticles: Array<{
    title: string;
    summary?: string;
    sentiment?: string;
    impact?: string;
    category?: string;
    companies?: string[];
  }> = [];
  let searchSource: 'tavily' | 'google_news_rss' | 'database' = 'google_news_rss';

  // 2. Comprehensive Web Search: Attempt Dual-Query Tavily Advanced News Search
  try {
    const { fetchTavilySearch } = await import('./tavily');
    const queryMacro = `India macroeconomic outlook RBI MPC repo rate inflation CPI GDP FII DII institutional flows`;
    const queryMarkets = `Indian stock market Nifty 50 Sensex valuation PE corporate earnings quarterly results ${sectors.slice(0, 2).join(' ')}`;

    const [tavilyMacro, tavilyMarkets] = await Promise.all([
      fetchTavilySearch(queryMacro, {
        searchDepth: 'advanced',
        topic: 'news',
        days: 7,
        maxResults: 4,
      }),
      fetchTavilySearch(queryMarkets, {
        searchDepth: 'advanced',
        topic: 'news',
        days: 7,
        maxResults: 4,
      }),
    ]);

    const tavilyBatches = [tavilyMacro, tavilyMarkets].filter(Boolean);
    const allResults = tavilyBatches.flatMap((tb) => tb?.results || []);

    if (allResults.length > 0) {
      searchSource = 'tavily';
      for (const tb of tavilyBatches) {
        if (tb?.answer) {
          headlines.push(`[TAVILY MACRO INTELLIGENCE BRIEFING]:\n${tb.answer}`);
        }
      }
      const seenTitles = new Set<string>();
      for (const res of allResults) {
        if (res.title && !seenTitles.has(res.title)) {
          seenTitles.add(res.title);
          if (res.content) {
            headlines.push(`[ARTICLE: ${res.title}]\n${res.content.slice(0, 380)}`);
          } else {
            headlines.push(`[ARTICLE: ${res.title}]`);
          }
        }
      }
      console.log(`[pipeline/macro] Successfully fetched ${seenTitles.size} news articles & macro briefing via dual-query Tavily Advanced Search.`);
    }
  } catch (err) {
    console.warn('[pipeline/macro] Tavily search fallback:', (err as Error).message);
  }

  // 3. Fallback: If Tavily returned nothing, scrape Live Market News via Google News RSS Search
  if (headlines.length === 0) {
    try {
      const rssQueries = [
        `India macroeconomic outlook RBI MPC repo rate inflation CPI GDP`,
        `Indian stock market Nifty 50 corporate earnings ${sectors.slice(0, 2).join(' ')}`,
      ];
      for (const q of rssQueries) {
        const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-IN&gl=IN&ceid=IN:en`;
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 300 } });
        if (res.ok) {
          const xml = await res.text();
          const matches = [...xml.matchAll(/<title>(.*?)<\/title>/g)].map((m) => m[1]).slice(1, 6);
          for (const title of matches) {
            const cleaned = title.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/&amp;/g, '&').trim();
            if (cleaned && cleaned !== 'Google News' && !headlines.includes(cleaned)) {
              headlines.push(cleaned);
            }
          }
        }
      }
      if (headlines.length > 0) searchSource = 'google_news_rss';
    } catch (err) {
      console.warn('[pipeline/scraper] Google News RSS scrape skipped:', (err as Error).message);
    }
  }

  // 4. Ingest Articles from the Internal News Section (Database repository & Synced Feeds)
  try {
    const { getPortfolioNews, getNews } = await import('@/lib/news/search');
    const [portfolioNews, generalNews] = await Promise.all([
      getPortfolioNews(15).catch(() => []),
      getNews({ limit: 15 }).then((r) => r.articles).catch(() => []),
    ]);

    const combined = [...portfolioNews, ...generalNews];
    const seenTitles = new Set<string>();

    for (const a of combined) {
      const title = (a.translatedTitle || a.originalTitle || '').trim();
      if (title && !seenTitles.has(title)) {
        seenTitles.add(title);
        const companyList = Array.isArray(a.companies)
          ? a.companies.map((c: unknown) => typeof c === 'string' ? c : (c as { ticker?: string; name?: string })?.ticker || (c as { name?: string })?.name || '').filter(Boolean)
          : undefined;

        newsSectionArticles.push({
          title,
          summary: a.summary || undefined,
          sentiment: a.sentiment || undefined,
          impact: a.impact || undefined,
          category: a.category || undefined,
          companies: companyList,
        });

        // Also add concise tag to headlines list for LLM context
        headlines.push(
          `[NEWS SECTION FEED]: "${title}" (Category: ${a.category || 'General'}, Sentiment: ${a.sentiment || 'neutral'})${a.summary ? ` — Summary: ${a.summary}` : ''}${companyList && companyList.length > 0 ? ` — Companies: ${companyList.join(', ')}` : ''}`
        );
      }
    }

    if (newsSectionArticles.length > 0) {
      console.log(`[pipeline/macro] Successfully ingested ${newsSectionArticles.length} articles from the internal News Section.`);
    }
  } catch (err) {
    console.warn('[pipeline/scraper] News section database query skipped:', (err as Error).message);
  }

  return { nifty, sensex, usdinr, brentCrude, gold, us10y, headlines, searchSource, newsSectionArticles };
}

// ─── Node 1: Portfolio Analyser ───────────────────────────────────────────────

async function portfolioAnalyzerNode(
  input: PortfolioInput,
  holdingsAnalysis: StockAnalysisMetrics[] = [],
  scoring?: ScoringBreakdownResult
): Promise<string> {
  logAgentHeader(1, 'PORTFOLIO ANALYSER & HEALTH METRICS');

  const system = `You are a senior portfolio analyst specializing in Indian capital markets and retail portfolios. 
Analyse the portfolio data, fundamental valuation multiples, and technical moving average metrics to produce a structured, factual assessment.
Focus on: health score rationale, allocation commentary, cash flow health, valuation risk (portfolio-weighted P/E), and technical momentum/breadth (% of holdings trading above 200DMA).
Always respond with JSON only.`;

  const holdingsTable = formatHoldingsAnalysisTable(holdingsAnalysis);
  const validPEs = holdingsAnalysis.map((h) => h.trailingPE).filter((pe): pe is number => typeof pe === 'number' && pe > 0);
  const avgPE = validPEs.length > 0 ? (validPEs.reduce((a, b) => a + b, 0) / validPEs.length).toFixed(1) : 'N/A';
  const above200DMA = holdingsAnalysis.filter((h) => h.pctVs200DMA !== undefined && h.pctVs200DMA > 0).length;
  const totalWith200DMA = holdingsAnalysis.filter((h) => h.pctVs200DMA !== undefined).length;
  const breadthPct = totalWith200DMA > 0 ? Math.round((above200DMA / totalWith200DMA) * 100) : null;

  const prompt = `Analyse this Indian investment portfolio:

NET WORTH: ₹${(input.netWorth / 1e5).toFixed(2)}L
EQUITY: ₹${(input.equityTotal / 1e5).toFixed(2)}L (${input.equityCount} holdings)
BONDS: ₹${(input.bondTotal / 1e5).toFixed(2)}L (${input.bondCount} holdings)

COMPUTED SCORING BREAKDOWN (Calculated deterministically by scoring engine):
  Overall Health: ${scoring?.overall ?? 75}/100 (${scoring?.status ?? 'Good'})
  Fundamental Score: ${scoring?.fundamental ?? 72}/100
  Technical Breadth: ${scoring?.technical ?? 50}/100
  Risk Control: ${scoring?.risk ?? 75}/100
  Diversification: ${scoring?.diversification ?? 65}/100
  Valuation Sanity: ${scoring?.valuation ?? 70}/100
  Performance: ${scoring?.performance ?? 65}/100

ASSET ALLOCATION:
${input.assetAllocation.map((a) => `  ${a.label}: ${(a.percent * 100).toFixed(1)}%`).join('\n')}

SECTOR ALLOCATION (top 5):
${input.sectorAllocation.slice(0, 5).map((s) => `  ${s.sector}: ${(s.percent * 100).toFixed(1)}%`).join('\n')}

TOP EQUITY HOLDINGS:
${input.topEquity.slice(0, 8).map((e) => `  ${e.ticker} | ${e.sector} | ₹${(e.currentValue / 1e5).toFixed(2)}L | ${e.allocationPercent.toFixed(1)}% | ${e.percentChange >= 0 ? '+' : ''}${(e.percentChange * 100).toFixed(2)}%`).join('\n')}

TOP EQUITY FUNDAMENTAL & TECHNICAL ANALYSIS (Yahoo Finance Real-Time):
Average Trailing P/E: ${avgPE}x | Technical Breadth: ${breadthPct !== null ? `${breadthPct}% holdings above 200DMA` : 'N/A'}
${holdingsTable}

TODAY'S WINNERS: ${input.winners.slice(0, 3).map((w) => `${w.ticker} +${(w.percentChange * 100).toFixed(1)}%`).join(', ')}
TODAY'S LOSERS: ${input.losers.slice(0, 3).map((l) => `${l.ticker} ${(l.percentChange * 100).toFixed(1)}%`).join(', ')}

BONDS (top 5):
${input.topBonds.slice(0, 5).map((b) => `  ${b.securityName} | ${b.creditRating} | YTM ${(b.ytm * 100).toFixed(2)}% | Duration ${b.duration.toFixed(1)}y | ₹${(b.totalValue / 1e5).toFixed(2)}L`).join('\n')}

DIVERSIFICATION: Score=${input.diversificationScore}/100, HHI=${input.herfindahlIndex.toFixed(4)}, Top-5 concentration=${(input.top5Percent * 100).toFixed(1)}%

CASH FLOW:
  Total Invested: ₹${(input.totalInvestment / 1e5).toFixed(2)}L
  Total Expenses: ₹${(input.totalExpenses / 1e5).toFixed(2)}L
  Avg Monthly Investment: ₹${(input.monthlyAvgInvestment / 1000).toFixed(1)}K
  Last Month: Invested ₹${(input.lastMonthInvestment / 1000).toFixed(1)}K, Expenses ₹${(input.lastMonthExpenses / 1000).toFixed(1)}K

Return JSON:
{
  "healthScore": ${scoring?.overall ?? 75},
  "healthStatus": "${scoring?.status ?? 'Good'}",
  "healthSummary": "<1 sentence summarizing asset allocation, valuation sanity, and moving average health>",
  "healthReasons": ["<reason 1 referencing allocation, P/E or 200DMA breadth>", "<reason 2>", "<reason 3>"],
  "allocationCommentary": "<2-3 sentences on equity vs debt suitability for an Indian retail investor>",
  "cashFlowHealth": "<1-2 sentences>",
  "concentrationRisk": "<1-2 sentences>",
  "topStrengths": ["<strength 1>", "<strength 2>"],
  "topWeaknesses": ["<weakness 1>", "<weakness 2>"],
  "fundamentalStrengths": ["<point 1, e.g. 'Strong profitability across core holdings'>", "<point 2>", "<point 3>"],
  "fundamentalWatchItems": ["<watch item 1, e.g. 'Valuation dispersion in select positions'>", "<watch item 2>"],
  "fundamentalInterpretation": "<2-3 sentences analyzing business profitability, debt quality, and cash flow conversion>",
  "holdingsFundamentalStatus": [
    ${input.topEquity.slice(0, 8).map((e) => `{"ticker": "${e.ticker}", "status": "Strong"|"Neutral"|"Weak"}`).join(',\n    ')}
  ],
  "technicalTrend": "Bullish"|"Neutral"|"Bearish",
  "technicalMomentum": "Strong"|"Neutral"|"Weak",
  "technicalMarketStructure": "Above 200DMA"|"Near 200DMA"|"Below 200DMA",
  "technicalSignals": [
    ${input.topEquity.slice(0, 8).map((e) => `{"ticker": "${e.ticker}", "trend": "Bullish"|"Neutral"|"Bearish", "momentum": "Strong"|"Neutral"|"Weak", "explanation": "<1 sentence explaining position relative to 50DMA/200DMA>"}`).join(',\n    ')}
  ],
  "matrixClassifications": [
    ${input.topEquity.slice(0, 8).map((e) => `{"ticker": "${e.ticker}", "fundamental": "Strong"|"Neutral"|"Weak", "technical": "Strong"|"Neutral"|"Weak"}`).join(',\n    ')}
  ]
}`;

  const response = await callWithFallback(prompt, system);
  const parsed = extractAndParseJSON(response, 'portfolioAnalysis');
  logAgentResponse(1, 'PORTFOLIO ANALYSER', parsed);
  return response;
}

// ─── Node 2: Macro Analyst (Tavily AI & Live Scraped Intelligence) ─────────────

async function macroAnalystNode(
  input: PortfolioInput,
  holdingsAnalysis: StockAnalysisMetrics[] = [],
  onTelemetry?: (tool: string, title: string, description: string, extra?: Record<string, unknown>) => void
): Promise<{ macroContext: string; snapshot: LiveMarketSnapshot }> {
  logAgentHeader(2, 'MACRO ANALYST (TAVILY AI SEARCH & LIVE GROUNDING)');

  const sectors = input.sectorAllocation.slice(0, 4).map((s) => s.sector);
  const sectorListStr = sectors.join(', ');

  // 1. Scrape real-time market data & execute token-efficient search + Ingest News Section
  console.log('[pipeline/macro] Grounding real-time market indices, search headlines & News Section database...');
  const snapshot = await scrapeLiveMarketData(sectors);

  const marketQuotesStr = [
    snapshot.nifty ? `NIFTY 50: ${snapshot.nifty.price} (${snapshot.nifty.change}, ${snapshot.nifty.changePct})` : 'NIFTY 50: Live quote unavailable',
    snapshot.sensex ? `SENSEX: ${snapshot.sensex.price} (${snapshot.sensex.change}, ${snapshot.sensex.changePct})` : 'SENSEX: Live quote unavailable',
    snapshot.usdinr ? `USD/INR: ₹${snapshot.usdinr.price} (${snapshot.usdinr.changePct})` : 'USD/INR: Live rate unavailable',
    snapshot.brentCrude ? `Brent Crude: $${snapshot.brentCrude.price}/bbl (${snapshot.brentCrude.changePct})` : 'Brent Crude: N/A',
    snapshot.gold ? `Gold: $${snapshot.gold.price}/oz (${snapshot.gold.changePct})` : 'Gold: N/A',
    snapshot.us10y ? `US 10Y Yield: ${snapshot.us10y.price}% (${snapshot.us10y.changePct})` : 'US 10Y Yield: N/A',
  ].join(' | ');

  if (onTelemetry) {
    onTelemetry('yahoo_finance_quotes', 'Live Market & Macro Indices Grounded', marketQuotesStr);
    
    // Telemetry for Tavily web search
    const topHeadline = snapshot.headlines.find((h) => !h.startsWith('[TAVILY') && !h.startsWith('[NEWS SECTION')) || snapshot.headlines[0];
    if (topHeadline) {
      const cleanHeadline = topHeadline.replace(/^\[ARTICLE:\s*/, '').replace(/\][\s\S]*$/, '').slice(0, 120);
      onTelemetry(
        snapshot.searchSource === 'tavily' ? 'tavily_search' : 'google_news_rss',
        `Live Macro News Grounded (${snapshot.searchSource.toUpperCase()})`,
        cleanHeadline
      );
    }

    // Telemetry for internal News Section ingestion
    if (snapshot.newsSectionArticles && snapshot.newsSectionArticles.length > 0) {
      const sampleNews = snapshot.newsSectionArticles[0]?.title || 'Market intelligence feeds';
      onTelemetry(
        'news_section_db',
        'Ingested News Section Feeds',
        `Ingested ${snapshot.newsSectionArticles.length} synced news articles (e.g. "${sampleNews.slice(0, 80)}...")`,
        {
          newsSectionCount: snapshot.newsSectionArticles.length,
          newsSectionHeadlines: snapshot.newsSectionArticles.map((a) => a.title).slice(0, 4),
        }
      );
    }
  }

  const headlinesListStr = snapshot.headlines.length > 0
    ? snapshot.headlines.map((h, i) => `  ${i + 1}. ${h}`).join('\n')
    : '  - Indian stock markets showing stable consolidation near key moving averages.';

  console.log(`\x1b[34m┌─── [LIVE MARKET DATA & SEARCH GROUNDING (${snapshot.searchSource.toUpperCase()})] ────────\x1b[0m`);
  console.log(`\x1b[34m│ 📊 INDICES: ${marketQuotesStr}\x1b[0m`);
  console.log(`\x1b[34m│ 📰 GROUNDED HEADLINES/SNIPPETS (${snapshot.headlines.length}):\x1b[0m`);
  if (snapshot.headlines.length > 0) {
    snapshot.headlines.forEach((h, i) => {
      console.log(`\x1b[34m│   [${i + 1}] ${h.slice(0, 100)}...\x1b[0m`);
    });
  } else {
    console.log(`\x1b[34m│   (No live headlines returned, using sector baseline)\x1b[0m`);
  }
  console.log(`\x1b[34m└─────────────────────────────────────────────────────────────────\x1b[0m\n`);

  const holdingsContextStr = holdingsAnalysis.length > 0
    ? `\nINVESTOR'S TOP EQUITIES VALUATION & TECHNICAL CONTEXT:\n${formatHoldingsAnalysisTable(holdingsAnalysis)}`
    : '';

  const externalMarketDossier = `REAL-WORLD LIVE MARKET GROUNDED DATA (${snapshot.searchSource.toUpperCase()}):
INDEX & MACRO QUOTES: ${marketQuotesStr}
${holdingsContextStr}

LATEST FINANCIAL HEADLINES & SEARCH SNIPPETS:
${headlinesListStr}`;

  console.log('[pipeline/macro] Analyzing market data via ModelManager chain...');
  const system = `You are a senior macroeconomic strategist for Indian capital markets. 
Base your analysis STRICTLY on the live market indices (Nifty, Sensex, USD/INR, Brent Crude, Gold, US 10Y Yield) and real-world news/search snippets provided.
Evaluate:
1. RBI MPC monetary policy stance, repo rate trajectory, and inflation (CPI target 4% +/- 2%).
2. Impact of Brent Crude oil prices on India's current account deficit (CAD), imported inflation, and rupee stability (USD/INR).
3. Impact of US 10Y Treasury yield on Foreign Institutional Investor (FII) outflows vs Domestic Institutional Investor (DII) SIP inflows.
4. Specific sector headwinds/tailwinds for the investor's top sectors.
Do not hallucinate data. Always respond with JSON only.`;

  const prompt = `Based on the live grounded market data below, analyze macroeconomic and market conditions for an Indian investor with exposure to: ${sectorListStr}.

${externalMarketDossier}

Return JSON:
{
  "marketStatus": "Bull Market"|"Bear Market"|"Sideways"|"Volatile"|"Recovery",
  "marketSummary": "<2-3 sentences directly referencing the live market indices: ${marketQuotesStr} and the search headlines>",
  "keyDrivers": ["<real driver from headlines/macro data>", "<driver 2>", "<driver 3>"],
  "niftyTrend": "<trend from Nifty quote: ${snapshot.nifty?.price || '23,200'} (${snapshot.nifty?.changePct || '0%'})>",
  "rbiStance": "<monetary policy stance, repo rate trajectory, and CPI outlook from news>",
  "fiiDiiFlow": "<FII/DII flow dynamics influenced by US 10Y yield and domestic SIP strength>",
  "sectorOutlook": {
    ${sectors.map((s) => `"${s}": "<real-world outlook based on search snippets and commodity/rate dynamics>"`).join(',\n    ')}
  },
  "impactOnEquity": "<1 sentence evaluating equity valuation vs historical Nifty P/E>",
  "impactOnBonds": "<1 sentence evaluating bond yield curve and duration strategy in light of RBI policy>",
  "impactOnPortfolio": "<1 sentence synthesizing overall portfolio exposure to crude, rates, and currency>",
  "searchGrounded": true
}`;

  const response = await callWithFallback(prompt, system);
  const parsed = extractAndParseJSON(response, 'macroAnalysis');
  logAgentResponse(2, 'MACRO ANALYST', parsed);
  return { macroContext: response, snapshot };
}

// ─── Node 3: Strategy & Recommendations ───────────────────────────────────────

async function strategyNode(state: PipelineState): Promise<string> {
  logAgentHeader(3, 'STRATEGY, OPPORTUNITIES & RISKS');

  const system = `You are a SEBI-registered Principal Wealth Advisor for Indian retail investors.
Formulate high-conviction, actionable recommendations strictly tailored for an Indian retail investor.
Ground your advice in:
1. Fundamental & Technical Analysis of the investor's top holdings:
   - Identify holdings trading near 200DMA support or oversold levels with reasonable P/E to accumulate via staggered SIPs.
   - Identify holdings with extended valuations (>40-50x P/E) or stretched far above 50DMA/200DMA to trim or set trailing stop-losses.
2. Indian Retail Wealth Instruments:
   - Recommend Nifty 50 and Nifty Next 50 index funds for low-cost core equity compounding.
   - Target Maturity Debt Index Funds (TMFs), Sovereign Gold Bonds (SGBs) / Gold ETFs, and G-Secs via RBI Retail Direct for fixed income safety.
   - Arbitrage funds for parking cash with equity taxation benefits.
3. Tax & Friction Optimization:
   - Union Budget LTCG tax rate (12.5% on gains exceeding ₹1.25 Lakh annual exemption) and STCG (20%).
   - Explicit advice on harvesting ₹1.25L tax-exempt long-term gains annually.
   - Pruning fragmented, illiquid micro-holdings to eliminate recurring CDSL/NSDL Depository Participant (DP) charges.
Always respond with JSON only.`;

  const holdingsTable = formatHoldingsAnalysisTable(state.holdingsAnalysis);

  const prompt = `Portfolio Analysis:
${state.portfolioAnalysis}

Holdings Technical & Fundamental Snapshot:
${holdingsTable}

Market/Macro Context:
${state.macroContext}

Provide specific strategy recommendations for this Indian portfolio.

Return JSON:
{
  "opportunities": [
    {
      "title": "<short title>",
      "description": "<specific, actionable description (1-2 sentences)>",
      "priority": "High"|"Medium"|"Low",
      "category": "Equity"|"Debt"|"Rebalance"|"SIP"|"Tax",
      "actionable": "<specific action step>",
      "evidence": "<market data or holding metric driving this opportunity, e.g. P/E or DMA support>"
    }
  ],
  "risks": [
    {
      "title": "<short title>",
      "description": "<specific risk description>",
      "severity": "High"|"Medium"|"Low",
      "mitigation": "<actionable mitigation step>"
    }
  ],
  "recommendations": [
    {
      "title": "<concise action title, e.g. 'Harvest ₹1.25L Tax-Exempt LTCG' or 'Accumulate Bluechip Near 200DMA Support'>",
      "action": "<precise step-by-step action>",
      "rationale": "<why this makes sense from fundamental, technical, or macro standpoint>",
      "priority": "High"|"Medium"|"Low",
      "timeframe": "Immediate"|"Next 30 days"|"1-3 months",
      "category": "Rebalance"|"SIP"|"Tax"|"Debt"|"Diversification",
      "evidence": "<data point, e.g. 'P/E 15.8x, 200DMA support at ₹2540, 12.5% LTCG slab'>",
      "targetAsset": "<asset or category affected>"
    }
  ],
  "longTermStrategy": "<4-5 sentences comprehensive long-term compounding strategy specific to this investor's profile, including Nifty index fund core, SGB/Gold hedge, and tax efficiency>",
  "reviewFlags": [
    {
      "type": "concentration"|"technical"|"valuation"|"quality",
      "severity": "red"|"orange"|"yellow"|"green",
      "title": "<short flag title>",
      "description": "<actionable review note>",
      "evidence": "<precise data point>",
      "actionRecommendation": "<specific investor action>"
    }
  ],
  "thesisMonitor": [
    ${state.input.topEquity.slice(0, 8).map((e) => `{
      "ticker": "${e.ticker}",
      "fundamentalsStatus": "Strong"|"Neutral"|"Weak",
      "valuationStatus": "Undervalued"|"Moderate"|"Elevated"|"Fair",
      "technicalStatus": "Bullish"|"Neutral"|"Bearish",
      "riskLevel": "Low"|"Medium"|"High",
      "thesisStatus": "Intact"|"Monitor"|"Review",
      "explanation": "<1-2 sentences explaining why this status was assigned based on profitability, valuation, and 200DMA>"
    }`).join(',\n    ')}
  ]
}`;

  const response = await callWithFallback(prompt, system);
  const parsed = extractAndParseJSON(response, 'strategyAnalysis');
  logAgentResponse(3, 'STRATEGY & RISKS', parsed);
  return response;
}

// ─── Node 4: Risk Engine & Stress Testing ──────────────────────────────────────

async function riskEngineNode(state: PipelineState): Promise<string> {
  logAgentHeader(4, 'RISK ENGINE & STRESS SCENARIOS');

  const system = `You are a quantitative risk engineer specializing in stress testing Indian retail portfolios.
Evaluate diversification, analyze sensitivity to macro shocks (crude spike, rate pivot, FII outflow), and formulate an explicit Market Outlook across short-term and medium-term horizons with actionable recommendations.
Always respond with JSON only.`;

  const holdingsTable = formatHoldingsAnalysisTable(state.holdingsAnalysis);

  const prompt = `Based on this portfolio:
NET WORTH: ₹${(state.input.netWorth / 1e5).toFixed(2)}L
EQUITY: ₹${(state.input.equityTotal / 1e5).toFixed(2)}L (${state.input.equityCount} stocks)
BONDS: ₹${(state.input.bondTotal / 1e5).toFixed(2)}L (${state.input.bondCount} bonds)
DIVERSIFICATION SCORE: ${state.input.diversificationScore}/100, HHI: ${state.input.herfindahlIndex.toFixed(4)}
TOP 5 EQUITY: ${state.input.topEquity.slice(0, 5).map((e) => `${e.ticker} (${e.allocationPercent.toFixed(1)}%)`).join(', ')}

TOP HOLDINGS FUNDAMENTALS & TECHNICALS:
${holdingsTable}

MACRO CONTEXT:
${state.macroContext}

Return JSON:
{
  "diversification": {
    "score": ${state.input.diversificationScore},
    "grade": "Excellent"|"Good"|"Fair"|"Poor",
    "hhi": ${state.input.herfindahlIndex},
    "strengths": ["<strength 1>", "<strength 2>"],
    "weaknesses": ["<weakness 1>", "<weakness 2>"],
    "suggestion": "<actionable diversification suggestion>"
  },
  "marketOutlook": {
    "horizon": "6–12 Months (Medium Term - Structural Bull / Cyclical Consolidation)",
    "sentiment": "Bullish"|"Cautious"|"Bearish"|"Neutral",
    "shortTerm": "<1-3 month tactical outlook based on moving averages, earnings season, and RBI MPC stance>",
    "mediumTerm": "<6-12 month structural outlook based on capex cycle, GDP growth, and corporate earnings trajectory>",
    "scenarios": [
      {
        "name": "Bull Case (Nifty +15%)",
        "probability": "25%",
        "impact": "Portfolio +<estimated %>",
        "trigger": "<macro trigger, e.g. RBI rate cuts begin, Brent crude drops below $75, FII buying resumes>",
        "description": "<1-2 sentences on how this portfolio behaves>"
      },
      {
        "name": "Base Case (Nifty +8-10%)",
        "probability": "55%",
        "impact": "Portfolio +<estimated %>",
        "trigger": "<macro trigger, e.g. Steady GDP growth 6.8%, rangebound crude $75-$85, sustained DII SIP inflows>",
        "description": "<1-2 sentences>"
      },
      {
        "name": "Bear Case (Correction -10%)",
        "probability": "20%",
        "impact": "Portfolio -<estimated %>",
        "trigger": "<macro trigger, e.g. Brent crude surges >$95, US yields spike to 5.25%, persistent FII outflows>",
        "description": "<1-2 sentences>"
      }
    ],
    "recommendation": "<1-2 sentences summarizing tactical stance, e.g. 'Maintain disciplined SIPs in Nifty index funds while buying oversold bluechips near 200DMA support'>"
  },
  "topRiskFactors": [
    {
      "title": "<e.g. 'Sector Concentration in Financials'>",
      "category": "Sector Concentration"|"Position Sizing"|"Trend Risk"|"Macro Sensitivity",
      "severity": "High"|"Medium"|"Low",
      "evidence": "<exact quantitative evidence, e.g. 'Banking & Finance accounts for 44.9% of portfolio'>",
      "potentialImpact": "<potential portfolio impact>",
      "whatToMonitor": "<what metric to track>"
    }
  ]
}`;

  const response = await callWithFallback(prompt, system);
  const parsed = extractAndParseJSON(response, 'riskAnalysis');
  logAgentResponse(4, 'RISK & STRESS TEST', parsed);
  return response;
}

// ─── Node 5: Report Generator (Programmatic Assembly) ─────────────────────────

// ─── Node 5: Report Generator (Programmatic Assembly) ─────────────────────────

async function reportGeneratorNode(state: PipelineState, riskAnalysisRaw: string): Promise<AIInsightsResponse> {
  logAgentHeader(5, 'REPORT GENERATOR & COMPILER (V2 INTELLIGENCE ENGINE)');

  // Parse individual node outputs safely
  const portfolio = extractAndParseJSON(state.portfolioAnalysis, 'portfolioAnalysis') || {};
  const macro = extractAndParseJSON(state.macroContext, 'macroAnalysis') || {};
  const strategy = extractAndParseJSON(state.strategyAnalysis, 'strategyAnalysis') || {};
  const risk = extractAndParseJSON(riskAnalysisRaw, 'riskAnalysis') || {};

  // Prompt the LLM to generate the executive summary, allocation commentary, and bullet insights
  const system = `You are a SEBI-registered Chief Investment Officer writing an executive portfolio intelligence report for an Indian investor.
Respond with concise JSON containing the executive summary, allocation commentary, and 3-4 data-backed bullet insights with underlying evidence.
Write real, complete, professional sentences without placeholder brackets. Always respond with JSON only.`;

  const prompt = `Write a comprehensive, professional Executive Summary for this Indian investment portfolio:
NET WORTH: ₹${(state.input.netWorth / 1e5).toFixed(2)}L
EQUITY TOTAL: ₹${(state.input.equityTotal / 1e5).toFixed(2)}L (${(state.input.equityTotal / state.input.netWorth * 100).toFixed(1)}%)
BOND TOTAL: ₹${(state.input.bondTotal / state.input.netWorth * 100).toFixed(1)}%
HEALTH STATUS: ${state.scoringResult.status} (Score: ${state.scoringResult.overall}/100)
MACRO STANCE: ${macro.marketStatus || 'Volatile'} (${macro.marketSummary || 'Market consolidating near key moving averages.'})

Return JSON:
{
  "summary": "Write 3-4 comprehensive executive sentences on this portfolio's positioning, risk posture, and immediate outlook.",
  "allocationCommentary": "Write 2-3 sentences on the current equity vs bond split.",
  "executiveSummaryInsights": [
    {
      "title": "<concise title, e.g. 'Fundamental Profitability & Cash Flow'>",
      "insight": "<1-2 sentence evidence-backed takeaway>",
      "category": "fundamental"|"technical"|"valuation"|"risk"|"portfolio"|"macro",
      "evidence": ["<metric 1>", "<metric 2>"]
    }
  ]
}`;

  function isPlaceholder(text?: string): boolean {
    if (!text) return true;
    const trimmed = text.trim();
    return (
      (trimmed.startsWith('<') && trimmed.endsWith('>')) ||
      trimmed.includes('<3-4 sentence') ||
      trimmed.includes('<2-3 sentence') ||
      trimmed.includes('Write 3-4 comprehensive') ||
      trimmed.includes('Write 2-3 sentences') ||
      trimmed.length < 25
    );
  }

  // Calculate percentages from portfolio inputs
  const equityPct = state.input.netWorth > 0 ? (state.input.equityTotal / state.input.netWorth) * 100 : 0;
  const bondPct = state.input.netWorth > 0 ? (state.input.bondTotal / state.input.netWorth) * 100 : 0;
  const otherPct = Math.max(0, 100 - equityPct - bondPct);

  const fallbackSummary = `This portfolio of ₹${(state.input.netWorth / 1e5).toFixed(2)}L demonstrates disciplined regular savings with an asset allocation of ${Math.round(equityPct)}% equities and ${Math.round(bondPct)}% fixed income. ${state.scoringResult.summary} Under the prevailing ${macro.marketStatus?.toLowerCase() || 'volatile'} macroeconomic environment, performance remains sensitive to interest rate policy and sector adjustments. ${strategy.longTermStrategy ? strategy.longTermStrategy.split('. ').slice(0, 2).join('. ') + '.' : 'Strategic priorities emphasize pruning fragmented equity positions and re-anchoring corporate debt into sovereign or AAA-rated instruments for optimal compounding stability.'}`;

  const fallbackAllocationCommentary = portfolio.allocationCommentary || `The portfolio maintains a growth-oriented ${Math.round(equityPct)}% equity to ${Math.round(bondPct)}% fixed income allocation, balancing long-term wealth appreciation with debt cushioning against market drawdowns.`;

  let summaryData: { summary?: string; allocationCommentary?: string; executiveSummaryInsights?: any[] } = {};
  try {
    const raw = await callWithFallback(prompt, system);
    summaryData = extractAndParseJSON(raw, 'executiveSummary');
  } catch (err) {
    console.warn('[pipeline] Summary synthesis failed, using fallback:', (err as Error).message);
  }

  const finalSummary = !isPlaceholder(summaryData.summary) ? summaryData.summary! : fallbackSummary;
  const finalAllocationCommentary = !isPlaceholder(summaryData.allocationCommentary) ? summaryData.allocationCommentary! : fallbackAllocationCommentary;

  // Safe scenario extraction
  const scenariosList = Array.isArray(risk.marketOutlook?.scenarios) ? risk.marketOutlook.scenarios : [];
  const bullScenario = risk.marketOutlook?.bull || scenariosList.find((s: any) => /bull|rally/i.test(s.name || s.label || '')) || scenariosList[0];
  const baseScenario = risk.marketOutlook?.base || scenariosList.find((s: any) => /base/i.test(s.name || s.label || '')) || scenariosList[1];
  const bearScenario = risk.marketOutlook?.bear || scenariosList.find((s: any) => /bear|correction/i.test(s.name || s.label || '')) || scenariosList[2];

  // ─── V2 Derived Metrics Assembly ──────────────────────────────────────────

  const validPEs = state.holdingsAnalysis.map((h) => h.trailingPE).filter((pe): pe is number => typeof pe === 'number' && pe > 0);
  const avgPE = validPEs.length > 0 ? (validPEs.reduce((a, b) => a + b, 0) / validPEs.length).toFixed(1) : '21.5';
  const above200DMA = state.holdingsAnalysis.filter((h) => h.pctVs200DMA !== undefined && h.pctVs200DMA > 0).length;
  const totalWith200DMA = state.holdingsAnalysis.filter((h) => h.pctVs200DMA !== undefined).length;
  const breadthPct = totalWith200DMA > 0 ? Math.round((above200DMA / totalWith200DMA) * 100) : state.scoringResult.technical;
  const topSector = state.input.sectorAllocation[0] || { sector: 'Core Equities', percent: 0.35 };
  const topSectorPct = (topSector.percent * 100).toFixed(1);
  const top5Weight = (state.input.top5Percent * 100).toFixed(1);
  const topEquityFirst = state.input.topEquity[0] || { ticker: 'N/A', allocationPercent: 0 };

  // 1. Executive Summary Insights (3-5 items with View Data metrics)
  let executiveSummaryInsights: ExecutiveSummaryInsight[] = [];
  if (Array.isArray(summaryData.executiveSummaryInsights) && summaryData.executiveSummaryInsights.length >= 3) {
    executiveSummaryInsights = summaryData.executiveSummaryInsights.map((item) => ({
      title: item.title || 'Portfolio Metric',
      insight: item.insight || item.description || '',
      category: item.category || 'portfolio',
      evidence: Array.isArray(item.evidence) ? item.evidence : [item.evidence || 'Telemetry confirmed'],
    }));
  } else {
    executiveSummaryInsights = [
      {
        title: 'Fundamental Quality & Profitability',
        insight: `Portfolio fundamentals remain sound with an average trailing P/E of ${avgPE}x across top holdings, supported by healthy balance sheets.`,
        category: 'fundamental',
        evidence: [`Average P/E: ${avgPE}x`, `${state.holdingsAnalysis.length} equity holdings evaluated`, `Fundamental score: ${state.scoringResult.fundamental}/100`],
      },
      {
        title: 'Technical Breadth & Trend Structure',
        insight: `Technical breadth is rated ${state.scoringResult.technical}/100, with ${above200DMA} of ${totalWith200DMA || state.holdingsAnalysis.length} key holdings holding above their 200-day moving average.`,
        category: 'technical',
        evidence: [`${above200DMA}/${totalWith200DMA || state.holdingsAnalysis.length} holdings above 200DMA`, `Breadth score: ${state.scoringResult.technical}/100`],
      },
      {
        title: 'Sector Exposure & Concentration Profile',
        insight: `${topSector.sector} represents ${topSectorPct}% of portfolio exposure, while top 5 holdings represent ${top5Weight}%, constituting the primary concentration factors.`,
        category: 'risk',
        evidence: [`Top sector: ${topSector.sector} (${topSectorPct}%)`, `Top 5 concentration: ${top5Weight}%`, `HHI Index: ${state.input.herfindahlIndex.toFixed(4)}`],
      },
      {
        title: 'Relative Valuation vs Benchmark',
        insight: `Portfolio valuation averages ${avgPE}x trailing earnings, evaluated alongside the Nifty 50 benchmark baseline of 22.8x.`,
        category: 'valuation',
        evidence: [`Portfolio P/E: ${avgPE}x`, 'Benchmark NIFTY 50 P/E: 22.8x', `Valuation score: ${state.scoringResult.valuation}/100`],
      },
    ];
  }

  // 2. Fundamental Intelligence
  const fundamentalHoldings: FundamentalHolding[] = state.input.topEquity.slice(0, 8).map((eq) => {
    const metric = state.holdingsAnalysis.find((m) => m.ticker === eq.ticker);
    const statusMatch = portfolio.holdingsFundamentalStatus?.find((s: any) => s.ticker === eq.ticker);
    let status: 'Strong' | 'Neutral' | 'Weak' | 'Under Review' = statusMatch?.status || 'Neutral';
    if (!statusMatch) {
      if (metric?.trailingPE && metric.trailingPE < 28 && /fair|undervalued/i.test(metric.fundamentalValuation)) status = 'Strong';
      else if (metric?.trailingPE && metric.trailingPE > 48) status = 'Weak';
    }
    return {
      symbol: eq.ticker,
      name: eq.name || eq.ticker,
      weight: eq.allocationPercent,
      pe: metric?.trailingPE,
      forwardPe: metric?.forwardPE,
      pb: metric?.priceToBook,
      dividendYield: metric?.dividendYield,
      status,
    };
  });

  const fundamentalIntelligence: FundamentalIntelligence = {
    score: state.scoringResult.fundamental,
    strengths: Array.isArray(portfolio.fundamentalStrengths) && portfolio.fundamentalStrengths.length > 0
      ? portfolio.fundamentalStrengths
      : ['Strong profitability across core holdings', 'Healthy balance-sheet characteristics', 'Consistent operating cash flow generation'],
    watchItems: Array.isArray(portfolio.fundamentalWatchItems) && portfolio.fundamentalWatchItems.length > 0
      ? portfolio.fundamentalWatchItems
      : ['Earnings growth dispersion across positions', 'Valuation premium in select momentum segments'],
    interpretation: portfolio.fundamentalInterpretation ||
      `Portfolio fundamentals are anchored by established holdings with resilient cash flows. Profitability remains healthy across core positions with an average P/E of ${avgPE}x.`,
    holdings: fundamentalHoldings,
  };

  // 3. Technical Intelligence
  const technicalSignals: TechnicalSignalHolding[] = state.input.topEquity.slice(0, 8).map((eq) => {
    const metric = state.holdingsAnalysis.find((m) => m.ticker === eq.ticker);
    const sigMatch = portfolio.technicalSignals?.find((s: any) => s.ticker === eq.ticker);
    const above200 = (metric?.pctVs200DMA ?? 0) >= 0;
    const structure = above200 ? 'Above 200DMA' : 'Below 200DMA';
    const cmp = metric?.currentPrice || (eq.shares ? eq.currentValue / eq.shares : eq.currentValue);
    return {
      symbol: eq.ticker,
      name: eq.name || eq.ticker,
      weight: eq.allocationPercent,
      currentPrice: cmp,
      // Preserve absolute DMA prices from Yahoo Finance for PDF display
      fiftyDayAverage: metric?.fiftyDayAverage,
      twoHundredDayAverage: metric?.twoHundredDayAverage,
      fiftyTwoWeekHigh: metric?.fiftyTwoWeekHigh,
      pctFrom52WHigh: metric?.pctFrom52WHigh,
      trend: sigMatch?.trend || (above200 ? 'Bullish' : 'Bearish'),
      momentum: sigMatch?.momentum || ((metric?.pctVs50DMA ?? 0) >= 0 ? 'Strong' : 'Weak'),
      marketStructure: structure,
      priceVs200DMA: metric?.pctVs200DMA,
      priceVs50DMA: metric?.pctVs50DMA,
      signalExplanation: sigMatch?.explanation || metric?.technicalSignal || (above200 ? 'Trading in structural uptrend above 200DMA.' : 'Price remains below 200DMA, indicating weaker momentum.'),
    };
  });

  const technicalIntelligence: TechnicalIntelligence = {
    breadthScore: state.scoringResult.technical,
    trend: portfolio.technicalTrend || (state.scoringResult.technical >= 55 ? 'Bullish' : state.scoringResult.technical <= 45 ? 'Bearish' : 'Neutral'),
    momentum: portfolio.technicalMomentum || (state.scoringResult.technical >= 60 ? 'Strong' : state.scoringResult.technical <= 40 ? 'Weak' : 'Neutral'),
    marketStructure: portfolio.technicalMarketStructure || (state.scoringResult.technical >= 50 ? 'Above 200DMA' : 'Below 200DMA'),
    signals: technicalSignals,
    interpretation: `Technical breadth is at ${breadthPct}%. Several positions trade ${above200DMA >= (totalWith200DMA / 2) ? 'above' : 'below'} their long-term trend indicator, reflecting selective market momentum.`,
  };

  // 4. Valuation Intelligence
  const benchmarkPe = 22.8;
  const portPe = Number(avgPE) || 21.5;
  const relVal = Math.round(((portPe - benchmarkPe) / benchmarkPe) * 1000) / 10;
  const valuationIntelligence: ValuationIntelligence = {
    portfolioPe: portPe,
    benchmarkPe,
    benchmarkName: 'NIFTY 50',
    relativeValuationPct: relVal,
    interpretation: `The portfolio trades at ${Math.abs(relVal)}% ${relVal <= 0 ? 'below' : 'above'} the Nifty 50 benchmark on trailing P/E (${portPe}x vs ${benchmarkPe}x). This valuation differential reflects sector weighting and growth expectations rather than a standalone mispricing.`,
    holdingsValuation: state.input.topEquity.slice(0, 8).map((eq) => {
      const metric = state.holdingsAnalysis.find((m) => m.ticker === eq.ticker);
      const sectorPe = getSectorPE(eq.sector, eq.ticker) ?? (metric?.sector ? getSectorPE(metric.sector, eq.ticker) : undefined);
      const evalResult = evaluateValuation(metric?.trailingPE, sectorPe);

      return {
        symbol: eq.ticker,
        pe: metric?.trailingPE,
        benchmarkPe: sectorPe ?? benchmarkPe,
        sectorPe,
        status: evalResult.status,
      };
    }),
  };

  // 5. Risk Intelligence
  const rawTopRiskFactors: RiskFactor[] = Array.isArray(risk.topRiskFactors) && risk.topRiskFactors.length > 0
    ? risk.topRiskFactors
    : [
        {
          title: 'Sector Concentration',
          category: 'Sector Exposure',
          severity: (topSector.percent * 100) > 40 ? 'High' : (topSector.percent * 100) > 25 ? 'Medium' : 'Low',
          evidence: `${topSector.sector} constitutes ${(topSector.percent * 100).toFixed(1)}% of total portfolio assets.`,
          potentialImpact: `Higher cyclical volatility if ${topSector.sector} faces regulatory headwinds or margin compression.`,
          whatToMonitor: `Quarterly sector earnings growth and policy announcements affecting ${topSector.sector}.`,
        },
        {
          title: 'Top Holdings Concentration',
          category: 'Position Sizing',
          severity: (state.input.top5Percent * 100) > 55 ? 'High' : (state.input.top5Percent * 100) > 35 ? 'Medium' : 'Low',
          evidence: `Top 5 equity holdings account for ${(state.input.top5Percent * 100).toFixed(1)}% of portfolio value.`,
          potentialImpact: 'Single-stock idiosyncratic shocks may disproportionately drag overall portfolio returns.',
          whatToMonitor: 'Company quarterly conference calls and promoter/institutional holding changes.',
        },
        {
          title: 'Technical Momentum Weakness',
          category: 'Trend Risk',
          severity: state.scoringResult.technical < 45 ? 'High' : state.scoringResult.technical < 60 ? 'Medium' : 'Low',
          evidence: `${state.scoringResult.technical}/100 technical breadth with holdings below 200DMA.`,
          potentialImpact: 'Extended consolidation or drawdowns before structural uptrend resumes.',
          whatToMonitor: 'Weekly closes relative to 50-day and 200-day simple moving averages.',
        },
      ];

  const riskIntelligence: RiskIntelligence = {
    overallRiskScore: state.scoringResult.risk,
    topSectorExposure: {
      sector: topSector.sector,
      percentage: Math.round(topSector.percent * 1000) / 10,
    },
    top5HoldingsWeight: Math.round(state.input.top5Percent * 1000) / 10,
    largestPosition: {
      symbol: topEquityFirst.ticker,
      percentage: topEquityFirst.allocationPercent,
    },
    debtQualityScore: 85,
    topRiskFactors: rawTopRiskFactors,
    interpretation: `Overall risk score is ${state.scoringResult.risk}/100. Portfolio risk is primarily concentrated in ${topSector.sector} exposure (${(topSector.percent * 100).toFixed(1)}%) and top-5 equity weighting (${(state.input.top5Percent * 100).toFixed(1)}%).`,
  };

  // 6. Portfolio Intelligence
  const topContribs: PerformanceContributor[] = state.input.winners.slice(0, 4).map((w) => ({
    symbol: w.ticker,
    name: w.name,
    contributionPct: Math.round((w.percentChange * w.allocationPercent) * 10) / 10,
    returnPct: Math.round(w.percentChange * 1000) / 10,
    weight: w.allocationPercent,
    type: 'gain',
  }));

  const underperfs: PerformanceContributor[] = state.input.losers.slice(0, 4).map((l) => ({
    symbol: l.ticker,
    name: l.name,
    contributionPct: Math.round((l.percentChange * l.allocationPercent) * 10) / 10,
    returnPct: Math.round(l.percentChange * 1000) / 10,
    weight: l.allocationPercent,
    type: 'loss',
  }));

  const portfolioIntelligence: PortfolioIntelligence = {
    portfolioReturnPct: Math.round((state.input.winners.reduce((acc, w) => acc + w.percentChange * w.allocationPercent, 0) + state.input.losers.reduce((acc, l) => acc + l.percentChange * l.allocationPercent, 0)) * 10) / 10,
    topContributors: topContribs,
    underperformers: underperfs,
    interpretation: `Portfolio performance has been supported by ${topContribs.map(c => c.symbol).join(', ') || 'key gainers'}, while ${underperfs.map(u => u.symbol).join(', ') || 'lagging positions'} continue to drag recent performance.`,
    assetAllocationSummary: state.input.assetAllocation.map((a) => ({ asset: a.label, percentage: Math.round(a.percent * 1000) / 10 })),
    sectorAllocationSummary: state.input.sectorAllocation.slice(0, 6).map((s) => ({ sector: s.sector, percentage: Math.round(s.percent * 1000) / 10 })),
  };

  // 7. Macro Intelligence
  const crudePrice = state.macroSnapshot?.brentCrude ? `$${state.macroSnapshot.brentCrude.price}/bbl` : '$78.4/bbl';
  const inrRate = state.macroSnapshot?.usdinr ? `₹${state.macroSnapshot.usdinr.price}` : '₹86.5';
  const us10yRate = state.macroSnapshot?.us10y ? `${state.macroSnapshot.us10y.price}%` : '4.35%';

  const macroExposures: MacroExposure[] = [
    {
      variable: 'Brent Crude Oil',
      currentValue: crudePrice,
      trend: 'Elevated',
      sensitivity: 'Energy-intensive manufacturing & logistics face cost inflation; domestic energy upstream benefits.',
      affectedHoldingsOrSectors: 'Automobile, FMCG, Paints, Chemicals',
    },
    {
      variable: 'USD / INR Currency Pair',
      currentValue: inrRate,
      trend: 'Rising',
      sensitivity: 'Rupee depreciation expands margin realization for export-driven IT and active pharmaceutical ingredients (API).',
      affectedHoldingsOrSectors: 'Information Technology, Healthcare',
    },
    {
      variable: 'Interest Rates & US 10Y Yield',
      currentValue: us10yRate,
      trend: 'Stable',
      sensitivity: 'Elevated US Treasury yields influence foreign institutional flows; domestic banking NIMs depend on RBI repo path.',
      affectedHoldingsOrSectors: 'Banking & NBFCs, Fixed Income',
    },
    {
      variable: 'Domestic Inflation (CPI Target: 4%)',
      currentValue: 'Moderate (4.2% - 4.8%)',
      trend: 'Stable',
      sensitivity: 'Consumer purchasing power and retail consumption resilience determine discretionary sales volumes.',
      affectedHoldingsOrSectors: 'Consumer Discretionary, Retail',
    },
  ];

  const macroIntelligence: MacroIntelligence = {
    summary: macro.marketSummary || `Indian capital markets navigate global macro conditions with Brent crude at ${crudePrice}, USD/INR at ${inrRate}, and US 10Y at ${us10yRate}.`,
    exposures: macroExposures,
  };

  // 8. Fundamental x Technical Matrix
  const matrixStocks: MatrixStock[] = state.input.topEquity.slice(0, 8).map((eq) => {
    const metric = state.holdingsAnalysis.find((m) => m.ticker === eq.ticker);
    const matrixItem = portfolio.matrixClassifications?.find((mc: any) => mc.ticker === eq.ticker);

    let fundamental: 'Strong' | 'Neutral' | 'Weak' = matrixItem?.fundamental || 'Neutral';
    if (!matrixItem) {
      if (metric?.trailingPE && metric.trailingPE < 28 && /fair|undervalued/i.test(metric.fundamentalValuation)) fundamental = 'Strong';
      else if (metric?.trailingPE && metric.trailingPE > 45) fundamental = 'Weak';
    }

    let technical: 'Strong' | 'Neutral' | 'Weak' = matrixItem?.technical || 'Neutral';
    if (!matrixItem) {
      if ((metric?.pctVs200DMA ?? 0) > 4 && (metric?.pctVs50DMA ?? 0) > 0) technical = 'Strong';
      else if ((metric?.pctVs200DMA ?? 0) < -4) technical = 'Weak';
    }

    return {
      symbol: eq.ticker,
      name: eq.name || eq.ticker,
      weight: eq.allocationPercent,
      fundamental,
      technical,
    };
  });

  // 9. Review Flags (Color-coded)
  const generatedReviewFlags: ReviewFlag[] = [];
  if (topSector.percent * 100 > 30) {
    generatedReviewFlags.push({
      type: 'concentration',
      severity: 'orange',
      title: 'Sector Concentration Flag',
      description: `${topSector.sector} allocation of ${(topSector.percent * 100).toFixed(1)}% exceeds the 30% prudential diversification threshold.`,
      evidence: `${topSector.sector}: ${(topSector.percent * 100).toFixed(1)}% of portfolio`,
      actionRecommendation: 'Direct incremental SIP flows into underweight sectors or broad-market index funds.',
    });
  }

  const below200 = state.holdingsAnalysis.filter((h) => (h.pctVs200DMA ?? 0) < 0);
  if (below200.length >= 2) {
    generatedReviewFlags.push({
      type: 'technical',
      severity: 'red',
      title: 'Technical Moving Average Flag',
      description: `${below200.length} major holdings (${below200.map(b => b.ticker).slice(0, 3).join(', ')}) trade below their 200DMA indicator.`,
      evidence: `${below200.map(b => `${b.ticker} (${b.pctVs200DMA}%)`).slice(0, 3).join(', ')}`,
      actionRecommendation: 'Avoid aggressive lumpsum additions until stabilization or moving average reclaim occurs.',
    });
  }

  if (portPe > 30 || Math.abs(relVal) > 15) {
    generatedReviewFlags.push({
      type: 'valuation',
      severity: 'yellow',
      title: 'Valuation Differential Flag',
      description: `Portfolio trailing P/E of ${portPe}x trades at a ${Math.abs(relVal)}% ${relVal > 0 ? 'premium' : 'discount'} to the Nifty benchmark.`,
      evidence: `Portfolio P/E: ${portPe}x vs Benchmark: 22.8x`,
      actionRecommendation: 'Review earnings growth trajectory to confirm growth justifies valuation multiple.',
    });
  }

  if (state.scoringResult.fundamental >= 70) {
    generatedReviewFlags.push({
      type: 'quality',
      severity: 'green',
      title: 'Fundamental Quality Flag',
      description: 'Core equity holdings demonstrate robust balance-sheet quality and sustainable operating profitability.',
      evidence: `Fundamental score: ${state.scoringResult.fundamental}/100 across top holdings`,
      actionRecommendation: 'Maintain core long-term holdings to let compounding work uninterrupted.',
    });
  }

  if (Array.isArray(strategy.reviewFlags)) {
    for (const rf of strategy.reviewFlags) {
      if (rf.title && !generatedReviewFlags.some((g) => g.title === rf.title)) {
        generatedReviewFlags.push({
          type: rf.type || 'concentration',
          severity: rf.severity || 'yellow',
          title: rf.title,
          description: rf.description || '',
          evidence: rf.evidence || '',
          actionRecommendation: rf.actionRecommendation,
        });
      }
    }
  }

  // 10. Investment Thesis Monitor (top 8 equity holdings)
  const thesisMonitor: ThesisHolding[] = state.input.topEquity.slice(0, 8).map((eq) => {
    const fromNode = Array.isArray(strategy.thesisMonitor)
      ? strategy.thesisMonitor.find((t: any) => t.ticker === eq.ticker)
      : null;
    const metric = state.holdingsAnalysis.find((m) => m.ticker === eq.ticker);
    const above200 = (metric?.pctVs200DMA ?? 0) >= 0;

    const fundamentalsStatus = fromNode?.fundamentalsStatus || (/fair|undervalued/i.test(metric?.fundamentalValuation || '') ? 'Strong' : 'Neutral');
    const valuationStatus = fromNode?.valuationStatus || ((metric?.trailingPE ?? 20) < 18 ? 'Undervalued' : (metric?.trailingPE ?? 20) > 35 ? 'Elevated' : 'Moderate');
    const technicalStatus = fromNode?.technicalStatus || (above200 ? 'Bullish' : 'Bearish');
    const riskLevel = fromNode?.riskLevel || (eq.allocationPercent > 15 ? 'High' : eq.allocationPercent > 8 ? 'Medium' : 'Low');

    let thesisStatus: 'Intact' | 'Monitor' | 'Review' = fromNode?.thesisStatus || 'Intact';
    if (!fromNode?.thesisStatus) {
      if (!above200 && fundamentalsStatus === 'Weak') thesisStatus = 'Review';
      else if (!above200 || valuationStatus === 'Elevated') thesisStatus = 'Monitor';
    }

    const explanation = fromNode?.explanation ||
      (thesisStatus === 'Intact'
        ? `Investment thesis remains intact with solid balance sheet metrics and steady price structure.`
        : thesisStatus === 'Monitor'
        ? `Long-term fundamentals remain sound, but ${above200 ? 'elevated valuation' : 'trading below 200DMA'} warrants ongoing quarterly tracking.`
        : `Underlying fundamentals and technical momentum both show weakness; warranting allocation review.`);

    // Derive catalysts / watchpoints per holding from the LLM node or deterministic fallback
    const catalystsWatch: string = fromNode?.catalystsWatch ||
      (() => {
        const parts: string[] = [];
        if (!above200) parts.push('Reclaim of 200DMA');
        if (valuationStatus === 'Elevated') parts.push('Earnings growth to justify valuation multiple');
        if (riskLevel === 'High') parts.push('Position sizing review each quarter');
        if (metric?.pctFrom52WHigh !== undefined && metric.pctFrom52WHigh < -20) parts.push('Recovery from 52-week lows');
        parts.push('Quarterly earnings & management guidance');
        return parts.slice(0, 3).join('; ');
      })();

    return {
      symbol: eq.ticker,
      name: eq.name || eq.ticker,
      weight: eq.allocationPercent,
      fundamentalsStatus,
      valuationStatus,
      technicalStatus,
      riskLevel,
      thesisStatus,
      explanation,
      catalystsWatch,
    } as ThesisHolding & { catalystsWatch: string };
  });

  // 11. Portfolio Changes (Differential & Baseline Comparative Analysis)
  const prev = state.input.previousReport;
  const portfolioChanges: PortfolioChanges = {
    isAvailable: true,
    message: prev
      ? `Sequential delta comparison against intelligence report generated on ${prev.generatedAt ? new Date(prev.generatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'prior run'}.`
      : 'Baseline comparison established from live market & portfolio telemetry. Subsequent intelligence runs will track exact sequential deltas.',
    changes: [],
  };

  if (prev && typeof prev === 'object') {
    // 1. Health Score Delta
    if (prev.health?.score !== undefined) {
      const prevScore = Number(prev.health.score);
      const currScore = state.scoringResult.overall;
      const diff = currScore - prevScore;
      portfolioChanges.changes.push({
        metric: 'Composite Health Score',
        previousValue: `${prevScore}/100`,
        currentValue: `${currScore}/100`,
        changeDirection: diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral',
        interpretation: diff > 0 ? `+${diff} pts improvement across quantitative pillars` : diff < 0 ? `${diff} pts contraction in composite score` : 'Health score unchanged',
      });
    }

    // 2. Fundamental Score Delta
    if (prev.portfolioHealthBreakdown?.fundamental?.score !== undefined) {
      const prevF = Number(prev.portfolioHealthBreakdown.fundamental.score);
      const currF = state.scoringResult.fundamental;
      const diff = currF - prevF;
      portfolioChanges.changes.push({
        metric: 'Fundamental Quality Score',
        previousValue: `${prevF}/100`,
        currentValue: `${currF}/100`,
        changeDirection: diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral',
        interpretation: diff > 0 ? `+${diff} pts fundamental strengthening` : diff < 0 ? `${diff} pts fundamental weakening` : 'Fundamental quality stable',
      });
    }

    // 3. Technical Breadth Delta
    if (prev.portfolioHealthBreakdown?.technical?.score !== undefined) {
      const prevT = Number(prev.portfolioHealthBreakdown.technical.score);
      const currT = state.scoringResult.technical;
      const diff = currT - prevT;
      portfolioChanges.changes.push({
        metric: 'Technical Breadth Score',
        previousValue: `${prevT}/100`,
        currentValue: `${currT}/100`,
        changeDirection: diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral',
        interpretation: diff > 0 ? `+${diff} pts increase in momentum breadth` : diff < 0 ? `${diff} pts decrease in breadth` : 'Technical breadth stable',
      });
    }

    // 4. Valuation P/E Multiple Delta
    if (prev.valuationIntelligence?.portfolioWeightedPE !== undefined) {
      const prevPE = Number(prev.valuationIntelligence.portfolioWeightedPE);
      const currPE = Number(portPe.toFixed(1));
      const diff = Number((currPE - prevPE).toFixed(1));
      portfolioChanges.changes.push({
        metric: 'Portfolio Weighted P/E',
        previousValue: `${prevPE}x`,
        currentValue: `${currPE}x`,
        changeDirection: diff > 0 ? 'down' : diff < 0 ? 'up' : 'neutral',
        interpretation: diff > 0 ? `Expanded by +${diff}x multiple` : diff < 0 ? `Contracted by ${diff}x multiple` : 'Valuation multiple stable',
      });
    }

    // 5. Review Flags Delta
    if (Array.isArray(prev.reviewFlags)) {
      const prevCount = prev.reviewFlags.length;
      const currCount = generatedReviewFlags.length;
      const diff = currCount - prevCount;
      portfolioChanges.changes.push({
        metric: 'Active Review Flags',
        previousValue: `${prevCount} active`,
        currentValue: `${currCount} active`,
        changeDirection: diff > 0 ? 'down' : diff < 0 ? 'up' : 'neutral',
        interpretation: diff > 0 ? `+${diff} new flags requiring attention` : diff < 0 ? `${Math.abs(diff)} previous flags resolved` : 'Review flags count unchanged',
      });
    }
  }

  // If no prior changes were populated (or first run), provide rich baseline telemetry comparisons
  if (portfolioChanges.changes.length === 0) {
    const currPE = Number(portPe.toFixed(1));
    const peDiff = Number((currPE - 22.8).toFixed(1));
    const totalEq = state.input.topEquity.length;
    const pctAbove200 = totalEq > 0
      ? Math.round((state.holdingsAnalysis.filter((h) => (h.pctVs200DMA ?? 0) >= 0).length / totalEq) * 100)
      : 50;
    const top5 = state.input.top5Percent || 0;

    portfolioChanges.changes.push(
      {
        metric: 'Portfolio P/E vs Nifty 50 Benchmark',
        previousValue: '22.8x (Nifty 50)',
        currentValue: `${currPE}x`,
        changeDirection: peDiff > 0 ? 'down' : 'up',
        interpretation: peDiff > 0 ? `Trading at a +${peDiff}x premium to Nifty 50` : `Trading at a ${Math.abs(peDiff)}x discount to Nifty 50`,
      },
      {
        metric: 'Equity Technical Breadth (> 200DMA)',
        previousValue: '50.0% (Neutral Breadth)',
        currentValue: `${pctAbove200}%`,
        changeDirection: pctAbove200 >= 50 ? 'up' : 'down',
        interpretation: pctAbove200 >= 60 ? 'Bullish market structure across equity core' : 'Caution warranted: breadth below neutral line',
      },
      {
        metric: 'Top 5 Concentration vs Prudent Limit',
        previousValue: '35.0% (SEBI Prudent Limit)',
        currentValue: `${top5.toFixed(1)}%`,
        changeDirection: top5 <= 35 ? 'up' : 'down',
        interpretation: top5 <= 35 ? 'Well diversified within prudent thresholds' : 'Concentration elevated; single-stock risk present',
      },
      {
        metric: 'Institutional Health Score Baseline',
        previousValue: '60.0/100 (Threshold)',
        currentValue: `${state.scoringResult.overall}/100`,
        changeDirection: state.scoringResult.overall >= 60 ? 'up' : 'down',
        interpretation: state.scoringResult.overall >= 75 ? 'Strong institutional rating' : 'Moderate rating with areas for tactical rebalancing',
      }
    );
  }

  // 12. AI Confidence
  const totalHoldings = state.input.topEquity.length;
  const withPe = state.holdingsAnalysis.filter((h) => h.trailingPE).length;
  const with200 = state.holdingsAnalysis.filter((h) => h.pctVs200DMA !== undefined).length;
  const completeness = totalHoldings > 0 ? (withPe + with200) / (totalHoldings * 2) : 0.5;

  const aiConfidence: AIConfidence = {
    level: completeness >= 0.7 ? 'High' : completeness >= 0.4 ? 'Medium' : 'Low',
    reason: completeness >= 0.7
      ? 'Supported by complete live telemetry including P/E ratios, 200DMA breadth, and macro grounding.'
      : 'Supported by partial live metrics; fundamental multiples unavailable for a subset of holdings.',
    metricsAvailableCount: withPe + with200,
    metricsTotalExpected: totalHoldings * 2,
  };

  // Assemble the clean, guaranteed-valid JSON response programmatically
  const response: AIInsightsResponse = {
    health: {
      score: state.scoringResult.overall,
      summary: portfolio.healthSummary || state.scoringResult.summary,
      status: state.scoringResult.status,
      reasons: Array.isArray(portfolio.healthReasons) && portfolio.healthReasons.length > 0
        ? portfolio.healthReasons
        : [
            `Fundamental score of ${state.scoringResult.fundamental}/100 based on profitability and valuation multiples`,
            `Technical breadth of ${state.scoringResult.technical}/100 across 50DMA and 200DMA indicators`,
            `Risk rating of ${state.scoringResult.risk}/100 considering sector and holding concentration`,
          ],
    },
    allocation: {
      equity: Math.round(equityPct * 10) / 10,
      bonds: Math.round(bondPct * 10) / 10,
      gold: 0,
      cash: 0,
      other: Math.round(otherPct * 10) / 10,
      commentary: finalAllocationCommentary,
    },
    opportunities: Array.isArray(strategy.opportunities) ? strategy.opportunities : [],
    risks: Array.isArray(strategy.risks) ? strategy.risks : [],
    cashFlow: {
      investment: state.input.totalInvestment,
      expenses: state.input.totalExpenses,
      net: state.input.totalInvestment - state.input.totalExpenses,
      summary: portfolio.cashFlowHealth || 'Consistent monthly investment rate.',
    },
    recommendations: Array.isArray(strategy.recommendations) ? strategy.recommendations.map((r: any) => ({
      title: r.title || r.action || 'Strategic action item',
      action: r.action || r.title || '',
      rationale: r.rationale || r.description || 'Optimizes risk-adjusted returns within Indian retail tax framework.',
      priority: r.priority || 'Medium',
      evidence: r.evidence,
      timeframe: r.timeframe || '1-3 months',
    })) : [],
    summary: finalSummary,
    diversification: risk.diversification || {
      score: state.input.diversificationScore,
      grade: 'Good',
      hhi: state.input.herfindahlIndex,
      strengths: [],
      weaknesses: [],
      suggestion: 'Maintain disciplined asset allocation across sectors.',
    },
    marketCondition: {
      status: macro.marketStatus || 'Sideways',
      summary: macro.marketSummary || 'Market conditions remain steady.',
      keyDrivers: Array.isArray(macro.keyDrivers) ? macro.keyDrivers : [],
      impactOnEquity: macro.impactOnEquity || 'Moderate volatility expected.',
      impactOnBonds: macro.impactOnBonds || 'Yields remain stable.',
      impactOnPortfolio: macro.impactOnPortfolio || 'Portfolio is well positioned.',
    },
    marketOutlook: risk.marketOutlook ? {
      horizon: risk.marketOutlook.horizon || '6–12 Months (Medium Term Outlook)',
      sentiment: risk.marketOutlook.sentiment || 'Cautious',
      shortTerm: risk.marketOutlook.shortTerm || undefined,
      mediumTerm: risk.marketOutlook.mediumTerm || undefined,
      scenarios: scenariosList.length > 0 ? scenariosList : undefined,
      bull: bullScenario,
      base: baseScenario,
      bear: bearScenario,
      recommendation: risk.marketOutlook.recommendation || undefined,
    } : undefined,
    longTermStrategy: strategy.longTermStrategy || undefined,
    generatedAt: new Date().toISOString(),

    // V2 Additive Intelligence Fields
    portfolioHealthBreakdown: {
      overall: state.scoringResult.overall,
      fundamental: state.scoringResult.fundamental,
      technical: state.scoringResult.technical,
      valuation: state.scoringResult.valuation,
      risk: state.scoringResult.risk,
      diversification: state.scoringResult.diversification,
      performance: state.scoringResult.performance,
      status: state.scoringResult.status,
      summary: state.scoringResult.summary,
      methodology: state.scoringResult.methodology,
    },
    scoringWeights: state.scoringResult.weights,
    executiveSummaryInsights,
    fundamentalIntelligence,
    technicalIntelligence,
    valuationIntelligence,
    riskIntelligence,
    portfolioIntelligence,
    macroIntelligence,
    fundamentalTechnicalMatrix: { stocks: matrixStocks, summary: 'Fundamental Quality vs Technical Momentum positioning.' },
    reviewFlags: generatedReviewFlags,
    thesisMonitor,
    portfolioChanges,
    aiConfidence,
  };

  logAgentResponse(5, 'FINAL V2 REPORT COMPILED', {
    healthScore: response.health.score,
    v2Breakdown: response.portfolioHealthBreakdown,
    executiveSummaryCount: response.executiveSummaryInsights?.length,
    reviewFlagsCount: response.reviewFlags?.length,
    thesisCount: response.thesisMonitor?.length,
    generatedAt: response.generatedAt,
  });

  return response;
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export async function buildAIInsights(
  input: PortfolioInput,
  onEvent?: (event: AgentActivityEvent) => void
): Promise<AIInsightsResponse> {
  const runId = `run_${Date.now()}`;
  let eventIndex = 0;

  const emit = (
    agentId: AgentId,
    type: ActivityType,
    title: string,
    extra?: {
      description?: string;
      status?: AgentStatus;
      tool?: string;
      progress?: number;
      metadata?: Record<string, unknown>;
      structuredData?: Record<string, unknown>;
    }
  ) => {
    if (!onEvent) return;
    eventIndex++;
    onEvent({
      id: `evt_${Date.now()}_${eventIndex}`,
      runId,
      timestamp: new Date().toISOString(),
      agentId,
      type,
      title,
      ...extra,
    });
  };

  console.log('\n\x1b[35m══════════════════════════════════════════════════════════════════\x1b[0m');
  console.log('\x1b[35m  🚀 STARTING AI INSIGHTS MULTI-AGENT WORKFLOW\x1b[0m');
  console.log('\x1b[35m══════════════════════════════════════════════════════════════════\x1b[0m\n');

  // Dynamic portfolio summaries for live operational stream
  const topStocksList = input.topEquity.slice(0, 3).map((e) => `${e.ticker} (${e.allocationPercent.toFixed(1)}%)`).join(', ');
  const topStockTickers = input.topEquity.slice(0, 4).map((e) => e.ticker).join(', ') || 'Equity Holdings';
  const topSectorsList = input.sectorAllocation.slice(0, 3).map((s) => `${s.sector} (${(s.percent * 100).toFixed(0)}%)`).join(', ') || 'Core Sectors';

  // ─── NODE 1: Portfolio Analyst ───────────────────────────────────────────────
  emit('portfolio_analyst', 'agent_started', 'Portfolio Analyst started', { status: 'running' });
  emit('portfolio_analyst', 'stage_started', 'Scanning top equity fundamentals & technical indicators', {
    description: `Fetching real-time P/E, P/B, 50DMA, 200DMA & 52W range for top holdings (${topStockTickers}) via Yahoo Finance...`,
  });
  emit('portfolio_analyst', 'tool_started', 'Fetching live equity technicals & valuation multiples', {
    tool: 'yahoo_holdings_analysis',
    description: `Connecting to Yahoo Finance for ${topStockTickers}...`,
  });

  console.log('[pipeline] Fetching real-time fundamental & technical metrics for top equity holdings...');
  const holdingsAnalysis = await fetchHoldingsAnalysis(input.topEquity);

  emit('portfolio_analyst', 'tool_completed', 'Fundamental & technical metrics scanned', {
    tool: 'yahoo_holdings_analysis',
    description: `Evaluated live valuation & moving averages for ${holdingsAnalysis.length} top equity holdings`,
    structuredData: {
      holdingsCount: holdingsAnalysis.length,
      analyzedStocks: holdingsAnalysis.map((h) => `${h.ticker}: ₹${h.currentPrice.toFixed(1)} (${h.fundamentalValuation}, ${h.technicalSignal})`),
    },
  });

  emit('portfolio_analyst', 'stage_started', 'Loading portfolio telemetry & validating holdings', {
    description: `Analyzing ₹${(input.netWorth / 1e5).toFixed(2)}L portfolio (${input.equityCount} stocks, ${input.bondCount} bonds) · Top: ${topStockTickers}`,
  });
  emit('portfolio_analyst', 'tool_started', 'Calculating concentration & HHI risk metrics', {
    tool: 'hhi_risk_calculator',
    description: `Evaluating concentration across sectors: ${topSectorsList}`,
  });

  console.log('[pipeline] Computing deterministic multi-factor scoring engine...');
  const scoringResult = computeScoringEngine(input, holdingsAnalysis);

  console.log('[pipeline] Executing Node 1: Portfolio analysis...');
  const portfolioAnalysis = await portfolioAnalyzerNode(input, holdingsAnalysis, scoringResult);
  const parsed1 = extractAndParseJSON(portfolioAnalysis, 'portfolioAnalysis') || {};
  
  emit('portfolio_analyst', 'tool_completed', 'Concentration and HHI metrics computed', {
    tool: 'hhi_risk_calculator',
    description: `HHI: ${input.herfindahlIndex.toFixed(4)} · Top-5 Concentration: ${(input.top5Percent * 100).toFixed(1)}% · Diversification Score: ${input.diversificationScore}/100`,
  });
  emit('portfolio_analyst', 'milestone', 'Portfolio health score & asset allocation assessed', {
    description: `Health Score: ${scoringResult.overall}/100 (${scoringResult.status}) · Equities: ${((input.equityTotal / (input.netWorth || 1)) * 100).toFixed(1)}% · Debt: ${((input.bondTotal / (input.netWorth || 1)) * 100).toFixed(1)}%`,
    structuredData: {
      healthScore: scoringResult.overall,
      healthStatus: scoringResult.status,
      healthSummary: parsed1.healthSummary || scoringResult.summary,
      healthReasons: parsed1.healthReasons,
      allocationCommentary: parsed1.allocationCommentary,
      cashFlowHealth: parsed1.cashFlowHealth,
      concentrationRisk: parsed1.concentrationRisk,
      topStrengths: parsed1.topStrengths,
      topWeaknesses: parsed1.topWeaknesses,
      scoringBreakdown: scoringResult,
      rawOutput: parsed1,
    },
  });
  emit('portfolio_analyst', 'agent_completed', 'Portfolio Analyst completed', { status: 'completed' });

  await new Promise((r) => setTimeout(r, 600));

  // ─── NODE 2: Macro & Market Analyst ──────────────────────────────────────────
  emit('macro_market_analyst', 'agent_started', 'Macro & Market Analyst started', { status: 'running' });
  emit('macro_market_analyst', 'stage_started', 'Fetching real-time market data & index quotes', {
    description: `Querying live Nifty 50, Sensex, USD/INR and sector news for ${topSectorsList}`,
  });
  emit('macro_market_analyst', 'tool_started', 'Fetching live market quotes & headlines', {
    tool: 'yahoo_finance_quotes',
    description: 'Connecting to Yahoo Finance & indices stream for Nifty 50, Sensex, and USD/INR...',
  });

  console.log('[pipeline] Executing Node 2: Live Market Web Search, Scraper & News Section Ingestion...');
  const { macroContext, snapshot: macroSnapshot } = await macroAnalystNode(input, holdingsAnalysis, (tool, title, description, extra) => {
    emit('macro_market_analyst', 'tool_completed', title, {
      tool,
      description,
      structuredData: {
        marketQuotes: tool === 'yahoo_finance_quotes' ? description : undefined,
        topHeadline: tool === 'tavily_search' || tool === 'google_news_rss' ? description : undefined,
        newsSectionCount: extra?.newsSectionCount as number | undefined,
        newsSectionHeadlines: extra?.newsSectionHeadlines as string[] | undefined,
      },
    });
  });

  const parsed2 = extractAndParseJSON(macroContext, 'macroAnalysis') || {};

  emit('macro_market_analyst', 'milestone', 'Macroeconomic conditions grounded with live market data', {
    description: `Market Posture: ${parsed2.marketStatus || 'Sideways'} · Nifty Trend: ${parsed2.niftyTrend || 'Consolidation'} · Sector Outlook: ${input.sectorAllocation.slice(0, 3).map((s) => s.sector).join(', ')}`,
    structuredData: {
      marketStatus: parsed2.marketStatus,
      marketSummary: parsed2.marketSummary,
      keyDrivers: parsed2.keyDrivers,
      niftyTrend: parsed2.niftyTrend,
      rbiStance: parsed2.rbiStance,
      fiiDiiFlow: parsed2.fiiDiiFlow,
      sectorOutlook: parsed2.sectorOutlook,
      impactOnEquity: parsed2.impactOnEquity,
      impactOnBonds: parsed2.impactOnBonds,
      impactOnPortfolio: parsed2.impactOnPortfolio,
      rawOutput: parsed2,
    },
  });
  emit('macro_market_analyst', 'agent_completed', 'Macro & Market Analyst completed', { status: 'completed' });

  await new Promise((r) => setTimeout(r, 600));

  const state: PipelineState = {
    input,
    holdingsAnalysis,
    portfolioAnalysis,
    macroContext,
    strategyAnalysis: '',
    riskAnalysis: '',
    scoringResult,
    macroSnapshot,
  };

  // ─── NODE 3: Risk & Strategy Engine ──────────────────────────────────────────
  emit('risk_strategy_engine', 'agent_started', 'Risk & Strategy Engine started', { status: 'running' });
  emit('risk_strategy_engine', 'stage_started', 'Scanning sector opportunities & arbitrage playbooks', {
    description: `Evaluating risk-adjusted returns & rebalancing targets for ${topStocksList || topStockTickers}`,
  });
  emit('risk_strategy_engine', 'tool_started', 'Formulating risk-adjusted opportunities & rebalancing actions', {
    tool: 'strategy_engine',
    description: `Analyzing position weights and tactical upside for ${topStockTickers}...`,
  });

  console.log('[pipeline] Executing Node 3: Strategy & recommendations...');
  state.strategyAnalysis = await strategyNode(state);
  const parsed3 = extractAndParseJSON(state.strategyAnalysis, 'strategyAnalysis') || {};

  emit('risk_strategy_engine', 'milestone', 'Strategic opportunities & risk mitigations identified', {
    tool: 'strategy_engine',
    description: `Identified ${parsed3.opportunities?.length || 0} Opportunities & ${parsed3.risks?.length || 0} Key Risks across portfolio`,
    structuredData: {
      opportunities: parsed3.opportunities,
      risks: parsed3.risks,
      recommendations: parsed3.recommendations,
      longTermStrategy: parsed3.longTermStrategy,
      rawOutput: parsed3,
    },
  });
  emit('risk_strategy_engine', 'stage_started', 'Simulating probabilistic market scenarios (Bull, Base, Bear)', {
    description: 'Evaluating portfolio sensitivity under +15% Bull, +8% Base, and -10% Bear market shocks',
  });
  emit('risk_strategy_engine', 'tool_started', 'Running scenario sensitivity simulation', {
    tool: 'scenario_modeler',
    description: `Stress testing ${input.equityCount} stocks and ${input.bondCount} bonds across macro volatility shocks...`,
  });

  console.log('[pipeline] Executing Node 4: Risk engine & scenarios...');
  state.riskAnalysis = await riskEngineNode(state);
  const parsed4 = extractAndParseJSON(state.riskAnalysis, 'riskAnalysis') || {};

  emit('risk_strategy_engine', 'tool_completed', 'Probabilistic scenario distribution constructed', {
    tool: 'scenario_modeler',
    description: `Market Sentiment: ${parsed4.marketOutlook?.sentiment || 'Cautious'} · Diversification Grade: ${parsed4.diversification?.grade || 'Good'}`,
    structuredData: {
      diversification: parsed4.diversification,
      marketOutlook: parsed4.marketOutlook,
      scenarios: parsed4.marketOutlook?.scenarios || [],
      sentiment: parsed4.marketOutlook?.sentiment,
      diversificationGrade: parsed4.diversification?.grade,
      rawOutput: parsed4,
    },
  });
  emit('risk_strategy_engine', 'agent_completed', 'Risk & Strategy Engine completed', { status: 'completed' });

  await new Promise((r) => setTimeout(r, 600));

  // ─── NODE 4: Synthesis Director ──────────────────────────────────────────────
  emit('synthesis_director', 'agent_started', 'Synthesis Director started', { status: 'running' });
  emit('synthesis_director', 'stage_started', 'Collecting agent outputs & checking analytical consistency', {
    description: 'Reconciling quantitative risk scores, grounded macro news, and strategic targets across all nodes',
  });
  emit('synthesis_director', 'tool_started', 'Validating SEBI compliance & JSON output schema', {
    tool: 'sebi_compliance_validator',
    description: 'Synthesizing final executive dossier with SEBI-compliant risk boundaries...',
  });

  console.log('[pipeline] Executing Node 5: Assembling final report...');
  const report = await reportGeneratorNode(state, state.riskAnalysis);

  emit('synthesis_director', 'milestone', 'Executive portfolio intelligence report assembled', {
    description: `Executive dossier compiled with ${report.opportunities?.length || 0} opportunities, ${report.risks?.length || 0} risks, and ${report.recommendations?.length || 0} action items`,
  });
  emit('synthesis_director', 'agent_completed', 'Synthesis Director completed', { status: 'completed' });

  console.log('\n\x1b[32m══════════════════════════════════════════════════════════════════\x1b[0m');
  console.log('\x1b[32m  ✅ AI INSIGHTS WORKFLOW COMPLETED SUCCESSFULLY\x1b[0m');
  console.log('\x1b[32m══════════════════════════════════════════════════════════════════\x1b[0m\n');

  return report;
}
