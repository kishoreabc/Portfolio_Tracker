import type { BondHolding } from '@/types/bonds';
import { parseISO, isValid, addMonths, startOfMonth, format } from 'date-fns';

export interface BondSummaryMetrics {
  totalInvested: number;
  weightedAvgMaturityText: string;
  uniqueSecuritiesCount: number;
  weightedAvgYieldText: string;
}

export interface MonthlyCashflowItem {
  key: string;       // "2026-10"
  month: string;     // "Oct"
  year: string;      // "2026"
  label: string;     // "Oct 2026"
  interest: number;  // expected coupon interest
  principal: number; // expected principal redeemed
  total: number;     // interest + principal
}

export interface InvestmentWeightItem {
  id: string;
  name: string;
  isin: string;
  value: number;
  percent: number;
  color: string;
}

export interface RatingDistributionItem {
  rating: string;
  count: number;
  label: string;
  value: number;
  percent: number;
  color: string;
}

export interface TypeDistributionItem {
  type: string;
  value: number;
  percent: number;
  color: string;
}

/**
 * Safely parse date from various formats (ISO, DD/MM/YYYY, DD-MM-YYYY).
 */
export function parseDateSafe(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const str = String(raw).trim();
  if (!str || str === '-' || str === 'NA') return null;

  try {
    const iso = parseISO(str);
    if (isValid(iso)) return iso;
  } catch {
    // fallback
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const d = new Date(Number(dmyMatch[3]), Number(dmyMatch[2]) - 1, Number(dmyMatch[1]));
    if (isValid(d)) return d;
  }

  // YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymdMatch) {
    const d = new Date(Number(ymdMatch[1]), Number(ymdMatch[2]) - 1, Number(ymdMatch[3]));
    if (isValid(d)) return d;
  }

  return null;
}

/**
 * Clean & extract the core credit rating grade (e.g., "CRISIL A+" -> "A+", "ICRA A" -> "A").
 */
export function extractRatingGrade(rawRating: string | null | undefined): string {
  if (!rawRating) return 'NR';
  const clean = String(rawRating).trim();
  if (!clean || clean === '-' || clean === 'NA') return 'NR';

  const match = clean.match(/(?:CRISIL|ICRA|CARE|IND|FITCH|BWR)?\s*(AAA|AA\+|AA\-|AA|A\+|A\-|A|BBB\+|BBB\-|BBB|BB\+|BB\-|BB|B\+|B\-|B|C|D|NR)/i);
  if (match && match[1]) {
    return match[1].toUpperCase();
  }
  return clean.toUpperCase();
}

/**
 * Categorize bond into an investment type (e.g. Corporate Bonds, Sovereign, NBFC, FDs).
 */
export function getInvestmentType(bond: BondHolding): string {
  const combined = `${bond.securityName || ''} ${bond.issuer || ''} ${bond.sector || ''}`.toLowerCase();
  if (combined.includes('fixed deposit') || combined.includes(' fd ') || combined.endsWith(' fd')) {
    return 'Fixed Deposits (FDs)';
  }
  if (
    combined.includes('g-sec') ||
    combined.includes('gsec') ||
    combined.includes('sovereign') ||
    combined.includes('treasury') ||
    combined.includes('sdl') ||
    combined.includes('govt') ||
    combined.includes('goi')
  ) {
    return 'Government Bonds (G-Sec)';
  }
  if (
    combined.includes('psu') ||
    combined.includes('rec') ||
    combined.includes('pfc') ||
    combined.includes('irfc') ||
    combined.includes('nhai') ||
    combined.includes('ntpc')
  ) {
    return 'PSU Bonds';
  }
  // In retail bond platforms, NBFC and Corporate Bonds are presented under Corporate Bonds
  return 'Corporate Bonds';
}

const WEIGHT_PALETTE = [
  '#70c04f', // Vibrant Green
  '#7c3aed', // Purple
  '#ec5b74', // Coral / Pink
  '#a78bfa', // Lavender
  '#38bdf8', // Sky Blue
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#e11d48', // Rose
  '#84cc16', // Lime
  '#6366f1', // Indigo
];

const RATING_COLOR_MAP: Record<string, string> = {
  AAA: '#70c04f',
  'AA+': '#84cc16',
  AA: '#22c55e',
  'AA-': '#14b8a6',
  'A+': '#ec5b74',
  A: '#6929c4',
  'A-': '#8b5cf6',
  'BBB+': '#b39ddb',
  BBB: '#f59e0b',
  'BBB-': '#f97316',
  'BB+': '#ea580c',
  BB: '#dc2626',
  'BB-': '#b91c1c',
  NR: '#94a3b8',
};

const TYPE_COLOR_MAP: Record<string, string> = {
  'Corporate Bonds': '#70c04f',
  'Fixed Deposits (FDs)': '#7c3aed',
  'Government Bonds (G-Sec)': '#38bdf8',
  'PSU Bonds': '#f59e0b',
  'NBFC Bonds': '#ec5b74',
};

/**
 * 1. Calculate Top 4 KPI Metrics
 */
export function calculateBondSummaryMetrics(bonds: BondHolding[]): BondSummaryMetrics {
  if (!bonds || bonds.length === 0) {
    return {
      totalInvested: 0,
      weightedAvgMaturityText: '—',
      uniqueSecuritiesCount: 0,
      weightedAvgYieldText: '—',
    };
  }

  const totalInvested = bonds.reduce(
    (sum, b) => sum + (b.totalValue > 0 ? b.totalValue : (b.unitsHeld * (b.faceValue || b.buyPrice)) || 0),
    0
  );

  const uniqueSecuritiesCount = new Set(
    bonds.map((b) => b.isin || b.securityName || b.issuer).filter(Boolean)
  ).size;

  const now = new Date();

  // Weighted Avg Maturity calculation
  let totalWeightedYears = 0;
  let maturityWeightSum = 0;

  for (const b of bonds) {
    const val = b.totalValue > 0 ? b.totalValue : (b.unitsHeld * (b.faceValue || b.buyPrice)) || 0;
    if (val <= 0) continue;

    const d = parseDateSafe(b.maturityDate);
    if (!d) continue;

    const diffMs = d.getTime() - now.getTime();
    const yrs = Math.max(0, diffMs / (365.25 * 24 * 3600 * 1000));
    totalWeightedYears += val * yrs;
    maturityWeightSum += val;
  }

  let weightedAvgMaturityText = '—';
  if (maturityWeightSum > 0) {
    const avgYears = totalWeightedYears / maturityWeightSum;
    const y = Math.floor(avgYears);
    const m = Math.round((avgYears - y) * 12);
    const finalY = m === 12 ? y + 1 : y;
    const finalM = m === 12 ? 0 : m;

    if (finalY > 0 && finalM > 0) {
      weightedAvgMaturityText = `${finalY} year${finalY > 1 ? 's' : ''} & ${finalM} month${finalM > 1 ? 's' : ''}`;
    } else if (finalY > 0) {
      weightedAvgMaturityText = `${finalY} year${finalY > 1 ? 's' : ''}`;
    } else if (finalM > 0) {
      weightedAvgMaturityText = `${finalM} month${finalM > 1 ? 's' : ''}`;
    } else {
      weightedAvgMaturityText = '< 1 month';
    }
  }

  // Weighted Avg Yield (YTM/YTC) calculation
  let totalWeightedYield = 0;
  let yieldWeightSum = 0;

  for (const b of bonds) {
    const val = b.totalValue > 0 ? b.totalValue : (b.unitsHeld * (b.faceValue || b.buyPrice)) || 0;
    if (val <= 0) continue;

    let y = b.ytm > 0 ? b.ytm : (b.couponRate > 0 ? b.couponRate : 0);
    if (y > 1) y = y / 100; // normalize if represented as 11.13 instead of 0.1113

    if (y > 0) {
      totalWeightedYield += val * y;
      yieldWeightSum += val;
    }
  }

  let weightedAvgYieldText = '—';
  if (yieldWeightSum > 0) {
    const avgYield = (totalWeightedYield / yieldWeightSum) * 100;
    weightedAvgYieldText = `${avgYield.toFixed(2)}% p.a.`;
  }

  return {
    totalInvested,
    weightedAvgMaturityText,
    uniqueSecuritiesCount,
    weightedAvgYieldText,
  };
}

/**
 * 2. Calculate Cashflow to Maturity/Call Timeline (1 yr, 2 yr, 5 yr)
 */
export function calculateCashflowTimeline(
  bonds: BondHolding[],
  horizonYears: 1 | 2 | 5 = 1
): MonthlyCashflowItem[] {
  const now = new Date();
  const start = startOfMonth(now);

  // Find latest maturity month among active bonds
  let maxMaturityMonths = 12;
  for (const b of bonds) {
    const mat = parseDateSafe(b.maturityDate);
    if (mat) {
      const diffMonths =
        (mat.getFullYear() - now.getFullYear()) * 12 +
        (mat.getMonth() - now.getMonth()) +
        1;
      if (diffMonths > maxMaturityMonths) {
        maxMaturityMonths = diffMonths;
      }
    }
  }

  // 1 yr: 12 months
  // 2 yr: 24 months
  // 5 yr: show up to the active portfolio maturity window (at least 24 months, capped at 60 months)
  let monthsCount = horizonYears * 12;
  if (horizonYears === 5) {
    monthsCount = Math.min(60, Math.max(24, maxMaturityMonths));
  }

  const result: MonthlyCashflowItem[] = [];

  for (let i = 0; i < monthsCount; i++) {
    const monthDate = addMonths(start, i);
    const y = monthDate.getFullYear();
    const m = monthDate.getMonth();
    const key = `${y}-${String(m + 1).padStart(2, '0')}`;
    const month = format(monthDate, 'MMM');
    const yearStr = format(monthDate, 'yyyy');

    let monthInterest = 0;
    let monthPrincipal = 0;

    for (const b of bonds) {
      const maturity = parseDateSafe(b.maturityDate);
      const isMaturedBefore = maturity && maturity < new Date(y, m, 1);
      const maturesThisMonth = maturity && maturity.getFullYear() === y && maturity.getMonth() === m;

      const couponRate = b.couponRate > 1 ? b.couponRate / 100 : b.couponRate;
      const principalValue = b.unitsHeld > 0 && b.faceValue > 0 ? b.faceValue * b.unitsHeld : b.totalValue;

      // If bond is not yet matured prior to this month, check for coupon payment
      if (!isMaturedBefore && couponRate > 0) {
        const payout = (b.payoutType || 'monthly').toLowerCase().trim();
        let intervalMonths = 1; // default monthly

        if (payout.includes('quarterly')) intervalMonths = 3;
        else if (payout.includes('semi') || payout.includes('half')) intervalMonths = 6;
        else if (payout.includes('annual') || payout.includes('yearly')) intervalMonths = 12;
        else if (payout.includes('maturity')) intervalMonths = 0; // only at maturity

        if (intervalMonths === 1) {
          monthInterest += (principalValue * couponRate) / 12;
        } else if (intervalMonths > 1) {
          // Check if this month matches payout cadence
          const anchorMonth = maturity ? maturity.getMonth() : 0;
          const diffMonths = (y * 12 + m) - (monthDate.getFullYear() * 12 + anchorMonth);
          if (Math.abs(diffMonths) % intervalMonths === 0) {
            monthInterest += (principalValue * couponRate) / (12 / intervalMonths);
          }
        } else if (intervalMonths === 0 && maturesThisMonth) {
          // At maturity full interest
          monthInterest += principalValue * couponRate;
        }
      }

      if (maturesThisMonth) {
        monthPrincipal += principalValue;
      }
    }

    result.push({
      key,
      month,
      year: yearStr,
      label: `${month} ${yearStr}`,
      interest: Math.round(monthInterest),
      principal: Math.round(monthPrincipal),
      total: Math.round(monthInterest + monthPrincipal),
    });
  }

  return result;
}

/**
 * 3. Calculate Investment Weight (%)
 */
export function calculateInvestmentWeights(bonds: BondHolding[]): InvestmentWeightItem[] {
  const total = bonds.reduce(
    (s, b) => s + (b.totalValue > 0 ? b.totalValue : (b.unitsHeld * (b.faceValue || b.buyPrice)) || 0),
    0
  );

  return bonds
    .map((b, idx) => {
      const val = b.totalValue > 0 ? b.totalValue : (b.unitsHeld * (b.faceValue || b.buyPrice)) || 0;
      const pct = total > 0 ? (val / total) * 100 : 0;
      return {
        id: b.isin || `${b.securityName}-${idx}`,
        name: b.securityName || b.issuer || 'Bond Security',
        isin: b.isin || '—',
        value: val,
        percent: pct,
        color: WEIGHT_PALETTE[idx % WEIGHT_PALETTE.length],
      };
    })
    .sort((a, b) => b.value - a.value);
}

/**
 * 4. Calculate Investment by Rating
 */
export function calculateRatingDistribution(bonds: BondHolding[]): RatingDistributionItem[] {
  const map = new Map<string, { count: number; value: number }>();
  let total = 0;

  for (const b of bonds) {
    const val = b.totalValue > 0 ? b.totalValue : (b.unitsHeld * (b.faceValue || b.buyPrice)) || 0;
    const grade = extractRatingGrade(b.creditRating);
    const prev = map.get(grade) ?? { count: 0, value: 0 };
    prev.count += 1;
    prev.value += val;
    map.set(grade, prev);
    total += val;
  }

  return Array.from(map.entries())
    .map(([rating, { count, value }]) => {
      const percent = total > 0 ? (value / total) * 100 : 0;
      const label = `${rating} (${count} ${count === 1 ? 'Bond' : 'Securities'})`;
      const color = RATING_COLOR_MAP[rating] || '#94a3b8';
      return {
        rating,
        count,
        label,
        value,
        percent,
        color,
      };
    })
    .sort((a, b) => b.value - a.value);
}

/**
 * 5. Calculate Investment Type
 */
export function calculateTypeDistribution(bonds: BondHolding[]): TypeDistributionItem[] {
  const map = new Map<string, number>();
  let total = 0;

  for (const b of bonds) {
    const val = b.totalValue > 0 ? b.totalValue : (b.unitsHeld * (b.faceValue || b.buyPrice)) || 0;
    const type = getInvestmentType(b);
    map.set(type, (map.get(type) ?? 0) + val);
    total += val;
  }

  return Array.from(map.entries())
    .map(([type, value], idx) => {
      const percent = total > 0 ? (value / total) * 100 : 0;
      const color = TYPE_COLOR_MAP[type] || WEIGHT_PALETTE[idx % WEIGHT_PALETTE.length];
      return {
        type,
        value,
        percent,
        color,
      };
    })
    .sort((a, b) => b.value - a.value);
}
