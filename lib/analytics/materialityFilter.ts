/**
 * lib/analytics/materialityFilter.ts
 *
 * Materiality Ranking & Synthesizer Input Budget Filter.
 * Adheres to Critique #13, #14, #25:
 *   - Finding -> Exposure -> Magnitude -> Confidence -> Materiality -> Top Findings
 *   - Hard output budget: Enforces 3-5 executive insights, 3-5 risks, 3-5 opportunities, 3-5 recommendations
 *   - Prevents dumping 15,000 raw tokens into the Synthesizer
 */

import type { CrossFactorFinding } from '@/types/evidence';
import type { RiskFlag } from '@/lib/analytics/concentration';
import type { SignificantChange } from '@/lib/analytics/temporal';

export interface ValidatedFinding {
  id: string;
  category: 'risk' | 'opportunity' | 'structural' | 'rebalance' | 'tax' | 'macro';
  domain: 'fundamental' | 'technical' | 'macro' | 'risk' | 'cross_factor' | 'tax' | 'bonds' | 'portfolio';
  title: string;
  description: string;
  materialityScore: number; // 0–100 composite rank
  importance: number;       // 0–100 (Exposure x Impact x Severity) (Critique Point #15)
  portfolioImpact: number;  // 0–100 magnitude
  confidence: number;       // 0–100 data/evidence completeness
  urgency: number;          // 0–100
  evidenceIds: string[];
  affectedHoldings: string[];
  affectedSectors: string[];
  recommendedAction?: string;
  isContradiction?: boolean;
}

export interface Contradiction {
  id: string;
  issue: string;
  evidenceA: string[];
  evidenceB: string[];
  sideA: string;
  sideB: string;
  resolution: 'supports_A' | 'supports_B' | 'genuinely_mixed' | 'insufficient_data';
  confidence: number;
}

export interface MaterialityFilterBudget {
  maxExecutiveInsights: number; // default 5
  maxRisks: number;             // default 5
  maxOpportunities: number;     // default 5
  maxRecommendations: number;   // default 5
}

export interface FilteredSynthesisContext {
  topMaterialFindings: ValidatedFinding[];
  keyContradictions: ValidatedFinding[];
  contradictions: Contradiction[]; // Explicitly typed contradiction resolution (Critique Point #18)
  prioritizedRisks: ValidatedFinding[];
  prioritizedOpportunities: ValidatedFinding[];
  prioritizedActions: ValidatedFinding[];
  totalEvaluated: number;
  filteredOutNoiseCount: number;
}

export const DEFAULT_BUDGET: MaterialityFilterBudget = {
  maxExecutiveInsights: 5,
  maxRisks: 5,
  maxOpportunities: 5,
  maxRecommendations: 5,
};

function computeImportance(portfolioImpact: number, urgency: number, weightPct: number = 5): number {
  const normalizedWeight = Math.min(100, weightPct * 5);
  return Math.round(portfolioImpact * 0.50 + urgency * 0.30 + normalizedWeight * 0.20);
}

function computeMaterialityScore(
  portfolioImpact: number,
  confidence: number,
  urgency: number,
  weightPct: number = 5
): number {
  const importance = computeImportance(portfolioImpact, urgency, weightPct);
  return Math.round(importance * 0.65 + confidence * 0.35);
}

export function filterFindingsForSynthesis(
  inputs: {
    crossFactors: CrossFactorFinding[];
    riskFlags: RiskFlag[];
    significantChanges: SignificantChange[];
    taxFlags?: Array<{ title: string; description: string; actionable: string; severity: string }>;
    holdingSignalsCount?: number;
    challengesCount?: number;
  },
  budget: MaterialityFilterBudget = DEFAULT_BUDGET
): FilteredSynthesisContext {
  const pool: ValidatedFinding[] = [];
  let nextId = 1;

  // 1. Cross-Factor Findings (highest analytical depth)
  for (const cf of inputs.crossFactors) {
    const isContradiction = cf.relationship === 'conflicts';
    const isAmplifier = cf.relationship === 'amplifies';

    const impact = cf.magnitude ? Math.min(100, cf.magnitude * 20) : (isAmplifier ? 85 : isContradiction ? 75 : 60);
    const urgency = isContradiction || isAmplifier ? 80 : 50;
    const importance = computeImportance(impact, urgency, 10);
    const score = computeMaterialityScore(impact, cf.confidence, urgency, 10);

    pool.push({
      id: `VF_${String(nextId++).padStart(3, '0')}`,
      category: isContradiction ? 'structural' : isAmplifier ? 'risk' : 'opportunity',
      domain: 'cross_factor',
      title: cf.title,
      description: cf.conclusion,
      materialityScore: score,
      importance,
      portfolioImpact: impact,
      confidence: cf.confidence,
      urgency,
      evidenceIds: cf.evidenceIds,
      affectedHoldings: cf.affectedHoldings,
      affectedSectors: cf.affectedSectors,
      recommendedAction: cf.whatWouldChangeTheView,
      isContradiction,
    });
  }

  // 2. Risk Flags from Concentration & Bond engines
  for (const rf of inputs.riskFlags) {
    const impact = rf.severity === 'red' ? 90 : rf.severity === 'orange' ? 70 : 45;
    const urgency = rf.severity === 'red' ? 95 : rf.severity === 'orange' ? 70 : 40;
    const importance = computeImportance(impact, urgency, 12);
    const score = computeMaterialityScore(impact, 85, urgency, 12);

    pool.push({
      id: `VF_${String(nextId++).padStart(3, '0')}`,
      category: 'risk',
      domain: rf.type === 'duration' ? 'bonds' : 'risk',
      title: rf.title,
      description: rf.description,
      materialityScore: score,
      importance,
      portfolioImpact: impact,
      confidence: 85,
      urgency,
      evidenceIds: [],
      affectedHoldings: [],
      affectedSectors: [],
      recommendedAction: rf.actionRecommendation,
    });
  }

  // 3. Significant Temporal Changes ("why now?")
  for (const sc of inputs.significantChanges) {
    const impact = sc.magnitude === 'large' ? 85 : sc.magnitude === 'medium' ? 65 : 40;
    const urgency = sc.magnitude === 'large' ? 80 : 50;
    const importance = computeImportance(impact, urgency, 8);
    const score = computeMaterialityScore(impact, 80, urgency, 8);

    pool.push({
      id: `VF_${String(nextId++).padStart(3, '0')}`,
      category: sc.direction === 'down' ? 'risk' : 'opportunity',
      domain: sc.domain === 'portfolio' ? 'portfolio' : sc.domain === 'macro' ? 'macro' : 'technical',
      title: `${sc.metric} ${sc.direction.toUpperCase()} (${sc.changePct > 0 ? '+' : ''}${sc.changePct}%)`,
      description: sc.whyItMatters,
      materialityScore: score,
      importance,
      portfolioImpact: impact,
      confidence: 80,
      urgency,
      evidenceIds: [],
      affectedHoldings: sc.relatedSymbol ? [sc.relatedSymbol] : [],
      affectedSectors: [],
    });
  }

  // 4. Tax Optimization Flags
  if (inputs.taxFlags) {
    for (const tf of inputs.taxFlags) {
      const impact = tf.severity === 'orange' ? 75 : 55;
      const urgency = 60;
      const importance = computeImportance(impact, urgency, 5);
      const score = computeMaterialityScore(impact, 90, urgency, 5);

      pool.push({
        id: `VF_${String(nextId++).padStart(3, '0')}`,
        category: 'tax',
        domain: 'tax',
        title: tf.title,
        description: tf.description,
        materialityScore: score,
        importance,
        portfolioImpact: impact,
        confidence: 90,
        urgency,
        evidenceIds: [],
        affectedHoldings: [],
        affectedSectors: [],
        recommendedAction: tf.actionable,
      });
    }
  }

  // Explicit contradiction extraction with resolution (Critique Point #18)
  const contradictions: Contradiction[] = [];
  for (const cf of inputs.crossFactors) {
    if (cf.relationship === 'conflicts') {
      const half = Math.ceil(cf.evidenceIds.length / 2);
      contradictions.push({
        id: `CONTR_${contradictions.length + 1}`,
        issue: cf.title,
        evidenceA: cf.evidenceIds.slice(0, half),
        evidenceB: cf.evidenceIds.slice(half),
        sideA: (cf as { signalA?: string }).signalA || 'Fundamental Stance',
        sideB: (cf as { signalB?: string }).signalB || 'Technical / Macro Headwind',
        resolution: cf.confidence >= 75 ? 'genuinely_mixed' : 'insufficient_data',
        confidence: cf.confidence,
      });
    }
  }

  // Sort overall pool descending by materiality score
  pool.sort((a, b) => b.materialityScore - a.materialityScore);

  // Extract contradictions (conflicting signals)
  const keyContradictions = pool.filter((p) => p.isContradiction).slice(0, 3);

  // Extract top executive findings (highest materiality overall)
  const topMaterialFindings = pool.slice(0, budget.maxExecutiveInsights);

  // Extract prioritized risks
  const prioritizedRisks = pool
    .filter((p) => p.category === 'risk' || p.category === 'structural')
    .slice(0, budget.maxRisks);

  // Extract prioritized opportunities
  const prioritizedOpportunities = pool
    .filter((p) => p.category === 'opportunity' || p.category === 'tax')
    .slice(0, budget.maxOpportunities);

  // Extract actionable recommendations
  const prioritizedActions = pool
    .filter((p) => Boolean(p.recommendedAction))
    .slice(0, budget.maxRecommendations);

  const totalEvaluated = pool.length;
  const filteredOutNoiseCount = Math.max(0, totalEvaluated - (budget.maxExecutiveInsights + budget.maxRisks + budget.maxOpportunities));

  return {
    topMaterialFindings,
    keyContradictions,
    contradictions,
    prioritizedRisks,
    prioritizedOpportunities,
    prioritizedActions,
    totalEvaluated,
    filteredOutNoiseCount,
  };
}
