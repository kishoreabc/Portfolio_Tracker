import type { ParsedSheet } from '@/types/sheets';
import type { EquityHolding } from '@/types/holdings';

export function mapEquityHoldings(sheet: ParsedSheet | null): EquityHolding[] {
  if (!sheet || !sheet.rows.length) return [];

  return sheet.rows
    .filter((row) => row.ticker || row.name) // must have at least one identifier
    .map((row) => {
      const currentPrice = Number(row.currentPrice ?? 0);
      const priceChange = Number(row.priceChange ?? 0);
      let percentChange = Number(row.pctChange ?? 0);

      // Fallback: if percentChange is 0 but we have a priceChange, compute it
      if (percentChange === 0 && priceChange !== 0 && currentPrice !== 0) {
        const prevClose = currentPrice - priceChange;
        if (prevClose !== 0) {
          percentChange = priceChange / prevClose;
        }
      }

      return {
        ticker: String(row.ticker ?? row.name ?? '').toUpperCase().trim(),
        exchange: String(row.exchange ?? 'NSE').trim(),
        name: String(row.name ?? row.ticker ?? '').trim(),
        currentPrice,
        priceChange,
        percentChange,
        shares: Number(row.shares ?? 0),
        currentValue: Number(row.currentValue ?? 0),
        allocationPercent: Number(row.allocationPercent ?? row['%'] ?? 0),
        sector: String(row.sector ?? 'Unknown').trim(),
      };
    })
    .filter((h) => h.ticker && h.currentValue >= 0);
}
