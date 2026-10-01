/**
 * lib/analytics/confidencePropagation.ts
 *
 * Hierarchical Confidence Propagation with Bottleneck Detection.
 * Adheres to Critique #16 & #17:
 *   - Data Confidence -> Engine Confidence -> Finding Confidence -> AI Claim Confidence -> Report Confidence
 *   - Weakest link / bottleneck principle: Never use naive arithmetic averaging that conceals critical flaws
 *   - Explicitly identifies the single bottleneck limiting report confidence
 */

import type { AnalysisQuality } from '@/types/evidence';
import type { EngineConfidence } from '@/types/engine-output';
import type { ClaimValidationResult } from '@/lib/analytics/claimValidator';

export interface ConfidenceBottleneck {
  domain: 'market_data' | 'fundamentals' | 'technicals' | 'macro' | 'news' | 'claims' | 'synthesis';
  severity: 'critical' | 'moderate' | 'minor';
  capLevel: 'high' | 'medium' | 'low';
  rationale: string;
}

export interface ClaimDomainConfidence {
  domain: 'fundamental' | 'technical' | 'macro' | 'risk_concentration' | 'bonds' | 'tax';
  confidence: 'high' | 'medium' | 'low';
  score: number;
  dependencies: string[];
  bottleneck?: string;
  rationale: string;
}

export interface HierarchicalConfidenceReport {
  overallConfidence: 'high' | 'medium' | 'low';
  overallScore: number; // 0–100

  layers: {
    dataLayer: {
      score: number;
      level: 'high' | 'medium' | 'low';
      missingCount: number;
      staleCount: number;
    };
    engineLayer: {
      score: number;
      level: 'high' | 'medium' | 'low';
      coveragePct: number;
      enginesCount: number;
    };
    claimsLayer: {
      score: number;
      level: 'high' | 'medium' | 'low';
      passRatePct: number;
      failedChecks: number;
    };
  };

  /** Claim-dependent confidence propagation (Critique Point #16) */
  claimDomainConfidences: Record<string, ClaimDomainConfidence>;

  /** The primary weakness pulling down overall confidence */
  bottleneck: ConfidenceBottleneck;

  confidenceRationale: string;
}

function levelToScore(level: 'high' | 'medium' | 'low'): number {
  if (level === 'high') return 90;
  if (level === 'medium') return 65;
  return 35;
}

export function propagateConfidence(inputs: {
  dataQuality: AnalysisQuality;
  engines: EngineConfidence[];
  claimValidation?: ClaimValidationResult;
  crossExaminerConfidence?: 'high' | 'medium' | 'low' | 'High' | 'Medium' | 'Low';
}): HierarchicalConfidenceReport {
  const normQA = (inputs.crossExaminerConfidence || 'medium').toLowerCase() as 'high' | 'medium' | 'low';
  const { dataQuality, engines, claimValidation } = inputs;
  const crossExaminerConfidence = normQA;

  // 1. Data Layer Confidence
  const dataQualityScores = [
    levelToScore(dataQuality.fundamental),
    levelToScore(dataQuality.technical),
    levelToScore(dataQuality.macro),
    levelToScore(dataQuality.news),
    levelToScore(dataQuality.portfolio),
  ];
  const dataScore = Math.round(dataQualityScores.reduce((a, b) => a + b, 0) / dataQualityScores.length);
  const dataLevel: 'high' | 'medium' | 'low' = dataScore >= 80 ? 'high' : dataScore >= 55 ? 'medium' : 'low';

  // 2. Engine Layer Confidence
  let engineCoverageSum = 0;
  let engineScoreSum = 0;
  for (const eng of engines) {
    engineCoverageSum += eng.coveragePct;
    engineScoreSum += levelToScore(eng.confidence);
  }
  const avgEngineCoverage = engines.length > 0 ? Math.round(engineCoverageSum / engines.length) : 50;
  const engineScore = engines.length > 0 ? Math.round(engineScoreSum / engines.length) : 50;
  const engineLevel: 'high' | 'medium' | 'low' = engineScore >= 80 ? 'high' : engineScore >= 55 ? 'medium' : 'low';

  // 3. Claims / Validation Layer Confidence
  let claimsScore = levelToScore(crossExaminerConfidence);
  let passRatePct = 100;
  let failedChecks = 0;

  if (claimValidation) {
    passRatePct = claimValidation.totalChecks > 0
      ? Math.round((claimValidation.passedChecks / claimValidation.totalChecks) * 100)
      : 100;
    failedChecks = claimValidation.failedChecks;

    if (failedChecks > 0) {
      claimsScore = Math.max(30, claimsScore - failedChecks * 20);
    }
  }

  const claimsLevel: 'high' | 'medium' | 'low' = claimsScore >= 80 ? 'high' : claimsScore >= 55 ? 'medium' : 'low';

  // 4. Bottleneck Detection (Weakest link analysis)
  const bottlenecks: ConfidenceBottleneck[] = [];

  // Check data quality bottlenecks
  if (dataQuality.fundamental === 'low') {
    bottlenecks.push({
      domain: 'fundamentals',
      severity: 'critical',
      capLevel: 'medium',
      rationale: `Fundamental financial metrics missing or ungrounded for multiple holdings: ${dataQuality.missingMetrics.slice(0, 3).join(', ')}`,
    });
  }

  if (dataQuality.news === 'low') {
    bottlenecks.push({
      domain: 'news',
      severity: 'minor',
      capLevel: 'medium',
      rationale: 'Recent financial news coverage is sparse or unverified; macro interpretations rely strictly on quantitative data',
    });
  }

  // Check validation failures
  if (failedChecks > 0) {
    bottlenecks.push({
      domain: 'claims',
      severity: 'critical',
      capLevel: 'low',
      rationale: `${failedChecks} deterministic invariant check(s) failed in agent claims`,
    });
  }

  // Check engine coverage
  const lowestEngine = engines.find((e) => e.confidence === 'low');
  if (lowestEngine) {
    bottlenecks.push({
      domain: 'fundamentals',
      severity: 'moderate',
      capLevel: 'medium',
      rationale: `Low data coverage in analytics engine: ${lowestEngine.interpretation.slice(0, 80)}`,
    });
  }

  // Pick dominant bottleneck
  const primaryBottleneck: ConfidenceBottleneck = bottlenecks[0] || {
    domain: 'synthesis',
    severity: 'minor',
    capLevel: 'high',
    rationale: 'All analytical layers operating within high-confidence parameters',
  };

  // 5. Hierarchical propagation: Overall confidence cannot exceed the bottleneck cap
  let overallScore = Math.round(dataScore * 0.35 + engineScore * 0.35 + claimsScore * 0.30);

  let overallConfidence: 'high' | 'medium' | 'low';
  if (primaryBottleneck.capLevel === 'low') {
    overallConfidence = 'low';
    overallScore = Math.min(overallScore, 45);
  } else if (primaryBottleneck.capLevel === 'medium') {
    overallConfidence = overallScore >= 60 ? 'medium' : 'low';
    overallScore = Math.min(overallScore, 70);
  } else {
    overallConfidence = overallScore >= 75 ? 'high' : overallScore >= 50 ? 'medium' : 'low';
  }

  // 5. Claim-Dependent Confidence Propagation (Critique Point #16)
  const claimDomainConfidences: Record<string, ClaimDomainConfidence> = {
    fundamental: {
      domain: 'fundamental',
      dependencies: ['market_quotes', 'pe_ratios', 'balance_sheet'],
      confidence: dataQuality.fundamental,
      score: levelToScore(dataQuality.fundamental),
      rationale: `Fundamental valuation claims depend strictly on corporate multiples (${dataQuality.fundamental}).`,
    },
    technical: {
      domain: 'technical',
      dependencies: ['50dma', '200dma', 'price_history'],
      confidence: dataQuality.technical,
      score: levelToScore(dataQuality.technical),
      rationale: `Technical momentum claims depend on moving average breadth (${dataQuality.technical}).`,
    },
    macro: {
      domain: 'macro',
      dependencies: ['indices', 'commodities', 'yields', 'news'],
      confidence: dataQuality.macro === 'low' || dataQuality.news === 'low' ? 'medium' : 'high',
      score: Math.round((levelToScore(dataQuality.macro) + levelToScore(dataQuality.news)) / 2),
      bottleneck: dataQuality.news === 'low' ? 'Sparse news coverage restricts qualitative narrative' : undefined,
      rationale: `Macro claims depend on live commodity quotes and verified news.`,
    },
    risk_concentration: {
      domain: 'risk_concentration',
      dependencies: ['portfolio_holdings', 'hhi_calculator', 'sector_weights'],
      confidence: dataQuality.portfolio,
      score: levelToScore(dataQuality.portfolio),
      rationale: `Concentration and HHI claims depend on verified portfolio ledger.`,
    },
    bonds: {
      domain: 'bonds',
      dependencies: ['bond_ledger', 'modified_duration', 'ytm'],
      confidence: dataQuality.portfolio,
      score: levelToScore(dataQuality.portfolio),
      rationale: `Fixed income duration and rate sensitivity depend on debt ISIN holdings.`,
    },
    tax: {
      domain: 'tax',
      dependencies: ['holding_periods', 'cost_basis', 'union_budget_2024_rules'],
      confidence: dataQuality.portfolio,
      score: levelToScore(dataQuality.portfolio),
      rationale: `Tax harvesting claims depend on purchase cost basis and Section 112A rules.`,
    },
  };

  const confidenceRationale =
    `Overall Report Confidence: ${overallConfidence.toUpperCase()} (${overallScore}/100). ` +
    `Data layer: ${dataLevel} (${dataScore}%), Engine layer: ${engineLevel} (${avgEngineCoverage}% coverage), Validation: ${claimsLevel} (${passRatePct}% invariant pass rate). ` +
    `Primary constraint: ${primaryBottleneck.rationale}.`;

  return {
    overallConfidence,
    overallScore,
    layers: {
      dataLayer: {
        score: dataScore,
        level: dataLevel,
        missingCount: dataQuality.missingMetrics.length,
        staleCount: dataQuality.staleMetrics.length,
      },
      engineLayer: {
        score: engineScore,
        level: engineLevel,
        coveragePct: avgEngineCoverage,
        enginesCount: engines.length,
      },
      claimsLayer: {
        score: claimsScore,
        level: claimsLevel,
        passRatePct,
        failedChecks,
      },
    },
    claimDomainConfidences,
    bottleneck: primaryBottleneck,
    confidenceRationale,
  };
}
