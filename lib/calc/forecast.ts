import type { BondHolding } from '@/types/bonds';
import type { BondMaturityEvent, BondLadderEntry, CreditRatingBucket } from '@/types/bonds';
import { parseISO, isValid, getYear, addMonths } from 'date-fns';

function parseBondDate(raw: string | null): Date | null {
  if (!raw) return null;
  // Try ISO first
  try {
    const d = parseISO(raw);
    if (isValid(d)) return d;
  } catch { /* fall through */ }
  // Try DD/MM/YYYY
  const m = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    if (isValid(d)) return d;
  }
  return null;
}

/**
 * Estimate semi-annual coupon payment dates from today → maturity.
 * These are labeled "Estimated" in the UI.
 */
function estimateCouponDates(maturityDate: Date, couponRate: number): Date[] {
  if (couponRate <= 0) return [];
  const dates: Date[] = [];
  const now = new Date();
  let cursor = new Date(maturityDate);
  // Walk back in 6-month steps from maturity, collect future dates
  for (let i = 0; i < 60; i++) {
    if (cursor < now) break;
    dates.unshift(new Date(cursor));
    cursor = addMonths(cursor, -6);
  }
  return dates.filter((d) => d > now).slice(0, 10);
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
        couponRate: b.couponRate,
        creditRating: b.creditRating,
        estimatedCouponDates: estimateCouponDates(maturityDate, b.couponRate),
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
