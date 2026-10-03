'use client';

import { useNewsSync } from '@/hooks/useNews';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function SyncButton() {
  const { mutateAsync: syncNews, isPending } = useNewsSync();
  const [result, setResult] = useState<string | null>(null);

  const handleSync = async () => {
    try {
      setResult(null);
      const data = await syncNews();
      setResult(`${data.newArticles} news updated`);
      setTimeout(() => setResult(null), 5000);
    } catch {
      setResult('Failed to sync');
      setTimeout(() => setResult(null), 5000);
    }
  };

  return (
    <div className="relative flex flex-col items-center">
      <button
        onClick={handleSync}
        disabled={isPending}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-blue-500/20"
      >
        <RefreshCw className={cn("w-3.5 h-3.5", isPending && "animate-spin")} />
        {isPending ? 'Syncing...' : 'Sync News'}
      </button>
      {result && (
        <span className="absolute top-[calc(100%+4px)] right-0 text-[10px] text-slate-400 whitespace-nowrap bg-slate-900/90 backdrop-blur border border-white/10 px-2 py-0.5 rounded shadow-lg animate-in fade-in slide-in-from-top-1 z-50">
          {result}
        </span>
      )}
    </div>
  );
}
