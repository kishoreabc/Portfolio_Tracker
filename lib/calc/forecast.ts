import type { BondHolding } from '@/types/bonds';
import type { BondMaturityEvent, BondLadderEntry, CreditRatingBucket, CouponPayment } from '@/types/bonds';
import { parseISO, isValid, getYear, addMonths } from 'date-fns';

function parseBondDate(raw: string | null): Date | null {
  if (!raw) return null;
  // Try ISO first
  try {
    const d = parseISO(raw);
    if (isValid(d)) return d;
  } catch { /* fall through */ }
  // Try DD/MM/YYYY or DD-MM-YYYY
  const m = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    if (isValid(d)) return d;
  }
  return null;
}

/** Map payout type string to interval in months */
function payoutTypeToMonths(payoutType: string): number | null {
  const t = payoutType.toLowerCase().trim();
  if (t.includes('monthly') || t === 'monthly') return 1;
  if (t.includes('quarterly') || t === 'quarterly') return 3;
  if (t.includes('semi') || t.includes('half') || t === 'semi-annual' || t === 'half-yearly') return 6;
  if (t.includes('annual') || t.includes('yearly')) return 12;
  if (t.includes('maturity')) return null; // single payment at maturity
  return null; // unknown → will fall back
}

/**
 * Parse payoutDate as a day-of-month number (DD).
 * Accepts: plain number "28", date strings like "28/01/2025", "2025-01-28", etc.
 * Returns the DD integer (1-31), or null if not parseable.
 */
function parsePayoutDay(raw: string | null): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  // Plain integer like "28" or "5"
  if (/^\d{1,2}$/.test(trimmed)) {
    const n = parseInt(trimmed, 10);
    return n >= 1 && n <= 31 ? n : null;
  }

  // DD/MM/YYYY or DD-MM-YYYY  → extract first segment
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmyMatch) {
    const n = parseInt(dmyMatch[1], 10);
    return n >= 1 && n <= 31 ? n : null;
  }

  // YYYY-MM-DD (ISO) → extract last segment
  const isoMatch = trimmed.match(/^\d{4}-\d{2}-(\d{2})/);
  if (isoMatch) {
    const n = parseInt(isoMatch[1], 10);
    return n >= 1 && n <= 31 ? n : null;
  }

  return null;
}

/**
 * Given a day-of-month (DD) and an interval in months, return the next
 * payment date >= today anchored to that day. Clamps to end-of-month.
 */
function nextPaymentDate(dayOfMonth: number, intervalMonths: number): Date {
  const now = new Date();
  // Start from current month's occurrence
  let candidate = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
  // Clamp to end of month if day exceeds month length
  const lastDay = new Date(candidate.getFullYear(), candidate.getMonth() + 1, 0).getDate();
  candidate.setDate(Math.min(dayOfMonth, lastDay));

  // Advance by interval until we're in the future
  while (candidate <= now) {
    candidate = addMonths(candidate, intervalMonths);
    const last = new Date(candidate.getFullYear(), candidate.getMonth() + 1, 0).getDate();
    candidate.setDate(Math.min(dayOfMonth, last));
  }
  return candidate;
}

/**
 * Compute upcoming coupon payment dates and amounts.
 * - payoutDate = DD (day-of-month). The DD stays fixed, MM/YYYY advance by interval.
 * - If no payoutDate: fall back to estimation from maturity date.
 * - Amount = (faceValue * unitsHeld * couponRate) / paymentsPerYear
 */
function computeCouponPayments(
  bond: BondHolding,
  maturityDate: Date,
): CouponPayment[] {
  if (bond.couponRate <= 0) return [];

  const now = new Date();
  const payoutDay = parsePayoutDay(bond.payoutDate);
  const intervalMonths = payoutTypeToMonths(bond.payoutType);

  // "At Maturity" or unknown payout type → single payment at maturity
  if (intervalMonths === null) {
    if (maturityDate > now) {
      const paymentsPerYear = 1;
      const amount = bond.faceValue > 0
        ? (bond.faceValue * bond.unitsHeld * bond.couponRate) / paymentsPerYear
        : bond.totalValue * bond.couponRate;
      return [{ date: maturityDate, amount, isEstimated: !payoutDay }];
    }
    return [];
  }

  const paymentsPerYear = 12 / intervalMonths;
  const amount = bond.faceValue > 0
    ? (bond.faceValue * bond.unitsHeld * bond.couponRate) / paymentsPerYear
    : (bond.totalValue * bond.couponRate) / paymentsPerYear;

  const dates: CouponPayment[] = [];

  if (payoutDay !== null) {
    // Real schedule: anchor to DD, walk forward by interval until maturity
    let cursor = nextPaymentDate(payoutDay, intervalMonths);
    for (let i = 0; i < 60; i++) {
      if (cursor > maturityDate) break;
      dates.push({ date: new Date(cursor), amount, isEstimated: false });
      cursor = addMonths(cursor, intervalMonths);
      // Re-clamp day to end-of-month after advancing
      const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
      cursor.setDate(Math.min(payoutDay, last));
    }
  } else {
    // Fallback: walk backward from maturity using interval
    let cursor = new Date(maturityDate);
    for (let i = 0; i < 60; i++) {
      if (cursor < now) break;
      dates.unshift({ date: new Date(cursor), amount, isEstimated: true });
      cursor = addMonths(cursor, -intervalMonths);
    }
  }

  return dates.filter((p) => p.date > now).slice(0, 12);
}

export function buildBondMaturityEvents(bonds: BondHolding[]): BondMaturityEvent[] {
  return bonds
    .map((b) => {
      const maturityDate = parseBondDate(b.maturityDate);
      if (!maturityDate) return null;
      return {
        isin: b.isin,
        securityName: b.securityName,
        issuer: b.issuer,
        maturityDate,
        totalValue: b.totalValue,
        faceValue: b.faceValue,
        unitsHeld: b.unitsHeld,
        couponRate: b.couponRate,
        creditRating: b.creditRating,
        payoutType: b.payoutType,
        couponPayments: computeCouponPayments(b, maturityDate),
      } satisfies BondMaturityEvent;
    })
    .filter((e): e is BondMaturityEvent => e !== null)
    .sort((a, b) => a.maturityDate.getTime() - b.maturityDate.getTime());
}

export function buildBondLadder(bonds: BondHolding[]): BondLadderEntry[] {
  const yearMap = new Map<number, BondLadderEntry>();

  for (const b of bonds) {
    const d = parseBondDate(b.maturityDate);
    if (!d) continue;
    const year = getYear(d);
    const existing = yearMap.get(year) ?? { year, count: 0, totalValue: 0, bonds: [] };
    existing.count += 1;
    existing.totalValue += b.totalValue;
    existing.bonds.push(b);
    yearMap.set(year, existing);
  }

  return Array.from(yearMap.values()).sort((a, b) => a.year - b.year);
}

export function buildCreditRatingDistribution(bonds: BondHolding[]): CreditRatingBucket[] {
  const ratingMap = new Map<string, CreditRatingBucket>();
  const total = bonds.reduce((s, b) => s + b.totalValue, 0);

  for (const b of bonds) {
    const rating = b.creditRating || 'NR';
    const existing = ratingMap.get(rating) ?? { rating, count: 0, totalValue: 0, percent: 0 };
    existing.count += 1;
    existing.totalValue += b.totalValue;
    ratingMap.set(rating, existing);
  }

  return Array.from(ratingMap.values())
    .map((r) => ({ ...r, percent: total > 0 ? r.totalValue / total : 0 }))
    .sort((a, b) => b.totalValue - a.totalValue);
}
