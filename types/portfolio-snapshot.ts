/**
 * types/portfolio-snapshot.ts
 *
 * Separated snapshot types following the principle:
 *   PortfolioSnapshot + MarketSnapshot + NewsSnapshot → AnalysisContext
 *
 * Portfolio changes frequently.
 * Market data changes frequently.
 * News changes frequently.
 * They should NOT be a single giant immutable object.
 */

import type { EquityHolding } from './holdings';
import type { BondHolding } from './bonds';
import type { Transaction } from './transactions';
import type { AnalysisQuality, EvidenceCollection } from './evidence';

// ─── Portfolio Snapshot ─────────────────────────────────────────────────────────

export interface PortfolioSnapshot {
  snapshotId: string;
  asOf: string;

  holdings: {
    equity: EquityHolding[];
    bonds: BondHolding[];
    transactions: Transaction[];
  };

  aggregates: {
    netWorth: number;
    equityTotal: number;
    bondTotal: number;
    equityCount: number;
    bondCount: number;
    todaysChange: number;
    todaysChangePct: number;
  };

  allocation: {
    assetAllocation: { label: string; value: number; percent: number }[];
    sectorAllocation: { sector: string; equityValue: number; bondValue: number; totalValue: number; percent: number }[];
  };

  concentration: {
    top5Holdings: { name: string; value: number; percent: number; type: 'equity' | 'bond' }[];
    top5Percent: number;
    herfindahlIndex: number;
    diversificationScore: number;
  };

  cashFlow: {
    totalInvestment: number;
    totalExpenses: number;
    monthlyAvgInvestment: number;
    lastMonthInvestment: number;
    lastMonthExpenses: number;
  };
}

// ─── Market Snapshot ────────────────────────────────────────────────────────────

export interface Quote {
  price: number;
  change: number;
  changePct: number;
  observedAt: string;
}

export interface HoldingMarketData {
  ticker: string;
  name: string;
  sector: string;

  currentPrice: number;

  trailingPE?: number;
  forwardPE?: number;
  priceToBook?: number;
  dividendYield?: number;

  roe?: number;
  roce?: number;
  epsGrowth?: number;
  revenueGrowth?: number;
  netMargin?: number;
  operatingMargin?: number;
  debtToEquity?: number;

  fiftyDayAverage?: number;
  twoHundredDayAverage?: number;
  pctVs50DMA?: number;
  pctVs200DMA?: number;

  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  pctFrom52WHigh?: number;
}

export interface IndexSnapshot {
  price: number;
  change: number;
  changePct: number;
}

export interface MacroQuote {
  price: number;
  change: number;
  changePct: number;
}

export interface MarketSnapshot {
  observedAt: string;

  /** Per-holding fundamental + technical data from Yahoo Finance */
  holdingData: HoldingMarketData[];

  /** Index quotes */
  nifty?: IndexSnapshot;
  sensex?: IndexSnapshot;

  /** Macro quotes */
  usdInr?: MacroQuote;
  brentCrude?: MacroQuote;
  gold?: MacroQuote;
  us10y?: MacroQuote;
}

// ─── News Snapshot ──────────────────────────────────────────────────────────────

export interface NewsArticle {
  title: string;
  source: string;
  url?: string;
  publishedAt?: string;
  content?: string;

  summary?: string;
  sentiment?: string;
  impact?: string;
  category?: string;
  companies?: string[];

  /** Where we got this article from */
  origin: 'tavily' | 'google_news_rss' | 'database';
}

export interface NewsSnapshot {
  observedAt: string;
  articles: NewsArticle[];
  tavilyBriefing?: string;
  searchSource: 'tavily' | 'google_news_rss' | 'database' | 'mixed';
}

// ─── Market Regime ──────────────────────────────────────────────────────────────

export type MarketRegime =
  | 'risk_on'
  | 'risk_off'
  | 'disinflation'
  | 'inflationary'
  | 'monetary_easing'
  | 'monetary_tightening'
  | 'growth_slowdown'
  | 'recovery'
  | 'mixed_uncertain';

// ─── Analysis Context ───────────────────────────────────────────────────────────

/**
 * Combines all snapshots into a single analysis context.
 * Timestamps at object level so the AI knows the freshness of each domain.
 */
export interface AnalysisContext {
  portfolioAsOf: string;
  marketAsOf: string;
  macroAsOf: string;
  newsAsOf: string;

  portfolio: PortfolioSnapshot;
  market: MarketSnapshot;
  news: NewsSnapshot;

  dataQuality: AnalysisQuality;
  evidence: EvidenceCollection;
}
