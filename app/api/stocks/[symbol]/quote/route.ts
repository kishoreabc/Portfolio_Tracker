import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { checkRateLimit, getClientIdentifier, rateLimitResponse } from '@/lib/server/rateLimiter';
import { methodNotAllowed, privateNoStoreHeaders, unauthorizedResponse } from '@/lib/server/apiHelpers';

// In-memory cache: symbol -> { data, ts }
const quoteCache = new Map<string, { data: Record<string, unknown>; ts: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return unauthorizedResponse();
  }

  const userId = session.user.id || session.user.email || null;
  const clientId = getClientIdentifier(req, userId);

  const limitResult = checkRateLimit(`stocks-quote:${clientId}`, 60, 60 * 1000);
  if (!limitResult.allowed) {
    return rateLimitResponse(limitResult.resetTime);
  }

  const { symbol } = await params;
  if (!symbol || !/^[A-Za-z0-9_.-]{1,20}$/.test(symbol)) {
    return NextResponse.json({ error: 'Invalid stock symbol' }, { status: 400, headers: privateNoStoreHeaders });
  }

  const upperSymbol = symbol.toUpperCase();

  // Check cache
  const cached = quoteCache.get(upperSymbol);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json(cached.data, { headers: privateNoStoreHeaders });
  }

  // Try candidates: NSE (.NS) first, then BSE (.BO), plus aliases for demerged tickers
  const candidateSymbols =
    upperSymbol === 'TATAMOTORS'
      ? ['TMCV.NS', 'TMPV.NS', 'TATAMOTORS.NS', 'TATAMOTORS.BO']
      : upperSymbol.includes('.')
      ? [upperSymbol]
      : [upperSymbol + '.NS', upperSymbol + '.BO'];

  let rawQuote: any = null;

  for (const yahooSymbol of candidateSymbols) {
    try {
      const yf = await import('yahoo-finance2');
      const YahooFinance = yf.default || yf;
      const yahooFinance = new (YahooFinance as any)();
      rawQuote = await yahooFinance.quote(yahooSymbol, {}, { validateResult: false });
      if (rawQuote) break;
    } catch {
      // try next candidate
    }
  }

  if (!rawQuote) {
    return NextResponse.json({ error: 'Symbol not found' }, { status: 404, headers: privateNoStoreHeaders });
  }

  const rawDivRate = rawQuote.dividendRate != null ? Number(rawQuote.dividendRate) : (rawQuote.trailingAnnualDividendRate != null ? Number(rawQuote.trailingAnnualDividendRate) : null);
  const cmp = typeof rawQuote.regularMarketPrice === 'number' && rawQuote.regularMarketPrice > 0 ? Number(rawQuote.regularMarketPrice) : null;

  // Calculate actual dividend yield based on CMP (Current Market Price): (Annual Dividend / CMP) * 100
  let calculatedDividendYield: number | null = null;
  if (rawDivRate != null && rawDivRate > 0 && cmp != null && cmp > 0) {
    calculatedDividendYield = Number(((rawDivRate / cmp) * 100).toFixed(2));
  } else if (rawQuote.dividendYield != null) {
    calculatedDividendYield = Number(Number(rawQuote.dividendYield).toFixed(2));
  }

  // Explicitly sanitize and pick ONLY fields required by the frontend UI
  const sanitizedQuote: Record<string, unknown> = {
    symbol: rawQuote.symbol || upperSymbol,
    shortName: rawQuote.shortName,
    longName: rawQuote.longName,
    regularMarketPrice: rawQuote.regularMarketPrice,
    regularMarketChange: rawQuote.regularMarketChange,
    regularMarketChangePercent: rawQuote.regularMarketChangePercent,
    regularMarketPreviousClose: rawQuote.regularMarketPreviousClose,
    regularMarketOpen: rawQuote.regularMarketOpen,
    regularMarketDayHigh: rawQuote.regularMarketDayHigh,
    regularMarketDayLow: rawQuote.regularMarketDayLow,
    regularMarketVolume: rawQuote.regularMarketVolume,
    averageDailyVolume3Month: rawQuote.averageDailyVolume3Month,
    marketCap: rawQuote.marketCap,
    trailingPE: rawQuote.trailingPE,
    priceToBook: rawQuote.priceToBook,
    trailingEps: rawQuote.trailingEps,
    dividendRate: rawDivRate,
    dividendYield: calculatedDividendYield,
    fiftyTwoWeekHigh: rawQuote.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: rawQuote.fiftyTwoWeekLow,
    exchange: rawQuote.exchange,
    fullExchangeName: rawQuote.fullExchangeName,
    currency: rawQuote.currency,
    regularMarketTime: rawQuote.regularMarketTime,
    sector: rawQuote.sector,
    industry: rawQuote.industry,
  };

  quoteCache.set(upperSymbol, { data: sanitizedQuote, ts: Date.now() });
  return NextResponse.json(sanitizedQuote, { headers: privateNoStoreHeaders });
}

export async function POST() {
  return methodNotAllowed(['GET']);
}

export async function PUT() {
  return methodNotAllowed(['GET']);
}

export async function DELETE() {
  return methodNotAllowed(['GET']);
}

export async function PATCH() {
  return methodNotAllowed(['GET']);
}
