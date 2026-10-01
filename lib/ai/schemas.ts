/**
 * lib/ai/schemas.ts
 *
 * Zod schemas for all AI agent outputs.
 * Every agent MUST return structured, validated output.
 * Uses flexible, case-insensitive enum validation with alias mapping
 * so LLM outputs with minor casing/phrasing variances pass cleanly.
 */

import { z } from 'zod';

/** Helper to create robust case-insensitive enums with optional aliases and fallback default */
function makeFlexibleEnum<T extends string>(
  validValues: readonly T[],
  defaultValue?: T,
  aliases?: Record<string, T>
) {
  const map = new Map<string, T>();
  for (const v of validValues) {
    map.set(v.toLowerCase(), v);
  }
  if (aliases) {
    for (const [k, v] of Object.entries(aliases)) {
      map.set(k.toLowerCase(), v);
    }
  }

  return z.preprocess((val) => {
    if (typeof val === 'string') {
      const cleaned = val.toLowerCase().trim();
      const match = map.get(cleaned);
      if (match) return match;
    }
    return defaultValue !== undefined ? defaultValue : val;
  }, z.enum(validValues as [T, ...T[]]));
}

// ─── Shared primitives ─────────────────────────────────────────────────────────

const EvidenceRef = z.object({
  claim: z.string(),
  evidenceIds: z.array(z.string()),
});

// ─── Fundamental Agent ──────────────────────────────────────────────────────────

export const FundamentalAgentSchema = z.object({
  strengths: z.array(z.string()).min(1).max(5),
  watchItems: z.array(z.string()).min(1).max(5),
  interpretation: z.string().min(30),
  holdingAssessments: z.array(z.object({
    ticker: z.string(),
    status: makeFlexibleEnum(['Strong', 'Neutral', 'Weak', 'Under Review'] as const, 'Neutral'),
    explanation: z.string().min(15),
  })),
  whatWouldChangeTheView: z.string().min(20),
  evidenceRefs: z.array(EvidenceRef).optional(),
});

export type FundamentalAgentOutput = z.infer<typeof FundamentalAgentSchema>;

// ─── Technical Agent ────────────────────────────────────────────────────────────

export const TechnicalAgentSchema = z.object({
  trendAssessment: z.string().min(30),
  breadthInterpretation: z.string().min(20),
  holdingSignals: z.array(z.object({
    ticker: z.string(),
    trend: makeFlexibleEnum(['Bullish', 'Neutral', 'Bearish'] as const, 'Neutral'),
    momentum: makeFlexibleEnum(['Strong', 'Neutral', 'Weak'] as const, 'Neutral'),
    explanation: z.string().min(15),
  })),
  whatWouldChangeTheView: z.string().min(20),
  evidenceRefs: z.array(EvidenceRef).optional(),
});

export type TechnicalAgentOutput = z.infer<typeof TechnicalAgentSchema>;

// ─── Macro/News Agent ───────────────────────────────────────────────────────────

export const MacroAgentSchema = z.object({
  regimeInterpretation: z.string().min(30),
  keyDrivers: z.array(z.string()).min(1).max(6),
  sectorOutlook: z.record(z.string(), z.string()),
  rbiStance: z.string().optional(),
  fiiDiiDynamics: z.string().optional(),
  portfolioImplications: z.string().min(20),
  whatWouldChangeTheView: z.string().min(20),
  evidenceRefs: z.array(EvidenceRef).optional(),
});

export type MacroAgentOutput = z.infer<typeof MacroAgentSchema>;

// ─── Risk Agent ─────────────────────────────────────────────────────────────────

export const RiskAgentSchema = z.object({
  riskInterpretation: z.string().min(30),
  scenarioInterpretations: z.array(z.object({
    scenarioName: z.string(),
    interpretation: z.string().min(20),
    portfolioActions: z.string(),
  })),
  topRiskNarrative: z.string().min(30),
  whatWouldChangeTheView: z.string().min(20),
  evidenceRefs: z.array(EvidenceRef).optional(),
});

export type RiskAgentOutput = z.infer<typeof RiskAgentSchema>;

// ─── Portfolio Strategist ───────────────────────────────────────────────────────

export const StrategistSchema = z.object({
  portfolioImplications: z.string().min(50),
  priorityIssues: z.array(z.object({
    title: z.string(),
    description: z.string().min(20),
    priority: makeFlexibleEnum(['High', 'Medium', 'Low'] as const, 'Medium'),
    category: makeFlexibleEnum(['Rebalance', 'SIP', 'Tax', 'Debt', 'Diversification', 'Risk Management'] as const, 'Risk Management'),
    evidence: z.string(),
    actionable: z.string(),
  })).min(1).max(8),
  opportunities: z.array(z.object({
    title: z.string(),
    description: z.string().min(15),
    priority: makeFlexibleEnum(['High', 'Medium', 'Low'] as const, 'Medium'),
    category: makeFlexibleEnum(['Equity', 'Debt', 'Rebalance', 'SIP', 'Tax'] as const, 'Equity'),
    actionable: z.string(),
    evidence: z.string(),
  })).min(1).max(6),
  risks: z.array(z.object({
    title: z.string(),
    description: z.string().min(15),
    severity: makeFlexibleEnum(['High', 'Medium', 'Low'] as const, 'Medium'),
    mitigation: z.string(),
  })).min(1).max(6),
  longTermStrategy: z.string().min(50),
  thesisAssessments: z.array(z.object({
    ticker: z.string(),
    thesisStatus: makeFlexibleEnum(['Intact', 'Monitor', 'Review'] as const, 'Monitor'),
    explanation: z.string().min(15),
    catalystsWatch: z.string(),
  })),
  whatWouldChangeTheView: z.string().min(20),
  evidenceRefs: z.array(EvidenceRef).optional(),
});

export type StrategistOutput = z.infer<typeof StrategistSchema>;

// ─── Cross Examiner ─────────────────────────────────────────────────────────────

export const CrossExaminerSchema = z.object({
  challenges: z.array(z.object({
    claimId: z.string().optional(),
    agentSource: z.string(),
    challengeType: makeFlexibleEnum(
      ['unsupported', 'contradiction', 'stale_data', 'missing_context', 'calculation_issue', 'overreach'] as const,
      'unsupported',
      {
        'unsupported_claim': 'unsupported',
        'contradictory': 'contradiction',
        'stale': 'stale_data',
        'missing': 'missing_context',
        'missing_data': 'missing_context',
        'calculation': 'calculation_issue',
        'math_error': 'calculation_issue',
      }
    ),
    explanation: z.string().min(20),
    evidenceIds: z.array(z.string()),
    severity: makeFlexibleEnum(['high', 'medium', 'low'] as const, 'medium'),
  })),
  validatedClaims: z.number().int(),
  challengedClaims: z.number().int(),
  overallConfidence: makeFlexibleEnum(['High', 'Medium', 'Low'] as const, 'Medium'),
  confidenceRationale: z.string().min(30),
});

export type CrossExaminerOutput = z.infer<typeof CrossExaminerSchema>;

// ─── Final Synthesizer ──────────────────────────────────────────────────────────

export const SynthesizerSchema = z.object({
  executiveSummary: z.string().min(80),
  allocationCommentary: z.string().min(30),
  keyFindings: z.array(z.object({
    title: z.string(),
    insight: z.string().min(15),
    category: makeFlexibleEnum(
      ['fundamental', 'technical', 'valuation', 'risk', 'portfolio', 'macro'] as const,
      'portfolio',
      {
        'market': 'macro',
        'general': 'portfolio',
        'strategy': 'portfolio',
        'allocation': 'portfolio',
        'diversification': 'portfolio',
        'equity': 'fundamental',
        'debt': 'risk',
      }
    ),
    evidence: z.array(z.string()),
  })).min(2).max(6),
  recommendation: z.string().min(20),
});

export type SynthesizerOutput = z.infer<typeof SynthesizerSchema>;

// ─── Unified Portfolio Analyst (Quick Mode & Deep Mode Step 1) ─────────────────

export const UnifiedAnalystSchema = z.object({
  portfolioNarrative: z.string().min(50),
  keyFindings: z.array(z.object({
    title: z.string(),
    insight: z.string().min(15),
    category: makeFlexibleEnum(
      ['fundamental', 'technical', 'valuation', 'risk', 'portfolio', 'macro'] as const,
      'portfolio',
      {
        'market': 'macro',
        'general': 'portfolio',
        'strategy': 'portfolio',
        'allocation': 'portfolio',
        'diversification': 'portfolio',
      }
    ),
    evidenceIds: z.array(z.string()),
    importance: z.number().optional(),
    confidence: z.number().optional(),
  })).min(1).max(5),
  strengths: z.array(z.string()).min(1).max(5),
  risks: z.array(z.object({
    title: z.string(),
    description: z.string().min(15),
    severity: makeFlexibleEnum(['High', 'Medium', 'Low'] as const, 'Medium'),
    mitigation: z.string(),
    evidenceIds: z.array(z.string()).optional(),
  })).min(1).max(5),
  opportunities: z.array(z.object({
    title: z.string(),
    description: z.string().min(15),
    priority: makeFlexibleEnum(['High', 'Medium', 'Low'] as const, 'Medium'),
    category: makeFlexibleEnum(['Equity', 'Debt', 'Rebalance', 'SIP', 'Tax'] as const, 'Equity'),
    actionable: z.string(),
    evidenceIds: z.array(z.string()).optional(),
  })).min(1).max(5),
  priorityActions: z.array(z.object({
    title: z.string(),
    observation: z.string(),
    interpretation: z.string(),
    risk: z.string(),
    monitorCondition: z.string(),
    potentialConsideration: z.string(),
    priority: makeFlexibleEnum(['High', 'Medium', 'Low'] as const, 'Medium'),
    category: makeFlexibleEnum(['Rebalance', 'SIP', 'Tax', 'Debt', 'Diversification', 'Risk Management'] as const, 'Risk Management'),
  })).min(1).max(5),
  integratedHoldings: z.array(z.object({
    symbol: z.string(),
    fundamentals: z.string(),
    valuation: z.string(),
    technicals: z.string(),
    macroExposure: z.string(),
    newsContext: z.string(),
    interaction: makeFlexibleEnum(['aligned', 'partially_aligned', 'conflicting', 'insufficient_data'] as const, 'partially_aligned'),
    conclusion: z.string(),
    evidenceIds: z.array(z.string()),
  })),
  thesisMonitor: z.array(z.object({
    symbol: z.string(),
    thesisStatus: makeFlexibleEnum(['Intact', 'Monitor', 'Review', 'Invalidated'] as const, 'Monitor'),
    explanation: z.string(),
    catalystsWatch: z.string(),
  })),
  whatWouldChangeTheView: z.string().min(20),
  allocationCommentary: z.string().min(20),
});

export type UnifiedAnalystOutput = z.infer<typeof UnifiedAnalystSchema>;
