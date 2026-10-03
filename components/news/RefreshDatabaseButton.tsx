'use client';

import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function RefreshDatabaseButton() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setResult(null);
    try {
      // Invalidate and refetch all news queries
      await queryClient.invalidateQueries({ queryKey: ['news'] });
      setResult('Database synced');
    } catch {
      setResult('Failed to sync');
    } finally {
      setIsRefreshing(false);
      setTimeout(() => setResult(null), 3000);
    }
  };

  return (
    <div className="relative flex flex-col items-center">
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-500/20"
      >
        <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
        {isRefreshing ? 'Syncing...' : 'Sync DB'}
      </button>
      {result && (
        <span className="absolute top-[calc(100%+4px)] right-0 text-[10px] text-emerald-400 whitespace-nowrap bg-emerald-950/90 backdrop-blur border border-emerald-500/20 px-2 py-0.5 rounded shadow-lg animate-in fade-in slide-in-from-top-1 z-50">
          {result}
        </span>
      )}
    </div>
  );
}
