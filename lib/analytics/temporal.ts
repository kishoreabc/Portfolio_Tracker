/**
 * lib/analytics/temporal.ts
 *
 * Temporal Analytics Engine.
 *
 * Answers: "What CHANGED, how FAST, and is it ACCELERATING?"
 *
 * Every metric gets: CURRENT + CHANGE + RATE_OF_CHANGE
 * This is the #1 missing analytical capability in V2.
 *
 * Consumes historical snapshots stored in the database.
 * Falls back gracefully if no history is available.
 */

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface TemporalDataPoint {
  value: number;
  observedAt: string;
}

export interface TemporalMetric {
  metric: string;
  current: number;
  /** Previous period value (e.g., 1 month ago) */
  previous?: number;
  /** Absolute change */
  change?: number;
  /** % change */
  changePct?: number;
  /** Rate of change (velocity: change per period) */
  rateOfChange?: number;
  /** Direction relative to financial health */
  direction?: 'improving' | 'deteriorating' | 'flat' | 'mixed';
  /** Magnitude of shift */
  magnitude?: 'large' | 'medium' | 'small' | 'negligible';
  /** Rate of change (change of change, for acceleration detection) */
  acceleration?: 'accelerating' | 'decelerating' | 'stable' | 'reversing';
  /** Regime persistence: persistent multi-period deterioration/improvement vs transitory shock */
  persistence?: 'transitory' | 'emerging' | 'persistent' | 'structural' | 'insufficient_data';
  /** Structural break / regime shift classification (Point #4) */
  regimeShift?: 'break_down' | 'break_out' | 'stable' | 'regime_transition';
  /** Shock characterization: temporary shock vs structural regime shift */
  shockType?: 'temporary_shock' | 'structural_shift' | 'none';
  /** True if a sharp drop was followed by a subsequent recovery */
  recoveryObserved?: boolean;
  /** How many data points contributed */
  dataPoints: number;
  /** Trend over available history */
  trend: 'improving' | 'deteriorating' | 'stable' | 'volatile' | 'insufficient_data';
  /** Textual interpretation */
  interpretation: string;
}

export interface TemporalAnalysis {
  /** Portfolio-level temporal metrics */
  portfolio: TemporalMetric[];

  /** Market-level temporal metrics */
  market: TemporalMetric[];

  /** Per-holding temporal metrics (key = ticker) */
  holdings: Map<string, TemporalMetric[]>;

  /** Overall temporal assessment */
  momentum: 'improving' | 'deteriorating' | 'stable' | 'mixed';
  momentumConfidence: number;

  /** Persistent findings across historical periods (Prompt #25) */
  persistentFindings: PersistentFinding[];

  /** What changed most recently (for "why now?" reasoning) */
  significantChanges: SignificantChange[];

  interpretation: string;
}

export interface PersistentFinding {
  findingId: string;
  metric: string;
  firstObserved: string;
  lastObserved: string;
  consecutivePeriods: number;
  status: 'new' | 'persistent' | 'worsening' | 'improving' | 'resolved';
  severity: 'low' | 'medium' | 'high';
  historyValues: Array<{ asOf: string; value: number }>;
  narrative: string;
}

export interface SignificantChange {
  metric: string;
  domain: 'portfolio' | 'market' | 'macro' | 'holding';
  relatedSymbol?: string;
  previousValue: number;
  currentValue: number;
  changePct: number;
  direction: 'up' | 'down';
  magnitude: 'large' | 'medium' | 'small';
  /** Why this change matters for this portfolio */
  whyItMatters: string;
}

// ─── Historical Data Interface ──────────────────────────────────────────────────

export interface HistoricalSnapshot {
  snapshotId?: string;
  snapshotHash?: string;
  asOf: string;
  netWorth?: number;
  equityTotal?: number;
  bondTotal?: number;
  equityCount?: number;
  bondCount?: number;
  top5Percent?: number;
  herfindahlIndex?: number;
  diversificationScore?: number;
  weightedPE?: number;
  breadthPct?: number;
  portfolioBeta?: number;
  macroRegime?: string;
  macroMetrics?: {
    niftyPrice?: number;
    usdInr?: number;
    brentCrude?: number;
    us10y?: number;
    goldPrice?: number;
  };
  niftyPrice?: number;
  usdInr?: number;
  brentCrude?: number;
  us10y?: number;
  goldPrice?: number;
  /** Per-holding prices for DMA tracking */
  holdingPrices?: Record<string, number>;
}

// ─── Trend Detection ────────────────────────────────────────────────────────────

function detectTrend(values: number[]): TemporalMetric['trend'] {
  if (values.length < 2) return 'insufficient_data';
  if (values.length < 3) {
    const diff = values[values.length - 1] - values[0];
    const pctDiff = values[0] !== 0 ? Math.abs(diff / values[0]) * 100 : 0;
    if (pctDiff < 2) return 'stable';
    return diff > 0 ? 'improving' : 'deteriorating';
  }

  // Use least-squares slope for direction
  const n = values.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const mean = sumY / n;
  const normalizedSlope = mean !== 0 ? slope / mean : 0;

  // Check for volatility
  const diffs = values.slice(1).map((v, i) => v - values[i]);
  const signChanges = diffs.slice(1).filter((d, i) => d * diffs[i] < 0).length;
  const volatility = signChanges / Math.max(diffs.length - 1, 1);

  if (volatility > 0.6) return 'volatile';
  if (Math.abs(normalizedSlope) < 0.01) return 'stable';
  return normalizedSlope > 0 ? 'improving' : 'deteriorating';
}

function detectAcceleration(values: number[]): TemporalMetric['acceleration'] {
  if (values.length < 3) return 'stable';

  const changes = values.slice(1).map((v, i) => v - values[i]);

  if (changes.length < 2) return 'stable';

  const recentChange = changes[changes.length - 1];
  const previousChange = changes[changes.length - 2];

  // Same direction, increasing magnitude
  if (recentChange * previousChange > 0 && Math.abs(recentChange) > Math.abs(previousChange) * 1.1) {
    return 'accelerating';
  }
  // Same direction, decreasing magnitude
  if (recentChange * previousChange > 0 && Math.abs(recentChange) < Math.abs(previousChange) * 0.9) {
    return 'decelerating';
  }
  // Different direction
  if (recentChange * previousChange < 0) {
    return 'reversing';
  }
  return 'stable';
}

function detectPersistence(values: number[]): TemporalMetric['persistence'] {
  if (values.length < 3) return 'insufficient_data';

  const diffs = values.slice(1).map((v, i) => v - values[i]);
  const nonZeroDiffs = diffs.filter((d) => Math.abs(d) > 0.0001);
  if (nonZeroDiffs.length < 2) return 'transitory';

  // Count consecutive moves in the same direction from the tail
  let streak = 1;
  const lastSign = Math.sign(nonZeroDiffs[nonZeroDiffs.length - 1]);
  for (let i = nonZeroDiffs.length - 2; i >= 0; i--) {
    if (Math.sign(nonZeroDiffs[i]) === lastSign) {
      streak++;
    } else {
      break;
    }
  }

  // Check for shock reversal (e.g., 80 -> 45 -> 79)
  if (nonZeroDiffs.length >= 2) {
    const last = nonZeroDiffs[nonZeroDiffs.length - 1];
    const prev = nonZeroDiffs[nonZeroDiffs.length - 2];
    if (Math.sign(last) !== Math.sign(prev) && Math.abs(last) > Math.abs(prev) * 0.7) {
      return 'transitory';
    }
  }

  if (streak >= 4) return 'structural';
  if (streak >= 3) return 'persistent';
  if (streak === 2) return 'emerging';
  return 'transitory';
}

function buildTemporalMetric(
  metric: string,
  values: number[],
  higherIsBetter: boolean = true
): TemporalMetric {
  const current = values[values.length - 1];
  const previous = values.length >= 2 ? values[values.length - 2] : undefined;
  const change = previous !== undefined ? current - previous : undefined;
  const changePct = previous !== undefined && previous !== 0
    ? Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10
    : undefined;

  const rateOfChange = change !== undefined ? Math.round(change * 100) / 100 : undefined;

  // Financial health direction
  let direction: TemporalMetric['direction'] = 'flat';
  if (change !== undefined && Math.abs(change) > 0.001) {
    const isPositiveChange = change > 0;
    if (isPositiveChange === higherIsBetter) {
      direction = 'improving';
    } else {
      direction = 'deteriorating';
    }
  }

  // Magnitude classification
  let magnitude: TemporalMetric['magnitude'] = 'negligible';
  if (changePct !== undefined) {
    const absPct = Math.abs(changePct);
    if (absPct >= 15) magnitude = 'large';
    else if (absPct >= 5) magnitude = 'medium';
    else if (absPct >= 1) magnitude = 'small';
    else magnitude = 'negligible';
  }

  const trend = detectTrend(values);
  const acceleration = detectAcceleration(values);
  const persistence = detectPersistence(values);

  // Structural break & shock characterization (Critique Point #4)
  let shockType: TemporalMetric['shockType'] = 'none';
  let recoveryObserved = false;
  let regimeShift: TemporalMetric['regimeShift'] = 'stable';

  if (values.length >= 3) {
    const diffs = values.slice(1).map((v, i) => v - values[i]);
    const lastDiff = diffs[diffs.length - 1];
    const prevDiff = diffs[diffs.length - 2];
    const baseVal = Math.abs(values[values.length - 3]) || 1;

    // A sharp counter-move recovering from an earlier shock
    if (Math.sign(lastDiff) !== Math.sign(prevDiff) && Math.abs(prevDiff) > 0.05 * baseVal) {
      if (Math.abs(lastDiff) >= 0.65 * Math.abs(prevDiff)) {
        shockType = 'temporary_shock';
        recoveryObserved = true;
      }
    } else if (persistence === 'persistent' || persistence === 'structural') {
      shockType = 'structural_shift';
      regimeShift = direction === 'deteriorating' ? 'break_down' : direction === 'improving' ? 'break_out' : 'regime_transition';
    }
  }

  let interpretation = `${metric}: ${current}`;
  if (change !== undefined && changePct !== undefined) {
    const move = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
    const persistenceNote = persistence && persistence !== 'insufficient_data' ? ` (${persistence})` : '';
    const shockNote = shockType === 'temporary_shock' ? ' · Temporary shock (recovery observed)' : shockType === 'structural_shift' ? ` · Structural ${regimeShift}` : '';
    interpretation = `${metric}: ${current} (${move} ${Math.abs(changePct)}% from ${previous}). Trend: ${trend}${persistenceNote}${shockNote}. ${acceleration !== 'stable' ? `${acceleration}.` : ''}`;
  } else {
    interpretation = `${metric}: ${current}. No prior data for comparison.`;
  }

  return {
    metric,
    current,
    previous,
    change,
    changePct,
    rateOfChange,
    direction,
    magnitude,
    acceleration,
    persistence,
    regimeShift,
    shockType,
    recoveryObserved,
    dataPoints: values.length,
    trend,
    interpretation,
  };
}

// ─── Significant Change Detection ───────────────────────────────────────────────

function detectSignificance(
  metric: string,
  domain: SignificantChange['domain'],
  current: number,
  previous: number,
  thresholdPct: number,
  whyItMatters: string,
  relatedSymbol?: string
): SignificantChange | null {
  if (previous === 0) return null;
  const changePct = ((current - previous) / Math.abs(previous)) * 100;
  if (Math.abs(changePct) < thresholdPct) return null;

  return {
    metric,
    domain,
    relatedSymbol,
    previousValue: previous,
    currentValue: current,
    changePct: Math.round(changePct * 10) / 10,
    direction: changePct > 0 ? 'up' : 'down',
    magnitude: Math.abs(changePct) > thresholdPct * 3 ? 'large' : Math.abs(changePct) > thresholdPct * 1.5 ? 'medium' : 'small',
    whyItMatters,
  };
}

// ─── Main Engine ────────────────────────────────────────────────────────────────

interface TemporalInput {
  currentSnapshot: {
    netWorth: number;
    equityTotal: number;
    bondTotal: number;
    top5Percent: number;
    herfindahlIndex: number;
    diversificationScore: number;
    weightedPE: number;
    breadthPct: number;
  };
  currentMarket: {
    niftyPrice?: number;
    usdInr?: number;
    brentCrude?: number;
    us10y?: number;
    goldPrice?: number;
  };
  currentHoldings?: Record<string, number>;
  history: HistoricalSnapshot[];
}

export function runTemporalAnalysis(input: TemporalInput): TemporalAnalysis {
  const { currentSnapshot, currentMarket, currentHoldings: _currentHoldings, history } = input;
  void _currentHoldings;

  const portfolioMetrics: TemporalMetric[] = [];
  const marketMetrics: TemporalMetric[] = [];
  const holdingsMap = new Map<string, TemporalMetric[]>();
  const significantChanges: SignificantChange[] = [];

  // ─── Portfolio metrics over time ────────────────────────────────────────────

  const netWorthHistory = [...history.filter((h) => h.netWorth !== undefined).map((h) => h.netWorth!), currentSnapshot.netWorth];
  if (netWorthHistory.length >= 1) {
    portfolioMetrics.push(buildTemporalMetric('Net Worth', netWorthHistory));
  }

  const top5History = [...history.filter((h) => h.top5Percent !== undefined).map((h) => h.top5Percent!), currentSnapshot.top5Percent];
  if (top5History.length >= 1) {
    portfolioMetrics.push(buildTemporalMetric('Top-5 Concentration', top5History, false));
  }

  const peHistory = [...history.filter((h) => h.weightedPE !== undefined).map((h) => h.weightedPE!), currentSnapshot.weightedPE];
  if (peHistory.length >= 1) {
    portfolioMetrics.push(buildTemporalMetric('Weighted P/E', peHistory, false));
  }

  const breadthHistory = [...history.filter((h) => h.breadthPct !== undefined).map((h) => h.breadthPct!), currentSnapshot.breadthPct];
  if (breadthHistory.length >= 1) {
    portfolioMetrics.push(buildTemporalMetric('200DMA Breadth %', breadthHistory));
  }

  const divScoreHistory = [...history.filter((h) => h.diversificationScore !== undefined).map((h) => h.diversificationScore!), currentSnapshot.diversificationScore];
  if (divScoreHistory.length >= 1) {
    portfolioMetrics.push(buildTemporalMetric('Diversification Score', divScoreHistory));
  }

  // ─── Market metrics over time ───────────────────────────────────────────────

  if (currentMarket.niftyPrice !== undefined) {
    const niftyHistory = [...history.filter((h) => h.niftyPrice !== undefined).map((h) => h.niftyPrice!), currentMarket.niftyPrice];
    marketMetrics.push(buildTemporalMetric('Nifty 50', niftyHistory));
  }

  if (currentMarket.usdInr !== undefined) {
    const usdHistory = [...history.filter((h) => h.usdInr !== undefined).map((h) => h.usdInr!), currentMarket.usdInr];
    marketMetrics.push(buildTemporalMetric('USD/INR', usdHistory, false));

    const prev = usdHistory.length >= 2 ? usdHistory[usdHistory.length - 2] : undefined;
    if (prev !== undefined) {
      const sig = detectSignificance('USD/INR', 'macro', currentMarket.usdInr, prev, 1.5,
        'Currency depreciation impacts IT export revenue (tailwind) and import costs (headwind)');
      if (sig) significantChanges.push(sig);
    }
  }

  if (currentMarket.brentCrude !== undefined) {
    const brentHistory = [...history.filter((h) => h.brentCrude !== undefined).map((h) => h.brentCrude!), currentMarket.brentCrude];
    marketMetrics.push(buildTemporalMetric('Brent Crude', brentHistory, false));

    const prev = brentHistory.length >= 2 ? brentHistory[brentHistory.length - 2] : undefined;
    if (prev !== undefined) {
      const sig = detectSignificance('Brent Crude', 'macro', currentMarket.brentCrude, prev, 5,
        'Oil price changes flow through to inflation expectations, input costs, and central bank policy');
      if (sig) significantChanges.push(sig);
    }
  }

  if (currentMarket.us10y !== undefined) {
    const yieldHistory = [...history.filter((h) => h.us10y !== undefined).map((h) => h.us10y!), currentMarket.us10y];
    marketMetrics.push(buildTemporalMetric('US 10Y Yield', yieldHistory, false));

    const prev = yieldHistory.length >= 2 ? yieldHistory[yieldHistory.length - 2] : undefined;
    if (prev !== undefined) {
      const sig = detectSignificance('US 10Y Yield', 'macro', currentMarket.us10y, prev, 5,
        'Rising US yields increase global discount rates, compress equity valuations, and reduce FII appetite for EM assets');
      if (sig) significantChanges.push(sig);
    }
  }

  if (currentMarket.goldPrice !== undefined) {
    const goldHistory = [...history.filter((h) => h.goldPrice !== undefined).map((h) => h.goldPrice!), currentMarket.goldPrice];
    marketMetrics.push(buildTemporalMetric('Gold', goldHistory));
  }

  // ─── Breadth change significance ────────────────────────────────────────────

  if (breadthHistory.length >= 2) {
    const prevBreadth = breadthHistory[breadthHistory.length - 2];
    const sig = detectSignificance('200DMA Breadth', 'portfolio', currentSnapshot.breadthPct, prevBreadth, 10,
      'Breadth contraction means fewer holdings participate in the rally — market support narrows');
    if (sig) significantChanges.push(sig);
  }

  // ─── P/E change significance ────────────────────────────────────────────────

  if (peHistory.length >= 2) {
    const prevPE = peHistory[peHistory.length - 2];
    const sig = detectSignificance('Weighted P/E', 'portfolio', currentSnapshot.weightedPE, prevPE, 8,
      'P/E expansion without earnings growth signals valuation stretch; contraction may signal market de-rating');
    if (sig) significantChanges.push(sig);
  }

  // ─── Overall momentum ──────────────────────────────────────────────────────

  const trendCounts = { improving: 0, deteriorating: 0, stable: 0, other: 0 };
  for (const m of [...portfolioMetrics, ...marketMetrics]) {
    if (m.trend === 'improving') trendCounts.improving++;
    else if (m.trend === 'deteriorating') trendCounts.deteriorating++;
    else if (m.trend === 'stable') trendCounts.stable++;
    else trendCounts.other++;
  }

  const total = trendCounts.improving + trendCounts.deteriorating + trendCounts.stable;
  let momentum: TemporalAnalysis['momentum'] = 'mixed';
  let momentumConfidence = 30;

  if (total > 0) {
    if (trendCounts.improving > trendCounts.deteriorating * 2) { momentum = 'improving'; momentumConfidence = 70; }
    else if (trendCounts.deteriorating > trendCounts.improving * 2) { momentum = 'deteriorating'; momentumConfidence = 70; }
    else if (trendCounts.stable > total * 0.6) { momentum = 'stable'; momentumConfidence = 60; }
    else { momentum = 'mixed'; momentumConfidence = 40; }
  }

  // ─── Persistent Findings Tracking (Prompt #25 & #5) ─────────────────────────
  const persistentFindings: PersistentFinding[] = [];

  // 1. Concentration persistence tracking
  if (history.length >= 2 && currentSnapshot.top5Percent !== undefined) {
    const concValues: Array<{ asOf: string; value: number }> = [];
    for (const h of history) {
      if (h.top5Percent !== undefined) {
        concValues.push({ asOf: h.asOf, value: Math.round(h.top5Percent * 1000) / 10 });
      }
    }
    concValues.push({ asOf: new Date().toISOString(), value: Math.round(currentSnapshot.top5Percent * 1000) / 10 });

    if (concValues.length >= 3) {
      const v1 = concValues[concValues.length - 3].value;
      const v2 = concValues[concValues.length - 2].value;
      const v3 = concValues[concValues.length - 1].value;

      if (v3 > v2 && v2 > v1) {
        persistentFindings.push({
          findingId: 'PF_CONC_WORSENING',
          metric: 'Top 5 Concentration',
          firstObserved: concValues[concValues.length - 3].asOf,
          lastObserved: concValues[concValues.length - 1].asOf,
          consecutivePeriods: 3,
          status: 'worsening',
          severity: v3 > 50 ? 'high' : 'medium',
          historyValues: concValues.slice(-3),
          narrative: `This is the third consecutive period of increasing concentration (${v1}% → ${v2}% → ${v3}%).`,
        });
      } else if (v3 < v2 && v2 < v1) {
        persistentFindings.push({
          findingId: 'PF_CONC_IMPROVING',
          metric: 'Top 5 Concentration',
          firstObserved: concValues[concValues.length - 3].asOf,
          lastObserved: concValues[concValues.length - 1].asOf,
          consecutivePeriods: 3,
          status: 'improving',
          severity: 'low',
          historyValues: concValues.slice(-3),
          narrative: `Top 5 concentration has decreased across three consecutive periods (${v1}% → ${v2}% → ${v3}%).`,
        });
      }
    }
  }

  // 2. Breadth shock vs persistent deterioration (Prompt #5)
  if (history.length >= 2 && currentSnapshot.breadthPct !== undefined) {
    const bValues: Array<{ asOf: string; value: number }> = [];
    for (const h of history) {
      if (h.breadthPct !== undefined) {
        bValues.push({ asOf: h.asOf, value: h.breadthPct });
      }
    }
    bValues.push({ asOf: new Date().toISOString(), value: currentSnapshot.breadthPct });

    if (bValues.length >= 3) {
      const b1 = bValues[bValues.length - 3].value;
      const b2 = bValues[bValues.length - 2].value;
      const b3 = bValues[bValues.length - 1].value;

      // Sharp drop followed by recovery (e.g. 72% -> 42% -> 71%)
      if (b2 < b1 - 20 && b3 >= b1 - 5) {
        persistentFindings.push({
          findingId: 'PF_BREADTH_RECOVERY',
          metric: 'Technical Breadth (>200DMA)',
          firstObserved: bValues[bValues.length - 3].asOf,
          lastObserved: bValues[bValues.length - 1].asOf,
          consecutivePeriods: 3,
          status: 'resolved',
          severity: 'low',
          historyValues: bValues.slice(-3),
          narrative: `Temporary shock and swift recovery observed in 200DMA breadth (${b1}% → ${b2}% → ${b3}%).`,
        });
      } else if (b3 < b2 && b2 < b1 && b3 < 60) {
        persistentFindings.push({
          findingId: 'PF_BREADTH_DETERIORATING',
          metric: 'Technical Breadth (>200DMA)',
          firstObserved: bValues[bValues.length - 3].asOf,
          lastObserved: bValues[bValues.length - 1].asOf,
          consecutivePeriods: 3,
          status: 'worsening',
          severity: b3 < 40 ? 'high' : 'medium',
          historyValues: bValues.slice(-3),
          narrative: `Persistent multi-period deterioration in technical breadth (${b1}% → ${b2}% → ${b3}%).`,
        });
      }
    }
  }

  // Sort significant changes by magnitude
  significantChanges.sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));

  const historyAvailable = history.length > 0;
  const interpretation = historyAvailable
    ? `Temporal analysis across ${history.length} historical snapshots. ` +
      `Overall momentum: ${momentum} (${momentumConfidence}% confidence). ` +
      `${significantChanges.length} significant changes detected. ` +
      `${trendCounts.improving} improving, ${trendCounts.deteriorating} deteriorating, ${trendCounts.stable} stable trends.`
    : 'No historical data available. Temporal analysis requires at least one prior snapshot for comparison. ' +
      'Current values recorded as baseline for future temporal reasoning.';

  return {
    portfolio: portfolioMetrics,
    market: marketMetrics,
    holdings: holdingsMap,
    momentum,
    momentumConfidence,
    significantChanges,
    persistentFindings,
    interpretation,
  };
}
