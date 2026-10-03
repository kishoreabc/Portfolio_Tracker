import { fetchRssFeed } from './rss';
import { cleanHtml, cleanTitle, translateCategory } from './normalize';
import { detectLanguage } from './language';
import { translateArticle } from './translator';
import { summarizeArticle } from './summarizer';
import { generateEmbedding } from './embeddings';
import { extractCompanies, isPortfolioRelevant } from './companies';
import { newsRepo } from './repository';
import type { NewsSyncResult } from '@/types/news';
import type { ProcessedArticle } from './types';

const MAX_CONCURRENCY = Number(process.env.MAX_NVIDIA_CONCURRENCY ?? '2');

/**
 * Run tasks with controlled concurrency to avoid API rate limits.
 */
async function pLimit<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number
): Promise<Array<PromiseSettledResult<T>>> {
  const results: Array<PromiseSettledResult<T>> = [];
  let i = 0;

  async function runNext(): Promise<void> {
    if (i >= tasks.length) return;
    const current = i++;
    try {
      const value = await tasks[current]();
      results[current] = { status: 'fulfilled', value };
    } catch (reason) {
      results[current] = { status: 'rejected', reason };
    }
    await runNext();
  }

  const workers = Array.from({ length: concurrency }, () => runNext());
  await Promise.all(workers);
  return results;
}

/**
 * Process a single RSS item through the full AI pipeline.
 * Returns a ProcessedArticle or throws.
 */
async function processItem(
  item: Awaited<ReturnType<typeof fetchRssFeed>>[0],
  portfolioCompanies: { name: string; symbol: string }[]
): Promise<ProcessedArticle> {
  const sourceId = item.guid || item.link;
  const rawContent = item.content || item.description || '';
  const cleanContent = cleanHtml(rawContent);
  const cleanedTitle = cleanTitle(item.title);

  const lang = detectLanguage(cleanedTitle + ' ' + cleanContent);

  const article: ProcessedArticle = {
    sourceId,
    sourceUrl: item.link,
    source: 'Money Pechu',
    originalTitle: cleanedTitle,
    translatedTitle: lang === 'en' ? cleanedTitle : null,
    originalContent: cleanContent,
    translatedContent: lang === 'en' ? cleanContent : null,
    originalLanguage: lang === 'unknown' ? 'en' : lang,
    category: translateCategory(item.categories[0] ?? null),
    categories: item.categories.map(c => translateCategory(c) ?? c),
    author: item.creator,
    publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : null,
    summary: null,
    sentiment: null,
    impact: null,
    companies: [],
    portfolioRelevant: false,
    translationStatus: lang === 'en' ? 'not_required' : 'pending',
    embeddingStatus: 'pending',
  };

  // ── Step 1: Translate Tamil → English ─────────────────────────────────────
  if (lang === 'ta') {
    try {
      console.log(`[news/sync] Translating: ${cleanedTitle.slice(0, 60)}`);
      const { translatedTitle, translatedContent } = await translateArticle(
        cleanedTitle,
        cleanContent
      );
      article.translatedTitle = translatedTitle;
      article.translatedContent = translatedContent;
      article.translationStatus = 'completed';
    } catch (err) {
      console.error(`[news/sync] Translation failed: ${(err as Error).message}`);
      article.translationStatus = 'failed';
    }
  }

  // ── Step 2: Summarize + Sentiment + Impact ─────────────────────────────────
  const titleForAI = article.translatedTitle ?? cleanedTitle;
  const contentForAI = article.translatedContent ?? cleanContent;

  if (contentForAI.length > 50) {
    try {
      const { summary, sentiment, impact } = await summarizeArticle(
        titleForAI,
        contentForAI
      );
      article.summary = summary;
      article.sentiment = sentiment;
      article.impact = impact;
    } catch (err) {
      console.error(`[news/sync] Summarization failed: ${(err as Error).message}`);
      // Non-fatal — article stored without summary
    }
  }

  // ── Step 3: Company extraction & portfolio matching ────────────────────────
  const textToSearch = `${titleForAI} ${contentForAI}`;
  article.companies = extractCompanies(textToSearch, portfolioCompanies);
  article.portfolioRelevant = isPortfolioRelevant(article.companies, portfolioCompanies.map(c => c.symbol));

  // ── Step 4: Generate embedding ─────────────────────────────────────────────
  const embeddingTitle = article.translatedTitle ?? cleanedTitle;
  let embeddingContent = article.summary ?? contentForAI;
  
  const badges = [
    article.category ? `Category: ${article.category}` : null,
    article.portfolioRelevant ? 'Portfolio Relevant' : null,
    article.sentiment ? `Sentiment: ${article.sentiment}` : null,
    article.impact ? `Impact: ${article.impact}` : null,
  ].filter(Boolean).join(', ');

  if (badges) {
    embeddingContent = `[Tags: ${badges}]\n\n${embeddingContent}`;
  }

  if (embeddingContent.length > 20) {
    try {
      article.embedding = await generateEmbedding(embeddingTitle, embeddingContent);
      article.embeddingStatus = 'completed';
    } catch (err) {
      console.error(`[news/sync] Embedding failed: ${(err as Error).message}`);
      article.embeddingStatus = 'failed';
    }
  }

  // ── Step 5: Pace out requests to avoid rate limits ─────────────────────────
  console.log(`[news/sync] Sleeping 5 seconds before next article to respect rate limits...`);
  await new Promise(resolve => setTimeout(resolve, 5000));

  return article;
}

/**
 * Main sync function: fetch RSS → process all new articles → store in Supabase.
 *
 * @param portfolioCompanies - NSE/BSE companies from the user's portfolio (from Google Sheets)
 */
export async function syncNews(
  portfolioCompanies: { name: string; symbol: string }[] = []
): Promise<NewsSyncResult> {
  const startTime = Date.now();
  const result: NewsSyncResult = {
    fetched: 0,
    newArticles: 0,
    skipped: 0,
    translated: 0,
    embedded: 0,
    failed: 0,
    durationMs: 0,
  };

  console.log('[news/sync] RSS sync started');

  // ── 1. Fetch RSS ───────────────────────────────────────────────────────────
  let items: Awaited<ReturnType<typeof fetchRssFeed>>;
  try {
    items = await fetchRssFeed();
    result.fetched = items.length;
    console.log(`[news/sync] Fetched ${items.length} RSS items`);
  } catch (err) {
    console.error(`[news/sync] RSS fetch failed: ${(err as Error).message}`);
    result.durationMs = Date.now() - startTime;
    return result;
  }

  // ── 2. Deduplicate ─────────────────────────────────────────────────────────
  const newItems: typeof items = [];
  for (const item of items) {
    const sourceId = item.guid || item.link;
    const exists = await newsRepo.exists(sourceId);
    if (exists) {
      result.skipped++;
    } else {
      newItems.push(item);
    }
  }

  console.log(`[news/sync] ${newItems.length} new articles to process, ${result.skipped} skipped`);

  if (newItems.length === 0) {
    result.durationMs = Date.now() - startTime;
    console.log('[news/sync] No new articles. Sync complete.');
    return result;
  }

  // ── 3. Process articles with controlled concurrency and immediate DB insertion ─────────────
  const tasks = newItems.map((item) => async () => {
    // 1. Process the item
    const processed = await processItem(item, portfolioCompanies);
    
    // 2. Insert into DB immediately
    try {
      await newsRepo.insert(processed);
      result.newArticles++;

      if (processed.translationStatus === 'completed') result.translated++;
      if (processed.embeddingStatus === 'completed') result.embedded++;

      console.log(`[news/sync] Inserted: ${processed.originalTitle.slice(0, 60)}`);
    } catch (err) {
      console.error(`[news/sync] DB insert failed for ${processed.originalTitle}: ${(err as Error).message}`);
      throw err; // bubble up so pLimit marks it as rejected
    }
  });

  const settled = await pLimit(tasks, MAX_CONCURRENCY);

  for (const settledResult of settled) {
    if (settledResult.status === 'rejected') {
      console.error(`[news/sync] Article failed during processing or insertion: ${settledResult.reason}`);
      result.failed++;
    }
  }

  result.durationMs = Date.now() - startTime;
  console.log(`[news/sync] Sync complete in ${result.durationMs}ms:`, result);
  return result;
}

/**
 * Reprocess a specific article: re-translate, re-summarize, re-embed.
 */
export async function reprocessArticle(id: number): Promise<void> {
  const article = await newsRepo.getArticle(id);
  if (!article) throw new Error(`Article ${id} not found`);

  const content = article.originalContent ?? '';

  // Re-translate if Tamil
  if (article.originalLanguage === 'ta' && content) {
    try {
      const { translatedTitle, translatedContent } = await translateArticle(
        article.originalTitle,
        content
      );
      await newsRepo.updateTranslation(id, {
        translatedTitle,
        translatedContent,
        translationStatus: 'completed',
      });
    } catch (err) {
      await newsRepo.updateTranslation(id, { translationStatus: 'failed' });
      throw err;
    }
  }

  // Re-fetch updated article for summarization
  const updated = await newsRepo.getArticle(id);
  if (!updated) return;

  const titleForAI = updated.translatedTitle ?? updated.originalTitle;
  const contentForAI = updated.translatedContent ?? content;

  // Re-summarize
  if (contentForAI.length > 50) {
    try {
      const { summary, sentiment, impact } = await summarizeArticle(titleForAI, contentForAI);
      await newsRepo.updateTranslation(id, { summary, sentiment, impact });
    } catch (err) {
      console.error(`[news/reprocess] Summarization failed: ${(err as Error).message}`);
    }
  }

  // Re-embed
  try {
    const reFetched = await newsRepo.getArticle(id);
    const embTitle = reFetched?.translatedTitle ?? titleForAI;
    let embContent = reFetched?.summary ?? contentForAI;
    
    const badges = [
      reFetched?.category ? `Category: ${reFetched.category}` : null,
      reFetched?.portfolioRelevant ? 'Portfolio Relevant' : null,
      reFetched?.sentiment ? `Sentiment: ${reFetched.sentiment}` : null,
      reFetched?.impact ? `Impact: ${reFetched.impact}` : null,
    ].filter(Boolean).join(', ');
  
    if (badges) {
      embContent = `[Tags: ${badges}]\n\n${embContent}`;
    }

    const embedding = await generateEmbedding(embTitle, embContent);
    await newsRepo.updateEmbedding(id, embedding);
  } catch (err) {
    console.error(`[news/reprocess] Embedding failed: ${(err as Error).message}`);
  }
}
