'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import type { SheetsApiResponse } from '@/types/sheets';
import { mapEquityHoldings } from '@/lib/mappers/equity';
import { mapBondHoldings } from '@/lib/mappers/bonds';
import { mapTransactions, buildCashFlowStats } from '@/lib/mappers/cashflow';
import { buildUnifiedPortfolio } from '@/lib/mappers/unified';
import { computeAssetAllocation, computeSectorAllocation } from '@/lib/calc/allocation';
import { computeConcentrationRisk, computeWinnersLosers } from '@/lib/calc/risk';
import { buildBondMaturityEvents, buildBondLadder, buildCreditRatingDistribution } from '@/lib/calc/forecast';

async function fetchSheetsData(force = false): Promise<SheetsApiResponse> {
  const url = force ? '/api/sheets?force=true' : '/api/sheets';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch data: ${res.statusText}`);
  return res.json();
}

export function usePortfolioData(force = false) {
  const { data: raw, isLoading, error, dataUpdatedAt } = useQuery({
    queryKey: force ? queryKeys.sheetsForced : queryKeys.sheets,
    queryFn: () => fetchSheetsData(force),
    staleTime: 15 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    retry: 2,
  });

  // Derived data — memoized by query cache
  const equity = mapEquityHoldings(raw?.equity ?? null);
  const bonds = mapBondHoldings(raw?.bonds ?? null);
  const transactions = mapTransactions(raw?.transactions ?? null);
  const cashFlowStats = buildCashFlowStats(transactions);
  const portfolio = buildUnifiedPortfolio(equity, bonds);
  const assetAllocation = computeAssetAllocation(equity, bonds);
  const sectorAllocation = computeSectorAllocation(equity, bonds);
  const concentrationRisk = computeConcentrationRisk(equity, bonds);
  const { winners, losers } = computeWinnersLosers(equity);
  const bondMaturityEvents = buildBondMaturityEvents(bonds);
  const bondLadder = buildBondLadder(bonds);
  const creditRatingDistribution = buildCreditRatingDistribution(bonds);

  const equityTotal = equity.reduce((s, h) => s + h.currentValue, 0);
  const bondTotal = bonds.reduce((s, b) => s + b.totalValue, 0);
  const netWorth = equityTotal + bondTotal;

  const todaysChange = equity.reduce((s, h) => s + h.priceChange * h.shares, 0);
  const todaysChangePct = netWorth > 0 ? todaysChange / netWorth : 0;

  return {
    // Raw
    raw,
    isLoading,
    error: error as Error | null,
    lastFetched: raw?.meta.lastFetched ?? null,
    dataUpdatedAt,
    tabs: raw?.meta.tabs ?? [],
    apiErrors: raw?.meta.errors ?? [],

    // Holdings
    equity,
    bonds,
    portfolio,
    transactions,

    // Aggregates
    netWorth,
    equityTotal,
    bondTotal,
    todaysChange,
    todaysChangePct,

    // Analytics
    cashFlowStats,
    assetAllocation,
    sectorAllocation,
    concentrationRisk,
    winners,
    losers,
    bondMaturityEvents,
    bondLadder,
    creditRatingDistribution,
  };
}
