import { NextResponse } from 'next/server';

const profileCache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const upperSymbol = symbol.toUpperCase();

  const cached = profileCache.get(upperSymbol);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  const suffixes = upperSymbol.includes('.') ? [''] : ['.NS', '.BO'];
  let result: unknown = null;

  for (const suffix of suffixes) {
    const yahooSymbol = upperSymbol + suffix;
    try {
      const yf = await import('yahoo-finance2');
      const YahooFinance = yf.default || yf;
      const yahooFinance = new (YahooFinance as any)();
      const profile = await yahooFinance.quoteSummary(yahooSymbol, {
        modules: ['assetProfile', 'summaryDetail', 'price', 'defaultKeyStatistics'],
      }, { validateResult: false });

      if (profile) {
        result = profile;
        break;
      }
    } catch {
      // try next suffix
    }
  }

  if (!result) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  profileCache.set(upperSymbol, { data: result, ts: Date.now() });
  return NextResponse.json(result);
}
