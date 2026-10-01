/**
 * lib/data/news.ts
 *
 * News data collection — runs PARALLEL to market data and analytics.
 * Sources: Google News RSS (primary free-tier) + Tavily (gap-filler / fallback, Sections 13 & 14).
 * Returns a NewsSnapshot with deduplication and provenance metadata.
 */

import type { NewsSnapshot, NewsArticle } from '@/types/portfolio-snapshot';
import { generatePortfolioTavilyQuery } from '@/lib/ai/tavily';

export interface FetchNewsOptions {
  allowTavily?: boolean;
  mode?: 'quick' | 'deep';
}

/**
 * Fetches news according to the free-tier source hierarchy:
 * 1. Google News RSS (0 API credits)
 * 2. Tavily (only if allowed or when RSS is insufficient/stale, max 1 primary + 1 fallback query)
 */
export async function fetchNewsSnapshot(
  sectors: string[],
  holdingTickers: string[] = [],
  options: FetchNewsOptions = {}
): Promise<NewsSnapshot> {
  const observedAt = new Date().toISOString();
  const articles: NewsArticle[] = [];
  let searchSource: NewsSnapshot['searchSource'] = 'google_news_rss';
  let tavilyBriefing: string | undefined;

  const seenTitles = new Set<string>();

  function addArticle(article: NewsArticle) {
    const title = article.title.trim();
    if (title && !seenTitles.has(title.toLowerCase())) {
      seenTitles.add(title.toLowerCase());
      articles.push(article);
    }
  }

  // ─── 1. Google News RSS (Primary Free Source — Section 13) ─────────────────
  try {
    const topSectors = sectors.slice(0, 2).join(' ');
    const rssQueries = [
      'India macroeconomic outlook RBI MPC repo rate inflation CPI GDP',
      `Indian stock market Nifty 50 corporate earnings ${topSectors}`.trim(),
    ];

    await Promise.all(
      rssQueries.map(async (q) => {
        try {
          const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-IN&gl=IN&ceid=IN:en`;
          const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            next: { revalidate: 300 },
          });
          if (res.ok) {
            const xml = await res.text();
            const matches = [...xml.matchAll(/<title>(.*?)<\/title>/g)].map((m) => m[1]).slice(1, 6);
            for (const title of matches) {
              const cleaned = title.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/&amp;/g, '&').trim();
              if (cleaned && cleaned !== 'Google News') {
                addArticle({
                  title: cleaned,
                  source: 'Google News RSS',
                  url: '',
                  publishedAt: observedAt,
                  origin: 'google_news_rss',
                });
              }
            }
          }
        } catch {
          // Individual RSS query failure ignored
        }
      })
    );
  } catch (err) {
    console.warn('[NewsSnapshot] Google News RSS query error:', (err as Error).message);
  }

  // ─── 2. Tavily as Gap-Filler / Deep Mode Research (Section 13 & 14) ─────────
  const shouldTryTavily = options.allowTavily || articles.length === 0;

  if (shouldTryTavily) {
    try {
      const { fetchTavilySearch } = await import('@/lib/ai/tavily');
      const { primaryQuery, fallbackQuery } = generatePortfolioTavilyQuery(sectors, holdingTickers);

      // Primary query (Basic search = 1 credit)
      let tavilyRes = await fetchTavilySearch(primaryQuery, {
        searchDepth: 'basic',
        topic: 'news',
        days: 7,
        maxResults: options.mode === 'deep' ? 6 : 4,
      });

      // If primary query yielded no results, execute the 1 allowed fallback query
      if ((!tavilyRes || tavilyRes.results.length === 0) && fallbackQuery) {
        tavilyRes = await fetchTavilySearch(fallbackQuery, {
          searchDepth: 'basic',
          topic: 'news',
          days: 7,
          maxResults: 4,
        });
      }

      if (tavilyRes && tavilyRes.results.length > 0) {
        searchSource = 'tavily';
        if (tavilyRes.answer) {
          tavilyBriefing = tavilyRes.answer;
        }

        for (const res of tavilyRes.results) {
          addArticle({
            title: res.title,
            source: 'Tavily',
            url: res.url,
            publishedAt: res.publishedDate || observedAt,
            content: res.content,
            origin: 'tavily',
          });
        }
        console.log(`[NewsSnapshot] Fetched ${tavilyRes.results.length} articles via Tavily.`);
      }
    } catch (err) {
      console.warn('[NewsSnapshot] Tavily search failed:', (err as Error).message);
    }
  }

  return {
    articles,
    tavilyBriefing,
    observedAt,
    searchSource,
  };
}
