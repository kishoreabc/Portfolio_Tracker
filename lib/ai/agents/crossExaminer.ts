/**
 * lib/ai/agents/crossExaminer.ts
 *
 * Cross-Examiner agent — a formal QA system, NOT another opinion generator.
 * Given explicit tests to run against specialist agent outputs.
 *
 * Tests:
 * 1. Unsupported claim?
 * 2. Conflicting evidence?
 * 3. Missing portfolio exposure?
 * 4. Stale data?
 * 5. Incorrect mathematical conclusion?
 * 6. Macro transmission unsupported?
 * 7. Recommendation exceeds evidence?
 * 8. Scenario assumption inconsistent?
 * 9. Fundamental/technical disagreement ignored?
 * 10. Source credibility problem?
 */

import { callAgent } from './callAgent';
import { CrossExaminerSchema, type CrossExaminerOutput } from '@/lib/ai/schemas';
import type { FundamentalAgentOutput } from '@/lib/ai/schemas';
import type { TechnicalAgentOutput } from '@/lib/ai/schemas';
import type { MacroAgentOutput } from '@/lib/ai/schemas';
import type { RiskAgentOutput } from '@/lib/ai/schemas';
import type { StrategistOutput } from '@/lib/ai/schemas';
import type { AnalysisQuality, EvidenceCollection } from '@/types/evidence';

interface CrossExaminerInput {
  fundamentalOutput: FundamentalAgentOutput;
  technicalOutput: TechnicalAgentOutput;
  macroOutput: MacroAgentOutput;
  riskOutput: RiskAgentOutput;
  strategistOutput: StrategistOutput;
  dataQuality: AnalysisQuality;
  evidence: EvidenceCollection;
}

export async function runCrossExaminer(input: CrossExaminerInput): Promise<CrossExaminerOutput> {
  const { fundamentalOutput, technicalOutput, macroOutput, riskOutput, strategistOutput, dataQuality, evidence } = input;

  const allEvidenceIds = evidence.metrics.map((e) => e.id);
  const allCrossFactorIds = evidence.crossFactors.map((cf) => cf.id);
  const staleMetrics = dataQuality.staleMetrics;
  const missingMetrics = dataQuality.missingMetrics;

  const system = `You are a rigorous quality assurance analyst for financial intelligence reports.
You receive outputs from 5 specialist AI agents and a data quality assessment.
Your job is NOT to add opinions. Your job is to find PROBLEMS with the analysis.

Run these explicit tests against every claim made by the specialist agents:

1. UNSUPPORTED: Does the claim reference specific evidence? Or is it vague?
2. CONTRADICTION: Do two agents disagree without acknowledging it?
3. STALE_DATA: Is a claim based on data flagged as stale?
4. MISSING_CONTEXT: Does a claim ignore important missing data?
5. CALCULATION_ISSUE: Does a narrative conclusion contradict the numbers provided?
6. OVERREACH: Does a recommendation go beyond what the evidence supports?

Be specific. Cite which agent made the problematic claim and what evidence ID would be needed.
Count validated claims and challenged claims to compute overall confidence.
Always respond with JSON only.`;

  const prompt = `SPECIALIST AGENT OUTPUTS TO EXAMINE:

=== FUNDAMENTAL AGENT ===
Interpretation: ${fundamentalOutput.interpretation}
Strengths: ${fundamentalOutput.strengths.join('; ')}
Watch Items: ${fundamentalOutput.watchItems.join('; ')}
Holding Assessments: ${fundamentalOutput.holdingAssessments.map((h) => `${h.ticker}: ${h.status} — ${h.explanation}`).join('; ')}

=== TECHNICAL AGENT ===
Trend: ${technicalOutput.trendAssessment}
Breadth: ${technicalOutput.breadthInterpretation}
Signals: ${technicalOutput.holdingSignals.map((h) => `${h.ticker}: ${h.trend}/${h.momentum}`).join('; ')}

=== MACRO AGENT ===
Regime: ${macroOutput.regimeInterpretation}
Key Drivers: ${macroOutput.keyDrivers.join('; ')}
Portfolio Implications: ${macroOutput.portfolioImplications}

=== RISK AGENT ===
Risk Interpretation: ${riskOutput.riskInterpretation}
Top Risk: ${riskOutput.topRiskNarrative}
Scenario Count: ${riskOutput.scenarioInterpretations.length}

=== STRATEGIST AGENT ===
Portfolio Implications: ${strategistOutput.portfolioImplications}
Priority Issues: ${strategistOutput.priorityIssues.length}
Opportunities: ${strategistOutput.opportunities.length}
Risks: ${strategistOutput.risks.length}
Long-term Strategy: ${strategistOutput.longTermStrategy.slice(0, 200)}

=== DATA QUALITY ===
Overall: ${dataQuality.overall}
Missing: ${missingMetrics.join(', ') || 'None'}
Stale: ${staleMetrics.join(', ') || 'None'}

=== AVAILABLE EVIDENCE IDS ===
Metric Evidence: ${allEvidenceIds.join(', ')}
Cross-Factor Findings: ${allCrossFactorIds.join(', ')}

Run all 6 quality tests. Return a valid JSON object matching this structure:
{
  "challenges": [
    {
      "agentSource": "Fundamental",
      "challengeType": "unsupported",
      "explanation": "Detailed explanation of the issue (min 20 chars)",
      "evidenceIds": ["E101"],
      "severity": "medium"
    }
  ],
  "validatedClaims": 10,
  "challengedClaims": 1,
  "overallConfidence": "High",
  "confidenceRationale": "Detailed confidence explanation (min 30 chars)"
}
Allowed challengeType: "unsupported" | "contradiction" | "stale_data" | "missing_context" | "calculation_issue" | "overreach"
Allowed severity: "high" | "medium" | "low"
Allowed overallConfidence: "High" | "Medium" | "Low"`;

  return callAgent('CrossExaminer', prompt, system, CrossExaminerSchema);
}
