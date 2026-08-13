// Internal types for the lib/news pipeline layer

export interface RssItem {
  guid: string;
  title: string;
  link: string;
  pubDate: string | null;
  creator: string | null;
  categories: string[];
  description: string | null;
  content: string | null; // content:encoded
}

export interface NormalizedArticle extends RssItem {
  cleanContent: string;
  cleanTitle: string;
}

export interface ProcessedArticle {
  sourceId: string;
  sourceUrl: string;
  source: string;
  originalTitle: string;
  translatedTitle: string | null;
  originalContent: string;
  translatedContent: string | null;
  originalLanguage: string;
  category: string | null;
  categories: string[];
  author: string | null;
  publishedAt: string | null;
  summary: string | null;
  sentiment: string | null;
  impact: string | null;
  companies: Array<{ name: string; symbol: string | null; confidence: number }>;
  portfolioRelevant: boolean;
  translationStatus: 'pending' | 'completed' | 'failed' | 'not_required';
  embeddingStatus: 'pending' | 'completed' | 'failed';
  embedding?: number[];
}

export interface DbNewsRow {
  id: number;
  source: string;
  source_id: string;
  source_url: string;
  original_title: string;
  translated_title: string | null;
  original_content: string | null;
  translated_content: string | null;
  original_language: string;
  category: string | null;
  categories: string[];
  author: string | null;
  published_at: string | null;
  summary: string | null;
  sentiment: string | null;
  impact: string | null;
  companies: Array<{ name: string; symbol: string | null; confidence: number }>;
  portfolio_relevant: boolean;
  translation_status: string;
  embedding_status: string;
  created_at: string;
  updated_at: string;
}
