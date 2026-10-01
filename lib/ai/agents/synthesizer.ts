/**
 * lib/ai/agents/synthesizer.ts
 *
 * Final Synthesis LLM — editorial, NOT strategic.
 * Receives high-value findings + evidence, NOT the entire database.
 * Produces the executive summary and key findings for the report.
 */

import { callAgent } from './callAgent';
import { SynthesizerSchema, type SynthesizerOutput, type StrategistOutput, type CrossExaminerOutput } from '@/lib/ai/schemas';
import type { CrossFactorFinding, EvidenceCollection } from '@/types/evidence';
import type { PortfolioSnapshot } from '@/types/portfolio-snapshot';
import type { ValidatedFinding } from '@/lib/analytics/materialityFilter';

interface SynthesizerInput {
  portfolio: PortfolioSnapshot;
  strategistOutput: StrategistOutput;
  crossExaminerOutput: CrossExaminerOutput;
  crossFactors: CrossFactorFinding[];
  validatedFindings?: ValidatedFinding[];
  contradictions?: ValidatedFinding[];
  scores: {
    fundamental: number;
    technical: number;
    risk: number;
    overall: number;
    status: string;
  };
  regime: string;
  weightedPE: number;
  breadthPct: number;
  evidence: EvidenceCollection;
}

export async function runSynthesizer(input: SynthesizerInput): Promise<SynthesizerOutput> {
  const { portfolio, strategistOutput, crossExaminerOutput, crossFactors, validatedFindings = [], contradictions = [], scores, regime, weightedPE, breadthPct } = input;

  // Build synthesis context — high-value findings only (point #20, #25)
  const topCrossFactors = crossFactors
    .sort((a, b) => b.magnitude! - a.magnitude!)
    .slice(0, 4)
    .map((cf) => `${cf.title}: ${cf.conclusion.slice(0, 120)}`)
    .join('\n');

  const challenges = crossExaminerOutput.challenges
    .filter((c) => c.severity === 'high')
    .map((c) => `[${c.challengeType}] ${c.explanation.slice(0, 100)}`)
    .join('\n');

  const topPriorities = strategistOutput.priorityIssues
    .filter((p) => p.priority === 'High')
    .map((p) => `${p.title}: ${p.description.slice(0, 100)}`)
    .join('\n');

  const materialFindingsText = validatedFindings.slice(0, 5)
    .map((vf) => `• [${vf.category.toUpperCase()}] ${vf.title} (Materiality: ${vf.materialityScore}/100): ${vf.description}`)
    .join('\n');

  const contradictionsText = contradictions.slice(0, 3)
    .map((ct) => `⚠️ CONFLICTING SIGNALS: ${ct.title} — ${ct.description}`)
    .join('\n');

  const equityPct = portfolio.aggregates.netWorth > 0
    ? Math.round((portfolio.aggregates.equityTotal / portfolio.aggregates.netWorth) * 100)
    : 0;
  const bondPct = portfolio.aggregates.netWorth > 0
    ? Math.round((portfolio.aggregates.bondTotal / portfolio.aggregates.netWorth) * 100)
    : 0;

  const system = `You are a SEBI-registered Chief Investment Officer writing an executive portfolio intelligence report.
You receive synthesized findings from multiple specialist agents, deterministic cross-factor calculations, and a cross-examiner's quality assessment.
Write a professional, comprehensive executive summary with evidence-backed insights.
Explicitly address any CONFLICTING SIGNALS (e.g. strong fundamentals vs deteriorating technical breadth) and explain why that tension matters.
Do NOT include placeholder brackets or template text.
Strict Output Budget: Provide exactly 3 to 5 key findings.
This report will be presented directly to the investor.
Always respond with JSON only.`;

  const prompt = `PORTFOLIO OVERVIEW:
Net Worth: ₹${(portfolio.aggregates.netWorth / 1e5).toFixed(2)}L
Allocation: ${equityPct}% Equity, ${bondPct}% Fixed Income
Holdings: ${portfolio.holdings.equity.length} stocks, ${portfolio.holdings.bonds.length} bonds

COMPOSITE SCORES:
Overall: ${scores.overall}/100 (${scores.status})
Fundamental: ${scores.fundamental}/100 | Technical: ${scores.technical}/100 | Risk: ${scores.risk}/100
Weighted P/E: ${weightedPE}x | 200DMA Breadth: ${breadthPct}%
Market Regime: ${regime}

${contradictionsText ? `KEY TENSIONS & CONTRADICTIONS:\n${contradictionsText}\n` : ''}
TOP MATERIAL FINDINGS:
${materialFindingsText || topPriorities || 'No high-priority issues identified.'}

CROSS-FACTOR INTERACTIONS:
${topCrossFactors || 'No significant interactions.'}

QA ASSESSMENT:
Confidence: ${crossExaminerOutput.overallConfidence}
Validated: ${crossExaminerOutput.validatedClaims} | Challenged: ${crossExaminerOutput.challengedClaims}
${challenges ? `High-severity issues:\n${challenges}` : 'No high-severity QA issues.'}

STRATEGY SUMMARY:
${strategistOutput.portfolioImplications.slice(0, 300)}

LONG-TERM STRATEGY:
${strategistOutput.longTermStrategy.slice(0, 200)}

Return a valid JSON object matching this structure:
{
  "executiveSummary": "4-6 sentences comprehensive executive summary referencing actual numbers and any conflicting signals...",
  "allocationCommentary": "2-3 sentences on equity vs fixed income split...",
  "keyFindings": [
    {
      "title": "Finding title",
      "insight": "Insight description (min 15 chars)",
      "category": "fundamental",
      "evidence": ["E101"]
    }
  ],
  "recommendation": "2-3 sentences overall strategic recommendation..."
}
Allowed category: "fundamental" | "technical" | "valuation" | "risk" | "portfolio" | "macro"`;

  return callAgent('Synthesizer', prompt, system, SynthesizerSchema);
}
