/**
 * lib/analytics/analysisTrigger.ts
 *
 * Analysis Trigger Engine (Section 6).
 *
 * Compares current portfolio snapshot & market context with previous analyzed snapshot.
 * Determines whether an AI analysis execution is justified or should be skipped to conserve quota.
 *
 * Principle: Zero Unnecessary LLM Calls.
 * If NO_CHANGE or MINOR_CHANGE with fresh cache, reuse existing analysis without burning free-tier quota.
 */

import type { PortfolioSnapshot, MarketSnapshot } from '@/types/portfolio-snapshot';
import type { HistoricalSnapshot } from '@/lib/analytics/temporal';

export type TriggerOutcome = 'NO_CHANGE' | 'MINOR_CHANGE' | 'MATERIAL_CHANGE' | 'CRITICAL_CHANGE';

export interface AnalysisTriggerThresholds {
  /** Portfolio value change % threshold to trigger minor/material analysis (default 2% minor, 5% material) */
  valueChangeMinorPct: number;
  valueChangeMaterialPct: number;
  /** Top position weight change % (e.g. 3.0 percentage points) */
  topPositionWeightChangePct: number;
  /** Sector allocation shift % (e.g. 5.0 percentage points) */
  sectorAllocationShiftPct: number;
  /** Absolute beta change (e.g. 0.15) */
  betaShift: number;
  /** Technical breadth change % (e.g. 15 percentage points) */
  breadthShiftPct: number;
  /** USDINR change % (e.g. 1.5%) */
  fxMovePct: number;
  /** Brent crude change % (e.g. 5.0%) */
  crudeMovePct: number;
  /** US10Y yield shift in bps (e.g. 15 bps = 0.15) */
  yieldMoveBps: number;
}

export const DEFAULT_TRIGGER_THRESHOLDS: AnalysisTriggerThresholds = {
  valueChangeMinorPct: 2.0,
  valueChangeMaterialPct: 5.0,
  topPositionWeightChangePct: 3.0,
  sectorAllocationShiftPct: 5.0,
  betaShift: 0.15,
  breadthShiftPct: 15.0,
  fxMovePct: 1.5,
  crudeMovePct: 5.0,
  yieldMoveBps: 15,
};

export interface MetricComparison {
  metric: string;
  previous: number | string;
  current: number | string;
  absoluteDiff?: number;
  pctChange?: number;
  isMaterial: boolean;
}

export interface AnalysisTriggerDecision {
  outcome: TriggerOutcome;
  shouldRunAI: boolean;
  recommendedMode: 'none' | 'quick' | 'deep';
  reasons: string[];
  comparisons: MetricComparison[];
  snapshotHashMatch: boolean;
}

export interface TriggerInput {
  currentPortfolio: PortfolioSnapshot;
  currentMarket?: MarketSnapshot;
  currentBeta?: number;
  currentBreadthPct?: number;
  currentMacroRegime?: string;
  previousSnapshot?: HistoricalSnapshot | null;
  highMaterialityNewsCount?: number;
  thresholds?: Partial<AnalysisTriggerThresholds>;
  forceRun?: boolean;
}

/**
 * Evaluates whether portfolio and market conditions have materially changed.
 */
export function evaluateAnalysisTrigger(input: TriggerInput): AnalysisTriggerDecision {
  const cfg = { ...DEFAULT_TRIGGER_THRESHOLDS, ...(input.thresholds || {}) };
  const reasons: string[] = [];
  const comparisons: MetricComparison[] = [];

  // Forced run override
  if (input.forceRun) {
    return {
      outcome: 'MATERIAL_CHANGE',
      shouldRunAI: true,
      recommendedMode: 'deep',
      reasons: ['Analysis manually triggered with force=true'],
      comparisons: [],
      snapshotHashMatch: false,
    };
  }

  // If no previous snapshot exists, this is the first analysis -> Critical run
  if (!input.previousSnapshot) {
    return {
      outcome: 'CRITICAL_CHANGE',
      shouldRunAI: true,
      recommendedMode: 'deep',
      reasons: ['Initial portfolio analysis — no prior snapshot available for baseline comparison'],
      comparisons: [],
      snapshotHashMatch: false,
    };
  }

  const prev = input.previousSnapshot;
  const curr = input.currentPortfolio;

  let hasCritical = false;
  let hasMaterial = false;
  let hasMinor = false;

  // 1. Portfolio Net Worth Change
  if (prev.netWorth !== undefined && prev.netWorth > 0 && curr.aggregates.netWorth > 0) {
    const prevNetWorth = prev.netWorth;
    const nwDiff = curr.aggregates.netWorth - prevNetWorth;
    const nwPct = Math.abs((nwDiff / prevNetWorth) * 100);
    const isMaterial = nwPct >= cfg.valueChangeMaterialPct;
    const isMinor = nwPct >= cfg.valueChangeMinorPct;

    comparisons.push({
      metric: 'Net Worth',
      previous: prevNetWorth,
      current: curr.aggregates.netWorth,
      absoluteDiff: nwDiff,
      pctChange: nwPct,
      isMaterial,
    });

    if (isMaterial) {
      hasMaterial = true;
      reasons.push(`Portfolio net worth shifted by ${nwPct.toFixed(1)}% (>= ${cfg.valueChangeMaterialPct}%)`);
    } else if (isMinor) {
      hasMinor = true;
      reasons.push(`Portfolio net worth shifted slightly by ${nwPct.toFixed(1)}% (>= ${cfg.valueChangeMinorPct}%)`);
    }
  }

  // 2. Holdings Count Change (Additions or deletions)
  const prevHoldingsCount = (prev.equityCount || 0) + (prev.bondCount || 0);
  const currHoldingsCount = curr.aggregates.equityCount + curr.aggregates.bondCount;
  if (prevHoldingsCount > 0 && prevHoldingsCount !== currHoldingsCount) {
    hasMaterial = true;
    reasons.push(`Holdings count changed from ${prevHoldingsCount} to ${currHoldingsCount}`);
    comparisons.push({
      metric: 'Holdings Count',
      previous: prevHoldingsCount,
      current: currHoldingsCount,
      absoluteDiff: currHoldingsCount - prevHoldingsCount,
      isMaterial: true,
    });
  }

  // 3. Top 5 Concentration Shift
  if (prev.top5Percent !== undefined && curr.concentration.top5Percent !== undefined) {
    const diffPct = Math.abs((curr.concentration.top5Percent - prev.top5Percent) * 100);
    const isMaterial = diffPct >= cfg.topPositionWeightChangePct;
    comparisons.push({
      metric: 'Top 5 Concentration',
      previous: `${(prev.top5Percent * 100).toFixed(1)}%`,
      current: `${(curr.concentration.top5Percent * 100).toFixed(1)}%`,
      absoluteDiff: diffPct,
      isMaterial,
    });
    if (isMaterial) {
      hasMaterial = true;
      reasons.push(`Top 5 holdings concentration moved by ${diffPct.toFixed(1)}%`);
    }
  }

  // 4. Portfolio Beta Shift
  if (input.currentBeta !== undefined && prev.portfolioBeta !== undefined) {
    const betaDiff = Math.abs(input.currentBeta - prev.portfolioBeta);
    const isMaterial = betaDiff >= cfg.betaShift;
    comparisons.push({
      metric: 'Portfolio Beta',
      previous: prev.portfolioBeta,
      current: input.currentBeta,
      absoluteDiff: betaDiff,
      isMaterial,
    });
    if (isMaterial) {
      hasMaterial = true;
      reasons.push(`Portfolio beta shifted from ${prev.portfolioBeta} to ${input.currentBeta} (Δ ${betaDiff.toFixed(2)})`);
    }
  }

  // 5. Technical Breadth Shift
  if (input.currentBreadthPct !== undefined && prev.breadthPct !== undefined) {
    const breadthDiff = Math.abs(input.currentBreadthPct - prev.breadthPct);
    const isMaterial = breadthDiff >= cfg.breadthShiftPct;
    comparisons.push({
      metric: 'Market Breadth (>200DMA)',
      previous: `${prev.breadthPct.toFixed(1)}%`,
      current: `${input.currentBreadthPct.toFixed(1)}%`,
      absoluteDiff: breadthDiff,
      isMaterial,
    });
    if (isMaterial) {
      hasMaterial = true;
      reasons.push(`Technical breadth shifted by ${breadthDiff.toFixed(1)}%`);
    }
  }

  // 6. Macro Regime Shift
  if (input.currentMacroRegime && prev.macroRegime && input.currentMacroRegime !== prev.macroRegime) {
    hasCritical = true;
    reasons.push(`Macro regime changed from "${prev.macroRegime}" to "${input.currentMacroRegime}"`);
    comparisons.push({
      metric: 'Macro Regime',
      previous: prev.macroRegime,
      current: input.currentMacroRegime,
      isMaterial: true,
    });
  }

  // 7. FX Shock (USDINR)
  const prevUsdInr = prev.macroMetrics?.usdInr ?? prev.usdInr;
  if (input.currentMarket?.usdInr && prevUsdInr) {
    const fxPct = Math.abs(((input.currentMarket.usdInr.price - prevUsdInr) / prevUsdInr) * 100);
    if (fxPct >= cfg.fxMovePct) {
      hasMaterial = true;
      reasons.push(`USDINR moved ${fxPct.toFixed(1)}% (>= ${cfg.fxMovePct}%)`);
    }
  }

  // 8. Crude Oil Shock (Brent)
  const prevBrent = prev.macroMetrics?.brentCrude ?? prev.brentCrude;
  if (input.currentMarket?.brentCrude && prevBrent) {
    const crudePct = Math.abs(((input.currentMarket.brentCrude.price - prevBrent) / prevBrent) * 100);
    if (crudePct >= cfg.crudeMovePct) {
      hasMaterial = true;
      reasons.push(`Brent crude moved ${crudePct.toFixed(1)}% (>= ${cfg.crudeMovePct}%)`);
    }
  }

  // 9. High-Materiality News Event Trigger
  if (input.highMaterialityNewsCount && input.highMaterialityNewsCount >= 2) {
    hasMaterial = true;
    reasons.push(`${input.highMaterialityNewsCount} high-materiality clustered news events detected`);
  }

  // Determine Final Outcome and Mode
  let outcome: TriggerOutcome;
  let recommendedMode: 'none' | 'quick' | 'deep';
  let shouldRunAI: boolean;

  if (hasCritical) {
    outcome = 'CRITICAL_CHANGE';
    recommendedMode = 'deep';
    shouldRunAI = true;
  } else if (hasMaterial) {
    outcome = 'MATERIAL_CHANGE';
    recommendedMode = 'deep';
    shouldRunAI = true;
  } else if (hasMinor) {
    outcome = 'MINOR_CHANGE';
    recommendedMode = 'quick';
    shouldRunAI = true;
  } else {
    outcome = 'NO_CHANGE';
    recommendedMode = 'none';
    shouldRunAI = false;
    reasons.push('Portfolio and market conditions have not materially changed since last analysis');
  }

  return {
    outcome,
    shouldRunAI,
    recommendedMode,
    reasons,
    comparisons,
    snapshotHashMatch: false,
  };
}
