'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export type TimeRange = '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '3y' | '5y' | 'max';

export interface Candle {
  time: number; // Unix timestamp seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface QuoteData {
  symbol?: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketPreviousClose?: number;
  regularMarketOpen?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  averageDailyVolume3Month?: number;
  marketCap?: number;
  trailingPE?: number;
  trailingEps?: number;
  dividendYield?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  exchange?: string;
  fullExchangeName?: string;
  currency?: string;
  regularMarketTime?: string | number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface HistoryData {
  symbol: string;
  range: string;
  candles: Candle[];
}

interface ProfileData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

async function fetchQuote(symbol: string): Promise<QuoteData> {
  const res = await fetch(`/api/stocks/${symbol}/quote`);
  if (!res.ok) throw new Error('Failed to fetch quote');
  return res.json();
}

async function fetchHistory(symbol: string, range: TimeRange): Promise<HistoryData> {
  const res = await fetch(`/api/stocks/${symbol}/history?range=${range}`);
  if (!res.ok) throw new Error('Failed to fetch history');
  return res.json();
}

async function fetchProfile(symbol: string): Promise<ProfileData> {
  const res = await fetch(`/api/stocks/${symbol}/profile`);
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
}

export function useStockDetails(symbol: string | null, range: TimeRange = '1y') {
  const enabled = !!symbol;

  const quoteQuery = useQuery({
    queryKey: ['stock-quote', symbol],
    queryFn: () => fetchQuote(symbol!),
    enabled,
    staleTime: 60 * 1000,
    retry: 1,
  });

  const historyQuery = useQuery({
    queryKey: ['stock-history', symbol, range],
    queryFn: () => fetchHistory(symbol!, range),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const profileQuery = useQuery({
    queryKey: ['stock-profile', symbol],
    queryFn: () => fetchProfile(symbol!),
    enabled,
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });

  const performance = useMemo(() => {
    const candles = historyQuery.data?.candles;
    if (!candles || candles.length < 2) return null;
    const prices = candles.map((c) => c.close);
    const last = prices[prices.length - 1];

    const calcReturn = (fromIndex: number) => {
      const from = prices[fromIndex];
      if (!from) return null;
      return ((last - from) / from) * 100;
    };

    return {
      today: quoteQuery.data?.regularMarketChangePercent ?? null,
      '1w': range === '5d' ? calcReturn(0) : calcReturn(Math.max(0, prices.length - 6)),
      '1mo': range === '1mo' ? calcReturn(0) : calcReturn(Math.max(0, prices.length - 22)),
      '3mo': range === '3mo' ? calcReturn(0) : calcReturn(Math.max(0, prices.length - 66)),
      '6mo': range === '6mo' ? calcReturn(0) : calcReturn(Math.max(0, prices.length - 132)),
      '1y': range === '1y' ? calcReturn(0) : calcReturn(Math.max(0, Math.floor(prices.length - 252))),
      '3y': range === '3y' ? calcReturn(0) : null,
      '5y': range === '5y' ? calcReturn(0) : null,
      'max': range === 'max' ? calcReturn(0) : null,
    };
  }, [historyQuery.data, quoteQuery.data]);

  return {
    quote: quoteQuery.data ?? null,
    candles: historyQuery.data?.candles ?? [],
    profile: profileQuery.data ?? null,
    performance,
    isQuoteLoading: quoteQuery.isLoading,
    isHistoryLoading: historyQuery.isLoading,
    isProfileLoading: profileQuery.isLoading,
    quoteError: quoteQuery.error,
    historyError: historyQuery.error,
  };
}
