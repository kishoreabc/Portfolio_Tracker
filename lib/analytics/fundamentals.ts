/**
 * lib/analytics/fundamentals.ts
 *
 * Deterministic fundamental scoring engine.
 * Computes per-holding and portfolio-level fundamental metrics
 * from the MarketSnapshot — NO network calls.
 *
 * Every score is decomposable: raw metric → normalized → factor score → portfolio score.
 */

import type { HoldingMarketData, PortfolioSnapshot } from '@/types/portfolio-snapshot';
import type { EvidenceCollection } from '@/types/evidence';
import { addMetricEvidence } from '@/types/evidence';
import { getSectorPE } from '@/lib/calc/valuation';
import { VALUATION_THRESHOLDS } from '@/lib/config/riskThresholds';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface HoldingFundamentalScore {
  ticker: string;
  name: string;
  weight: number;

  /** Raw metrics */
  trailingPE?: number;
  forwardPE?: number;
  priceToBook?: number;
  dividendYield?: number;
  roe?: number;
  debtToEquity?: number;

  /** Derived */
  sectorPE?: number;
  valuationStatus: 'Undervalued' | 'Fair' | 'Moderate' | 'Elevated';
  fundamentalStatus: 'Strong' | 'Neutral' | 'Weak' | 'Under Review';

  /** Component scores (0–100) */
  valuationScore: number;
  qualityScore: number;

  /** Overall (0–100) */
  score: number;

  /** What would change this assessment */
  whatWouldChange: string;
}

export interface FundamentalAnalysis {
  /** Portfolio-level score (0–100) */
  portfolioScore: number;

  /** Portfolio-weighted average P/E (arithmetic) */
  weightedPE: number;

  /** Portfolio weighted earnings yield % (E/P harmonic weighting) */
  weightedEarningsYieldPct: number;

  /** Harmonic mean P/E (1 / weighted earnings yield) */
  harmonicMeanPE: number;

  /** Potential value traps identified (low PE + low ROE or high leverage) */
  potentialValueTraps: string[];

  /** Earnings yield spread vs risk-free (bps) */
  earningsYieldSpreadBps: number;

  /** Per-holding breakdown */
  holdings: HoldingFundamentalScore[];

  /** Decomposition */
  valuationSubscore: number;
  qualitySubscore: number;

  strengths: string[];
  watchItems: string[];

  interpretation: string;
}

// ─── Scoring ────────────────────────────────────────────────────────────────────

function scoreValuation(pe: number | undefined, sectorPE: number | undefined): number {
  if (pe === undefined || pe <= 0) return 50; // neutral when data missing
  const benchmark = sectorPE ?? 22.8;
  const ratio = pe / benchmark;

  if (ratio < VALUATION_THRESHOLDS.undervaluedRatio) return 90;
  if (ratio < 1.0) return 75;
  if (ratio < VALUATION_THRESHOLDS.elevatedRatio) return 55;
  if (ratio < 1.5) return 35;
  return 20;
}

function scoreQuality(holding: HoldingMarketData): number {
  let score = 50; // baseline

  // ROE contribution
  if (holding.roe !== undefined) {
    if (holding.roe > 20) score += 15;
    else if (holding.roe > 12) score += 8;
    else if (holding.roe < 5) score -= 10;
  }

  // Debt/Equity
  if (holding.debtToEquity !== undefined) {
    if (holding.debtToEquity < 0.3) score += 10;
    else if (holding.debtToEquity > 2.0) score -= 15;
    else if (holding.debtToEquity > 1.0) score -= 5;
  }

  // Dividend yield bonus
  if (holding.dividendYield !== undefined && holding.dividendYield > 1.5) {
    score += 5;
  }

  return Math.max(0, Math.min(100, score));
}

function deriveValuationStatus(
  pe: number | undefined,
  sectorPE: number | undefined,
  roe?: number,
  debtToEquity?: number
): HoldingFundamentalScore['valuationStatus'] {
  if (pe === undefined || pe <= 0) return 'Moderate';
  const benchmark = sectorPE ?? 22.8;
  const ratio = pe / benchmark;

  // Value trap protection (Prompt #11): Low PE is NOT automatically undervalued if company has deteriorating capital return or excessive leverage
  const isValueTrap = ratio < VALUATION_THRESHOLDS.undervaluedRatio && ((roe !== undefined && roe < 8) || (debtToEquity !== undefined && debtToEquity > 1.8));
  if (isValueTrap) return 'Moderate';

  if (ratio < VALUATION_THRESHOLDS.undervaluedRatio) return 'Undervalued';
  if (ratio < 1.0) return 'Fair';
  if (ratio < VALUATION_THRESHOLDS.elevatedRatio) return 'Moderate';
  return 'Elevated';
}

function deriveFundamentalStatus(score: number): HoldingFundamentalScore['fundamentalStatus'] {
  if (score >= 70) return 'Strong';
  if (score >= 45) return 'Neutral';
  if (score >= 25) return 'Weak';
  return 'Under Review';
}

// ─── Main Engine ────────────────────────────────────────────────────────────────

/**
 * Run deterministic fundamental analysis on the portfolio.
 * Consumes MarketSnapshot data — no network calls.
 */
export function runFundamentalAnalysis(
  portfolio: PortfolioSnapshot,
  holdingData: HoldingMarketData[],
  evidence: EvidenceCollection,
  riskFreeRate: number = 7.0
): FundamentalAnalysis {
  const equityHoldings = portfolio.holdings.equity;
  const totalEquityValue = portfolio.aggregates.equityTotal;

  // Score each holding
  const holdings: HoldingFundamentalScore[] = equityHoldings.map((eq) => {
    const market = holdingData.find((m) => m.ticker === eq.ticker);
    const weight = totalEquityValue > 0 ? (eq.currentValue / totalEquityValue) * 100 : 0;
    const sectorPE = getSectorPE(eq.sector, eq.ticker) ?? undefined;

    const valuationScore = scoreValuation(market?.trailingPE, sectorPE);
    const qualityScore = market ? scoreQuality(market) : 50;
    const score = Math.round(valuationScore * 0.55 + qualityScore * 0.45);

    const valuationStatus = deriveValuationStatus(market?.trailingPE, sectorPE, market?.roe, market?.debtToEquity);
    const fundamentalStatus = deriveFundamentalStatus(score);

    // Build what-would-change
    let whatWouldChange = '';
    const isValueTrap = market?.trailingPE && market.trailingPE < 15 && ((market.roe && market.roe < 8) || (market.debtToEquity && market.debtToEquity > 1.8));
    if (isValueTrap) {
      whatWouldChange = `Caution: potential value trap. Requires ROE expansion above 12% or debt reduction before rerating multiple.`;
    } else if (valuationStatus === 'Elevated') {
      whatWouldChange = `Earnings growth accelerating to justify ${market?.trailingPE?.toFixed(1)}x multiple, or P/E contracting below ${sectorPE?.toFixed(0) ?? 22}x sector average`;
    } else if (fundamentalStatus === 'Weak') {
      whatWouldChange = `ROE improvement above 12%, or debt reduction below 1.0x D/E`;
    } else if (fundamentalStatus === 'Strong') {
      whatWouldChange = `Significant margin compression or earnings miss would require reassessment`;
    } else {
      whatWouldChange = `Quarterly earnings trajectory and sector-relative valuation evolution`;
    }

    // Register evidence
    if (market?.trailingPE !== undefined) {
      addMetricEvidence(evidence, {
        source: 'Yahoo Finance',
        metric: `${eq.ticker} Trailing P/E`,
        value: market.trailingPE,
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
      trailingPE: market?.trailingPE,
      forwardPE: market?.forwardPE,
      priceToBook: market?.priceToBook,
      dividendYield: market?.dividendYield,
      roe: market?.roe,
      debtToEquity: market?.debtToEquity,
      sectorPE,
      valuationStatus,
      fundamentalStatus,
      valuationScore,
      qualityScore,
      score,
      whatWouldChange,
    };
  });

  // Portfolio-weighted P/E and weighted earnings yield (Prompt #11)
  let weightedPENumerator = 0;
  let weightedPEDenominator = 0;
  let weightedEarningsYieldSum = 0;
  let totalEarningsYieldWeight = 0;

  for (const h of holdings) {
    if (h.trailingPE !== undefined && h.trailingPE > 0 && h.weight > 0) {
      weightedPENumerator += h.weight * h.trailingPE;
      weightedPEDenominator += h.weight;

      const ey = (1 / h.trailingPE) * 100;
      weightedEarningsYieldSum += ey * h.weight;
      totalEarningsYieldWeight += h.weight;
    }
  }

  const weightedPE = weightedPEDenominator > 0
    ? Math.round((weightedPENumerator / weightedPEDenominator) * 10) / 10
    : 0;

  const weightedEarningsYieldPct = totalEarningsYieldWeight > 0
    ? Math.round((weightedEarningsYieldSum / totalEarningsYieldWeight) * 100) / 100
    : 0;

  const harmonicMeanPE = weightedEarningsYieldPct > 0
    ? Math.round((100 / weightedEarningsYieldPct) * 10) / 10
    : 0;

  const potentialValueTraps = holdings
    .filter((h) => (h.trailingPE || 0) > 0 && (h.trailingPE || 0) < 15 && (((h.roe || 0) > 0 && (h.roe || 0) < 8) || (h.debtToEquity || 0) > 1.8))
    .map((h) => h.ticker);

  // Earnings yield spread vs risk-free
  const earningsYield = weightedEarningsYieldPct > 0 ? weightedEarningsYieldPct : (weightedPE > 0 ? (1 / weightedPE) * 100 : 0);
  const earningsYieldSpreadBps = Math.round((earningsYield - riskFreeRate) * 100);

  // Portfolio-level scores
  const scoredHoldings = holdings.filter((h) => h.weight > 0);
  const totalWeight = scoredHoldings.reduce((sum, h) => sum + h.weight, 0);

  const portfolioScore = totalWeight > 0
    ? Math.round(scoredHoldings.reduce((sum, h) => sum + h.score * h.weight, 0) / totalWeight)
    : 50;

  const valuationSubscore = totalWeight > 0
    ? Math.round(scoredHoldings.reduce((sum, h) => sum + h.valuationScore * h.weight, 0) / totalWeight)
    : 50;

  const qualitySubscore = totalWeight > 0
    ? Math.round(scoredHoldings.reduce((sum, h) => sum + h.qualityScore * h.weight, 0) / totalWeight)
    : 50;

  // Derive strengths and watch items
  const strengths: string[] = [];
  const watchItems: string[] = [];

  const strongCount = holdings.filter((h) => h.fundamentalStatus === 'Strong').length;
  if (strongCount >= holdings.length * 0.5) {
    strengths.push(`${strongCount}/${holdings.length} holdings rated fundamentally strong`);
  }
  if (weightedPE > 0 && weightedPE < 22) {
    strengths.push(`Portfolio trades at ${weightedPE}x weighted P/E, below Nifty 50 historical median`);
  }
  if (earningsYieldSpreadBps > 150) {
    strengths.push(`Positive earnings yield spread of ${earningsYieldSpreadBps}bps over risk-free rate`);
  }

  const weakCount = holdings.filter((h) => h.fundamentalStatus === 'Weak' || h.fundamentalStatus === 'Under Review').length;
  if (weakCount >= 2) {
    watchItems.push(`${weakCount} holdings show fundamental weakness requiring review`);
  }
  const elevatedCount = holdings.filter((h) => h.valuationStatus === 'Elevated').length;
  if (elevatedCount >= 2) {
    watchItems.push(`${elevatedCount} holdings trading at elevated valuations vs sector peers`);
  }
  if (earningsYieldSpreadBps < 0) {
    watchItems.push(`Negative earnings yield spread: portfolio valuation compresses equity risk premium`);
  }

  // Register portfolio-level evidence
  addMetricEvidence(evidence, {
    source: 'Deterministic Fundamental Engine',
    metric: 'Portfolio Weighted P/E',
    value: weightedPE,
    observedAt: new Date().toISOString(),
    confidence: weightedPEDenominator > 50 ? 'high' : 'medium',
  });

  const interpretation = `Portfolio fundamental score is ${portfolioScore}/100. ` +
    `Weighted trailing P/E of ${weightedPE}x (earnings yield spread: ${earningsYieldSpreadBps}bps vs risk-free). ` +
    `${strongCount}/${holdings.length} holdings rated Strong, ${weakCount} require attention.`;

  return {
    portfolioScore,
    weightedPE,
    weightedEarningsYieldPct,
    harmonicMeanPE,
    potentialValueTraps,
    earningsYieldSpreadBps,
    holdings,
    valuationSubscore,
    qualitySubscore,
    strengths,
    watchItems,
    interpretation,
  };
}
