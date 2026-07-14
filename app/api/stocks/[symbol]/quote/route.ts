import { NextResponse } from 'next/server';

// Simple in-memory cache
const quoteCache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const upperSymbol = symbol.toUpperCase();

  // Check cache
  const cached = quoteCache.get(upperSymbol);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  // Try NSE (.NS) first, then BSE (.BO)
  const suffixes = upperSymbol.includes('.') ? [''] : ['.NS', '.BO'];
  let quote: unknown = null;

  for (const suffix of suffixes) {
    const yahooSymbol = upperSymbol + suffix;
    try {
      const yf = await import('yahoo-finance2');
      const YahooFinance = yf.default || yf;
      const yahooFinance = new (YahooFinance as any)();
      quote = await yahooFinance.quote(yahooSymbol, {}, { validateResult: false });
      if (quote) break;
    } catch {
      // try next suffix
    }
  }

  if (!quote) {
    return NextResponse.json({ error: 'Symbol not found' }, { status: 404 });
  }

  quoteCache.set(upperSymbol, { data: quote, ts: Date.now() });
  return NextResponse.json(quote);
}
