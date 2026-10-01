/**
 * lib/ai/agents/fundamental.ts
 *
 * Fundamental Analyst agent.
 * Receives deterministic fundamental analysis + evidence.
 * Interprets relationships — does NOT calculate.
 */

import { callAgent } from './callAgent';
import { FundamentalAgentSchema, type FundamentalAgentOutput } from '@/lib/ai/schemas';
import type { FundamentalAnalysis } from '@/lib/analytics/fundamentals';
import type { EvidenceCollection } from '@/types/evidence';

export async function runFundamentalAgent(
  analysis: FundamentalAnalysis,
  evidence: EvidenceCollection
): Promise<FundamentalAgentOutput> {
  const relevantEvidence = evidence.metrics
    .filter((e) => e.metric.includes('P/E') || e.metric.includes('Fundamental'))
    .map((e) => `[${e.id}] ${e.metric}: ${e.value} (source: ${e.source})`)
    .join('\n');

  const holdingsTable = analysis.holdings
    .map((h) => `${h.ticker} | Weight: ${h.weight.toFixed(1)}% | P/E: ${h.trailingPE ?? 'N/A'} (sector: ${h.sectorPE ?? 'N/A'}) | Status: ${h.fundamentalStatus} | Score: ${h.score}/100`)
    .join('\n');

  const system = `You are a senior equity research analyst specializing in Indian capital markets fundamentals.
You receive pre-computed fundamental analysis from a deterministic scoring engine.
Your job is to INTERPRET the relationships, NOT recalculate scores.
Explain WHY certain holdings are strong/weak, what the portfolio-level fundamental posture means,
and what would change your assessment. Reference evidence IDs in your reasoning.
Always respond with JSON only.`;

  const prompt = `PORTFOLIO FUNDAMENTAL ANALYSIS (Pre-computed):

Portfolio Fundamental Score: ${analysis.portfolioScore}/100
Weighted P/E: ${analysis.weightedPE}x
Earnings Yield Spread vs Risk-Free: ${analysis.earningsYieldSpreadBps}bps
Valuation Subscore: ${analysis.valuationSubscore}/100
Quality Subscore: ${analysis.qualitySubscore}/100

PER-HOLDING FUNDAMENTALS:
${holdingsTable}

PRE-IDENTIFIED STRENGTHS:
${analysis.strengths.map((s, i) => `${i + 1}. ${s}`).join('\n')}

PRE-IDENTIFIED WATCH ITEMS:
${analysis.watchItems.map((w, i) => `${i + 1}. ${w}`).join('\n')}

EVIDENCE:
${relevantEvidence}

Return JSON with:
- "strengths": 2-4 interpretive strength statements explaining WHY these are strengths
- "watchItems": 2-4 specific items to monitor with reasoning
- "interpretation": 3-5 sentences analyzing profitability, balance sheet quality, and valuation posture
- "holdingAssessments": for each holding, status and 1-sentence explanation
- "whatWouldChangeTheView": what would cause a reassessment
- "evidenceRefs": array of {claim, evidenceIds} linking your claims to evidence`;

  return callAgent('FundamentalAgent', prompt, system, FundamentalAgentSchema);
}
