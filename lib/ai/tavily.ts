/**
 * lib/ai/tavily.ts
 *
 * Tavily AI Search integration for real-time market grounding (Sections 13 & 14).
 *
 * Free-Tier Principles:
 * - Basic Search by default (1 credit/search, conserving monthly 1,000 credit budget).
 * - Enforces API Budget Manager checks before firing queries.
 * - Portfolio-aware query generation (max 1 primary + 1 fallback query).
 * - Untrusted external content: retrieved content is treated as DATA only.
 */

import { budgetManager } from '@/lib/ai/budgetManager';

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  rawContent?: string;
  score?: number;
  publishedDate?: string;
}

export interface TavilySearchResponse {
  answer?: string;
  results: TavilySearchResult[];
}

export interface TavilySearchOptions {
  maxResults?: number;
  searchDepth?: 'basic' | 'advanced';
  topic?: 'news' | 'general';
  days?: number;
}

/**
 * Generate at most 1 primary query and 1 fallback query for portfolio news/macro.
 * Section 14: Portfolio-aware query generation.
 */
export function generatePortfolioTavilyQuery(
  sectors: string[],
  holdingTickers: string[] = []
): { primaryQuery: string; fallbackQuery: string } {
  const topSectors = sectors.slice(0, 3);
  const sectorKeywords = topSectors
    .map((s) => {
      if (/bank|financ|nbfc/i.test(s)) return 'banking NIM credit growth';
      if (/it|tech|software/i.test(s)) return 'IT earnings USDINR US demand';
      if (/fmcg|consumer/i.test(s)) return 'FMCG rural demand consumption';
      if (/pharma|health/i.test(s)) return 'pharma API FDA approvals';
      if (/auto|automobile/i.test(s)) return 'auto sales EV transition';
      return `${s} sector`;
    })
    .join(' ');

  const primaryHoldings = holdingTickers.slice(0, 3).map((t) => t.replace(/\.NS$/, '')).join(' ');

  const primaryQuery = `India stock market RBI repo inflation Nifty ${primaryHoldings} ${sectorKeywords}`.slice(0, 150);
  const fallbackQuery = 'India economic outlook RBI monetary policy GDP inflation corporate earnings';

  return { primaryQuery, fallbackQuery };
}

export async function fetchTavilySearch(
  query: string,
  options: TavilySearchOptions = {}
): Promise<TavilySearchResponse | null> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return null;
  }

  // Budget check (Section 5)
  const budgetCheck = budgetManager.canMakeRequest('tavily');
  if (!budgetCheck.allowed) {
    console.warn('[tavily] Search skipped:', budgetCheck.reason);
    return null;
  }

  const {
    maxResults = 6,
    searchDepth = 'basic', // Section 14: Use Basic Search by default (1 credit vs 2 credits)
    topic = 'news',
    days = 14,
  } = options;

  const creditsUsed = searchDepth === 'advanced' ? 2 : 1;
  budgetManager.startRequest('tavily');

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: searchDepth,
        topic,
        days,
        include_answer: searchDepth === 'advanced' ? 'advanced' : 'basic',
        include_raw_content: false,
        max_results: maxResults,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      const is429 = res.status === 429;
      budgetManager.recordFailure('tavily', is429);
      console.warn('[tavily] Search request failed:', res.status, err.slice(0, 100));
      return null;
    }

    budgetManager.recordRequest('tavily', { searchCredits: creditsUsed, success: true });

    const data = await res.json();
    return {
      answer: data.answer,
      results: (data.results || []).map((r: { title?: string; url?: string; content?: string; score?: number; published_date?: string }) => ({
        title: r.title || '',
        url: r.url || '',
        content: r.content || '',
        score: r.score,
        publishedDate: r.published_date,
      })),
    };
  } catch (err) {
    budgetManager.recordFailure('tavily', false);
    console.warn('[tavily] Search execution error:', (err as Error).message);
    return null;
  }
}
