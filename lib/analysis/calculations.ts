/**
 * lib/analysis/calculations.ts
 *
 * Deterministic financial calculation utilities.
 * All calculations handle null, undefined, zero, and negative values correctly.
 * Never produce NaN, Infinity, or undefined as outputs.
 */

// ─── Safe Math Utilities ───────────────────────────────────────────────────────

/**
 * Returns null if any argument is invalid, zero, or Infinity/NaN.
 */
export function safeDivide(numerator: number | null | undefined, denominator: number | null | undefined): number | null {
  if (numerator == null || denominator == null) return null;
  if (!isFinite(numerator) || !isFinite(denominator)) return null;
  if (denominator === 0) return null;
  const result = numerator / denominator;
  return isFinite(result) ? result : null;
}

/**
 * Rounds to given decimal places, returning null on invalid input.
 */
export function safeRound(value: number | null | undefined, decimals = 2): number | null {
  if (value == null || !isFinite(value)) return null;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Calculates percentage change from `previous` to `current`.
 * Returns null if either value is invalid or previous is zero.
 */
export function percentageChange(
  current: number | null | undefined,
  previous: number | null | undefined
): number | null {
  if (current == null || previous == null) return null;
  if (previous === 0) return null;
  if (!isFinite(current) || !isFinite(previous)) return null;
  return safeRound(((current - previous) / Math.abs(previous)) * 100);
}

/**
 * Calculates CAGR (Compound Annual Growth Rate) as a percentage.
 * Requirements:
 * - start must be > 0 (or < 0 handled carefully)
 * - end must be a valid finite number
 * - years must be > 0
 * Returns null if inputs are invalid.
 */
export function cagr(
  start: number | null | undefined,
  end: number | null | undefined,
  years: number
): number | null {
  if (start == null || end == null) return null;
  if (years <= 0 || !isFinite(years)) return null;
  if (!isFinite(start) || !isFinite(end)) return null;
  if (start === 0) return null;
  // Cannot take fractional root of negative base in real numbers
  if (start < 0) return null;
  const ratio = end / start;
  if (ratio < 0) return null;
  const result = (Math.pow(ratio, 1 / years) - 1) * 100;
  return isFinite(result) ? safeRound(result) : null;
}

/**
 * Formats a number as Indian currency (₹ with Cr/L Cr suffix).
 */
export function formatIndianCurrency(
  value: number | null | undefined,
  decimals = 0
): string {
  if (value == null || !isFinite(value)) return 'N/A';
  const crore = value / 1e7;
  if (Math.abs(crore) >= 1e5) {
    return `₹${safeRound(crore / 1e5, 2)}L Cr`;
  }
  if (Math.abs(crore) >= 1) {
    return `₹${safeRound(crore, decimals)} Cr`;
  }
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: decimals })}`;
}

/**
 * Formats a percentage value.
 */
export function formatPct(value: number | null | undefined, decimals = 2): string {
  if (value == null || !isFinite(value)) return 'N/A';
  return `${safeRound(value, decimals)}%`;
}

/**
 * Formats a ratio value.
 */
export function formatRatio(value: number | null | undefined, decimals = 2): string {
  if (value == null || !isFinite(value)) return 'N/A';
  return `${safeRound(value, decimals)}x`;
}

/**
 * Formats a plain number with optional suffix.
 */
export function formatNumber(
  value: number | null | undefined,
  decimals = 2,
  suffix = ''
): string {
  if (value == null || !isFinite(value)) return 'N/A';
  return `${safeRound(value, decimals)}${suffix}`;
}

// ─── Financial Ratio Calculations ─────────────────────────────────────────────

/**
 * Calculates ROE = Net Income / Avg Shareholder Equity
 * Returns null if equity is zero or negative.
 */
export function calcRoe(netIncome: number | null, equity: number | null): number | null {
  if (netIncome == null || equity == null) return null;
  if (equity <= 0) return null;
  return safeRound(safeDivide(netIncome, equity)! * 100);
}

/**
 * Calculates ROCE = EBIT / Capital Employed
 * Capital Employed = Total Assets - Current Liabilities
 */
export function calcRoce(ebit: number | null, capitalEmployed: number | null): number | null {
  if (ebit == null || capitalEmployed == null) return null;
  if (capitalEmployed <= 0) return null;
  return safeRound(safeDivide(ebit, capitalEmployed)! * 100);
}

/**
 * Calculates Free Cash Flow = Operating Cash Flow - CapEx
 */
export function calcFcf(operatingCf: number | null, capex: number | null): number | null {
  if (operatingCf == null || capex == null) return null;
  return operatingCf - Math.abs(capex);
}

/**
 * Extracts the last N values from an array, handling nulls.
 * Used for CAGR calculations with limited history.
 */
export function extractValues(
  values: (number | null)[],
  periods: number
): { start: number | null; end: number | null; years: number } {
  const nonNull = values.filter((v): v is number => v !== null);
  if (nonNull.length < 2) return { start: null, end: null, years: 0 };
  const available = Math.min(nonNull.length, periods + 1);
  const slice = nonNull.slice(nonNull.length - available);
  return {
    start: slice[0],
    end: slice[slice.length - 1],
    years: slice.length - 1,
  };
}

/**
 * Formats a stock price in Indian Rupees.
 */
export function formatPrice(price: number | null | undefined, decimals = 2): string {
  if (price == null || !isFinite(price)) return 'N/A';
  return `₹${price.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/**
 * Formats a market cap value in human-readable Indian format.
 */
export function formatMarketCap(marketCap: number | null | undefined): string {
  if (marketCap == null || !isFinite(marketCap)) return 'N/A';
  const crore = marketCap / 1e7;
  if (crore >= 1e5) return `₹${safeRound(crore / 1e5, 2)}L Cr`;
  if (crore >= 1e3) return `₹${safeRound(crore / 1e3, 2)}K Cr`;
  if (crore >= 1) return `₹${safeRound(crore, 0)} Cr`;
  return `₹${marketCap.toLocaleString('en-IN')}`;
}

/**
 * Clamps a percentage to [0, 100] range for shareholding validation.
 */
export function clampPct(value: number | null): number | null {
  if (value == null || !isFinite(value)) return null;
  return Math.max(0, Math.min(100, value));
}
