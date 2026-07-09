'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { queryKeys } from '@/lib/query-keys';

export function useRefreshData() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      // Force-fetch bypasses server cache
      await fetch('/api/sheets?force=true');
      // Invalidate and refetch the standard query key
      await queryClient.invalidateQueries({ queryKey: queryKeys.sheets });
      await queryClient.refetchQueries({ queryKey: queryKeys.sheets });
    } finally {
      setIsRefreshing(false);
    }
  };

  return { refresh, isRefreshing };
}
