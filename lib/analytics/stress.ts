/**
 * lib/analytics/stress.ts
 *
 * Deterministic stress testing engine.
 * Calculates explicit portfolio impact from macro shocks.
 * The MATH is deterministic; only scenario INTERPRETATION goes to LLM.
 */

import type { PortfolioSnapshot } from '@/types/portfolio-snapshot';
import type { MacroAnalysis } from './macro';
import type { RiskDecomposition } from './concentration';
import type { EvidenceCollection } from '@/types/evidence';
import { addMetricEvidence } from '@/types/evidence';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface StressScenario {
  name: string;
  description: string;
  probability: string;

  shocks: {
    niftyPct?: number;
    brentChangePct?: number;
    usdInrChangePct?: number;
    rateChangeBps?: number;
  };

  /** Deterministic portfolio impact */
  portfolioImpactPct: number;
  equityImpactPct: number;
  bondImpactPct: number;

  /** Largest contributors to the impact */
  topContributors: { factor: string; impactPct: number }[];

  /** LLM-generated after deterministic calc (filled later) */
  interpretation?: string;
}

export interface StressTestResult {
  scenarios: StressScenario[];
  worstCaseImpactPct: number;
  bestCaseImpactPct: number;
  baselineImpactPct: number;
  interpretation: string;
}

// ─── Sector Beta Approximations ─────────────────────────────────────────────────

const SECTOR_BETA: Record<string, number> = {
  'banking': 1.1,
  'banks': 1.1,
  'financial services': 1.2,
  'nbfc': 1.3,
  'information technology': 0.85,
  'it': 0.85,
  'technology': 0.9,
  'fmcg': 0.6,
  'consumer staples': 0.6,
  'pharmaceuticals': 0.7,
  'pharma': 0.7,
  'healthcare': 0.7,
  'automobile': 1.15,
  'auto': 1.15,
  'energy': 0.9,
  'oil & gas': 0.85,
  'metals': 1.3,
  'real estate': 1.4,
  'realty': 1.4,
  'capital goods': 1.2,
  'infrastructure': 1.1,
  'consumer discretionary': 1.05,
  'telecom': 0.8,
  'chemicals': 1.0,
  'cement': 0.95,
  'insurance': 0.9,
  'power': 0.75,
};

function getSectorBeta(sector: string): number {
  const key = sector.toLowerCase().trim();
  return SECTOR_BETA[key] ?? 1.0;
}

// ─── Engine ─────────────────────────────────────────────────────────────────────

export function runStressTests(
  portfolio: PortfolioSnapshot,
  macro: MacroAnalysis,
  risk: RiskDecomposition,
  evidence: EvidenceCollection
): StressTestResult {
  const netWorth = portfolio.aggregates.netWorth;
  const equityPct = netWorth > 0 ? portfolio.aggregates.equityTotal / netWorth : 0;
  const bondPct = netWorth > 0 ? portfolio.aggregates.bondTotal / netWorth : 0;

  // Portfolio-weighted beta
  const sectorAlloc = portfolio.allocation.sectorAllocation;
  let portfolioBeta = 0;
  for (const s of sectorAlloc) {
    portfolioBeta += getSectorBeta(s.sector) * s.percent;
  }
  if (portfolioBeta === 0) portfolioBeta = 1.0;

  const weightedDuration = risk.bondAnalysis.weightedDuration;

  function computeScenario(
    name: string,
    description: string,
    probability: string,
    shocks: StressScenario['shocks']
  ): StressScenario {
    const contributors: { factor: string; impactPct: number }[] = [];

    // Equity impact from Nifty shock (beta-adjusted)
    let equityImpact = 0;
    if (shocks.niftyPct !== undefined) {
      equityImpact = shocks.niftyPct * portfolioBeta;
      contributors.push({
        factor: `Nifty ${shocks.niftyPct > 0 ? '+' : ''}${shocks.niftyPct}% (β=${portfolioBeta.toFixed(2)})`,
        impactPct: equityImpact * equityPct,
      });
    }

    // Bond impact from rate shock (duration-based)
    let bondImpact = 0;
    if (shocks.rateChangeBps !== undefined) {
      // Modified duration approximation: ΔP ≈ -D × Δy
      bondImpact = -weightedDuration * (shocks.rateChangeBps / 10000) * 100;
      contributors.push({
        factor: `Rate ${shocks.rateChangeBps > 0 ? '+' : ''}${shocks.rateChangeBps}bps (D=${weightedDuration.toFixed(1)})`,
        impactPct: bondImpact * bondPct,
      });
    }

    // Currency impact approximation
    if (shocks.usdInrChangePct !== undefined) {
      // Simplified: IT/pharma benefit, importers hurt
      const itExposure = sectorAlloc
        .filter((s) => /it|tech|software|pharma/i.test(s.sector))
        .reduce((sum, s) => sum + s.percent, 0);
      const importExposure = sectorAlloc
        .filter((s) => /auto|fmcg|chemical|paint/i.test(s.sector))
        .reduce((sum, s) => sum + s.percent, 0);

      const fxImpact = (itExposure * 0.5 - importExposure * 0.3) * shocks.usdInrChangePct;
      if (Math.abs(fxImpact) > 0.1) {
        contributors.push({
          factor: `USD/INR ${shocks.usdInrChangePct > 0 ? '+' : ''}${shocks.usdInrChangePct}%`,
          impactPct: fxImpact,
        });
      }
    }

    // Portfolio-level impact
    const portfolioImpactPct = Math.round(
      (equityImpact * equityPct + bondImpact * bondPct + contributors
        .filter((c) => !c.factor.startsWith('Nifty') && !c.factor.startsWith('Rate'))
        .reduce((sum, c) => sum + c.impactPct, 0)) * 10
    ) / 10;

    return {
      name,
      description,
      probability,
      shocks,
      portfolioImpactPct,
      equityImpactPct: Math.round(equityImpact * 10) / 10,
      bondImpactPct: Math.round(bondImpact * 10) / 10,
      topContributors: contributors.sort((a, b) => Math.abs(b.impactPct) - Math.abs(a.impactPct)),
    };
  }

  // ─── Define scenarios ─────────────────────────────────────────────────────────

  const bull = computeScenario(
    'Bull Case',
    'RBI rate cuts begin, crude drops below $70, FII buying resumes, strong earnings season.',
    '20-25%',
    { niftyPct: 15, rateChangeBps: -50, brentChangePct: -15, usdInrChangePct: -2 }
  );

  const base = computeScenario(
    'Base Case',
    'Steady GDP growth ~6.5%, rangebound crude $75-$85, sustained DII SIP inflows, moderate earnings growth.',
    '50-55%',
    { niftyPct: 8, rateChangeBps: 0, brentChangePct: 0, usdInrChangePct: 1 }
  );

  const bear = computeScenario(
    'Bear Case',
    'Crude surges >$95, US yields spike to 5.25%, persistent FII outflows, global slowdown.',
    '15-20%',
    { niftyPct: -12, rateChangeBps: 100, brentChangePct: 25, usdInrChangePct: 5 }
  );

  const tailRisk = computeScenario(
    'Tail Risk',
    'Severe global recession, Nifty correction >20%, credit event, liquidity crunch.',
    '5-10%',
    { niftyPct: -25, rateChangeBps: 200, brentChangePct: -30, usdInrChangePct: 8 }
  );

  const scenarios = [bull, base, bear, tailRisk];

  // Register evidence
  addMetricEvidence(evidence, {
    source: 'Deterministic Stress Engine',
    metric: 'Portfolio Beta',
    value: portfolioBeta.toFixed(2),
    observedAt: new Date().toISOString(),
    confidence: 'medium',
  });

  for (const s of scenarios) {
    addMetricEvidence(evidence, {
      source: 'Deterministic Stress Engine',
      metric: `${s.name} Impact`,
      value: `${s.portfolioImpactPct > 0 ? '+' : ''}${s.portfolioImpactPct}%`,
      observedAt: new Date().toISOString(),
      confidence: 'medium',
    });
  }

  const interpretation =
    `Stress test across ${scenarios.length} scenarios using portfolio β=${portfolioBeta.toFixed(2)}, ` +
    `bond duration=${weightedDuration.toFixed(1)}Y. ` +
    `Bull: ${bull.portfolioImpactPct > 0 ? '+' : ''}${bull.portfolioImpactPct}%, ` +
    `Base: ${base.portfolioImpactPct > 0 ? '+' : ''}${base.portfolioImpactPct}%, ` +
    `Bear: ${bear.portfolioImpactPct > 0 ? '+' : ''}${bear.portfolioImpactPct}%, ` +
    `Tail: ${tailRisk.portfolioImpactPct > 0 ? '+' : ''}${tailRisk.portfolioImpactPct}%.`;

  return {
    scenarios,
    bestCaseImpactPct: bull.portfolioImpactPct,
    baselineImpactPct: base.portfolioImpactPct,
    worstCaseImpactPct: tailRisk.portfolioImpactPct,
    interpretation,
  };
}
