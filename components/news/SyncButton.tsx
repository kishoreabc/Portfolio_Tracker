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
      setResult(`+${data.newArticles} new, ${data.translated} translated`);
      setTimeout(() => setResult(null), 5000);
    } catch (err) {
      setResult('Failed to sync');
      setTimeout(() => setResult(null), 5000);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {result && <span className="text-xs text-slate-400 animate-in fade-in">{result}</span>}
      <button
        onClick={handleSync}
        disabled={isPending}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-blue-500/20"
      >
        <RefreshCw className={cn("w-4 h-4", isPending && "animate-spin")} />
        {isPending ? 'Syncing...' : 'Sync News'}
      </button>
    </div>
  );
}
