'use client';

import { useQuery } from '@tanstack/react-query';
import type { ResearchData } from '@/types/research';

async function fetchResearch(symbol: string): Promise<ResearchData> {
  const res = await fetch(`/api/analysis/${symbol}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to fetch research data (${res.status})`);
  }
  return res.json();
}

export function useResearch(symbol: string | null) {
  return useQuery<ResearchData, Error>({
    queryKey: ['research', symbol],
    queryFn: () => fetchResearch(symbol!),
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000,    // 5 minutes
    gcTime: 15 * 60 * 1000,       // 15 minutes cache
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
