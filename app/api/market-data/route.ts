import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIdentifier, rateLimitResponse } from '@/lib/server/rateLimiter';
import { methodNotAllowed, safeErrorResponse } from '@/lib/server/apiHelpers';

export const dynamic = 'force-dynamic';

// In-memory cache for market ticker to prevent rate-limiting Yahoo Finance
let marketCache: { data: unknown; fetchedAt: number } | null = null;
const MARKET_CACHE_TTL_MS = 60 * 1000; // 1 minute

export async function GET(req: NextRequest) {
  const clientId = getClientIdentifier(req);

  // Rate limit: 60 requests per minute per IP
  const limitResult = checkRateLimit(`market-data:${clientId}`, 60, 60 * 1000);
  if (!limitResult.allowed) {
    return rateLimitResponse(limitResult.resetTime, 'Market data rate limit exceeded.');
  }

  const now = Date.now();
  if (marketCache && now - marketCache.fetchedAt < MARKET_CACHE_TTL_MS) {
    return NextResponse.json(marketCache.data, {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=30',
      },
    });
  }

  const indexMap: Record<string, string> = {
    'NIFTY 50': '^NSEI',
    'NIFTY NEXT 50': 'JUNIORBEES.NS',
    'NIFTY 100': '^CNX100',
    'NIFTY MIDCAP 50': '^NSEMDCP50',
    'NIFTY SMALLCAP 100': '^CNXSC',
    'NIFTY BANK': '^NSEBANK',
    'NIFTY AUTO': '^CNXAUTO',
    'NIFTY FIN SERVICE': '^CNXFIN',
    'NIFTY IT': '^CNXIT',
    'NIFTY PHARMA': '^CNXPHARMA',
    'NIFTY FMCG': '^CNXFMCG',
    'NIFTY METAL': '^CNXMETAL',
    'INDIA VIX': '^INDIAVIX',
  };

  const allIndianStocks = [
    'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'INFY.NS',
    'SBIN.NS', 'BHARTIARTL.NS', 'ITC.NS', 'HINDUNILVR.NS', 'LT.NS',
    'BAJFINANCE.NS', 'HCLTECH.NS', 'MARUTI.NS', 'SUNPHARMA.NS', 'TATAMOTORS.NS',
    'M&M.NS', 'ASIANPAINT.NS', 'KOTAKBANK.NS', 'TITAN.NS', 'POWERGRID.NS',
    'NTPC.NS', 'BAJAJFINSV.NS', 'ADANIENT.NS', 'WIPRO.NS', 'NESTLEIND.NS',
    'ONGC.NS', 'JSWSTEEL.NS', 'HINDALCO.NS', 'TATASTEEL.NS', 'GRASIM.NS',
    'CIPLA.NS', 'TECHM.NS', 'BRITANNIA.NS', 'SBILIFE.NS', 'DRREDDY.NS',
    'APOLLOHOSP.NS', 'EICHERMOT.NS', 'DIVISLAB.NS', 'BAJAJ-AUTO.NS', 'HEROMOTOCO.NS',
    'COALINDIA.NS', 'LTIM.NS', 'UPL.NS', 'BPCL.NS', 'INDUSINDBK.NS',
    'HDFCLIFE.NS', 'ADANIPORTS.NS', 'TATACONSUM.NS', 'ZOMATO.NS', 'JIOFIN.NS',
  ];

  const uniqueIndianStocks = Array.from(new Set(allIndianStocks));
  const shuffledStocks = [...uniqueIndianStocks].sort(() => 0.5 - Math.random());
  const selectedStocks = shuffledStocks.slice(0, 15);

  const symbols = [
    ...selectedStocks,
    ...Object.keys(indexMap),
  ];

  try {
    const promises = symbols.map(async (sym) => {
      const yahooSymbol = indexMap[sym] || sym;
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d`, {
        next: { revalidate: 60 },
      });
      if (!res.ok) return null;
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta) return null;

      const price = meta.regularMarketPrice;
      const prevClose = meta.chartPreviousClose;
      const changePercent = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;

      return {
        symbol: sym.replace('.NS', ''),
        value: `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`,
      };
    });

    const rawResults = await Promise.all(promises);
    const results = rawResults.filter(Boolean);

    marketCache = { data: results, fetchedAt: now };

    return NextResponse.json(results, {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=30',
      },
    });
  } catch (error) {
    return safeErrorResponse('api/market-data', error, 'Failed to fetch market data');
  }
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
