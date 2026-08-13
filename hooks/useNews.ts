'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import type { NewsArticle, NewsFilters, NewsListResponse, NewsSearchResult, NewsSyncResult } from '@/types/news';
import { usePortfolioData } from './usePortfolioData';

/**
 * Fetch paginated news with optional filters
 */
export function useNews(filters: NewsFilters = {}) {
  return useQuery<NewsListResponse, Error>({
    queryKey: queryKeys.news(filters),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (filters.page) searchParams.set('page', filters.page.toString());
      if (filters.limit) searchParams.set('limit', filters.limit.toString());
      if (filters.category) searchParams.set('category', filters.category);
      if (filters.language) searchParams.set('language', filters.language);
      if (filters.sentiment) searchParams.set('sentiment', filters.sentiment);
      if (filters.impact) searchParams.set('impact', filters.impact);
      if (filters.portfolioRelevant !== undefined) {
        searchParams.set('portfolioRelevant', filters.portfolioRelevant.toString());
      }
      if (filters.from) searchParams.set('from', filters.from);
      if (filters.to) searchParams.set('to', filters.to);

      const res = await fetch(`/api/news?${searchParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch news');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch a single news article by ID
 */
export function useNewsArticle(id: number | null) {
  return useQuery<NewsArticle, Error>({
    queryKey: id ? queryKeys.newsArticle(id) : ['news', 'none'],
    queryFn: async () => {
      const res = await fetch(`/api/news/${id}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('Article not found');
        throw new Error('Failed to fetch article');
      }
      return res.json();
    },
    enabled: !!id,
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * Search news (keyword or semantic)
 */
export function useNewsSearch(query: string, semantic = false, limit = 20) {
  return useQuery<{ articles: NewsSearchResult[] }, Error>({
    queryKey: queryKeys.newsSearch(query, semantic),
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        q: query,
        semantic: semantic.toString(),
        limit: limit.toString(),
      });
      const res = await fetch(`/api/news/search?${searchParams.toString()}`);
      if (!res.ok) throw new Error('Failed to search news');
      return res.json();
    },
    enabled: !!query && query.trim().length > 0,
    staleTime: 15 * 60 * 1000,
  });
}

/**
 * Fetch news specifically relevant to the user's portfolio
 */
export function usePortfolioNews(limit = 30) {
  return useQuery<{ articles: NewsArticle[] }, Error>({
    queryKey: queryKeys.portfolioNews,
    queryFn: async () => {
      const res = await fetch(`/api/news/portfolio?limit=${limit}`);
      if (!res.ok) throw new Error('Failed to fetch portfolio news');
      return res.json();
    },
    staleTime: 15 * 60 * 1000,
  });
}

/**
 * Mutation to trigger a manual news sync
 */
export function useNewsSync() {
  const queryClient = useQueryClient();
  const { equity } = usePortfolioData();
  
  // Extract unique symbols from portfolio
  const portfolioSymbols = Array.from(new Set(equity.map(h => h.ticker).filter(Boolean)));

  return useMutation<NewsSyncResult, Error, void>({
    mutationFn: async () => {
      const res = await fetch('/api/news/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolioSymbols }),
      });
      if (!res.ok) throw new Error('Sync failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news'] });
    },
  });
}
