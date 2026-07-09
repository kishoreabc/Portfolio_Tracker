import type { ParsedSheet } from '@/types/sheets';
import type { BondHolding } from '@/types/bonds';

export function mapBondHoldings(sheet: ParsedSheet | null): BondHolding[] {
  if (!sheet || !sheet.rows.length) return [];

  return sheet.rows
    .filter((row) => row.isin || row.securityName || row.issuer)
    .map((row) => ({
      broker: String(row.broker ?? '').trim(),
      issuer: String(row.issuer ?? '').trim(),
      securityName: String(row.securityName ?? row.name ?? '').trim(),
      isin: String(row.isin ?? '').trim().toUpperCase(),
      sector: String(row.sector ?? 'Unknown').trim(),
      creditRating: String(row.creditRating ?? 'NR').trim(),
      maturityDate: row.maturityDate ? String(row.maturityDate).trim() : null,
      duration: Number(row.duration ?? 0),
      couponRate: Number(row.couponRate ?? 0),
      ytm: Number(row.ytm ?? 0),
      faceValue: Number(row.faceValue ?? 0),
      buyPrice: Number(row.buyPrice ?? 0),
      unitsHeld: Number(row.shares ?? row.unitsHeld ?? 0),
      totalValue: Number(row.currentValue ?? row.totalValue ?? 0),
      portfolioPercent: Number(row.portfolioPercent ?? row.allocationPercent ?? 0),
    }))
    .filter((b) => b.totalValue > 0 || b.isin);
}
