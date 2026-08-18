/**
 * lib/ai/tavily.ts
 *
 * Comprehensive Tavily AI Search integration for real-time market grounding.
 * Fetches full in-depth financial news articles and synthesized answers
 * to provide rich context for macro and risk reasoning models.
 */

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

export async function fetchTavilySearch(
  query: string,
  options: TavilySearchOptions = {}
): Promise<TavilySearchResponse | null> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return null;
  }

  const {
    maxResults = 15,
    searchDepth = 'advanced',
    topic = 'news',
    days = 30,
  } = options;

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
        include_answer: 'advanced',
        include_raw_content: false,
        max_results: maxResults,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn('[tavily] Advanced search request failed:', res.status, err.slice(0, 100));
      return null;
    }

    const data = await res.json();
    return {
      answer: data.answer,
      results: (data.results || []).map((r: any) => ({
        title: r.title || '',
        url: r.url || '',
        content: r.content || '',
        score: r.score,
        publishedDate: r.published_date,
      })),
    };
  } catch (err) {
    console.warn('[tavily] Advanced search execution error:', (err as Error).message);
    return null;
  }
}
