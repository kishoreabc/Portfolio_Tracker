/**
 * lib/analytics/bondRisk.ts
 *
 * Dedicated Bond & Fixed Income Risk Analysis Engine.
 * Separated from concentration.ts to adhere to single responsibility.
 *
 * Evaluates:
 *   1. Duration & Interest Rate Sensitivity (modified duration, PV01, 100bps rate shock impact)
 *   2. Yield Profile (weighted YTM vs benchmark 10Y G-Sec)
 *   3. Credit Quality Distribution (Sovereign/AAA vs Sub-AAA)
 *   4. Issuer & Entity Concentration in Fixed Income
 */

import type { PortfolioSnapshot } from '@/types/portfolio-snapshot';
import type { EvidenceCollection } from '@/types/evidence';
import { addMetricEvidence } from '@/types/evidence';
import { BOND_RISK_THRESHOLDS } from '@/lib/config/riskThresholds';

export interface BondHoldingRisk {
  isin: string;
  securityName: string;
  issuer: string;
  weightPct: number;
  duration: number;
  ytm: number;
  creditRating: string;
  totalValue: number;
  sensitivityBps: number; // estimated % loss if yield rises 100bps (-duration * 1%)
}

export interface RateShockScenario {
  shiftBps: -100 | -50 | 0 | 50 | 100;
  priceImpactPct: number;       // Impact on bond sleeve
  portfolioImpactPct: number;   // Impact on entire net worth
  reinvestmentEffect: string;   // Explanation of coupon reinvestment offsetting price drops
}

export interface CorporateSpreadShockScenario {
  spreadShiftBps: 50 | 100 | 200;
  corporatePriceImpactPct: number;
  portfolioImpactPct: number;
  estimatedLossInr: number;
  severity: 'low' | 'medium' | 'high';
}

export interface CreditSpreadRisk {
  sovereignExposurePct: number;       // Sovereign debt has zero corporate credit spread risk
  corporateExposurePct: number;       // Corporate bonds exposed to spread widening
  creditSpreadSensitivityPct: number; // Est. loss if corporate spreads widen 50bps
  spreadShockScenarios: CorporateSpreadShockScenario[]; // Explicit spread shocks: +50bp, +100bp, +200bp (Prompt #13)
  commentary: string;
}

export interface BondRiskAnalysis {
  hasBonds: boolean;
  totalBondValue: number;
  bondCount: number;
  bondAllocationPct: number;

  /** Weighted duration in years */
  weightedDuration: number;
  /** Average yield to maturity % */
  avgYTM: number;
  /** Dominant / average credit quality */
  creditQualityDistribution: {
    sovereignAndAAA: number; // % of bonds
    aaTier: number;          // % of bonds
    subAA: number;           // % of bonds
  };
  primaryRating: string;

  /** Top issuer exposure in fixed income */
  topIssuer: {
    issuer: string;
    exposurePct: number;
    value: number;
  };
  issuerHHI: number;

  /** Interest rate risk score (0-100, higher = safer / lower duration risk) */
  durationScore: number;
  /** Issuer risk score (0-100, higher = well diversified across issuers) */
  issuerScore: number;
  /** Composite bond risk score (0-100) */
  bondCompositeScore: number;

  /** Estimated portfolio impact from 100bps yield hike (in bps) */
  rateShock100bpsImpactPct: number;

  /** Multi-scenario rate shocks (-100bp, -50bp, 0, +50bp, +100bp) with reinvestment effects (Critique Point #9) */
  rateShockScenarios: RateShockScenario[];

  /** Credit spread risk explicitly separated from interest rate duration risk (Critique Point #9) */
  creditSpreadRisk: CreditSpreadRisk;

  /** Risk flags specific to debt holdings */
  bondFlags: Array<{
    type: 'duration' | 'credit' | 'issuer' | 'yield';
    severity: 'red' | 'orange' | 'yellow' | 'green';
    title: string;
    description: string;
    actionable: string;
  }>;

  holdings: BondHoldingRisk[];
  interpretation: string;
}

export function runBondRiskAnalysis(
  snapshot: PortfolioSnapshot,
  evidence?: EvidenceCollection
): BondRiskAnalysis {
  const bonds = snapshot.holdings.bonds;
  const netWorth = snapshot.aggregates.netWorth;
  const totalBondValue = snapshot.aggregates.bondTotal;
  const bondAllocationPct = netWorth > 0 ? (totalBondValue / netWorth) * 100 : 0;

  if (bonds.length === 0 || totalBondValue === 0) {
    return {
      hasBonds: false,
      totalBondValue: 0,
      bondCount: 0,
      bondAllocationPct: 0,
      weightedDuration: 0,
      avgYTM: 0,
      creditQualityDistribution: { sovereignAndAAA: 100, aaTier: 0, subAA: 0 },
      primaryRating: 'N/A',
      topIssuer: { issuer: 'None', exposurePct: 0, value: 0 },
      issuerHHI: 0,
      durationScore: 100,
      issuerScore: 100,
      bondCompositeScore: 100,
      rateShock100bpsImpactPct: 0,
      rateShockScenarios: [
        { shiftBps: -100, priceImpactPct: 0, portfolioImpactPct: 0, reinvestmentEffect: 'Zero bond allocation.' },
        { shiftBps: -50, priceImpactPct: 0, portfolioImpactPct: 0, reinvestmentEffect: 'Zero bond allocation.' },
        { shiftBps: 0, priceImpactPct: 0, portfolioImpactPct: 0, reinvestmentEffect: 'Zero bond allocation.' },
        { shiftBps: 50, priceImpactPct: 0, portfolioImpactPct: 0, reinvestmentEffect: 'Zero bond allocation.' },
        { shiftBps: 100, priceImpactPct: 0, portfolioImpactPct: 0, reinvestmentEffect: 'Zero bond allocation.' },
      ],
      creditSpreadRisk: {
        sovereignExposurePct: 100,
        corporateExposurePct: 0,
        creditSpreadSensitivityPct: 0,
        spreadShockScenarios: [
          { spreadShiftBps: 50, corporatePriceImpactPct: 0, portfolioImpactPct: 0, estimatedLossInr: 0, severity: 'low' },
          { spreadShiftBps: 100, corporatePriceImpactPct: 0, portfolioImpactPct: 0, estimatedLossInr: 0, severity: 'medium' },
          { spreadShiftBps: 200, corporatePriceImpactPct: 0, portfolioImpactPct: 0, estimatedLossInr: 0, severity: 'high' },
        ],
        commentary: 'No fixed income holdings; zero corporate credit spread exposure.',
      },
      bondFlags: [],
      holdings: [],
      interpretation: 'No fixed income holdings present. Zero duration and credit risk from bonds.',
    };
  }

  // 1. Duration & YTM calculations
  let weightedDurationSum = 0;
  let weightedYTMSum = 0;
  const issuerMap = new Map<string, number>();

  let sovereignAaaValue = 0;
  let aaValue = 0;
  let subAaValue = 0;

  const holdingsRisk: BondHoldingRisk[] = [];

  for (const b of bonds) {
    const val = b.totalValue;
    const duration = b.duration || 2.0; // fallback conservative 2yr
    const ytm = b.ytm || b.couponRate || 7.0;
    const weightInBonds = (val / totalBondValue) * 100;

    weightedDurationSum += duration * val;
    weightedYTMSum += ytm * val;

    const issuer = (b.issuer || b.securityName || 'Unknown').trim();
    issuerMap.set(issuer, (issuerMap.get(issuer) || 0) + val);

    // Credit rating classification
    const rating = (b.creditRating || '').toUpperCase();
    if (rating.includes('SOV') || rating.includes('AAA') || rating.includes('G-SEC') || rating.includes('TREPS')) {
      sovereignAaaValue += val;
    } else if (rating.includes('AA')) {
      aaValue += val;
    } else {
      subAaValue += val;
    }

    holdingsRisk.push({
      isin: b.isin,
      securityName: b.securityName,
      issuer,
      weightPct: Math.round(weightInBonds * 10) / 10,
      duration,
      ytm,
      creditRating: b.creditRating || 'Unrated',
      totalValue: val,
      sensitivityBps: Math.round(-duration * 100), // -duration * 1% in bps
    });
  }

  const weightedDuration = Math.round((weightedDurationSum / totalBondValue) * 100) / 100;
  const avgYTM = Math.round((weightedYTMSum / totalBondValue) * 100) / 100;

  // Issuer concentration & HHI
  let topIssuerName = 'Unknown';
  let topIssuerVal = 0;
  let issuerHHI = 0;

  for (const [issuer, val] of issuerMap.entries()) {
    const pct = (val / totalBondValue) * 100;
    issuerHHI += Math.round(pct * pct);
    if (val > topIssuerVal) {
      topIssuerVal = val;
      topIssuerName = issuer;
    }
  }

  const topIssuerPct = Math.round((topIssuerVal / totalBondValue) * 1000) / 10;

  // Credit distribution
  const creditQualityDistribution = {
    sovereignAndAAA: Math.round((sovereignAaaValue / totalBondValue) * 1000) / 10,
    aaTier: Math.round((aaValue / totalBondValue) * 1000) / 10,
    subAA: Math.round((subAaValue / totalBondValue) * 1000) / 10,
  };

  const primaryRating = creditQualityDistribution.sovereignAndAAA >= 70
    ? 'AAA / Sovereign'
    : creditQualityDistribution.sovereignAndAAA + creditQualityDistribution.aaTier >= 70
    ? 'AA Investment Grade'
    : 'High Yield / Mixed';

  // Scoring
  let durationScore = 80;
  if (weightedDuration <= BOND_RISK_THRESHOLDS.shortDuration) durationScore = 90;
  else if (weightedDuration <= BOND_RISK_THRESHOLDS.mediumDuration) durationScore = 75;
  else if (weightedDuration <= BOND_RISK_THRESHOLDS.longDuration) durationScore = 55;
  else durationScore = 35;

  let issuerScore = 80;
  if (topIssuerPct > BOND_RISK_THRESHOLDS.issuerConcentrationWarning) issuerScore = 40;
  else if (topIssuerPct > 25) issuerScore = 60;
  else if (issuerHHI < 1800) issuerScore = 90;

  let creditScore = 80;
  if (creditQualityDistribution.subAA > 15) creditScore -= 30;
  if (creditQualityDistribution.sovereignAndAAA >= 80) creditScore += 10;

  const bondCompositeScore = Math.round(durationScore * 0.4 + issuerScore * 0.35 + creditScore * 0.25);

  // Rate shock impact on entire portfolio: -(weightedDuration * 1%) * (bondAllocationPct / 100)
  const rateShock100bpsImpactPct = Math.round(-weightedDuration * (bondAllocationPct / 100) * 100) / 100;

  // Multi-scenario rate shocks (-100bp, -50bp, 0, +50bp, +100bp) with reinvestment effects (Critique Point #9)
  const shifts: Array<-100 | -50 | 0 | 50 | 100> = [-100, -50, 0, 50, 100];
  const rateShockScenarios: RateShockScenario[] = shifts.map((shiftBps) => {
    const rateDelta = shiftBps / 10000;
    const priceImpactPct = Math.round(-weightedDuration * rateDelta * 10000) / 100;
    const portfolioImpactPct = Math.round(priceImpactPct * (bondAllocationPct / 100) * 100) / 100;
    const reinvestmentEffect = shiftBps > 0
      ? `Yield expansion improves coupon reinvestment rate to ${(avgYTM + shiftBps / 100).toFixed(2)}%, partially offsetting capital loss over holding horizon.`
      : shiftBps < 0
      ? `Yield compression boosts capital value by +${Math.abs(priceImpactPct)}%, though future reinvestment yields compress to ${(avgYTM + shiftBps / 100).toFixed(2)}%.`
      : 'Baseline current yield with zero capital fluctuation.';
    return {
      shiftBps,
      priceImpactPct,
      portfolioImpactPct,
      reinvestmentEffect,
    };
  });

  // Credit spread risk separation:
  // Government / sovereign debt has zero credit spread risk.
  // Corporate bonds (AA / sub-AA) are exposed to credit spread widening.
  const sovereignExposurePct = creditQualityDistribution.sovereignAndAAA;
  const corporateExposurePct = Math.round((creditQualityDistribution.aaTier + creditQualityDistribution.subAA) * 10) / 10;
  const corporateValue = (totalBondValue * corporateExposurePct) / 100;
  // A 50bps widening in corporate credit spreads impacts corporate sleeve by -(duration * 0.5%)
  const creditSpreadSensitivityPct = Math.round(-weightedDuration * 0.005 * (corporateValue / (netWorth || 1)) * 10000) / 100;

  // Corporate spread shocks (+50bp, +100bp, +200bp) (Prompt #13)
  const spreadShifts: Array<50 | 100 | 200> = [50, 100, 200];
  const spreadShockScenarios: CorporateSpreadShockScenario[] = spreadShifts.map((shiftBps) => {
    const corpPriceImpact = Math.round(-weightedDuration * (shiftBps / 10000) * 10000) / 100;
    const portImpact = Math.round(corpPriceImpact * (corporateValue / (netWorth || 1)) * 100) / 100;
    const lossInr = Math.round(Math.abs(corpPriceImpact / 100) * corporateValue);
    const severity: 'low' | 'medium' | 'high' = shiftBps === 50 ? 'low' : shiftBps === 100 ? 'medium' : 'high';
    return {
      spreadShiftBps: shiftBps,
      corporatePriceImpactPct: corpPriceImpact,
      portfolioImpactPct: portImpact,
      estimatedLossInr: lossInr,
      severity,
    };
  });

  const creditSpreadRisk: CreditSpreadRisk = {
    sovereignExposurePct,
    corporateExposurePct,
    creditSpreadSensitivityPct,
    spreadShockScenarios,
    commentary: corporateExposurePct === 0
      ? '100% sovereign/AAA debt. Zero corporate credit spread risk; portfolio is insulated from private credit defaults.'
      : `${corporateExposurePct}% corporate debt exposure (₹${Math.round(corporateValue).toLocaleString('en-IN')}). Spread widening of +50bp creates ${creditSpreadSensitivityPct}% drag; +200bp shock creates ${spreadShockScenarios[2].portfolioImpactPct}% portfolio impact.`,
  };

  // Build flags
  const bondFlags: BondRiskAnalysis['bondFlags'] = [];

  if (weightedDuration > BOND_RISK_THRESHOLDS.mediumDuration) {
    bondFlags.push({
      type: 'duration',
      severity: weightedDuration > BOND_RISK_THRESHOLDS.longDuration ? 'red' : 'orange',
      title: 'Elevated Bond Duration Risk',
      description: `Weighted portfolio duration is ${weightedDuration} years. A 100bps upward yield shift will impact fixed income by ~${Math.round(weightedDuration * 10) / 10}%.`,
      actionable: 'Consider trimming long-duration papers into shorter 1-3 year target maturity or floating rate instruments.',
    });
  }

  if (topIssuerPct > BOND_RISK_THRESHOLDS.issuerConcentrationWarning) {
    bondFlags.push({
      type: 'issuer',
      severity: 'orange',
      title: `Single Issuer Concentration: ${topIssuerName}`,
      description: `${topIssuerName} accounts for ${topIssuerPct}% of the debt portfolio.`,
      actionable: `Diversify debt holdings across multiple distinct issuers or sovereign/SDL instruments.`,
    });
  }

  if (creditQualityDistribution.subAA > 10) {
    bondFlags.push({
      type: 'credit',
      severity: creditQualityDistribution.subAA > 25 ? 'red' : 'yellow',
      title: 'Sub-AA Credit Rating Exposure',
      description: `${creditQualityDistribution.subAA}% of debt is rated below AA, carrying elevated credit spread and default risk.`,
      actionable: 'Review credit fundamentals and monitor rating revision updates for non-AAA debt.',
    });
  }

  const interpretation = `Fixed income allocation is ${Math.round(bondAllocationPct * 10) / 10}% (₹${totalBondValue.toLocaleString('en-IN')}) across ${bonds.length} bonds. ` +
    `Weighted duration: ${weightedDuration}y, Average YTM: ${avgYTM}%. Credit profile: ${primaryRating} (${creditQualityDistribution.sovereignAndAAA}% AAA/Gov). ` +
    `Duration risk score: ${durationScore}/100, Issuer diversification score: ${issuerScore}/100.`;

  // Evidence logging
  if (evidence) {
    addMetricEvidence(evidence, {
      source: 'BondRiskEngine',
      metric: 'portfolio_weighted_duration',
      value: weightedDuration,
      observedAt: new Date().toISOString(),
      confidence: 'high',
    });
    addMetricEvidence(evidence, {
      source: 'BondRiskEngine',
      metric: 'portfolio_avg_ytm',
      value: avgYTM,
      observedAt: new Date().toISOString(),
      confidence: 'high',
    });
    addMetricEvidence(evidence, {
      source: 'BondRiskEngine',
      metric: 'bond_top_issuer_pct',
      value: topIssuerPct,
      observedAt: new Date().toISOString(),
      confidence: 'high',
    });
  }

  return {
    hasBonds: true,
    totalBondValue,
    bondCount: bonds.length,
    bondAllocationPct: Math.round(bondAllocationPct * 10) / 10,
    weightedDuration,
    avgYTM,
    creditQualityDistribution,
    primaryRating,
    topIssuer: {
      issuer: topIssuerName,
      exposurePct: topIssuerPct,
      value: topIssuerVal,
    },
    issuerHHI,
    durationScore,
    issuerScore,
    bondCompositeScore,
    rateShock100bpsImpactPct,
    rateShockScenarios,
    creditSpreadRisk,
    bondFlags,
    holdings: holdingsRisk,
    interpretation,
  };
}
