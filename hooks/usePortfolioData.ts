'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import type { SanitizedPortfolioData } from '@/lib/server/portfolioService';
import { useMemo } from 'react';

async function fetchPortfolioData(force = false): Promise<SanitizedPortfolioData> {
  const url = force ? '/api/portfolio?force=true' : '/api/portfolio';
  const res = await fetch(url);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Failed to fetch portfolio: ${res.statusText}`);
  }
  return res.json();
}

export function usePortfolioData(force = false) {
  const { data, isLoading, error, dataUpdatedAt } = useQuery({
    queryKey: force ? queryKeys.portfolioForced : queryKeys.portfolio,
    queryFn: () => fetchPortfolioData(force),
    staleTime: 5 * 60 * 1000,      // Consider data fresh for 5 mins
    refetchInterval: 15 * 60 * 1000, // Refetch every 15 mins in background
    refetchIntervalInBackground: false, // Save quota when tab is inactive
    gcTime: 20 * 60 * 1000,
    retry: 2,
  });

  // Revive transaction dates from serialized ISO strings
  const transactions = useMemo(() => {
    if (!data?.transactions) return [];
    return data.transactions.map((t) => ({
      ...t,
      date: new Date(t.date),
    }));
  }, [data?.transactions]);

  const cashFlowStats = useMemo(() => {
    if (!data?.cashFlowStats) {
      return {
        totalInvestment: 0,
        totalExpenses: 0,
        totalFoodAndEntertainment: 0,
        totalOthers: 0,
        monthlySummaries: [],
        startDate: null,
        endDate: null,
      };
    }
    return {
      ...data.cashFlowStats,
      startDate: data.cashFlowStats.startDate ? new Date(data.cashFlowStats.startDate) : null,
      endDate: data.cashFlowStats.endDate ? new Date(data.cashFlowStats.endDate) : null,
    };
  }, [data?.cashFlowStats]);

  return {
    raw: null,
    isLoading,
    error: error as Error | null,
    lastFetched: data?.meta.lastFetched ?? null,
    dataUpdatedAt,
    tabs: [],
    apiErrors: data?.meta.errors ?? [],

    // Holdings
    equity: data?.equity ?? [],
    bonds: data?.bonds ?? [],
    portfolio: data?.portfolio ?? [],
    transactions,

    // Aggregates
    netWorth: data?.netWorth ?? 0,
    equityTotal: data?.equityTotal ?? 0,
    bondTotal: data?.bondTotal ?? 0,
    todaysChange: data?.todaysChange ?? 0,
    todaysChangePct: data?.todaysChangePct ?? 0,

    // Analytics
    cashFlowStats,
    assetAllocation: data?.assetAllocation ?? [],
    overallAllocation: data?.overallAllocation ?? [],
    sectorAllocation: data?.sectorAllocation ?? [],
    concentrationRisk: data?.concentrationRisk ?? {
      top5Holdings: [],
      top5Percent: 0,
      herfindahlIndex: 0,
      diversificationScore: 0,
    },
    winners: data?.winners ?? [],
    losers: data?.losers ?? [],
    bondMaturityEvents: data?.bondMaturityEvents ?? [],
    bondLadder: data?.bondLadder ?? [],
    creditRatingDistribution: data?.creditRatingDistribution ?? [],
  };
}
