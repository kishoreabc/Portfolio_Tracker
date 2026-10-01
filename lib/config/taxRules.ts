/**
 * lib/config/taxRules.ts
 *
 * Versioned Indian capital gains tax rules.
 * Rules are isolated from analytics code so they can be updated
 * when Union Budget changes regulations.
 */

export interface TaxRuleSet {
  effectiveFrom: string;
  effectiveTo?: string;
  assessmentYear: string;

  /** Equity — long-term capital gains (holding > 12 months) */
  equityLtcgRate: number;
  equityLtcgExemption: number;

  /** Equity — short-term capital gains (holding <= 12 months) */
  equityStcgRate: number;

  /** Debt — long-term (holding > 36 months for pre-2023, or per slab for post-2023) */
  debtLtcgRate: number;
  debtLtcgIndexation: boolean;

  /** Debt — short-term */
  debtStcgRate: 'slab';

  /** Gold — long-term threshold and rate */
  goldLtcgHoldingMonths: number;
  goldLtcgRate: number;

  /** Long-term holding period threshold (months) */
  equityLtcgHoldingMonths: number;
  debtLtcgHoldingMonths: number;
}

/**
 * Current Indian tax rules (Union Budget 2024).
 */
export const CURRENT_TAX_RULES: TaxRuleSet = {
  effectiveFrom: '2024-07-23',
  assessmentYear: 'AY 2025-26',

  equityLtcgRate: 0.125, // 12.5%
  equityLtcgExemption: 125000, // ₹1.25 Lakh
  equityStcgRate: 0.20, // 20%

  debtLtcgRate: 0.125, // 12.5% without indexation
  debtLtcgIndexation: false,
  debtStcgRate: 'slab',

  goldLtcgHoldingMonths: 24,
  goldLtcgRate: 0.125,

  equityLtcgHoldingMonths: 12,
  debtLtcgHoldingMonths: 24,
};

/**
 * Returns the applicable tax rule set for a given date.
 */
export function getTaxRules(_asOfDate?: string): TaxRuleSet {
  void _asOfDate;
  // Currently only one ruleset; extend when new budgets are released
  return CURRENT_TAX_RULES;
}
