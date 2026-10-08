/**
 * lib/stocks/stockDirectory.ts
 *
 * Official Stock Directory & Market Data Fetcher.
 * Fetches dynamic stock directories and constituent data exclusively from official sources:
 * - National Stock Exchange of India (NSE) official archives (ind_nifty50list.csv, EQUITY_L.csv)
 * - Yahoo Finance official search & quoteSummary API
 *
 * No static/hardcoded stock lists or static sector mappings.
 */

export interface OfficialStock {
  symbol: string;
  name: string;
  sector?: string;
  industry?: string;
  exchange: 'NSE' | 'BSE' | string;
  isin?: string;
  isPopular?: boolean;
}

// In-memory caches with TTL to ensure high performance while strictly staying dynamic
let nseNiftyCache: { data: OfficialStock[]; timestamp: number } | null = null;
let nseDirectoryCache: { data: Map<string, OfficialStock>; timestamp: number } | null = null;
const sectorCache: Map<string, string> = new Map();

const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function parseCsvLine(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

/**
 * Fetches the official Nifty 50 constituent list directly from the National Stock Exchange of India (NSE).
 */
export async function fetchOfficialNseNifty50(): Promise<OfficialStock[]> {
  const now = Date.now();
  if (nseNiftyCache && now - nseNiftyCache.timestamp < CACHE_TTL_MS) {
    return nseNiftyCache.data;
  }

  try {
    const res = await fetch('https://archives.nseindia.com/content/indices/ind_nifty50list.csv', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (res.ok) {
      const text = await res.text();
      const lines = text.trim().split('\n');
      if (lines.length > 1) {
        // Headers: Company Name,Industry,Symbol,Series,ISIN Code
        const stocks: OfficialStock[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = parseCsvLine(lines[i]);
          const name = cols[0];
          const sector = cols[1];
          const symbol = cols[2];
          const isin = cols[4];
          if (symbol) {
            const cleanSym = symbol.toUpperCase();
            stocks.push({
              symbol: cleanSym,
              name: name || cleanSym,
              sector: sector || undefined,
              exchange: 'NSE',
              isin: isin || undefined,
              isPopular: true,
            });
            if (sector) {
              sectorCache.set(cleanSym, sector);
            }
          }
        }

        if (stocks.length > 0) {
          nseNiftyCache = { data: stocks, timestamp: now };
          return stocks;
        }
      }
    }
  } catch (err) {
    console.warn('[stockDirectory] Failed to fetch official NSE Nifty 50 list:', err);
  }

  return nseNiftyCache?.data || [];
}

/**
 * Fetches the official listed equities directory directly from the National Stock Exchange of India (NSE).
 * Contains all 2,600+ companies listed on NSE.
 */
export async function fetchOfficialNseDirectory(): Promise<Map<string, OfficialStock>> {
  const now = Date.now();
  if (nseDirectoryCache && now - nseDirectoryCache.timestamp < CACHE_TTL_MS) {
    return nseDirectoryCache.data;
  }

  try {
    const res = await fetch('https://archives.nseindia.com/content/equities/EQUITY_L.csv', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (res.ok) {
      const text = await res.text();
      const lines = text.trim().split('\n');
      if (lines.length > 1) {
        // Headers: SYMBOL,NAME OF COMPANY, SERIES, DATE OF LISTING, PAID UP VALUE, MARKET LOT, ISIN NUMBER, FACE VALUE
        const dir = new Map<string, OfficialStock>();
        for (let i = 1; i < lines.length; i++) {
          const cols = parseCsvLine(lines[i]);
          const symbol = cols[0];
          const name = cols[1];
          const isin = cols[6];
          if (symbol) {
            const cleanSym = symbol.toUpperCase();
            dir.set(cleanSym, {
              symbol: cleanSym,
              name: name || cleanSym,
              exchange: 'NSE',
              isin: isin || undefined,
            });
          }
        }

        if (dir.size > 0) {
          nseDirectoryCache = { data: dir, timestamp: now };
          return dir;
        }
      }
    }
  } catch (err) {
    console.warn('[stockDirectory] Failed to fetch official NSE directory:', err);
  }

  return nseDirectoryCache?.data || new Map();
}

/**
 * Searches stocks exclusively using official sources (Yahoo Finance live search + NSE Official Equities Directory).
 */
export async function searchOfficialStocks(query: string, limit = 15): Promise<OfficialStock[]> {
  const cleanQ = query.trim();

  // If query is empty, return official NIFTY 50 benchmark stocks from NSE
  if (!cleanQ) {
    const nifty = await fetchOfficialNseNifty50();
    return nifty.slice(0, limit);
  }

  const results: OfficialStock[] = [];
  const seen = new Set<string>();

  // 1. Search official Yahoo Finance API
  try {
    const yfModule = await import('yahoo-finance2');
    const YahooFinance = yfModule.default || yfModule;
    const yahooFinance = new (YahooFinance as any)({ suppressNotices: ['yahooSurvey'] });
    const yfRes = await yahooFinance.search(cleanQ, {}, { validateResult: false });

    if (yfRes && Array.isArray(yfRes.quotes)) {
      for (const q of yfRes.quotes) {
        if (!q.symbol) continue;
        const rawSym = String(q.symbol);
        const cleanSym = rawSym.replace(/\.(NS|BO)$/i, '').toUpperCase();

        if (seen.has(cleanSym)) continue;

        const isEquity = q.quoteType === 'EQUITY' || q.typeDisp === 'Equity' || !q.quoteType;
        if (!isEquity) continue;

        const rawExch = (q.exchDisp || q.exchange || (rawSym.endsWith('.NS') ? 'NSE' : rawSym.endsWith('.BO') ? 'BSE' : 'GLOBAL')) as string;
        const normalizedExch = rawExch === 'NSI' ? 'NSE' : rawExch === 'BOM' ? 'BSE' : rawExch;

        const officialSector = (q.sectorDisp || q.sector || '') as string;
        if (officialSector) {
          sectorCache.set(cleanSym, officialSector);
        }

        seen.add(cleanSym);
        results.push({
          symbol: cleanSym,
          name: (q.shortname || q.longname || cleanSym) as string,
          exchange: normalizedExch,
          sector: officialSector || undefined,
          industry: (q.industryDisp || q.industry || '') as string,
        });

        if (results.length >= limit) break;
      }
    }
  } catch (err) {
    console.warn('[stockDirectory] Yahoo Finance search failed:', err);
  }

  // 2. Supplement with official NSE directory if under limit
  if (results.length < limit) {
    try {
      const nseDir = await fetchOfficialNseDirectory();
      const qLower = cleanQ.toLowerCase();
      for (const [sym, stock] of nseDir.entries()) {
        if (seen.has(sym)) continue;
        if (sym.toLowerCase().includes(qLower) || stock.name.toLowerCase().includes(qLower)) {
          seen.add(sym);
          const cachedSector = sectorCache.get(sym);
          results.push({
            ...stock,
            sector: cachedSector || undefined,
          });
          if (results.length >= limit) break;
        }
      }
    } catch {
      // Ignore NSE directory search error
    }
  }

  return results.slice(0, limit);
}

/**
 * Resolves a stock's official sector from official sources (cache, live quote, or quoteSummary assetProfile).
 */
export async function fetchOfficialStockSector(symbol: string): Promise<string | undefined> {
  if (!symbol) return undefined;
  const cleanSym = symbol.replace(/\.(NS|BO)$/i, '').toUpperCase();

  const cached = sectorCache.get(cleanSym);
  if (cached) return cached;

  // Check Nifty 50 official list
  const nifty = await fetchOfficialNseNifty50();
  const match = nifty.find((s) => s.symbol === cleanSym);
  if (match?.sector) {
    sectorCache.set(cleanSym, match.sector);
    return match.sector;
  }

  // Fetch official profile from Yahoo Finance
  try {
    const yfModule = await import('yahoo-finance2');
    const YahooFinance = yfModule.default || yfModule;
    const yahooFinance = new (YahooFinance as any)({ suppressNotices: ['yahooSurvey'] });
    const summary = await yahooFinance.quoteSummary(
      `${cleanSym}.NS`,
      { modules: ['assetProfile'] },
      { validateResult: false }
    );
    const sec = summary?.assetProfile?.sector;
    if (typeof sec === 'string' && sec) {
      sectorCache.set(cleanSym, sec);
      return sec;
    }
  } catch {
    try {
      const yfModule = await import('yahoo-finance2');
      const YahooFinance = yfModule.default || yfModule;
      const yahooFinance = new (YahooFinance as any)({ suppressNotices: ['yahooSurvey'] });
      const summary = await yahooFinance.quoteSummary(
        `${cleanSym}.BO`,
        { modules: ['assetProfile'] },
        { validateResult: false }
      );
      const sec = summary?.assetProfile?.sector;
      if (typeof sec === 'string' && sec) {
        sectorCache.set(cleanSym, sec);
        return sec;
      }
    } catch {
      // ignore
    }
  }

  return undefined;
}
