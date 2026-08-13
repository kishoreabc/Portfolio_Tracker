'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useNews, useNewsSearch } from '@/hooks/useNews';
import { NewsSearch } from '@/components/news/NewsSearch';
import { NewsFilters } from '@/components/news/NewsFilters';
import { NewsList } from '@/components/news/NewsList';
import { SyncButton } from '@/components/news/SyncButton';
import { Newspaper } from 'lucide-react';

function NewsContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q');
  const isSemantic = searchParams.get('semantic') === 'true';

  // If there's a search query, use the search hook
  const searchResult = useNewsSearch(query || '', isSemantic);
  
  // Otherwise, use the standard paginated hook
  const filters = {
    page: parseInt(searchParams.get('page') || '1', 10),
    category: searchParams.get('category') || undefined,
    sentiment: searchParams.get('sentiment') as any || undefined,
    impact: searchParams.get('impact') as any || undefined,
    portfolioRelevant: searchParams.get('portfolioRelevant') === 'true' ? true : undefined,
  };
  const newsResult = useNews(filters);

  const activeResult = query ? searchResult : newsResult;
  const articles = query ? searchResult.data?.articles || [] : newsResult.data?.articles || [];

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-2 flex items-center gap-3">
            <Newspaper className="w-8 h-8 text-blue-500" />
            Financial News
          </h1>
          <p className="text-slate-400 text-sm md:text-base max-w-xl">
            Real-time market news translated into English and analyzed using NVIDIA AI.
          </p>
        </div>
        <SyncButton />
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-0 border border-white/10 rounded-2xl bg-white/[0.02] p-4 md:p-6 overflow-hidden">
        <NewsSearch />
        {!query && <NewsFilters />}
      </div>

      {/* Content */}
      <NewsList 
        articles={articles} 
        isLoading={activeResult.isLoading} 
        error={activeResult.error} 
      />
    </div>
  );
}

export default function NewsPage() {
  return (
    <div className="min-h-screen p-4 md:p-8 pt-20 md:pt-8 w-full max-w-[1600px] mx-auto pb-24">
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      }>
        <NewsContent />
      </Suspense>
    </div>
  );
}
