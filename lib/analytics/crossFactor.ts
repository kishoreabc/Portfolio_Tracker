/**
 * lib/analytics/crossFactor.ts
 *
 * Deterministic cross-factor interaction engine.
 * Identifies how fundamental, technical, macro, and risk factors
 * interact and compound — BEFORE the LLM sees any data.
 *
 * Example: "USD/INR ↑ + IT revenue USD exposure → tailwind"
 *          "BUT US tech demand ↓ offsets currency benefit"
 */

import type { FundamentalAnalysis } from './fundamentals';
import type { TechnicalAnalysis } from './technicals';
import type { MacroAnalysis } from './macro';
import type { RiskDecomposition } from './concentration';
import type { EvidenceCollection, CrossFactorFinding } from '@/types/evidence';
import { addCrossFactorFinding } from '@/types/evidence';

// ─── Main Engine ────────────────────────────────────────────────────────────────

export function runCrossFactorAnalysis(
  fundamental: FundamentalAnalysis,
  technical: TechnicalAnalysis,
  macro: MacroAnalysis,
  risk: RiskDecomposition,
  evidence: EvidenceCollection
): CrossFactorFinding[] {
  const findings: CrossFactorFinding[] = [];

  // ─── 1. Valuation × Technical alignment ─────────────────────────────────────
  // When fundamental strength conflicts with technical weakness
  const strongFundTickers = fundamental.holdings
    .filter((h) => h.fundamentalStatus === 'Strong')
    .map((h) => h.ticker);
  const bearishTechTickers = technical.holdings
    .filter((h) => h.trend === 'Bearish')
    .map((h) => h.ticker);

  const valueTrapCandidates = strongFundTickers.filter((t) => bearishTechTickers.includes(t));
  if (valueTrapCandidates.length > 0) {
    const relatedEvidence = evidence.metrics
      .filter((e) => e.relatedSymbols?.some((s) => valueTrapCandidates.includes(s)))
      .map((e) => e.id);

    findings.push(addCrossFactorFinding(evidence, {
      factorA: 'fundamental',
      factorB: 'technical',
      relationship: 'conflicts',
      title: 'Fundamental-Technical Divergence',
      conclusion: `${valueTrapCandidates.join(', ')} show strong fundamentals but bearish technical structure (below 200DMA). ` +
        `Could represent accumulation opportunities near support, OR value traps with deteriorating momentum.`,
      affectedSectors: [],
      affectedHoldings: valueTrapCandidates,
      evidenceIds: relatedEvidence,
      magnitude: valueTrapCandidates.length / Math.max(fundamental.holdings.length, 1),
      confidence: 0.75,
      whatWouldChangeTheView: `Price reclaiming 200DMA would confirm accumulation thesis; continued breakdown with volume would confirm value trap.`,
    }));
  }

  // Opposite: Weak fundamentals + Bullish technicals = Momentum divergence
  const weakFundTickers = fundamental.holdings
    .filter((h) => h.fundamentalStatus === 'Weak')
    .map((h) => h.ticker);
  const bullishTechTickers = technical.holdings
    .filter((h) => h.trend === 'Bullish')
    .map((h) => h.ticker);

  const momentumDivergence = weakFundTickers.filter((t) => bullishTechTickers.includes(t));
  if (momentumDivergence.length > 0) {
    findings.push(addCrossFactorFinding(evidence, {
      factorA: 'fundamental',
      factorB: 'technical',
      relationship: 'conflicts',
      title: 'Momentum-Quality Divergence',
      conclusion: `${momentumDivergence.join(', ')} show bullish momentum despite weak fundamentals. ` +
        `Technical strength may be temporary if earnings don't improve.`,
      affectedSectors: [],
      affectedHoldings: momentumDivergence,
      evidenceIds: [],
      magnitude: momentumDivergence.length / Math.max(fundamental.holdings.length, 1),
      confidence: 0.7,
      whatWouldChangeTheView: `Fundamental improvement (earnings beat, margin expansion) would validate the rally.`,
    }));
  }

  // ─── 2. Macro × Sector concentration ────────────────────────────────────────
  for (const exposure of macro.exposures) {
    if (exposure.direction === 'headwind' && exposure.magnitude > 0.3) {
      // Check if portfolio is concentrated in affected sectors
      const isConcentrated = risk.sectorConcentration < 60; // lower score = more concentrated

      if (isConcentrated && exposure.affectedHoldings.length >= 2) {
        findings.push(addCrossFactorFinding(evidence, {
          factorA: 'macro',
          factorB: 'risk',
          relationship: 'amplifies',
          title: `${exposure.variable} Headwind + Sector Concentration`,
          conclusion: `${exposure.variable} (${exposure.currentValue}, ${exposure.trend}) creates headwind for ${exposure.affectedSectors.join(', ')}. ` +
            `This is amplified by portfolio concentration in these sectors.`,
          affectedSectors: exposure.affectedSectors,
          affectedHoldings: exposure.affectedHoldings,
          evidenceIds: evidence.metrics
            .filter((e) => e.metric.toLowerCase().includes(exposure.variable.toLowerCase().split(' ')[0]))
            .map((e) => e.id),
          magnitude: exposure.magnitude * (isConcentrated ? 1.3 : 1.0),
          confidence: 0.7,
          whatWouldChangeTheView: `${exposure.variable} reversing trend, or portfolio reducing concentration in affected sectors.`,
        }));
      }
    }

    if (exposure.direction === 'tailwind' && exposure.magnitude > 0.3) {
      findings.push(addCrossFactorFinding(evidence, {
        factorA: 'macro',
        factorB: 'fundamental',
        relationship: 'supports',
        title: `${exposure.variable} Tailwind for Portfolio`,
        conclusion: `${exposure.variable} (${exposure.currentValue}, ${exposure.trend}) benefits ${exposure.affectedSectors.join(', ')} holdings. ` +
          `This supports the fundamental thesis for ${exposure.affectedHoldings.slice(0, 3).join(', ')}.`,
        affectedSectors: exposure.affectedSectors,
        affectedHoldings: exposure.affectedHoldings,
        evidenceIds: evidence.metrics
          .filter((e) => e.metric.toLowerCase().includes(exposure.variable.toLowerCase().split(' ')[0]))
          .map((e) => e.id),
        magnitude: exposure.magnitude,
        confidence: 0.65,
        whatWouldChangeTheView: `${exposure.variable} trend reversal would remove this tailwind.`,
      }));
    }
  }

  // ─── 3. Regime × Valuation interaction ──────────────────────────────────────
  if (macro.regime === 'risk_off' || macro.regime === 'monetary_tightening') {
    const elevatedHoldings = fundamental.holdings
      .filter((h) => h.valuationStatus === 'Elevated')
      .map((h) => h.ticker);

    if (elevatedHoldings.length >= 2) {
      findings.push(addCrossFactorFinding(evidence, {
        factorA: 'macro',
        factorB: 'valuation',
        relationship: 'amplifies',
        title: 'Risk-off Regime + Elevated Valuations',
        conclusion: `Market regime is ${macro.regime.replace(/_/g, ' ')}, which historically compresses elevated multiples. ` +
          `Holdings at elevated valuations (${elevatedHoldings.join(', ')}) face heightened de-rating risk.`,
        affectedSectors: [],
        affectedHoldings: elevatedHoldings,
        evidenceIds: [],
        magnitude: 0.7,
        confidence: 0.6,
        whatWouldChangeTheView: `Regime shift to recovery/risk-on, or strong earnings growth justifying current multiples.`,
      }));
    }
  }

  // ─── 4. Technical breadth × Risk score ──────────────────────────────────────
  if (technical.breadthPct < 40 && risk.overallRiskScore < 55) {
    findings.push(addCrossFactorFinding(evidence, {
      factorA: 'technical',
      factorB: 'risk',
      relationship: 'amplifies',
      title: 'Weak Technical Breadth + Elevated Risk Profile',
      conclusion: `Technical breadth at ${technical.breadthPct}% (below neutral) combined with overall risk score of ${risk.overallRiskScore}/100. ` +
        `Portfolio lacks both momentum support and diversification cushioning.`,
      affectedSectors: [],
      affectedHoldings: technical.holdings.filter((h) => h.trend === 'Bearish').map((h) => h.ticker),
      evidenceIds: evidence.metrics
        .filter((e) => e.metric.includes('Breadth') || e.metric.includes('Concentration'))
        .map((e) => e.id),
      magnitude: 0.65,
      confidence: 0.75,
      whatWouldChangeTheView: `Breadth recovering above 50% or risk score improving via diversification.`,
    }));
  }

  // ─── 5. Earnings yield spread × Regime ──────────────────────────────────────
  if (fundamental.earningsYieldSpreadBps < 0 && macro.regime !== 'monetary_easing') {
    findings.push(addCrossFactorFinding(evidence, {
      factorA: 'fundamental',
      factorB: 'macro',
      relationship: 'conflicts',
      title: 'Negative Earnings Yield Spread in Non-Easing Regime',
      conclusion: `Portfolio earnings yield is below risk-free rate (spread: ${fundamental.earningsYieldSpreadBps}bps). ` +
        `Without monetary easing, this valuation cannot be sustained by liquidity alone.`,
      affectedSectors: [],
      affectedHoldings: fundamental.holdings
        .filter((h) => h.valuationStatus === 'Elevated')
        .map((h) => h.ticker),
      evidenceIds: evidence.metrics
        .filter((e) => e.metric.includes('P/E') || e.metric.includes('Yield'))
        .map((e) => e.id),
      magnitude: 0.8,
      confidence: 0.7,
      whatWouldChangeTheView: `Rate cuts, or earnings growth compressing the P/E multiple.`,
    }));
  }

  console.log(`[CrossFactor] Identified ${findings.length} cross-factor interactions.`);

  return findings;
}
