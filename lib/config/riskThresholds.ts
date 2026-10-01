/**
 * lib/config/riskThresholds.ts
 *
 * Versioned risk threshold configuration.
 * Replaces magic numbers in pipeline and scoring logic.
 */

export const CONCENTRATION_THRESHOLDS = {
  /** Sector allocation above this triggers a concentration flag */
  sectorWarning: 30,
  sectorCritical: 45,

  /** Top-5 holdings weight thresholds */
  top5Warning: 35,
  top5Critical: 55,

  /** Single-stock position threshold */
  singlePositionWarning: 10,
  singlePositionCritical: 20,

  /** HHI thresholds (0–1 scale) */
  hhiConcentrated: 0.15,
  hhiHighlyConcentrated: 0.25,
} as const;

export const TECHNICAL_THRESHOLDS = {
  /** DMA periods */
  shortTermDMA: 20,
  mediumTermDMA: 50,
  longTermDMA: 200,

  /** Breadth thresholds (% of holdings above DMA) */
  breadthBullish: 60,
  breadthNeutral: 40,
  breadthBearish: 30,

  /** RSI thresholds */
  rsiOverbought: 70,
  rsiOversold: 30,

  /** Distance thresholds */
  nearDMAPercent: 2.5,
  distantFromDMAPercent: 15,
} as const;

export const VALUATION_THRESHOLDS = {
  /** PE ratio thresholds relative to sector */
  undervaluedRatio: 0.82,
  elevatedRatio: 1.25,

  /** Absolute PE thresholds */
  peDeepValue: 12,
  peReasonableHigh: 30,
  peExpensiveHigh: 45,

  /** Earnings yield spread required to signal value */
  earningsYieldSpreadMinimum: 1.5,
} as const;

export const BOND_RISK_THRESHOLDS = {
  /** Duration thresholds (years) */
  shortDuration: 2,
  mediumDuration: 5,
  longDuration: 8,

  /** Stress test basis point shocks */
  mildShockBps: 50,
  moderateShockBps: 100,
  severeShockBps: 200,

  /** Issuer concentration threshold */
  issuerConcentrationWarning: 25,
} as const;
