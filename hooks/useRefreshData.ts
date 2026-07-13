'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';
import { queryKeys } from '@/lib/query-keys';

export function useRefreshData() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearError = () => {
    setError(null);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const refresh = async () => {
    setIsRefreshing(true);
    clearError();
    try {
      // Force-fetch bypasses server cache
      const res = await fetch('/api/sheets?force=true');
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to refresh data: ${res.statusText}`);
      }

      // Invalidate and refetch the standard query key
      await queryClient.invalidateQueries({ queryKey: queryKeys.sheets });
      await queryClient.refetchQueries({ queryKey: queryKeys.sheets });
    } catch (err) {
      let message = err instanceof Error ? err.message : String(err);
      
      // Try to extract status from Google API JSON error
      try {
        const jsonStart = message.indexOf('{');
        if (jsonStart !== -1) {
          const jsonStr = message.substring(jsonStart);
          const parsed = JSON.parse(jsonStr);
          if (parsed?.error?.status) {
            message = parsed.error.status;
          } else if (parsed?.error?.message) {
            message = parsed.error.message;
          }
        }
      } catch (e) {
        // ignore parse error
      }

      setError(message);
      timeoutRef.current = setTimeout(() => {
        setError(null);
      }, 5000);
    } finally {
      setIsRefreshing(false);
    }
  };

  return { refresh, isRefreshing, error, clearError };
}
