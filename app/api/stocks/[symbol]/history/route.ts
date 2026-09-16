import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { checkRateLimit, getClientIdentifier, rateLimitResponse } from '@/lib/server/rateLimiter';
import { methodNotAllowed, privateNoStoreHeaders, safeErrorResponse, unauthorizedResponse } from '@/lib/server/apiHelpers';

// In-memory cache: symbol+range -> { data, ts }
const historyCache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const dynamic = 'force-dynamic';

const VALID_RANGES = new Set(['1d', '5d', '1mo', '3mo', '6mo', '1y', '3y', '5y', 'max']);

function getPeriod1(range: string): Date {
  const now = new Date();
  switch (range) {
    case '1d':   return new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    case '5d':   return new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
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
    case '1mo': return '1h';
    case '3mo': return '1d';
    case '6mo': return '1d';
    case '1y':  return '1d';
    case '3y':  return '1wk';
    case '5y':  return '1wk';
    case 'max': return '1mo';
    default:    return '1d';
  }
}

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

  const limitResult = checkRateLimit(`stocks-history:${clientId}`, 60, 60 * 1000);
  if (!limitResult.allowed) {
    return rateLimitResponse(limitResult.resetTime);
  }

  const { symbol } = await params;
  if (!symbol || !/^[A-Za-z0-9_.-]{1,20}$/.test(symbol)) {
    return NextResponse.json({ error: 'Invalid stock symbol' }, { status: 400, headers: privateNoStoreHeaders });
  }

  const rawRange = req.nextUrl.searchParams.get('range') || '1y';
  const range = VALID_RANGES.has(rawRange) ? rawRange : '1y';
  const upperSymbol = symbol.toUpperCase();

  const cacheKey = `${upperSymbol}:${range}`;
  const cached = historyCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json(cached.data, { headers: privateNoStoreHeaders });
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
      const interval = getInterval(range);

      let historical = await (yahooFinance.chart as any)(yahooSymbol, {
        period1,
        interval,
      }, { validateResult: false }) as { quotes?: Array<{ date: Date; open?: number; high?: number; low?: number; close?: number; volume?: number }> } | null;

      if (range === '1d' && (!historical?.quotes || historical.quotes.length === 0)) {
        historical = await (yahooFinance.chart as any)(yahooSymbol, {
          period1: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          interval: '15m',
        }, { validateResult: false });
      }

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
          }))
          .sort((a, b) => a.time - b.time);

        if (range === '1d' && candles.length > 0) {
          const lastCandle = candles[candles.length - 1];
          const lastDayStr = new Date(lastCandle.time * 1000).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
          candles = candles.filter((c) => {
            return new Date(c.time * 1000).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) === lastDayStr;
          });
        }

        if (candles.length > 0) {
          result = { symbol: yahooSymbol, range, candles };
          break;
        }
      }
    } catch {
      // try next suffix
    }
  }

  if (!result) {
    return NextResponse.json({ error: 'History not found' }, { status: 404, headers: privateNoStoreHeaders });
  }

  historyCache.set(cacheKey, { data: result, ts: Date.now() });
  return NextResponse.json(result, { headers: privateNoStoreHeaders });
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
