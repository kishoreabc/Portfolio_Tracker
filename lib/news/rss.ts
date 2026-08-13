import RssParser from 'rss-parser';
import type { RssItem } from './types';

const parser = new RssParser({
  customFields: {
    item: [
      ['content:encoded', 'contentEncoded'],
      ['dc:creator', 'creator'],
    ],
  },
});

const RSS_URL = process.env.RSS_URL ?? 'https://moneypechu.com/feed/';
const MAX_RETRIES = 3;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch and parse the Money Pechu RSS feed.
 * Retries with exponential backoff on transient failures.
 */
export async function fetchRssFeed(): Promise<RssItem[]> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[news/rss] Fetching RSS feed (attempt ${attempt}): ${RSS_URL}`);
      const feed = await parser.parseURL(RSS_URL);

      const items: RssItem[] = (feed.items ?? []).map((item) => {
        const raw = item as any;
        return {
          guid: (raw.guid as string) || (item.link as string) || '',
          title: (item.title as string) || '',
          link: (item.link as string) || '',
          pubDate: (item.pubDate as string) || null,
          creator: (raw.creator as string) || (raw.author as string) || null,
          categories: Array.isArray(item.categories)
            ? (item.categories as string[])
            : [],
          description: (item.contentSnippet as string) || (raw.summary as string) || null,
          content: (raw.contentEncoded as string) || (raw.content as string) || null,
        };
      });

      console.log(`[news/rss] Fetched ${items.length} items`);
      return items;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`[news/rss] Attempt ${attempt} failed: ${lastError.message}`);
      if (attempt < MAX_RETRIES) {
        await sleep(1000 * attempt); // exponential: 1s, 2s
      }
    }
  }

  throw new Error(`RSS fetch failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}
