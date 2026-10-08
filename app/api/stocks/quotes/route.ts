import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { checkRateLimit, getClientIdentifier, rateLimitResponse } from '@/lib/server/rateLimiter';
import { methodNotAllowed, privateNoStoreHeaders, unauthorizedResponse, safeErrorResponse } from '@/lib/server/apiHelpers';
import type { WatchlistStockQuote } from '@/types/watchlist';
import { fetchOfficialStockSector } from '@/lib/stocks/stockDirectory';

// In-memory cache: uppercase symbol -> { data, ts }
const quoteCache = new Map<string, { data: WatchlistStockQuote; ts: number }>();
const sectorCache = new Map<string, string>();
const CACHE_TTL_MS = 45 * 1000; // 45 seconds

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return unauthorizedResponse();
  }

  const userId = session.user.id || session.user.email || null;
  const clientId = getClientIdentifier(req, userId);

  const limitResult = checkRateLimit(`stocks-batch-quotes:${clientId}`, 60, 60 * 1000);
  if (!limitResult.allowed) {
    return rateLimitResponse(limitResult.resetTime);
  }

  const { searchParams } = new URL(req.url);
  const rawSymbols = searchParams.get('symbols') || '';
  
  if (!rawSymbols.trim()) {
    return NextResponse.json({ quotes: {}, list: [] }, { headers: privateNoStoreHeaders });
  }

  // Parse symbols (comma separated, max 35)
  const symbols = Array.from(
    new Set(
      rawSymbols
        .split(',')
        .map((s) => s.trim().replace(/\.(NS|BO)$/i, '').toUpperCase())
        .filter((s) => /^[A-Za-z0-9_.-]{1,20}$/.test(s))
    )
  ).slice(0, 35);

  if (symbols.length === 0) {
    return NextResponse.json({ quotes: {}, list: [] }, { headers: privateNoStoreHeaders });
  }

  const now = Date.now();
  const results: Record<string, WatchlistStockQuote> = {};
  const symbolsToFetch: string[] = [];

  for (const sym of symbols) {
    const cached = quoteCache.get(sym);
    if (cached && now - cached.ts < CACHE_TTL_MS) {
      results[sym] = cached.data;
    } else {
      symbolsToFetch.push(sym);
    }
  }

  if (symbolsToFetch.length > 0) {
    try {
      const yf = await import('yahoo-finance2');
      const YahooFinance = yf.default || yf;
      const yahooFinance = new (YahooFinance as any)({ suppressNotices: ['yahooSurvey'] });

      await Promise.all(
        symbolsToFetch.map(async (upperSymbol) => {
          const candidateSymbols =
            upperSymbol === 'TATAMOTORS'
              ? ['TMCV.NS', 'TMPV.NS', 'TATAMOTORS.NS', 'TATAMOTORS.BO']
              : upperSymbol.includes('.')
              ? [upperSymbol]
              : [upperSymbol + '.NS', upperSymbol + '.BO', upperSymbol];

          let rawQuote: any = null;

          for (const yahooSymbol of candidateSymbols) {
            try {
              rawQuote = await yahooFinance.quote(yahooSymbol, {}, { validateResult: false });
              if (rawQuote && rawQuote.regularMarketPrice != null) break;
            } catch {
              // try next candidate
            }
          }

          if (rawQuote && rawQuote.regularMarketPrice != null) {
            const currentPrice = Number(rawQuote.regularMarketPrice) || 0;
            const priceChange = Number(rawQuote.regularMarketChange) || 0;
            const percentChange = Number(rawQuote.regularMarketChangePercent) || 0;

            const rawDivRate = rawQuote.dividendRate != null ? Number(rawQuote.dividendRate) : (rawQuote.trailingAnnualDividendRate != null ? Number(rawQuote.trailingAnnualDividendRate) : null);
            let calculatedDividendYield: number | null = null;
            if (rawDivRate != null && rawDivRate > 0 && currentPrice > 0) {
              calculatedDividendYield = Number(((rawDivRate / currentPrice) * 100).toFixed(2));
            } else if (rawQuote.dividendYield != null) {
              calculatedDividendYield = Number(Number(rawQuote.dividendYield).toFixed(2));
            }

            // Resolve sector dynamically from official sources (quote itself, cache, or official quoteSummary / NSE)
            let resolvedSector =
              (typeof rawQuote.sector === 'string' && rawQuote.sector ? rawQuote.sector : null) ||
              sectorCache.get(upperSymbol);

            if (!resolvedSector) {
              try {
                const officialSector = await fetchOfficialStockSector(upperSymbol);
                if (officialSector) {
                  resolvedSector = officialSector;
                  sectorCache.set(upperSymbol, officialSector);
                }
              } catch {
                // Ignore profile lookup failures
              }
            }

            const rawExchange = (rawQuote.exchange || (rawQuote.symbol?.endsWith('.NS') ? 'NSE' : rawQuote.symbol?.endsWith('.BO') ? 'BSE' : 'NSE')) as string;
            const normalizedExchange = rawExchange === 'NSI' ? 'NSE' : rawExchange === 'BOM' ? 'BSE' : rawExchange;

            const quoteObj: WatchlistStockQuote = {
              symbol: upperSymbol,
              name: (rawQuote.shortName || rawQuote.longName || upperSymbol) as string,
              exchange: normalizedExchange,
              currentPrice,
              priceChange,
              percentChange,
              dayHigh: rawQuote.regularMarketDayHigh != null ? Number(rawQuote.regularMarketDayHigh) : undefined,
              dayLow: rawQuote.regularMarketDayLow != null ? Number(rawQuote.regularMarketDayLow) : undefined,
              fiftyTwoWeekHigh: rawQuote.fiftyTwoWeekHigh != null ? Number(rawQuote.fiftyTwoWeekHigh) : undefined,
              fiftyTwoWeekLow: rawQuote.fiftyTwoWeekLow != null ? Number(rawQuote.fiftyTwoWeekLow) : undefined,
              marketCap: rawQuote.marketCap != null ? Number(rawQuote.marketCap) : undefined,
              trailingPE: rawQuote.trailingPE != null ? Number(rawQuote.trailingPE) : null,
              priceToBook: rawQuote.priceToBook != null ? Number(rawQuote.priceToBook) : null,
              dividendRate: rawDivRate,
              dividendYield: calculatedDividendYield,
              sector: resolvedSector || (rawQuote.sector || ''),
              industry: (rawQuote.industry || '') as string,
              currency: (rawQuote.currency || 'INR') as string,
              regularMarketTime: rawQuote.regularMarketTime,
            };

            quoteCache.set(upperSymbol, { data: quoteObj, ts: now });
            results[upperSymbol] = quoteObj;
          }
        })
      );
    } catch (err) {
      console.error('[api/stocks/quotes] Error fetching quotes:', err);
    }
  }

  // Preserve the original requested order in the list array
  const list = symbols.map((sym) => results[sym]).filter(Boolean);

  return NextResponse.json({ quotes: results, list }, { headers: privateNoStoreHeaders });
}

export async function POST() {
  return methodNotAllowed(['GET']);
}
