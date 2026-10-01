/**
 * lib/ai/agents/risk.ts
 *
 * Risk Analyst agent.
 * Interprets pre-computed risk decomposition, stress scenarios, and cross-factor findings.
 */

import { callAgent } from './callAgent';
import { RiskAgentSchema, type RiskAgentOutput } from '@/lib/ai/schemas';
import type { RiskDecomposition } from '@/lib/analytics/concentration';
import type { StressTestResult } from '@/lib/analytics/stress';
import type { CrossFactorFinding, EvidenceCollection } from '@/types/evidence';

export async function runRiskAgent(
  risk: RiskDecomposition,
  stress: StressTestResult,
  crossFactors: CrossFactorFinding[],
  evidence: EvidenceCollection
): Promise<RiskAgentOutput> {
  const relevantEvidence = evidence.metrics
    .filter((e) => e.metric.includes('Concentration') || e.metric.includes('Risk') || e.metric.includes('Beta') || e.metric.includes('Impact') || e.metric.includes('HHI'))
    .map((e) => `[${e.id}] ${e.metric}: ${e.value} (source: ${e.source})`)
    .join('\n');

  const riskFlags = risk.flags
    .map((f) => `[${f.severity.toUpperCase()}] ${f.title}: ${f.description} → Action: ${f.actionRecommendation}`)
    .join('\n');

  const scenariosSummary = stress.scenarios
    .map((s) => `${s.name} (${s.probability}): Portfolio impact ${s.portfolioImpactPct > 0 ? '+' : ''}${s.portfolioImpactPct}% (Equity: ${s.equityImpactPct}%, Bond: ${s.bondImpactPct}%)`)
    .join('\n');

  const crossFactorSummary = crossFactors
    .map((cf) => `[${cf.id}] ${cf.title}: ${cf.conclusion.slice(0, 150)}`)
    .join('\n');

  const system = `You are a quantitative risk analyst specializing in Indian retail portfolio stress testing and risk management.
You receive pre-computed risk decomposition scores, deterministic stress test results (using sector betas and bond duration), and cross-factor findings.
Your job is to INTERPRET what these risk metrics mean in practice. Explain the stress scenarios in plain language.
Do NOT change any calculated numbers. Provide narrative on what the numbers mean for this investor.
Always respond with JSON only.`;

  const prompt = `RISK ANALYSIS (Pre-computed):

Overall Risk Score: ${risk.overallRiskScore}/100
Position Concentration: ${risk.positionConcentration}/100
Sector Concentration: ${risk.sectorConcentration}/100
Bond Duration Score: ${risk.bondDuration}/100
Issuer Concentration: ${risk.issuerConcentration}/100

Bond Analytics:
- Weighted Duration: ${risk.bondAnalysis.weightedDuration}Y (${risk.bondAnalysis.weightedDurationMonths ? `${risk.bondAnalysis.weightedDurationMonths}M` : `${Math.round(risk.bondAnalysis.weightedDuration * 12)}M`})
- Avg YTM: ${risk.bondAnalysis.avgYTM}%
- Credit Quality: ${risk.bondAnalysis.avgCreditQuality}
- Duration Risk: ${risk.bondAnalysis.durationRiskBps}bps per 100bps rate shock (${(risk.bondAnalysis.durationRiskBps / 100).toFixed(2)}% price impact)

RISK FLAGS:
${riskFlags || 'No critical flags raised.'}

STRESS TEST RESULTS (Deterministic):
${scenariosSummary}

CROSS-FACTOR INTERACTIONS:
${crossFactorSummary || 'No significant cross-factor interactions detected.'}

EVIDENCE:
${relevantEvidence}

Return JSON with:
- "riskInterpretation": 3-4 sentences interpreting overall risk posture
- "scenarioInterpretations": for each stress scenario, interpretation and recommended portfolio actions
- "topRiskNarrative": 2-3 sentences on the single most important risk factor
- "whatWouldChangeTheView": what would improve or worsen the risk profile
- "evidenceRefs": array of {claim, evidenceIds}`;

  return callAgent('RiskAgent', prompt, system, RiskAgentSchema);
}
