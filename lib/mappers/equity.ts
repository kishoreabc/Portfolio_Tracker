import type { ParsedSheet } from '@/types/sheets';
import type { EquityHolding } from '@/types/holdings';

export const BANK_PB_DEFAULTS: Record<string, number> = {
  SOUTHBANK: 1.01,
  KTKBANK: 0.90,
  IDFCFIRSTB: 1.52,
  INDUSINDBK: 1.13,
  HDFCBANK: 2.85,
  ICICIBANK: 3.12,
  SBIN: 1.45,
  KOTAKBANK: 2.70,
  AXISBANK: 1.85,
  BANKBARODA: 1.10,
  PNB: 1.05,
  FEDERALBNK: 1.25,
  RBLBANK: 0.95,
  YESBANK: 1.30,
};

export function isBankingSector(sector: string): boolean {
  if (!sector) return false;
  const s = sector.toLowerCase().trim();
  return s === 'banking' || s === 'bank' || s === 'banks' || s.includes('bank');
}

export function mapEquityHoldings(sheet: ParsedSheet | null): EquityHolding[] {
  if (!sheet || !sheet.rows.length) return [];

  const rawHoldings = sheet.rows
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

      const ticker = String(row.ticker ?? row.name ?? '').toUpperCase().trim();
      const sector = String(row.sector ?? 'Unknown').trim();
      const isBank = isBankingSector(sector);

      // Parse PE from sheet
      const rawPe = row.peRatio ?? row.pe;
      let pe: number | null = null;
      if (typeof rawPe === 'number' && !isNaN(rawPe) && rawPe > 0) {
        pe = Math.round(rawPe * 100) / 100;
      } else if (rawPe && !isNaN(Number(rawPe)) && Number(rawPe) > 0) {
        pe = Math.round(Number(rawPe) * 100) / 100;
      }

      // Parse PB from sheet or fallback defaults for banking
      const rawPb = row.pbRatio ?? row.pb;
      let pb: number | null = null;
      if (typeof rawPb === 'number' && !isNaN(rawPb) && rawPb > 0) {
        pb = Math.round(rawPb * 100) / 100;
      } else if (rawPb && !isNaN(Number(rawPb)) && Number(rawPb) > 0) {
        pb = Math.round(Number(rawPb) * 100) / 100;
      } else if (isBank && BANK_PB_DEFAULTS[ticker]) {
        pb = BANK_PB_DEFAULTS[ticker];
      }

      // For banking, user requested PB ratio; for non-banking, use PE ratio
      const valuationType: 'PE' | 'PB' | null = isBank
        ? (pb !== null ? 'PB' : null)
        : (pe !== null ? 'PE' : (pb !== null ? 'PB' : null));

      const valuationRatio: number | null = isBank
        ? (pb ?? null)
        : (pe ?? (pb ?? null));

      return {
        ticker,
        exchange: String(row.exchange ?? 'NSE').trim(),
        name: String(row.name ?? row.ticker ?? '').trim(),
        currentPrice,
        priceChange,
        percentChange,
        shares: Number(row.shares ?? 0),
        currentValue: Number(row.currentValue ?? 0),
        allocationPercent: Number(row.allocationPercent ?? row['%'] ?? 0),
        sector,
        pe,
        pb,
        valuationType,
        valuationRatio,
      };
    })
    .filter((h) => h.ticker && h.currentValue >= 0);

  const totalValue = rawHoldings.reduce((sum, h) => sum + h.currentValue, 0);

  return rawHoldings.map((h) => ({
    ...h,
    allocationPercent:
      h.allocationPercent > 0
        ? h.allocationPercent
        : totalValue > 0
        ? (h.currentValue / totalValue) * 100
        : 0,
  }));
}
