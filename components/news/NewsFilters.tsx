'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { NewsSentiment, NewsImpact } from '@/types/news';

export function NewsFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const currentCategory = searchParams.get('category');
  const currentSentiment = searchParams.get('sentiment');
  const currentImpact = searchParams.get('impact');
  const isPortfolioRelevant = searchParams.get('portfolioRelevant') === 'true';

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Reset page on filter change
    params.delete('page');
    router.push(`/news?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 py-4 border-b border-white/5">
      <button
        onClick={() => updateFilter('portfolioRelevant', isPortfolioRelevant ? null : 'true')}
        className={cn(
          "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
          isPortfolioRelevant 
            ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" 
            : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
        )}
      >
        Portfolio Only
      </button>

      <div className="h-4 w-px bg-white/10 mx-1" />

      {/* Category */}
      <select
        value={currentCategory || ''}
        onChange={(e) => updateFilter('category', e.target.value)}
        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/5 border border-white/10 text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
      >
        <option value="">All Categories</option>
        <option value="Domestic News">Domestic News</option>
        <option value="Corporate">Corporate</option>
        <option value="Earnings">Earnings</option>
        <option value="Economy">Economy</option>
      </select>

      {/* Sentiment */}
      <select
        value={currentSentiment || ''}
        onChange={(e) => updateFilter('sentiment', e.target.value)}
        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/5 border border-white/10 text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
      >
        <option value="">All Sentiment</option>
        <option value="positive">Positive</option>
        <option value="negative">Negative</option>
        <option value="mixed">Mixed</option>
        <option value="neutral">Neutral</option>
      </select>

      {/* Impact */}
      <select
        value={currentImpact || ''}
        onChange={(e) => updateFilter('impact', e.target.value)}
        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/5 border border-white/10 text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
      >
        <option value="">All Impact</option>
        <option value="high">High Impact</option>
        <option value="medium">Medium Impact</option>
        <option value="low">Low Impact</option>
      </select>
      
      {(currentCategory || currentSentiment || currentImpact || isPortfolioRelevant) && (
        <button
          onClick={() => router.push('/news')}
          className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white transition-colors"
        >
          Clear All
        </button>
      )}
    </div>
  );
}
