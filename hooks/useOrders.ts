'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import type { Order, PerformanceHistory, PerformanceRange } from '@/types/orders';

interface OrdersApiResponse {
  orders: Order[];
  performanceHistory: PerformanceHistory;
}

async function fetchOrders(range: PerformanceRange = 'ALL'): Promise<OrdersApiResponse> {
  const res = await fetch(`/api/orders?range=${range}`);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || errData.error || `Failed to fetch orders: ${res.statusText}`);
  }
  return res.json();
}

export function useOrders(range: PerformanceRange = 'ALL') {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: queryKeys.orders(range),
    queryFn: () => fetchOrders(range),
    staleTime: 2 * 60 * 1000,        // 2 minutes
    refetchInterval: 10 * 60 * 1000,  // 10 minutes background
    retry: 1,
  });

  return {
    orders: data?.orders ?? [],
    performanceHistory: data?.performanceHistory ?? null,
    isLoading,
    isFetching,
    error: error as Error | null,
    refetch,
  };
}
