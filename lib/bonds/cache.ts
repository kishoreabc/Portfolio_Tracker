import fs from 'fs';
import path from 'path';
import type { NsdlCashFlowResponse } from '@/types/bonds';

// 7 days for valid schedules (bond coupon/maturity dates are contractual and fixed)
export const BOND_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
// 1 hour for empty or error responses so they can retry later
export const BOND_CACHE_ERROR_TTL_MS = 60 * 60 * 1000;

interface CachedEntry {
  data: NsdlCashFlowResponse;
  savedAt: number;
}

// In-memory cache for ultra-fast same-process lookups (< 0.1ms)
const memoryCache = new Map<string, CachedEntry>();

// Persistent directory on disk
const CACHE_DIR = path.join(process.cwd(), '.cache', 'bonds');

function ensureCacheDir() {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('[BondCache] Failed to create cache directory:', (err as Error).message);
  }
}

function getCacheFilePath(isin: string): string {
  const safeName = isin.replace(/[^A-Z0-9]/gi, '_').toUpperCase();
  return path.join(CACHE_DIR, `${safeName}.json`);
}

/**
 * Retrieve cached bond cashflow and schedule details.
 * Checks in-memory cache first, then disk cache.
 */
export async function getCachedBondCashflow(
  isin: string,
  ignoreExpiry = false
): Promise<NsdlCashFlowResponse | null> {
  const cleanIsin = isin.trim().toUpperCase();
  const now = Date.now();

  // 1. Check memory cache
  const mem = memoryCache.get(cleanIsin);
  if (mem) {
    const ttl = mem.data.cashFlowSchedule?.length > 0 ? BOND_CACHE_TTL_MS : BOND_CACHE_ERROR_TTL_MS;
    if (ignoreExpiry || now - mem.savedAt < ttl) {
      return mem.data;
    }
  }

  // 2. Check disk cache
  const filePath = getCacheFilePath(cleanIsin);
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const entry: CachedEntry = JSON.parse(raw);
      if (entry && entry.data) {
        const ttl = entry.data.cashFlowSchedule?.length > 0 ? BOND_CACHE_TTL_MS : BOND_CACHE_ERROR_TTL_MS;
        if (ignoreExpiry || now - entry.savedAt < ttl) {
          // Populate memory cache
          memoryCache.set(cleanIsin, entry);
          return entry.data;
        }
      }
    }
  } catch (err) {
    console.warn(`[BondCache] Read error for ${cleanIsin}:`, (err as Error).message);
  }

  return null;
}

/**
 * Save bond cashflow data to both memory and persistent disk cache.
 */
export async function saveCachedBondCashflow(
  isin: string,
  data: NsdlCashFlowResponse
): Promise<void> {
  const cleanIsin = isin.trim().toUpperCase();
  const entry: CachedEntry = {
    data,
    savedAt: Date.now(),
  };

  // 1. Save in memory
  memoryCache.set(cleanIsin, entry);

  // 2. Save to persistent disk cache
  try {
    ensureCacheDir();
    const filePath = getCacheFilePath(cleanIsin);
    fs.writeFileSync(filePath, JSON.stringify(entry, null, 2), 'utf-8');
  } catch (err) {
    console.warn(`[BondCache] Write error for ${cleanIsin}:`, (err as Error).message);
  }
}
