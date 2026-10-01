/**
 * lib/ai/agents/macro.ts
 *
 * Macro/News Analyst agent.
 * Interprets regime detection, macro exposure mappings, and news.
 * The LLM adds narrative context — does NOT determine regime or exposures.
 */

import { callAgent } from './callAgent';
import { MacroAgentSchema, type MacroAgentOutput } from '@/lib/ai/schemas';
import type { MacroAnalysis } from '@/lib/analytics/macro';
import type { NewsSnapshot } from '@/types/portfolio-snapshot';
import type { EvidenceCollection } from '@/types/evidence';

export async function runMacroAgent(
  macroAnalysis: MacroAnalysis,
  news: NewsSnapshot,
  portfolioSectors: string[],
  evidence: EvidenceCollection
): Promise<MacroAgentOutput> {
  const relevantEvidence = evidence.metrics
    .filter((e) => ['Crude', 'USD', 'INR', 'Yield', 'Treasury', 'Nifty'].some((kw) => e.metric.includes(kw)))
    .map((e) => `[${e.id}] ${e.metric}: ${e.value} (source: ${e.source})`)
    .join('\n');

  // Build news context (limited to prevent prompt bloat — point #20)
  const newsContext = news.articles
    .slice(0, 8)
    .map((a, i) => `[${i + 1}] ${a.title}${a.sentiment ? ` (${a.sentiment})` : ''}${a.summary ? ` — ${a.summary.slice(0, 120)}` : ''}`)
    .join('\n');

  const exposuresSummary = macroAnalysis.exposures
    .map((e) => `${e.variable}: ${e.currentValue} (${e.trend}) → ${e.direction} for ${e.affectedSectors.join(', ')}`)
    .join('\n');

  const system = `You are a macroeconomic strategist for Indian capital markets.
You receive a pre-computed market regime classification, portfolio-specific macro exposure mappings, and curated news.
Your job is to provide narrative interpretation of HOW these macro factors affect this specific portfolio.
Do not change the regime classification or recalculate exposures. Interpret them.
Ground your analysis in the provided news headlines and evidence.
Always respond with JSON only.`;

  const prompt = `MACRO ANALYSIS (Pre-computed):

Detected Regime: ${macroAnalysis.regime.replace(/_/g, ' ')} (confidence: ${macroAnalysis.regimeConfidence}%)
Rationale: ${macroAnalysis.regimeRationale}

Market Quotes:
- Nifty: ${macroAnalysis.niftyStatus}
- Sensex: ${macroAnalysis.sensexStatus}
- USD/INR: ${macroAnalysis.currencyStatus}
- Brent Crude: ${macroAnalysis.commodityStatus}
- US 10Y: ${macroAnalysis.yieldStatus}

PORTFOLIO MACRO EXPOSURES:
${exposuresSummary}

Portfolio Sectors: ${portfolioSectors.join(', ')}

What Would Change Regime: ${macroAnalysis.whatWouldChangeRegime}

NEWS HEADLINES (${news.searchSource}):
${news.tavilyBriefing ? `[BRIEFING]: ${news.tavilyBriefing.slice(0, 300)}\n` : ''}${newsContext}

EVIDENCE:
${relevantEvidence}

Return JSON with:
- "regimeInterpretation": 3-4 sentences interpreting the current macro regime for this portfolio
- "keyDrivers": 3-5 key macro drivers from news/data
- "sectorOutlook": {sector: outlook} for portfolio sectors
- "rbiStance": RBI policy interpretation if available from news
- "fiiDiiDynamics": FII/DII flow analysis if available
- "portfolioImplications": 2-3 sentences on what this means for the portfolio specifically
- "whatWouldChangeTheView": what macro shift would alter the assessment
- "evidenceRefs": array of {claim, evidenceIds}`;

  return callAgent('MacroAgent', prompt, system, MacroAgentSchema);
}
