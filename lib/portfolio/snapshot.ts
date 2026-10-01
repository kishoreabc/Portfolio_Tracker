/**
 * lib/portfolio/snapshot.ts
 *
 * Builds a PortfolioSnapshot from the existing SanitizedPortfolioData.
 * This is the adapter between the existing data pipeline and the new analytics architecture.
 */

import type { PortfolioSnapshot } from '@/types/portfolio-snapshot';
import type { SanitizedPortfolioData } from '@/lib/server/portfolioService';
import crypto from 'crypto';

/**
 * Build a canonical PortfolioSnapshot from existing portfolio service data.
 */
export function buildPortfolioSnapshot(
  data: SanitizedPortfolioData
): PortfolioSnapshot {
  const asOf = data.meta.lastFetched || new Date().toISOString();

  const totalInvestment = data.cashFlowStats.totalInvestment;
  const totalExpenses = data.cashFlowStats.totalExpenses;
  const monthCount = data.cashFlowStats.monthlySummaries.length || 1;
  const monthlyAvg = totalInvestment / monthCount;
  const lastMonth = data.cashFlowStats.monthlySummaries.slice(-1)[0];

  const snapshot: PortfolioSnapshot = {
    snapshotId: generateSnapshotId(data),
    asOf,

    holdings: {
      equity: data.equity,
      bonds: data.bonds,
      transactions: data.transactions,
    },

    aggregates: {
      netWorth: data.netWorth,
      equityTotal: data.equityTotal,
      bondTotal: data.bondTotal,
      equityCount: data.equity.length,
      bondCount: data.bonds.length,
      todaysChange: data.todaysChange,
      todaysChangePct: data.todaysChangePct,
    },

    allocation: {
      assetAllocation: data.assetAllocation.map((a) => ({
        label: a.label,
        value: a.value,
        percent: a.percent,
      })),
      sectorAllocation: data.sectorAllocation.map((s) => ({
        sector: s.sector,
        equityValue: s.equityValue,
        bondValue: s.bondValue,
        totalValue: s.totalValue,
        percent: s.percent,
      })),
    },

    concentration: {
      top5Holdings: data.concentrationRisk.top5Holdings,
      top5Percent: data.concentrationRisk.top5Percent,
      herfindahlIndex: data.concentrationRisk.herfindahlIndex,
      diversificationScore: data.concentrationRisk.diversificationScore,
    },

    cashFlow: {
      totalInvestment,
      totalExpenses,
      monthlyAvgInvestment: monthlyAvg,
      lastMonthInvestment: lastMonth?.investment ?? 0,
      lastMonthExpenses: lastMonth?.totalExpenses ?? 0,
    },
  };

  return snapshot;
}

/**
 * Generate a deterministic snapshot ID from portfolio data.
 * Uses SHA-256 of canonical serialization.
 */
function generateSnapshotId(data: SanitizedPortfolioData): string {
  const canonical = JSON.stringify({
    equityCount: data.equity.length,
    bondCount: data.bonds.length,
    netWorth: Math.round(data.netWorth),
    tickers: data.equity.map((e) => e.ticker).sort(),
    isins: data.bonds.map((b) => b.isin).sort(),
  });

  return crypto.createHash('sha256').update(canonical).digest('hex').slice(0, 16);
}
