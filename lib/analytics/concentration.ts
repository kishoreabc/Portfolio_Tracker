/**
 * lib/analytics/concentration.ts
 *
 * Enhanced multi-dimensional concentration and risk analysis.
 * Decomposes risk into: position, sector, issuer, factor.
 * Each sub-score is traceable.
 */

import type { PortfolioSnapshot } from '@/types/portfolio-snapshot';
import type { EvidenceCollection } from '@/types/evidence';
import { addMetricEvidence } from '@/types/evidence';
import { CONCENTRATION_THRESHOLDS } from '@/lib/config/riskThresholds';
import { runBondRiskAnalysis } from '@/lib/analytics/bondRisk';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface RiskDecomposition {
  /** Individual sub-scores (0–100, higher = better/safer) */
  positionConcentration: number;
  sectorConcentration: number;
  bondDuration: number;
  issuerConcentration: number;

  /** Overall risk score (0–100) */
  overallRiskScore: number;

  /** Flags */
  flags: RiskFlag[];

  /** Bond analytics */
  bondAnalysis: {
    weightedDuration: number;
    avgYTM: number;
    avgCreditQuality: string;
    durationRiskBps: number; // estimated portfolio impact from 100bps rate shock
  };

  interpretation: string;
}

export interface RiskFlag {
  type: 'concentration' | 'technical' | 'valuation' | 'quality' | 'duration' | 'issuer';
  severity: 'red' | 'orange' | 'yellow' | 'green';
  title: string;
  description: string;
  evidence: string;
  actionRecommendation: string;
}

// ─── Scoring Functions ──────────────────────────────────────────────────────────

function scorePositionConcentration(top5Pct: number, largestPct: number): number {
  let score = 80;

  if (top5Pct > CONCENTRATION_THRESHOLDS.top5Critical) score -= 35;
  else if (top5Pct > CONCENTRATION_THRESHOLDS.top5Warning) score -= 15;

  if (largestPct > CONCENTRATION_THRESHOLDS.singlePositionCritical) score -= 25;
  else if (largestPct > CONCENTRATION_THRESHOLDS.singlePositionWarning) score -= 10;

  return Math.max(0, Math.min(100, score));
}

function scoreSectorConcentration(topSectorPct: number, sectorCount: number): number {
  let score = 80;

  if (topSectorPct > CONCENTRATION_THRESHOLDS.sectorCritical) score -= 35;
  else if (topSectorPct > CONCENTRATION_THRESHOLDS.sectorWarning) score -= 15;

  if (sectorCount <= 2) score -= 20;
  else if (sectorCount <= 4) score -= 10;
  else if (sectorCount >= 7) score += 10;

  return Math.max(0, Math.min(100, score));
}

// ─── Main Engine ────────────────────────────────────────────────────────────────

export function runRiskAnalysis(
  portfolio: PortfolioSnapshot,
  evidence: EvidenceCollection
): RiskDecomposition {
  const flags: RiskFlag[] = [];

  // ─── Position concentration ─────────────────────────────────────────────────
  const top5Pct = portfolio.concentration.top5Percent * 100;
  const largestPct = portfolio.concentration.top5Holdings[0]?.percent
    ? portfolio.concentration.top5Holdings[0].percent * 100
    : 0;

  const positionScore = scorePositionConcentration(top5Pct, largestPct);

  if (top5Pct > CONCENTRATION_THRESHOLDS.top5Warning) {
    flags.push({
      type: 'concentration',
      severity: top5Pct > CONCENTRATION_THRESHOLDS.top5Critical ? 'red' : 'orange',
      title: 'Top-5 Holdings Concentration',
      description: `Top 5 holdings represent ${top5Pct.toFixed(1)}% of portfolio (threshold: ${CONCENTRATION_THRESHOLDS.top5Warning}%).`,
      evidence: `Top-5 weight: ${top5Pct.toFixed(1)}%`,
      actionRecommendation: 'Diversify incremental investments into broader index funds or underweight positions.',
    });
  }

  // ─── Sector concentration ───────────────────────────────────────────────────
  const topSector = portfolio.allocation.sectorAllocation[0];
  const topSectorPct = topSector ? topSector.percent * 100 : 0;
  const sectorCount = portfolio.allocation.sectorAllocation.filter((s) => s.percent > 0.03).length;

  const sectorScore = scoreSectorConcentration(topSectorPct, sectorCount);

  if (topSectorPct > CONCENTRATION_THRESHOLDS.sectorWarning) {
    flags.push({
      type: 'concentration',
      severity: topSectorPct > CONCENTRATION_THRESHOLDS.sectorCritical ? 'red' : 'orange',
      title: 'Sector Concentration Flag',
      description: `${topSector?.sector || 'Top sector'} allocation of ${topSectorPct.toFixed(1)}% exceeds ${CONCENTRATION_THRESHOLDS.sectorWarning}% threshold.`,
      evidence: `${topSector?.sector}: ${topSectorPct.toFixed(1)}% of portfolio`,
      actionRecommendation: 'Direct incremental SIP flows into underweight sectors or broad-market index funds.',
    });
  }

  // ─── Bond analysis (delegated to dedicated bondRisk engine) ─────────────────
  const bondRisk = runBondRiskAnalysis(portfolio, evidence);
  const weightedDuration = bondRisk.weightedDuration;
  const weightedYTM = bondRisk.avgYTM;
  const durationRiskBps = Math.round(weightedDuration * 100);
  const bondDurationScore = bondRisk.durationScore;
  const issuerScore = bondRisk.issuerScore;
  const avgCreditQuality = bondRisk.primaryRating;

  // Merge bond flags
  for (const bf of bondRisk.bondFlags) {
    flags.push({
      type: bf.type === 'duration' ? 'duration' : 'issuer',
      severity: bf.severity,
      title: bf.title,
      description: bf.description,
      evidence: `Duration: ${weightedDuration}y, ${durationRiskBps}bps rate sensitivity`,
      actionRecommendation: bf.actionable,
    });
  }

  // ─── Overall risk score ─────────────────────────────────────────────────────
  const overallRiskScore = Math.round(
    positionScore * 0.30 +
    sectorScore * 0.30 +
    bondDurationScore * 0.20 +
    issuerScore * 0.20
  );

  // Register evidence
  addMetricEvidence(evidence, {
    source: 'Deterministic Risk Engine',
    metric: 'Position Concentration Score',
    value: positionScore,
    observedAt: new Date().toISOString(),
    confidence: 'high',
  });

  addMetricEvidence(evidence, {
    source: 'Deterministic Risk Engine',
    metric: 'Sector Concentration Score',
    value: sectorScore,
    observedAt: new Date().toISOString(),
    confidence: 'high',
  });

  addMetricEvidence(evidence, {
    source: 'Deterministic Risk Engine',
    metric: 'HHI Index',
    value: portfolio.concentration.herfindahlIndex.toFixed(4),
    observedAt: new Date().toISOString(),
    confidence: 'high',
  });

  const interpretation =
    `Risk Score: ${overallRiskScore}/100. Decomposition: Position ${positionScore}, Sector ${sectorScore}, ` +
    `Bond Duration ${bondDurationScore}, Issuer ${issuerScore}. ` +
    `Top-5 holdings: ${top5Pct.toFixed(1)}%, HHI: ${portfolio.concentration.herfindahlIndex.toFixed(4)}, ` +
    `Bond duration: ${weightedDuration.toFixed(1)}Y, Credit quality: ${avgCreditQuality}. ` +
    `${flags.length} risk flags raised.`;

  return {
    positionConcentration: positionScore,
    sectorConcentration: sectorScore,
    bondDuration: bondDurationScore,
    issuerConcentration: issuerScore,
    overallRiskScore,
    flags,
    bondAnalysis: {
      weightedDuration: Math.round(weightedDuration * 10) / 10,
      avgYTM: Math.round(weightedYTM * 10000) / 100,
      avgCreditQuality,
      durationRiskBps,
    },
    interpretation,
  };
}
