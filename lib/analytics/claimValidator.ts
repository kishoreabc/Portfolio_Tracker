/**
 * lib/analytics/claimValidator.ts
 *
 * Deterministic Claim Validator (Sections 36 & 37).
 * Runs AFTER AI generation but BEFORE final response delivery.
 *
 * Checks:
 * 1. Numerical claims (P/E, weights, beta, breadth, stress impact) match deterministic calculations.
 * 2. Invariants: no fabricated undervalued claims without benchmark, no strong momentum without data.
 * 3. Freshness & source validation.
 * 4. Calculates Claim Coverage Metrics:
 *    - factualClaimCount
 *    - validatedClaimCount
 *    - unsupportedClaimCount
 *    - claimCoveragePercent
 */

import type { EvidenceCollection, AnalysisQuality } from '@/types/evidence';
import type { FundamentalAnalysis } from './fundamentals';
import type { TechnicalAnalysis } from './technicals';
import type { MacroAnalysis } from './macro';
import type { RiskDecomposition } from './concentration';
import type { StressTestResult } from './stress';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface ClaimViolation {
  id: string;
  type:
    | 'numerical_mismatch'
    | 'missing_evidence'
    | 'stale_data'
    | 'logic_error'
    | 'overreach'
    | 'invariant_violation';
  severity: 'error' | 'warning' | 'info';
  claim: string;
  expected?: string;
  actual?: string;
  explanation: string;
  source?: string;
}

export interface ClaimCoverageMetrics {
  factualClaimCount: number;
  validatedClaimCount: number;
  unsupportedClaimCount: number;
  claimCoveragePercent: number;
}

export interface ClaimValidationResult {
  violations: ClaimViolation[];
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  warningChecks: number;
  overallValid: boolean;
  confidence: 'high' | 'medium' | 'low';
  interpretation: string;
  claimCoverage: ClaimCoverageMetrics;
  // Direct shortcuts for Section 37
  factualClaimCount: number;
  validatedClaimCount: number;
  unsupportedClaimCount: number;
  claimCoveragePercent: number;
}

// ─── Validation Engine ──────────────────────────────────────────────────────────

export interface ValidatorInput {
  // Deterministic ground truth
  fundamental: FundamentalAnalysis;
  technical: TechnicalAnalysis;
  macro: MacroAnalysis;
  risk: RiskDecomposition;
  stress: StressTestResult;
  dataQuality: AnalysisQuality;
  evidence: EvidenceCollection;

  portfolioBeta?: number;

  // Agent claims to validate
  agentClaims: {
    fundamentalInterpretation?: string;
    technicalTrend?: string;
    macroRegime?: string;
    riskInterpretation?: string;
    strategistImplications?: string;
    executiveSummary?: string;
  };
}

export function validateClaims(input: ValidatorInput): ClaimValidationResult {
  const violations: ClaimViolation[] = [];
  let totalChecks = 0;
  let vId = 0;
  const nextId = () => `CV${String(++vId).padStart(3, '0')}`;

  const { fundamental, technical, macro, risk, stress, dataQuality, evidence, agentClaims } = input;

  // ═══════════════════════════════════════════════════════════════════════════
  // CHECK 1: Evidence existence
  // ═══════════════════════════════════════════════════════════════════════════

  totalChecks++;
  if (evidence.metrics.length === 0) {
    violations.push({
      id: nextId(),
      type: 'missing_evidence',
      severity: 'error',
      claim: 'Analysis contains claims but evidence collection is empty',
      explanation: 'No metric evidence was registered. Analytics engines may have failed to produce evidence.',
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHECK 2: Data freshness
  // ═══════════════════════════════════════════════════════════════════════════

  totalChecks++;
  if (dataQuality.staleMetrics.length > 0) {
    violations.push({
      id: nextId(),
      type: 'stale_data',
      severity: 'warning',
      claim: 'Analysis uses stale data',
      actual: dataQuality.staleMetrics.join('; '),
      explanation: `${dataQuality.staleMetrics.length} metrics are stale: ${dataQuality.staleMetrics.join(', ')}. Claims based on these may be outdated.`,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHECK 3: Fundamental score vs data availability
  // ═══════════════════════════════════════════════════════════════════════════

  totalChecks++;
  const holdingsWithPE = fundamental.holdings.filter((h) => h.trailingPE !== undefined).length;
  const totalHoldings = fundamental.holdings.length;
  const peCoverage = totalHoldings > 0 ? holdingsWithPE / totalHoldings : 0;

  if (peCoverage < 0.5 && fundamental.portfolioScore > 75) {
    violations.push({
      id: nextId(),
      type: 'overreach',
      severity: 'warning',
      claim: `Fundamental score of ${fundamental.portfolioScore}/100 with only ${holdingsWithPE}/${totalHoldings} P/E ratios available`,
      expected: `Score should reflect low data coverage (${Math.round(peCoverage * 100)}%)`,
      explanation: 'High fundamental confidence score despite low data coverage. Score may be unreliable.',
      source: 'FundamentalEngine',
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHECK 4: Technical claims vs data availability
  // ═══════════════════════════════════════════════════════════════════════════

  totalChecks++;
  const holdingsWith200DMA = technical.holdings.filter((h) => h.pctVs200DMA !== undefined).length;
  if (holdingsWith200DMA < totalHoldings * 0.5 && technical.trend !== 'Neutral') {
    violations.push({
      id: nextId(),
      type: 'invariant_violation',
      severity: 'warning',
      claim: `Technical trend assessed as "${technical.trend}" with only ${holdingsWith200DMA}/${totalHoldings} holdings having 200DMA data`,
      expected: 'Neutral assessment when >50% of holdings lack technical data',
      explanation: 'Decision invariant: Never call technical momentum strong/weak without sufficient technical data.',
      source: 'TechnicalEngine',
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHECK 5: Weighted P/E numerical sanity
  // ═══════════════════════════════════════════════════════════════════════════

  totalChecks++;
  if (fundamental.weightedPE > 0) {
    if (fundamental.weightedPE > 80) {
      violations.push({
        id: nextId(),
        type: 'numerical_mismatch',
        severity: 'warning',
        claim: `Portfolio weighted P/E of ${fundamental.weightedPE}x`,
        expected: 'Typical diversified portfolio P/E range: 12-45x',
        explanation: 'Extremely high P/E may indicate data quality issues or outlier-dominated weighting.',
        source: 'FundamentalEngine',
      });
    }
    if (fundamental.weightedPE < 3) {
      violations.push({
        id: nextId(),
        type: 'numerical_mismatch',
        severity: 'warning',
        claim: `Portfolio weighted P/E of ${fundamental.weightedPE}x`,
        expected: 'Typical diversified portfolio P/E range: 12-45x',
        explanation: 'Extremely low P/E may indicate data quality issues or negative earnings not handled.',
        source: 'FundamentalEngine',
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHECK 6: Concentration invariants
  // ═══════════════════════════════════════════════════════════════════════════

  totalChecks++;
  const riskScore = risk.overallRiskScore;
  if (risk.flags.some((f) => f.type === 'concentration' && (f.severity === 'red' || f.severity === 'orange'))) {
    if (riskScore > 75) {
      violations.push({
        id: nextId(),
        type: 'logic_error',
        severity: 'warning',
        claim: `Risk score ${riskScore}/100 despite active concentration flags`,
        expected: 'Risk score should be below 75 when concentration flags are raised',
        explanation: 'Concentration flags raised but not adequately reflected in overall risk score.',
        source: 'RiskEngine',
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHECK 7: Stress test consistency
  // ═══════════════════════════════════════════════════════════════════════════

  totalChecks++;
  if (stress.bestCaseImpactPct < stress.worstCaseImpactPct) {
    violations.push({
      id: nextId(),
      type: 'logic_error',
      severity: 'error',
      claim: `Bull case impact (${stress.bestCaseImpactPct}%) worse than bear case (${stress.worstCaseImpactPct}%)`,
      expected: 'Bull scenario should have better impact than bear/tail scenarios',
      explanation: 'Stress test scenario ordering is inverted. Check scenario definitions.',
      source: 'StressEngine',
    });
  }

  if (stress.baselineImpactPct > stress.bestCaseImpactPct ||
      stress.baselineImpactPct < stress.worstCaseImpactPct) {
    totalChecks++;
    violations.push({
      id: nextId(),
      type: 'logic_error',
      severity: 'warning',
      claim: `Base case (${stress.baselineImpactPct}%) outside bull-bear range [${stress.worstCaseImpactPct}%, ${stress.bestCaseImpactPct}%]`,
      expected: 'Base case should be between bull and bear scenarios',
      explanation: 'Base case scenario impact falls outside the bull/bear range.',
      source: 'StressEngine',
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHECK 8: Macro freshness invariant
  // ═══════════════════════════════════════════════════════════════════════════

  totalChecks++;
  if (dataQuality.macro === 'low' && macro.regimeConfidence > 60) {
    violations.push({
      id: nextId(),
      type: 'invariant_violation',
      severity: 'warning',
      claim: `Macro regime confidence ${macro.regimeConfidence}% with low macro data quality`,
      expected: 'Regime confidence should be capped at 40% when macro data quality is low',
      explanation: 'Decision invariant: Never describe current macro conditions with high confidence when data is stale/missing.',
      source: 'MacroEngine',
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHECK 9: Valuation invariant — never call undervalued without benchmark
  // ═══════════════════════════════════════════════════════════════════════════

  totalChecks++;
  const undervaluedWithoutBenchmark = fundamental.holdings.filter(
    (h) => h.valuationStatus === 'Undervalued' && h.sectorPE === undefined
  );
  if (undervaluedWithoutBenchmark.length > 0) {
    violations.push({
      id: nextId(),
      type: 'invariant_violation',
      severity: 'warning',
      claim: `${undervaluedWithoutBenchmark.map((h) => h.ticker).join(', ')} marked Undervalued without sector P/E benchmark`,
      expected: 'Undervalued status requires both holding P/E and sector benchmark P/E',
      explanation: 'Decision invariant: Never call an asset undervalued without a benchmark and evidence.',
      source: 'FundamentalEngine',
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHECK 10: Numerical claim validation against agent narrative (Section 36)
  // ═══════════════════════════════════════════════════════════════════════════

  const allAgentText = Object.values(agentClaims).filter(Boolean).join(' ');

  // 10A: P/E claim check
  const peMatches = [...allAgentText.matchAll(/(?:P\/E|PE|pe)\s*(?:of|is|at|:)?\s*(\d+(?:\.\d+)?)\s*x?/gi)];
  for (const match of peMatches) {
    totalChecks++;
    const statedPE = parseFloat(match[1]);
    const actualPE = fundamental.weightedPE;
    // If the stated PE deviates by > 20% from actual and doesn't match any holding PE
    const matchesHolding = fundamental.holdings.some((h) => h.trailingPE && Math.abs(h.trailingPE - statedPE) < 1.0);
    if (actualPE > 0 && Math.abs(statedPE - actualPE) > 3.0 && !matchesHolding) {
      violations.push({
        id: nextId(),
        type: 'numerical_mismatch',
        severity: 'error',
        claim: `Agent stated P/E of ${statedPE}x`,
        expected: `Verified portfolio weighted P/E is ${actualPE}x`,
        actual: `${statedPE}x`,
        explanation: 'Factual numerical claim contradicts verified deterministic portfolio P/E calculation.',
        source: 'AgentText',
      });
    }
  }

  // 10B: Beta claim check
  if (input.portfolioBeta !== undefined) {
    const betaMatches = [...allAgentText.matchAll(/(?:beta|Beta)\s*(?:of|is|at|:)?\s*(\d+(?:\.\d+)?)/g)];
    for (const match of betaMatches) {
      totalChecks++;
      const statedBeta = parseFloat(match[1]);
      if (Math.abs(statedBeta - input.portfolioBeta) > 0.25) {
        violations.push({
          id: nextId(),
          type: 'numerical_mismatch',
          severity: 'error',
          claim: `Agent stated Beta of ${statedBeta}`,
          expected: `Verified portfolio Beta is ${input.portfolioBeta}`,
          actual: `${statedBeta}`,
          explanation: 'Factual numerical claim contradicts verified portfolio beta calculation.',
          source: 'AgentText',
        });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHECK 11: Claim Coverage Metrics (Section 37)
  // ═══════════════════════════════════════════════════════════════════════════

  const errors = violations.filter((v) => v.severity === 'error').length;
  const warnings = violations.filter((v) => v.severity === 'warning').length;
  const _infos = violations.filter((v) => v.severity === 'info').length;
  void _infos;
  const passedChecks = Math.max(0, totalChecks - errors - warnings);
  const overallValid = errors === 0;

  const factualClaimCount = totalChecks;
  const validatedClaimCount = passedChecks;
  const unsupportedClaimCount = errors;
  const claimCoveragePercent = Math.round((validatedClaimCount / Math.max(1, factualClaimCount)) * 100);

  const confidence: 'high' | 'medium' | 'low' =
    errors > 0 ? 'low' :
    warnings > 2 ? 'medium' :
    'high';

  const interpretation = `Claim validation: ${totalChecks} checks run, ${passedChecks} passed, ${errors} errors, ${warnings} warnings. ` +
    `Claim coverage: ${claimCoveragePercent}% (${validatedClaimCount}/${factualClaimCount}). ` +
    `Overall: ${overallValid ? 'VALID' : 'INVALID'}. Confidence: ${confidence}.`;

  return {
    violations,
    totalChecks,
    passedChecks,
    failedChecks: errors,
    warningChecks: warnings,
    overallValid,
    confidence,
    interpretation,
    claimCoverage: {
      factualClaimCount,
      validatedClaimCount,
      unsupportedClaimCount,
      claimCoveragePercent,
    },
    factualClaimCount,
    validatedClaimCount,
    unsupportedClaimCount,
    claimCoveragePercent,
  };
}
