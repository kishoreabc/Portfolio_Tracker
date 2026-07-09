import type { EquityHolding } from '@/types/holdings';
import type { BondHolding } from '@/types/bonds';

export interface ConcentrationRisk {
  top5Holdings: { name: string; value: number; percent: number; type: 'equity' | 'bond' }[];
  top5Percent: number;
  herfindahlIndex: number; // 0–1, higher = more concentrated
  diversificationScore: number; // 0–100, higher = more diversified
}

export function computeConcentrationRisk(
  equity: EquityHolding[],
  bonds: BondHolding[]
): ConcentrationRisk {
  const all = [
    ...equity.map((h) => ({ name: h.name || h.ticker, value: h.currentValue, type: 'equity' as const })),
    ...bonds.map((b) => ({ name: b.securityName || b.isin, value: b.totalValue, type: 'bond' as const })),
  ].sort((a, b) => b.value - a.value);

  const total = all.reduce((s, h) => s + h.value, 0);
  if (total === 0) {
    return { top5Holdings: [], top5Percent: 0, herfindahlIndex: 0, diversificationScore: 0 };
  }

  const withPercent = all.map((h) => ({ ...h, percent: h.value / total }));
  const top5 = withPercent.slice(0, 5);
  const top5Percent = top5.reduce((s, h) => s + h.percent, 0);

  // Herfindahl-Hirschman Index
  const hhi = withPercent.reduce((s, h) => s + h.percent ** 2, 0);

  // Diversification score: 100 = perfectly equal n-way split, 0 = one holding
  const n = all.length;
  const minHHI = n > 0 ? 1 / n : 1;
  const score = n <= 1 ? 0 : Math.max(0, Math.round(((1 - hhi) / (1 - minHHI)) * 100));

  return {
    top5Holdings: top5,
    top5Percent,
    herfindahlIndex: hhi,
    diversificationScore: score,
  };
}

export interface WinnerLoser {
  ticker: string;
  name: string;
  percentChange: number;
  priceChange: number;
  currentValue: number;
  currentPrice: number;
}

export function computeWinnersLosers(equity: EquityHolding[]): {
  winners: WinnerLoser[];
  losers: WinnerLoser[];
} {
  const mapToWL = (h: EquityHolding) => ({
    ticker: h.ticker,
    name: h.name,
    percentChange: h.percentChange,
    priceChange: h.priceChange,
    currentValue: h.currentValue,
    currentPrice: h.currentPrice,
  });

  const winners = [...equity]
    .filter((h) => h.percentChange > 0)
    .sort((a, b) => b.percentChange - a.percentChange)
    .slice(0, 5)
    .map(mapToWL);

  const losers = [...equity]
    .filter((h) => h.percentChange < 0)
    .sort((a, b) => a.percentChange - b.percentChange)
    .slice(0, 5)
    .map(mapToWL);

  return { winners, losers };
}
