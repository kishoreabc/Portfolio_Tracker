import { NextResponse } from 'next/server';

// In-memory cache: symbol+range -> { data, ts }
const historyCache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const dynamic = 'force-dynamic';

// Map our range keys to Yahoo Finance's period1 date offsets
function getPeriod1(range: string): Date {
  const now = new Date();
  switch (range) {
    case '1d':   return new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days for intraday
    case '5d':   return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '1mo':  return new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000);
    case '3mo':  return new Date(now.getTime() - 95 * 24 * 60 * 60 * 1000);
    case '6mo':  return new Date(now.getTime() - 190 * 24 * 60 * 60 * 1000);
    case '1y':   return new Date(now.getTime() - 370 * 24 * 60 * 60 * 1000);
    case '3y':   return new Date(now.getTime() - 1100 * 24 * 60 * 60 * 1000);
    case '5y':   return new Date(now.getTime() - 1830 * 24 * 60 * 60 * 1000);
    case 'max':  return new Date('2000-01-01');
    default:     return new Date(now.getTime() - 370 * 24 * 60 * 60 * 1000);
  }
}

function getInterval(range: string): string {
  switch (range) {
    case '1d':  return '5m';
    case '5d':  return '15m';
    case '1mo': return '1d';
    default:    return '1d';
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const upperSymbol = symbol.toUpperCase();
  const url = new URL(req.url);
  const range = url.searchParams.get('range') || '1y';

  const cacheKey = `${upperSymbol}:${range}`;
  const cached = historyCache.get(cacheKey);
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

      const period1 = getPeriod1(range);
      const interval = getInterval(range) as '5m' | '15m' | '1d';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const historical = await (yahooFinance.chart as any)(yahooSymbol, {
        period1,
        interval,
      }, { validateResult: false }) as { quotes?: Array<{ date: Date; open?: number; high?: number; low?: number; close?: number; volume?: number }> } | null;

      if (historical?.quotes?.length) {
        let candles = historical.quotes
          .filter((q) => q.open != null && q.close != null)
          .map((q) => ({
            time: Math.floor(new Date(q.date).getTime() / 1000),
            open: Number(q.open?.toFixed(2)),
            high: Number(q.high?.toFixed(2)),
            low: Number(q.low?.toFixed(2)),
            close: Number(q.close?.toFixed(2)),
            volume: q.volume ?? 0,
          }));

        if (range === '1d' && candles.length > 0) {
          const lastCandle = candles[candles.length - 1];
          const lastDayStr = new Date(lastCandle.time * 1000).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
          candles = candles.filter((c) => {
            return new Date(c.time * 1000).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) === lastDayStr;
          });
        }

        result = { symbol: yahooSymbol, range, candles };
        break;
      }
    } catch {
      // try next suffix
    }
  }

  if (!result) {
    return NextResponse.json({ error: 'History not found' }, { status: 404 });
  }

  historyCache.set(cacheKey, { data: result, ts: Date.now() });
  return NextResponse.json(result);
}
