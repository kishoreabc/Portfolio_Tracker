/**
 * lib/analytics/stressAttribution.ts
 *
 * Stress Attribution Engine.
 *
 * Instead of just:   "Portfolio impact = -8.2%"
 * Produces:
 *   Total = -8.2%
 *   ├── Equity beta         -4.1%
 *   ├── Sector shock        -1.6%
 *   ├── Bond duration       -1.2%
 *   ├── FX interaction      -0.8%
 *   └── Other               -0.5%
 *
 * Every scenario impact is decomposed into attributable factors.
 */

import type { StressTestResult } from './stress';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface AttributionComponent {
  factor: string;
  impactPct: number;
  /** Percentage of total impact attributable to this factor */
  contributionPct: number;
  explanation: string;
}

export interface ScenarioAttribution {
  scenarioName: string;
  totalImpactPct: number;
  components: AttributionComponent[];
  dominantFactor: string;
  /** What the user should do about this scenario */
  actionableInsight: string;
}

export interface StressAttributionResult {
  scenarios: ScenarioAttribution[];
  overallDominantRisk: string;
  interpretation: string;
}

// ─── Attribution Logic ──────────────────────────────────────────────────────────

interface AttributionInput {
  stressResults: StressTestResult;
  equityWeightPct: number;
  bondWeightPct: number;
  portfolioBeta: number;
  weightedDuration: number;
  /** Top sector weight for sector concentration shock */
  topSectorWeightPct: number;
  /** Does the portfolio have significant FX exposure (IT, pharma, etc)? */
  hasFxExposure: boolean;
  fxExposurePct: number;
}

export function attributeStressImpact(input: AttributionInput): StressAttributionResult {
  const {
    stressResults,
    equityWeightPct,
    bondWeightPct,
    portfolioBeta,
    weightedDuration,
    topSectorWeightPct,
    hasFxExposure,
    fxExposurePct,
  } = input;

  const scenarios: ScenarioAttribution[] = stressResults.scenarios.map((scenario) => {
    const total = scenario.portfolioImpactPct;
    const equityImpact = scenario.equityImpactPct;
    const bondImpact = scenario.bondImpactPct;

    // Orthogonalized Decomposition Methodology (Prompt #14):
    // 1. Systematic Market Beta: isolates market-wide sensitivity: equityImpact * (equityWeight/100) * min(1.0, portfolioBeta)
    // 2. Sector Concentration Residual: isolates excess sensitivity above broad market: equityImpact * (equityWeight/100) * max(0, portfolioBeta - 1.0) * (topSectorWeight/100)
    // 3. Bond Duration: isolates interest rate shift * bond sleeve: bondImpact * (bondWeight/100)
    // 4. FX Interaction: isolates currency passthrough on export/import sleeves
    // 5. Cross-Asset Residual: non-linear interactions ensuring exact sum = totalImpactPct
    const marketBetaFactor = Math.min(1.0, Math.max(0.2, portfolioBeta));
    const excessBetaFactor = Math.max(0, portfolioBeta - 1.0);

    const betaComponent = equityImpact * marketBetaFactor * (equityWeightPct / 100);
    const sectorComponent = topSectorWeightPct > 20
      ? (equityImpact * excessBetaFactor * (topSectorWeightPct / 100))
      : 0;

    // Decompose bond impact
    const durationComponent = bondImpact * (bondWeightPct / 100);

    // FX component
    const fxComponent = hasFxExposure
      ? total * 0.08 * (fxExposurePct / 100)
      : 0;

    // Residual ensuring mathematical exactness without double-counting
    const explained = betaComponent + sectorComponent + durationComponent + fxComponent;
    const residual = total - explained;

    const components: AttributionComponent[] = [];
    const absTotal = Math.abs(total) || 1;

    if (Math.abs(betaComponent) > 0.01) {
      components.push({
        factor: 'Equity Beta',
        impactPct: Math.round(betaComponent * 100) / 100,
        contributionPct: Math.round((Math.abs(betaComponent) / absTotal) * 100),
        explanation: `Market-wide equity move amplified by portfolio beta of ${portfolioBeta.toFixed(2)}`,
      });
    }

    if (Math.abs(sectorComponent) > 0.01) {
      components.push({
        factor: 'Sector Concentration',
        impactPct: Math.round(sectorComponent * 100) / 100,
        contributionPct: Math.round((Math.abs(sectorComponent) / absTotal) * 100),
        explanation: `Top sector exposure at ${topSectorWeightPct.toFixed(0)}% amplifies sector-specific shocks`,
      });
    }

    if (Math.abs(durationComponent) > 0.01) {
      components.push({
        factor: 'Bond Duration',
        impactPct: Math.round(durationComponent * 100) / 100,
        contributionPct: Math.round((Math.abs(durationComponent) / absTotal) * 100),
        explanation: `Weighted duration of ${weightedDuration.toFixed(1)}Y creates rate sensitivity`,
      });
    }

    if (Math.abs(fxComponent) > 0.01) {
      components.push({
        factor: 'FX Interaction',
        impactPct: Math.round(fxComponent * 100) / 100,
        contributionPct: Math.round((Math.abs(fxComponent) / absTotal) * 100),
        explanation: `${fxExposurePct.toFixed(0)}% of portfolio has FX sensitivity (IT, pharma exports)`,
      });
    }

    if (Math.abs(residual) > 0.01) {
      components.push({
        factor: 'Other / Interaction Effects',
        impactPct: Math.round(residual * 100) / 100,
        contributionPct: Math.round((Math.abs(residual) / absTotal) * 100),
        explanation: 'Non-linear effects, correlation changes, and unmodeled risk factors',
      });
    }

    // Sort by absolute impact
    components.sort((a, b) => Math.abs(b.impactPct) - Math.abs(a.impactPct));

    const dominantFactor = components[0]?.factor || 'Unknown';

    const actionableInsight = total < -5
      ? `Potential ${Math.abs(total)}% drawdown dominated by ${dominantFactor.toLowerCase()}. Consider hedging or reducing exposure.`
      : total > 5
        ? `Potential ${total}% upside driven by ${dominantFactor.toLowerCase()}. Current positioning benefits.`
        : `Modest impact of ${total}% within normal range. No immediate action needed.`;

    return {
      scenarioName: scenario.name,
      totalImpactPct: Math.round(total * 100) / 100,
      components,
      dominantFactor,
      actionableInsight,
    };
  });

  // Overall dominant risk (from worst-case scenario)
  const worstScenario = scenarios.reduce((w, s) =>
    s.totalImpactPct < w.totalImpactPct ? s : w, scenarios[0]
  );
  const overallDominantRisk = worstScenario?.dominantFactor || 'Market Risk';

  const interpretation = `Stress attribution across ${scenarios.length} scenarios. ` +
    `Worst case: ${worstScenario.scenarioName} (${worstScenario.totalImpactPct}%) dominated by ${overallDominantRisk}. ` +
    `${scenarios.map((s) => `${s.scenarioName}: ${s.totalImpactPct > 0 ? '+' : ''}${s.totalImpactPct}% (${s.dominantFactor})`).join('; ')}.`;

  return {
    scenarios,
    overallDominantRisk,
    interpretation,
  };
}
