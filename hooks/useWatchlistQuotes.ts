'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { WatchlistStockQuote } from '@/types/watchlist';

interface BatchQuotesResponse {
  quotes: Record<string, WatchlistStockQuote>;
  list: WatchlistStockQuote[];
}

async function fetchWatchlistQuotes(symbols: string[]): Promise<BatchQuotesResponse> {
  if (symbols.length === 0) {
    return { quotes: {}, list: [] };
  }
  const queryStr = symbols.join(',');
  const res = await fetch(`/api/stocks/quotes?symbols=${encodeURIComponent(queryStr)}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch watchlist quotes: ${res.statusText}`);
  }
  return res.json();
}

export function useWatchlistQuotes(symbols: string[]) {
  // Sort symbols for stable query key
  const normalizedSymbols = useMemo(() => {
    return Array.from(new Set(symbols.map((s) => s.toUpperCase()))).sort();
  }, [symbols]);

  const queryKey = useMemo(() => ['watchlist-quotes', normalizedSymbols.join(',')], [normalizedSymbols]);

  const { data, isLoading, isFetching, error, refetch } = useQuery<BatchQuotesResponse>({
    queryKey,
    queryFn: () => fetchWatchlistQuotes(normalizedSymbols),
    enabled: normalizedSymbols.length > 0,
    staleTime: 45 * 1000,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
    retry: 1,
  });

  const quotesMap = data?.quotes ?? {};

  // Build ordered list matching the user's specific watchlist order
  const quotesList = useMemo(() => {
    if (!data) return [];
    return symbols
      .map((sym) => quotesMap[sym.toUpperCase()])
      .filter((q): q is WatchlistStockQuote => Boolean(q));
  }, [symbols, data, quotesMap]);

  // Derived metrics for KPIs
  const summary = useMemo(() => {
    if (quotesList.length === 0) {
      return {
        totalCount: 0,
        gainersCount: 0,
        losersCount: 0,
        unchangedCount: 0,
        avgChangePct: 0,
        topPerformer: null,
        worstPerformer: null,
      };
    }

    let totalPct = 0;
    let gainers = 0;
    let losers = 0;
    let unchanged = 0;
    let top: WatchlistStockQuote | null = null;
    let worst: WatchlistStockQuote | null = null;

    for (const q of quotesList) {
      totalPct += q.percentChange;
      if (q.percentChange > 0) gainers++;
      else if (q.percentChange < 0) losers++;
      else unchanged++;

      if (!top || q.percentChange > top.percentChange) top = q;
      if (!worst || q.percentChange < worst.percentChange) worst = q;
    }

    return {
      totalCount: quotesList.length,
      gainersCount: gainers,
      losersCount: losers,
      unchangedCount: unchanged,
      avgChangePct: totalPct / quotesList.length,
      topPerformer: top,
      worstPerformer: worst,
    };
  }, [quotesList]);

  return {
    quotes: quotesMap,
    list: quotesList,
    isLoading: isLoading && symbols.length > 0,
    isFetching,
    error,
    refetch,
    summary,
  };
}
