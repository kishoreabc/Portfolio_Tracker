'use client';

import { useState } from 'react';
import type { AIInsightsResponse } from '@/types/insights';

interface InsightPayload {
  equitySummary: object;
  bondSummary: object;
  cashFlowSummary: object;
  allocationSummary: object;
}

export function useAiInsights() {
  const [insights, setInsights] = useState<AIInsightsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);

  const fetchInsights = async (payload: InsightPayload) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to fetch insights');
      setInsights(data.insights);
      setCached(data.cached ?? false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const resetInsights = () => {
    setInsights(null);
    setError(null);
    setCached(false);
  };

  return { insights, isLoading, error, cached, fetchInsights, resetInsights };
}

