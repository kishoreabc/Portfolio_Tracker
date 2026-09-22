import type { NewsFilters } from '@/types/news';

export const queryKeys = {
  portfolio: ['portfolio'] as const,
  portfolioForced: ['portfolio', 'forced'] as const,
  sheets: ['portfolio'] as const,
  sheetsForced: ['portfolio', 'forced'] as const,
  insights: (hash: string) => ['insights', hash] as const,

  // News
  news: (filters?: NewsFilters) => filters ? ['news', filters] : ['news'],
  newsArticle: (id: number) => ['news', id] as const,
  newsSearch: (query: string, semantic: boolean) => ['news', 'search', query, semantic] as const,
  portfolioNews: ['news', 'portfolio'] as const,

  // Orders & Performance
  orders: (range?: string) => range ? ['orders', range] as const : ['orders'] as const,
} as const;
