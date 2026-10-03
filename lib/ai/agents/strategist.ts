/**
 * lib/ai/agents/strategist.ts
 *
 * Portfolio Strategist agent.
 * Input: ALL deterministic analytics + ALL specialist agent outputs.
 * Answers: "Given everything we know, what matters at the PORTFOLIO level?"
 *
 * Company analysis ≠ portfolio decision.
 * The user owns weights, sector concentrations, bonds, cash.
 * This agent focuses on portfolio-level implications.
 */

import { callAgent } from './callAgent';
import { StrategistSchema, type StrategistOutput } from '@/lib/ai/schemas';
import type { FundamentalAnalysis } from '@/lib/analytics/fundamentals';
import type { TechnicalAnalysis } from '@/lib/analytics/technicals';
import type { MacroAnalysis } from '@/lib/analytics/macro';
import type { RiskDecomposition } from '@/lib/analytics/concentration';
import type { StressTestResult } from '@/lib/analytics/stress';
import type { CrossFactorFinding, EvidenceCollection } from '@/types/evidence';
import type { PortfolioSnapshot } from '@/types/portfolio-snapshot';
import type { TaxRuleSet } from '@/lib/config/taxRules';

interface StrategistInput {
  portfolio: PortfolioSnapshot;
  fundamental: FundamentalAnalysis;
  technical: TechnicalAnalysis;
  macro: MacroAnalysis;
  risk: RiskDecomposition;
  stress: StressTestResult;
  crossFactors: CrossFactorFinding[];
  taxRules: TaxRuleSet;
  evidence: EvidenceCollection;
}

export async function runStrategistAgent(input: StrategistInput): Promise<StrategistOutput> {
  const {
    portfolio, fundamental, technical, macro,
    risk, stress, crossFactors, taxRules, evidence: _evidence,
  } = input;

  const crossFactorSummary = crossFactors
    .map((cf) => `[${cf.id}] ${cf.title} (${cf.relationship}): ${cf.conclusion.slice(0, 150)}`)
    .join('\n');

  const holdingsSummary = portfolio.holdings.equity
    .slice(0, 10)
    .map((eq) => {
      const fund = fundamental.holdings.find((h) => h.ticker === eq.ticker);
      const tech = technical.holdings.find((h) => h.ticker === eq.ticker);
      return `${eq.ticker} | ${eq.sector} | Weight: ${eq.allocationPercent.toFixed(1)}% | ` +
        `Fundamental: ${fund?.fundamentalStatus || 'N/A'} | Technical: ${tech?.trend || 'N/A'} | ` +
        `P/E: ${fund?.trailingPE ?? 'N/A'} | 200DMA: ${tech?.pctVs200DMA ?? 'N/A'}%`;
    })
    .join('\n');

  const system = `You are a SEBI-registered Principal Wealth Advisor for Indian retail investors.
You receive comprehensive pre-computed analytics from deterministic engines and cross-factor analysis.
Your role is PORTFOLIO-LEVEL strategy — not individual stock analysis.

Focus on:
1. Portfolio-level implications: what matters given ALL the evidence together
2. Priority issues requiring action (ranked by urgency)
3. Actionable opportunities (Nifty index SIPs, TMFs, SGBs, tax harvesting). If the portfolio already holds Gold or Commodities (>= 3-5%), DO NOT recommend initiating a new gold position; instead evaluate maintaining or rebalancing the existing hedge.
4. Risks with specific mitigations
5. Investment thesis status for each holding
6. Tax efficiency using Indian tax framework (LTCG ${(taxRules.equityLtcgRate * 100).toFixed(1)}%, STCG ${(taxRules.equityStcgRate * 100).toFixed(0)}%, exemption ₹${(taxRules.equityLtcgExemption / 1000).toFixed(0)}K)

You must provide the "whatWouldChangeTheView" for your overall strategy assessment.
Always respond with JSON only.`;

  const assetAllocationSummary = (portfolio.allocation.assetAllocation || []).length > 0
    ? portfolio.allocation.assetAllocation.map((a) => `${a.label}: ${(a.percent * 100).toFixed(1)}%`).join(', ')
    : `Equity: ₹${(portfolio.aggregates.equityTotal / 1e5).toFixed(2)}L, Bonds: ₹${(portfolio.aggregates.bondTotal / 1e5).toFixed(2)}L`;

  const prompt = `PORTFOLIO CONTEXT:
Net Worth: ₹${(portfolio.aggregates.netWorth / 1e5).toFixed(2)}L
Asset Allocation: ${assetAllocationSummary}
Equity: ₹${(portfolio.aggregates.equityTotal / 1e5).toFixed(2)}L (${portfolio.holdings.equity.length} holdings)
Bonds: ₹${(portfolio.aggregates.bondTotal / 1e5).toFixed(2)}L (${portfolio.holdings.bonds.length} holdings)
Cash Flow: Monthly avg ₹${(portfolio.cashFlow.monthlyAvgInvestment / 1000).toFixed(1)}K

DETERMINISTIC SCORES:
Fundamental: ${fundamental.portfolioScore}/100 | Technical: ${technical.portfolioScore}/100
Risk: ${risk.overallRiskScore}/100 | Weighted P/E: ${fundamental.weightedPE}x
Breadth: ${technical.breadthPct}% above 200DMA
Regime: ${macro.regime.replace(/_/g, ' ')} (${macro.regimeConfidence}% confidence)

TOP HOLDINGS:
${holdingsSummary}

CROSS-FACTOR INTERACTIONS:
${crossFactorSummary || 'No significant interactions detected.'}

STRESS TEST SUMMARY:
Best case: ${stress.bestCaseImpactPct > 0 ? '+' : ''}${stress.bestCaseImpactPct}% | Base: ${stress.baselineImpactPct > 0 ? '+' : ''}${stress.baselineImpactPct}% | Worst: ${stress.worstCaseImpactPct > 0 ? '+' : ''}${stress.worstCaseImpactPct}%

RISK FLAGS:
${risk.flags.map((f) => `[${f.severity}] ${f.title}: ${f.description}`).join('\n') || 'No critical flags.'}

TAX RULES:
LTCG: ${(taxRules.equityLtcgRate * 100).toFixed(1)}% above ₹${(taxRules.equityLtcgExemption / 1000).toFixed(0)}K | STCG: ${(taxRules.equityStcgRate * 100).toFixed(0)}%

Return JSON with:
- "portfolioImplications": 4-6 sentences on what ALL the evidence means at the portfolio level
- "priorityIssues": 3-6 ranked priority items with title, description, priority, category, evidence, actionable
- "opportunities": 3-5 actionable opportunities
- "risks": 3-5 key risks with mitigations
- "longTermStrategy": 4-6 sentences on long-term compounding strategy
- "thesisAssessments": for each holding, thesis status with explanation and catalysts to watch
- "whatWouldChangeTheView": overall view change conditions
- "evidenceRefs": array of {claim, evidenceIds}`;

  return callAgent('StrategistAgent', prompt, system, StrategistSchema);
}
