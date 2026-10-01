/**
 * lib/ai/agents/technical.ts
 *
 * Technical Analyst agent.
 * Interprets pre-computed technical analysis — does NOT calculate.
 */

import { callAgent } from './callAgent';
import { TechnicalAgentSchema, type TechnicalAgentOutput } from '@/lib/ai/schemas';
import type { TechnicalAnalysis } from '@/lib/analytics/technicals';
import type { EvidenceCollection } from '@/types/evidence';

export async function runTechnicalAgent(
  analysis: TechnicalAnalysis,
  evidence: EvidenceCollection
): Promise<TechnicalAgentOutput> {
  const relevantEvidence = evidence.metrics
    .filter((e) => e.metric.includes('DMA') || e.metric.includes('Breadth') || e.metric.includes('Technical'))
    .map((e) => `[${e.id}] ${e.metric}: ${e.value} (source: ${e.source})`)
    .join('\n');

  const holdingsTable = analysis.holdings
    .map((h) =>
      `${h.ticker} | CMP: ₹${h.currentPrice.toFixed(0)} | ` +
      `50DMA: ${h.fiftyDayAverage ? `₹${h.fiftyDayAverage.toFixed(0)} (${h.pctVs50DMA ?? 0}%)` : 'N/A'} | ` +
      `200DMA: ${h.twoHundredDayAverage ? `₹${h.twoHundredDayAverage.toFixed(0)} (${h.pctVs200DMA ?? 0}%)` : 'N/A'} | ` +
      `52W High: ${h.fiftyTwoWeekHigh ? `₹${h.fiftyTwoWeekHigh.toFixed(0)} (${h.pctFrom52WHigh ?? 0}%)` : 'N/A'} | ` +
      `Trend: ${h.trend} | Momentum: ${h.momentum} | Score: ${h.score}/100`
    )
    .join('\n');

  const system = `You are a technical analyst specializing in Indian equity price action, moving average structures, and momentum breadth.
You receive pre-computed technical metrics from a deterministic engine.
Your job is to INTERPRET price structures, identify key support/resistance levels, and assess overall portfolio technical health.
Do not recalculate scores. Explain what the technical picture means for each holding and the portfolio.
Always respond with JSON only.`;

  const prompt = `PORTFOLIO TECHNICAL ANALYSIS (Pre-computed):

Portfolio Technical Score: ${analysis.portfolioScore}/100
200DMA Breadth: ${analysis.holdingsAbove200DMA}/${analysis.holdingsWith200DMAData} (${analysis.breadthPct}%)
50DMA Breadth: ${analysis.breadth50Pct}%
Portfolio Trend: ${analysis.trend}
Portfolio Momentum: ${analysis.momentum}
Market Structure: ${analysis.marketStructure}

PER-HOLDING TECHNICALS:
${holdingsTable}

EVIDENCE:
${relevantEvidence}

Return JSON with:
- "trendAssessment": 3-4 sentences on overall portfolio trend structure
- "breadthInterpretation": 2-3 sentences on what breadth levels mean for market participation
- "holdingSignals": for each holding, trend/momentum assessment with 1-sentence explanation
- "whatWouldChangeTheView": what technical development would alter the assessment
- "evidenceRefs": array of {claim, evidenceIds}`;

  return callAgent('TechnicalAgent', prompt, system, TechnicalAgentSchema);
}
