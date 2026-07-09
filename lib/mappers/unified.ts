import type { EquityHolding, PortfolioRow } from '@/types/holdings';
import type { BondHolding } from '@/types/bonds';

export function buildUnifiedPortfolio(
  equity: EquityHolding[],
  bonds: BondHolding[]
): PortfolioRow[] {
  const totalValue =
    equity.reduce((s, h) => s + h.currentValue, 0) +
    bonds.reduce((s, b) => s + b.totalValue, 0);

  const equityRows: PortfolioRow[] = equity.map((h) => ({
    id: `equity-${h.ticker}`,
    type: 'equity',
    ticker: h.ticker,
    name: h.name,
    sector: h.sector,
    currentValue: h.currentValue,
    allocationPercent: totalValue > 0 ? h.currentValue / totalValue : 0,
    percentChange: h.percentChange,
  }));

  const bondRows: PortfolioRow[] = bonds.map((b) => ({
    id: `bond-${b.isin || b.securityName}`,
    type: 'bond',
    ticker: b.isin,
    name: b.securityName,
    sector: b.sector,
    currentValue: b.totalValue,
    allocationPercent: totalValue > 0 ? b.totalValue / totalValue : 0,
    maturityDate: b.maturityDate ?? undefined,
    creditRating: b.creditRating,
    ytm: b.ytm,
  }));

  return [...equityRows, ...bondRows].sort((a, b) => b.currentValue - a.currentValue);
}
