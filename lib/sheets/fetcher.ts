import { discoverTabs } from './discovery';
import { getSheetValues } from './client';
import { parseSheet } from './parser';
import type { SheetsApiResponse } from '@/types/sheets';

const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes

interface CacheEntry {
  data: SheetsApiResponse;
  fetchedAt: number;
}

// Module-level in-memory cache (survives across requests in the same Node process)
let cache: CacheEntry | null = null;

export async function fetchAllSheetData(force = false): Promise<SheetsApiResponse> {
  const now = Date.now();

  if (!force && cache && now - cache.fetchedAt < CACHE_DURATION_MS) {
    return cache.data;
  }

  const errors: string[] = [];
  const { tabs, matched } = await discoverTabs();

  async function safeFetch(key: string) {
    const tab = matched[key];
    if (!tab) {
      errors.push(`Tab not found for "${key}"`);
      return null;
    }
    try {
      const values = await getSheetValues(tab.title);
      return parseSheet(tab.title, values);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Failed to fetch "${tab.title}": ${msg}`);
      return null;
    }
  }

  const [equity, bonds, portfolio, transactions] = await Promise.all([
    safeFetch('equity'),
    safeFetch('bonds'),
    safeFetch('portfolio'),
    safeFetch('transactions'),
  ]);

  const result: SheetsApiResponse = {
    equity,
    bonds,
    portfolio,
    transactions,
    meta: {
      lastFetched: new Date().toISOString(),
      tabs,
      errors,
    },
  };

  cache = { data: result, fetchedAt: now };
  return result;
}
