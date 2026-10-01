/**
 * lib/analytics/technicals.ts
 *
 * Deterministic technical scoring engine.
 * Evaluates per-holding and portfolio-level technical health
 * from MarketSnapshot — NO network calls.
 */

import type { HoldingMarketData, PortfolioSnapshot } from '@/types/portfolio-snapshot';
import type { EvidenceCollection } from '@/types/evidence';
import { addMetricEvidence } from '@/types/evidence';
import { TECHNICAL_THRESHOLDS } from '@/lib/config/riskThresholds';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface HoldingTechnicalScore {
  ticker: string;
  name: string;
  weight: number;

  currentPrice: number;
  fiftyDayAverage?: number;
  twoHundredDayAverage?: number;
  pctVs50DMA?: number;
  pctVs200DMA?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  pctFrom52WHigh?: number;

  trend: 'Bullish' | 'Neutral' | 'Bearish';
  momentum: 'Strong' | 'Neutral' | 'Weak';
  marketStructure: 'Above 200DMA' | 'Near 200DMA' | 'Below 200DMA';

  /** Component scores (0–100) */
  trendScore: number;
  momentumScore: number;

  score: number;

  signalExplanation: string;
  whatWouldChange: string;
}

export interface TechnicalAnalysis {
  portfolioScore: number;

  /** % of holdings above 200DMA */
  breadthPct: number;
  holdingsAbove200DMA: number;
  holdingsWith200DMAData: number;

  /** % of holdings above 50DMA */
  breadth50Pct: number;

  trend: 'Bullish' | 'Neutral' | 'Bearish';
  momentum: 'Strong' | 'Neutral' | 'Weak';
  marketStructure: 'Above 200DMA' | 'Near 200DMA' | 'Below 200DMA';

  holdings: HoldingTechnicalScore[];

  interpretation: string;
}

// ─── Scoring Functions ──────────────────────────────────────────────────────────

function scoreTrend(pctVs200DMA?: number, pctVs50DMA?: number): number {
  if (pctVs200DMA === undefined) return 50;

  let score = 50;

  // 200DMA position
  if (pctVs200DMA > 10) score += 25;
  else if (pctVs200DMA > 0) score += 15;
  else if (pctVs200DMA > -5) score -= 5;
  else if (pctVs200DMA > -15) score -= 20;
  else score -= 30;

  // 50DMA confirmation
  if (pctVs50DMA !== undefined) {
    if (pctVs50DMA > 0) score += 10;
    else score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

function scoreMomentum(pctVs50DMA?: number, pctFrom52WHigh?: number): number {
  if (pctVs50DMA === undefined && pctFrom52WHigh === undefined) return 50;

  let score = 50;

  if (pctVs50DMA !== undefined) {
    if (pctVs50DMA > 5) score += 20;
    else if (pctVs50DMA > 0) score += 10;
    else if (pctVs50DMA < -10) score -= 20;
    else if (pctVs50DMA < 0) score -= 10;
  }

  if (pctFrom52WHigh !== undefined) {
    if (pctFrom52WHigh > -5) score += 10; // near highs
    else if (pctFrom52WHigh < -30) score -= 15; // deeply corrected
  }

  return Math.max(0, Math.min(100, score));
}

function deriveTrend(pctVs200DMA?: number): HoldingTechnicalScore['trend'] {
  if (pctVs200DMA === undefined) return 'Neutral';
  if (pctVs200DMA > TECHNICAL_THRESHOLDS.nearDMAPercent) return 'Bullish';
  if (pctVs200DMA < -TECHNICAL_THRESHOLDS.nearDMAPercent) return 'Bearish';
  return 'Neutral';
}

function deriveMomentum(pctVs50DMA?: number): HoldingTechnicalScore['momentum'] {
  if (pctVs50DMA === undefined) return 'Neutral';
  if (pctVs50DMA > 3) return 'Strong';
  if (pctVs50DMA < -3) return 'Weak';
  return 'Neutral';
}

function deriveMarketStructure(pctVs200DMA?: number): HoldingTechnicalScore['marketStructure'] {
  if (pctVs200DMA === undefined) return 'Near 200DMA';
  if (pctVs200DMA > TECHNICAL_THRESHOLDS.nearDMAPercent) return 'Above 200DMA';
  if (pctVs200DMA < -TECHNICAL_THRESHOLDS.nearDMAPercent) return 'Below 200DMA';
  return 'Near 200DMA';
}

// ─── Main Engine ────────────────────────────────────────────────────────────────

export function runTechnicalAnalysis(
  portfolio: PortfolioSnapshot,
  holdingData: HoldingMarketData[],
  evidence: EvidenceCollection
): TechnicalAnalysis {
  const equityHoldings = portfolio.holdings.equity;
  const totalEquityValue = portfolio.aggregates.equityTotal;

  const holdings: HoldingTechnicalScore[] = equityHoldings.map((eq) => {
    const market = holdingData.find((m) => m.ticker === eq.ticker);
    const weight = totalEquityValue > 0 ? (eq.currentValue / totalEquityValue) * 100 : 0;

    const pctVs200DMA = market?.pctVs200DMA ?? (market?.currentPrice && market?.twoHundredDayAverage ? Math.round(((market.currentPrice - market.twoHundredDayAverage) / market.twoHundredDayAverage) * 1000) / 10 : undefined);
    const pctVs50DMA = market?.pctVs50DMA ?? (market?.currentPrice && market?.fiftyDayAverage ? Math.round(((market.currentPrice - market.fiftyDayAverage) / market.fiftyDayAverage) * 1000) / 10 : undefined);
    const pctFrom52WHigh = market?.pctFrom52WHigh;

    const trendScore = scoreTrend(pctVs200DMA, pctVs50DMA);
    const momentumScore = scoreMomentum(pctVs50DMA, pctFrom52WHigh);
    const score = Math.round(trendScore * 0.6 + momentumScore * 0.4);

    const trend = deriveTrend(pctVs200DMA);
    const momentum = deriveMomentum(pctVs50DMA);
    const marketStructure = deriveMarketStructure(pctVs200DMA);

    const cmp = market?.currentPrice ?? (eq.shares > 0 ? eq.currentValue / eq.shares : 0);

    // Build signal explanation
    const parts: string[] = [];
    if (pctVs200DMA !== undefined) {
      parts.push(`${pctVs200DMA > 0 ? '+' : ''}${pctVs200DMA}% vs 200DMA`);
    }
    if (pctVs50DMA !== undefined) {
      parts.push(`${pctVs50DMA > 0 ? '+' : ''}${pctVs50DMA}% vs 50DMA`);
    }
    if (pctFrom52WHigh !== undefined) {
      parts.push(`${pctFrom52WHigh}% from 52W high`);
    }
    const signalExplanation = parts.length > 0
      ? `Trading ${marketStructure.toLowerCase()}: ${parts.join(', ')}.`
      : 'Insufficient moving average data for technical assessment.';

    // What would change
    let whatWouldChange = '';
    if (trend === 'Bearish') {
      whatWouldChange = `Price reclaiming 200DMA at ₹${market?.twoHundredDayAverage?.toFixed(0) ?? 'N/A'} would signal structural recovery`;
    } else if (trend === 'Bullish' && momentum === 'Weak') {
      whatWouldChange = `Break above 50DMA at ₹${market?.fiftyDayAverage?.toFixed(0) ?? 'N/A'} needed to confirm sustained momentum`;
    } else {
      whatWouldChange = `Monitoring weekly closes relative to key moving averages`;
    }

    // Register evidence
    if (pctVs200DMA !== undefined) {
      addMetricEvidence(evidence, {
        source: 'Yahoo Finance',
        metric: `${eq.ticker} % vs 200DMA`,
        value: pctVs200DMA,
        observedAt: new Date().toISOString(),
        confidence: 'high',
        relatedSymbols: [eq.ticker],
        relatedSectors: [eq.sector],
      });
    }

    return {
      ticker: eq.ticker,
      name: market?.name || eq.name || eq.ticker,
      weight,
      currentPrice: cmp,
      fiftyDayAverage: market?.fiftyDayAverage,
      twoHundredDayAverage: market?.twoHundredDayAverage,
      pctVs50DMA,
      pctVs200DMA,
      fiftyTwoWeekHigh: market?.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: market?.fiftyTwoWeekLow,
      pctFrom52WHigh,
      trend,
      momentum,
      marketStructure,
      trendScore,
      momentumScore,
      score,
      signalExplanation,
      whatWouldChange,
    };
  });

  // Portfolio-level breadth
  const holdingsWith200DMAData = holdings.filter((h) => h.pctVs200DMA !== undefined).length;
  const holdingsAbove200DMA = holdings.filter((h) => h.pctVs200DMA !== undefined && h.pctVs200DMA > 0).length;
  const breadthPct = holdingsWith200DMAData > 0 ? Math.round((holdingsAbove200DMA / holdingsWith200DMAData) * 100) : 50;

  const holdingsWith50DMAData = holdings.filter((h) => h.pctVs50DMA !== undefined).length;
  const holdingsAbove50DMA = holdings.filter((h) => h.pctVs50DMA !== undefined && h.pctVs50DMA > 0).length;
  const breadth50Pct = holdingsWith50DMAData > 0 ? Math.round((holdingsAbove50DMA / holdingsWith50DMAData) * 100) : 50;

  // Portfolio score (weighted)
  const scoredHoldings = holdings.filter((h) => h.weight > 0);
  const totalWeight = scoredHoldings.reduce((sum, h) => sum + h.weight, 0);
  const portfolioScore = totalWeight > 0
    ? Math.round(scoredHoldings.reduce((sum, h) => sum + h.score * h.weight, 0) / totalWeight)
    : 50;

  const portfolioTrend = breadthPct >= TECHNICAL_THRESHOLDS.breadthBullish ? 'Bullish' : breadthPct <= TECHNICAL_THRESHOLDS.breadthBearish ? 'Bearish' : 'Neutral';
  const portfolioMomentum = breadth50Pct >= 60 ? 'Strong' : breadth50Pct <= 35 ? 'Weak' : 'Neutral';
  const portfolioStructure = breadthPct >= 55 ? 'Above 200DMA' : breadthPct <= 40 ? 'Below 200DMA' : 'Near 200DMA';

  // Register breadth evidence
  addMetricEvidence(evidence, {
    source: 'Deterministic Technical Engine',
    metric: 'Portfolio 200DMA Breadth',
    value: `${breadthPct}%`,
    observedAt: new Date().toISOString(),
    confidence: holdingsWith200DMAData >= holdings.length * 0.6 ? 'high' : 'medium',
  });

  const interpretation = `Technical breadth: ${holdingsAbove200DMA}/${holdingsWith200DMAData} holdings (${breadthPct}%) above 200DMA. ` +
    `50DMA breadth: ${breadth50Pct}%. Portfolio technical score: ${portfolioScore}/100. ` +
    `Overall trend: ${portfolioTrend}, momentum: ${portfolioMomentum}.`;

  return {
    portfolioScore,
    breadthPct,
    holdingsAbove200DMA,
    holdingsWith200DMAData,
    breadth50Pct,
    trend: portfolioTrend,
    momentum: portfolioMomentum,
    marketStructure: portfolioStructure,
    holdings,
    interpretation,
  };
}
