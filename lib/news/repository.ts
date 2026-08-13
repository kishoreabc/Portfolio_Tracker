import { supabase } from '@/lib/supabase';
import type { DbNewsRow, ProcessedArticle } from './types';
import type { NewsArticle, NewsFilters } from '@/types/news';

// ── DB row → public NewsArticle mapper ───────────────────────────────────────
function mapRow(row: DbNewsRow): NewsArticle {
  return {
    id: row.id,
    source: row.source,
    sourceId: row.source_id,
    sourceUrl: row.source_url,
    originalTitle: row.original_title,
    translatedTitle: row.translated_title,
    originalContent: row.original_content,
    translatedContent: row.translated_content,
    originalLanguage: row.original_language,
    category: row.category,
    categories: Array.isArray(row.categories) ? row.categories : [],
    author: row.author,
    publishedAt: row.published_at,
    summary: row.summary,
    sentiment: row.sentiment as NewsArticle['sentiment'],
    impact: row.impact as NewsArticle['impact'],
    companies: Array.isArray(row.companies) ? row.companies : [],
    portfolioRelevant: row.portfolio_relevant,
    translationStatus: row.translation_status as NewsArticle['translationStatus'],
    embeddingStatus: row.embedding_status as NewsArticle['embeddingStatus'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class NewsRepository {
  /** Check if an article already exists by source_id */
  async exists(sourceId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('news')
      .select('id')
      .eq('source_id', sourceId)
      .single();
    if (error && error.code !== 'PGRST116') {
      throw new Error(`DB exists check failed: ${error.message}`);
    }
    return !!data;
  }

  /** Insert a new article. Returns the inserted row ID. */
  async insert(article: ProcessedArticle): Promise<number> {
    const { data, error } = await supabase
      .from('news')
      .insert({
        source: article.source,
        source_id: article.sourceId,
        source_url: article.sourceUrl,
        original_title: article.originalTitle,
        translated_title: article.translatedTitle,
        original_content: article.originalContent,
        translated_content: article.translatedContent,
        original_language: article.originalLanguage,
        category: article.category,
        categories: article.categories,
        author: article.author,
        published_at: article.publishedAt,
        summary: article.summary,
        sentiment: article.sentiment,
        impact: article.impact,
        companies: article.companies,
        portfolio_relevant: article.portfolioRelevant,
        translation_status: article.translationStatus,
        embedding_status: article.embeddingStatus,
        embedding: article.embedding ? `[${article.embedding.join(',')}]` : null,
      })
      .select('id')
      .single();

    if (error) throw new Error(`DB insert failed: ${error.message}`);
    return (data as { id: number }).id;
  }

  /** Update embedding for an existing article */
  async updateEmbedding(id: number, embedding: number[]): Promise<void> {
    const { error } = await supabase
      .from('news')
      .update({
        embedding: `[${embedding.join(',')}]`,
        embedding_status: 'completed',
      })
      .eq('id', id);
    if (error) throw new Error(`DB updateEmbedding failed: ${error.message}`);
  }

  /** Update translation fields for an existing article */
  async updateTranslation(
    id: number,
    fields: {
      translatedTitle?: string;
      translatedContent?: string;
      summary?: string;
      sentiment?: string;
      impact?: string;
      translationStatus?: string;
    }
  ): Promise<void> {
    const update: Record<string, unknown> = {};
    if (fields.translatedTitle !== undefined) update.translated_title = fields.translatedTitle;
    if (fields.translatedContent !== undefined) update.translated_content = fields.translatedContent;
    if (fields.summary !== undefined) update.summary = fields.summary;
    if (fields.sentiment !== undefined) update.sentiment = fields.sentiment;
    if (fields.impact !== undefined) update.impact = fields.impact;
    if (fields.translationStatus !== undefined) update.translation_status = fields.translationStatus;

    const { error } = await supabase.from('news').update(update).eq('id', id);
    if (error) throw new Error(`DB updateTranslation failed: ${error.message}`);
  }

  /** Get paginated articles with optional filters */
  async getArticles(
    filters: NewsFilters = {}
  ): Promise<{ articles: NewsArticle[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      category,
      language,
      sentiment,
      impact,
      portfolioRelevant,
      from,
      to,
    } = filters;

    const offset = (page - 1) * limit;

    let query = supabase
      .from('news')
      .select('*', { count: 'exact' })
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) query = query.eq('category', category);
    if (language) query = query.eq('original_language', language);
    if (sentiment) query = query.eq('sentiment', sentiment);
    if (impact) query = query.eq('impact', impact);
    if (portfolioRelevant !== undefined) query = query.eq('portfolio_relevant', portfolioRelevant);
    if (from) query = query.gte('published_at', from);
    if (to) query = query.lte('published_at', to);

    const { data, error, count } = await query;
    if (error) throw new Error(`DB getArticles failed: ${error.message}`);

    return {
      articles: (data as DbNewsRow[]).map(mapRow),
      total: count ?? 0,
    };
  }

  /** Get a single article by ID */
  async getArticle(id: number): Promise<NewsArticle | null> {
    const { data, error } = await supabase
      .from('news')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`DB getArticle failed: ${error.message}`);
    }
    return mapRow(data as DbNewsRow);
  }

  /** Full-text keyword search */
  async keywordSearch(
    query: string,
    limit = 20
  ): Promise<NewsArticle[]> {
    const { data, error } = await supabase
      .from('news')
      .select('*')
      .or(
        `translated_title.ilike.%${query}%,translated_content.ilike.%${query}%,original_title.ilike.%${query}%`
      )
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`DB keywordSearch failed: ${error.message}`);
    return (data as DbNewsRow[]).map(mapRow);
  }

  /** Semantic vector search via the match_news postgres function */
  async vectorSearch(
    embedding: number[],
    matchThreshold = 0.5,
    matchCount = 10
  ): Promise<Array<NewsArticle & { similarity: number }>> {
    const { data, error } = await supabase.rpc('match_news', {
      query_embedding: `[${embedding.join(',')}]`,
      match_threshold: matchThreshold,
      match_count: matchCount,
    });

    if (error) throw new Error(`DB vectorSearch failed: ${error.message}`);

    return (data as Array<DbNewsRow & { similarity: number }>).map((row) => ({
      ...mapRow(row),
      similarity: row.similarity,
    }));
  }

  /** Get portfolio-relevant articles */
  async getPortfolioNews(limit = 30): Promise<NewsArticle[]> {
    const { data, error } = await supabase
      .from('news')
      .select('*')
      .eq('portfolio_relevant', true)
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`DB getPortfolioNews failed: ${error.message}`);
    return (data as DbNewsRow[]).map(mapRow);
  }

  /** Articles awaiting translation retry */
  async getPendingTranslations(limit = 10): Promise<Array<{ id: number; originalTitle: string; originalContent: string | null }>> {
    const { data, error } = await supabase
      .from('news')
      .select('id, original_title, original_content')
      .in('translation_status', ['pending', 'failed'])
      .eq('original_language', 'ta')
      .limit(limit);

    if (error) throw new Error(`DB getPendingTranslations failed: ${error.message}`);
    return (data as Array<{ id: number; original_title: string; original_content: string | null }>).map((r) => ({
      id: r.id,
      originalTitle: r.original_title,
      originalContent: r.original_content,
    }));
  }

  /** Articles awaiting embedding retry */
  async getPendingEmbeddings(limit = 10): Promise<Array<{ id: number; translatedTitle: string | null; summary: string | null }>> {
    const { data, error } = await supabase
      .from('news')
      .select('id, translated_title, summary')
      .in('embedding_status', ['pending', 'failed'])
      .limit(limit);

    if (error) throw new Error(`DB getPendingEmbeddings failed: ${error.message}`);
    return (data as Array<{ id: number; translated_title: string | null; summary: string | null }>).map((r) => ({
      id: r.id,
      translatedTitle: r.translated_title,
      summary: r.summary,
    }));
  }
}

export const newsRepo = new NewsRepository();
