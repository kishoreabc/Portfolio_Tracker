import { newsRepo } from './repository';
import { generateQueryEmbedding } from './embeddings';
import type { NewsArticle, NewsSearchResult, NewsFilters } from '@/types/news';

const TOP_K = Number(process.env.NEWS_SEARCH_TOP_K ?? '20');

/**
 * Standard keyword search across title and content.
 */
export async function keywordSearch(query: string, limit = TOP_K): Promise<NewsSearchResult[]> {
  const results = await newsRepo.keywordSearch(query, limit);
  return results.map((a) => ({ ...a, similarity: undefined }));
}

/**
 * Semantic similarity search using pgvector.
 * Embeds the user query with the SAME NVIDIA model used for documents.
 */
export async function semanticSearch(
  query: string,
  matchThreshold = 0.65,
  matchCount = TOP_K
): Promise<NewsSearchResult[]> {
  const embedding = await generateQueryEmbedding(query);
  const results = await newsRepo.vectorSearch(embedding, matchThreshold, matchCount);
  return results;
}

/**
 * Get paginated news articles with optional filters.
 */
export async function getNews(
  filters: NewsFilters = {}
): Promise<{ articles: NewsArticle[]; total: number }> {
  return newsRepo.getArticles(filters);
}

/**
 * Get a single article by ID.
 */
export async function getArticle(id: number): Promise<NewsArticle | null> {
  return newsRepo.getArticle(id);
}

/**
 * Get related articles for a given article using vector similarity.
 */
export async function getRelatedArticles(
  article: NewsArticle,
  limit = 5
): Promise<NewsSearchResult[]> {
  if (!article.id) return [];

  // Use the article's own embedding via a keyword search as fallback
  const query = article.translatedTitle ?? article.originalTitle;
  try {
    const results = await semanticSearch(query, 0.5, limit + 1);
    // Exclude the article itself
    return results.filter((r) => r.id !== article.id).slice(0, limit);
  } catch {
    // Fallback to keyword search if embedding fails
    const fallback = await keywordSearch(query.split(' ').slice(0, 3).join(' '), limit + 1);
    return fallback.filter((r) => r.id !== article.id).slice(0, limit);
  }
}

/**
 * Get portfolio-relevant news.
 */
export async function getPortfolioNews(limit = 30): Promise<NewsArticle[]> {
  return newsRepo.getPortfolioNews(limit);
}
