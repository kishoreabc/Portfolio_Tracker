'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useNews, useNewsSearch } from '@/hooks/useNews';
import { NewsSearch } from '@/components/news/NewsSearch';
import { NewsFilters } from '@/components/news/NewsFilters';
import { NewsList } from '@/components/news/NewsList';
import { SyncButton } from '@/components/news/SyncButton';
import { RefreshDatabaseButton } from '@/components/news/RefreshDatabaseButton';
import { Database, ChevronLeft, ChevronRight } from 'lucide-react';
import { Topbar } from '@/components/layout/Topbar';
import { useRouter, usePathname } from 'next/navigation';

function NewsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const query = searchParams.get('q');
  const isSemantic = searchParams.get('semantic') === 'true';
  const sortBy = searchParams.get('sortBy') || 'date';

  // If there's a search query, use the search hook
  const searchResult = useNewsSearch(query || '', isSemantic);
  
  // Otherwise, use the standard paginated hook
  const filters = {
    page: parseInt(searchParams.get('page') || '1', 10),
    category: searchParams.get('category') || undefined,
    sentiment: searchParams.get('sentiment') as any || undefined,
    impact: searchParams.get('impact') as any || undefined,
  };
  const newsResult = useNews(filters);

  const activeResult = query ? searchResult : newsResult;
  const rawArticles = query ? searchResult.data?.articles || [] : newsResult.data?.articles || [];
  
  // Default search display: sort by date (newest first)
  const articles = query
    ? [...rawArticles].sort((a, b) => {
        if (sortBy === 'date') {
          const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
          const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
          return dateB - dateA;
        }
        return 0; // relevance keeps default order (similarity for semantic search)
      })
    : rawArticles;

  const total = !query ? (newsResult.data?.total || 0) : 0;
  const limit = 20;
  const totalPages = Math.ceil(total / limit);
  const currentPage = filters.page;

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSortChange = (newSortBy: 'date' | 'relevance') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sortBy', newSortBy);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      {/* Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 border border-white/10 rounded-2xl bg-white/[0.02] p-4 md:p-6 overflow-hidden w-full">
        <div className="flex-1 w-full max-w-xl">
          <NewsSearch />
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          {query ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as 'date' | 'relevance')}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/5 border border-white/10 text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              >
                <option className="bg-slate-900 text-slate-200" value="date">Newest First</option>
                {isSemantic && (
                  <option className="bg-slate-900 text-slate-200" value="relevance">Most Relevant</option>
                )}
              </select>
            </div>
          ) : (
            <NewsFilters />
          )}
          <RefreshDatabaseButton />
        </div>
      </div>

      {/* Content */}
      <NewsList 
        articles={articles} 
        isLoading={activeResult.isLoading} 
        error={activeResult.error} 
      />
      
      {/* Pagination (only for non-search for now) */}
      {!query && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 border border-white/10 rounded-2xl bg-white/[0.02] p-4">
          <p className="text-xs text-slate-400">
            Showing <span className="font-medium text-slate-200">{(currentPage - 1) * limit + 1}</span> to <span className="font-medium text-slate-200">{Math.min(currentPage * limit, total)}</span> of <span className="font-medium text-slate-200">{total}</span> articles
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || activeResult.isLoading}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </button>
            <span className="text-xs font-medium text-slate-400 px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || activeResult.isLoading}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewsPage() {
  return (
    <>
      <Topbar 
        pageTitle="Financial News"
        hideRefresh
        customAction={<SyncButton />}
        customStatus={
          <div className="flex items-center gap-1 text-slate-400" title="DBMS Connected">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline font-medium">DBMS Online</span>
          </div>
        }
      />
      <div className="min-h-screen p-4 md:p-8 pt-4 md:pt-8 w-full max-w-[1600px] mx-auto pb-24">
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      }>
        <NewsContent />
      </Suspense>
      </div>
    </>
  );
}
