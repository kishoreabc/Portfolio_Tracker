'use client';

import { NewsCard } from './NewsCard';
import type { NewsArticle, NewsSearchResult } from '@/types/news';

interface NewsListProps {
  articles: NewsArticle[] | NewsSearchResult[];
  isLoading: boolean;
  error: Error | null;
}

export function NewsList({ articles, isLoading, error }: NewsListProps) {
  if (error) {
    return (
      <div className="p-8 text-center border border-red-500/20 rounded-xl bg-red-500/5 text-red-400">
        <h3 className="font-semibold mb-1">Failed to load news</h3>
        <p className="text-sm opacity-80">{error.message}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-48 rounded-xl border border-white/5 bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="p-12 text-center border border-white/5 rounded-xl bg-white/[0.02] text-slate-400">
        <p>No articles found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {articles.map((article) => (
        <NewsCard key={article.id} article={article as NewsArticle} />
      ))}
    </div>
  );
}
