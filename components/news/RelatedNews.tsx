'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import type { NewsArticle, NewsSearchResult } from '@/types/news';
import { formatDistanceToNow } from 'date-fns';
import { Sparkles } from 'lucide-react';

export function RelatedNews({ article }: { article: NewsArticle }) {
  const { data: related, isLoading } = useQuery<NewsSearchResult[]>({
    queryKey: ['news', 'related', article.id],
    queryFn: async () => {
      // In a real app we'd have a specific /api/news/[id]/related endpoint
      // For now we'll use the search endpoint with semantic=true
      const query = article.translatedTitle || article.originalTitle;
      const res = await fetch(`/api/news/search?q=${encodeURIComponent(query)}&semantic=true&limit=6`);
      if (!res.ok) throw new Error('Failed to fetch related news');
      const data = await res.json();
      return data.articles.filter((a: NewsArticle) => a.id !== article.id).slice(0, 5);
    },
    enabled: !!article.id,
    staleTime: 60 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <h3 className="font-semibold text-slate-200">Related News</h3>
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-white/5 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (!related || related.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-indigo-400" />
        <h3 className="font-semibold text-slate-200">Related News</h3>
      </div>
      
      <div className="flex flex-col gap-3">
        {related.map(item => (
          <Link 
            key={item.id} 
            href={`/news/${item.id}`}
            className="group block p-3 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] transition-colors"
          >
            <h4 className="text-sm font-medium text-slate-300 group-hover:text-blue-400 line-clamp-2 leading-snug mb-2 transition-colors">
              {item.translatedTitle || item.originalTitle}
            </h4>
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span className="uppercase tracking-wider font-semibold text-slate-400">
                {item.category || 'News'}
              </span>
              <span>
                {item.publishedAt ? formatDistanceToNow(new Date(item.publishedAt), { addSuffix: true }) : ''}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
