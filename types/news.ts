// ─── News Module Types ────────────────────────────────────────────────────────

export type NewsSentiment = 'positive' | 'negative' | 'neutral' | 'mixed';
export type NewsImpact = 'low' | 'medium' | 'high';
export type TranslationStatus = 'pending' | 'completed' | 'failed' | 'not_required';
export type EmbeddingStatus = 'pending' | 'completed' | 'failed';

export interface NewsCompany {
  name: string;
  symbol: string | null;
  confidence: number;
}

export interface NewsArticle {
  id: number;
  source: string;
  sourceId: string;
  sourceUrl: string;
  originalTitle: string;
  translatedTitle: string | null;
  originalContent: string | null;
  translatedContent: string | null;
  originalLanguage: string;
  category: string | null;
  categories: string[];
  author: string | null;
  publishedAt: string | null;
  summary: string | null;
  sentiment: NewsSentiment | null;
  impact: NewsImpact | null;
  companies: NewsCompany[];
  portfolioRelevant: boolean;
  translationStatus: TranslationStatus;
  embeddingStatus: EmbeddingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface NewsFilters {
  page?: number;
  limit?: number;
  category?: string;
  language?: string;
  sentiment?: NewsSentiment;
  impact?: NewsImpact;
  portfolioRelevant?: boolean;
  from?: string;
  to?: string;
}

export interface NewsListResponse {
  articles: NewsArticle[];
  page: number;
  limit: number;
  total: number;
}

export interface NewsSearchResult extends NewsArticle {
  similarity?: number;
}

export interface NewsSyncResult {
  fetched: number;
  newArticles: number;
  skipped: number;
  translated: number;
  embedded: number;
  failed: number;
  durationMs: number;
}
