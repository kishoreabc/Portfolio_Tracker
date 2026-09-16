import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { checkRateLimit, getClientIdentifier, rateLimitResponse } from '@/lib/server/rateLimiter';
import { methodNotAllowed, privateNoStoreHeaders, safeErrorResponse, unauthorizedResponse } from '@/lib/server/apiHelpers';

const profileCache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

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

  const limitResult = checkRateLimit(`stocks-profile:${clientId}`, 60, 60 * 1000);
  if (!limitResult.allowed) {
    return rateLimitResponse(limitResult.resetTime);
  }

  const { symbol } = await params;
  if (!symbol || !/^[A-Za-z0-9_.-]{1,20}$/.test(symbol)) {
    return NextResponse.json({ error: 'Invalid stock symbol' }, { status: 400, headers: privateNoStoreHeaders });
  }

  const upperSymbol = symbol.toUpperCase();

  const cached = profileCache.get(upperSymbol);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json(cached.data, { headers: privateNoStoreHeaders });
  }

  const suffixes = upperSymbol.includes('.') ? [''] : ['.NS', '.BO'];
  let rawProfile: any = null;

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
        rawProfile = profile;
        break;
      }
    } catch {
      // try next suffix
    }
  }

  if (!rawProfile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404, headers: privateNoStoreHeaders });
  }

  // Explicitly sanitize and retain ONLY fields needed by the UI
  const sanitizedProfile = {
    assetProfile: {
      longBusinessSummary: rawProfile.assetProfile?.longBusinessSummary ?? null,
      website: rawProfile.assetProfile?.website ?? null,
      fullTimeEmployees: rawProfile.assetProfile?.fullTimeEmployees ?? null,
      city: rawProfile.assetProfile?.city ?? null,
      country: rawProfile.assetProfile?.country ?? null,
      sector: rawProfile.assetProfile?.sector ?? null,
      industry: rawProfile.assetProfile?.industry ?? null,
      companyOfficers: Array.isArray(rawProfile.assetProfile?.companyOfficers)
        ? rawProfile.assetProfile.companyOfficers.slice(0, 3).map((o: any) => ({
            name: o?.name ?? '',
            title: o?.title ?? '',
          }))
        : [],
    },
    defaultKeyStatistics: {
      trailingEps: rawProfile.defaultKeyStatistics?.trailingEps ?? null,
    },
    price: {
      regularMarketPrice: rawProfile.price?.regularMarketPrice ?? null,
    },
  };

  profileCache.set(upperSymbol, { data: sanitizedProfile, ts: Date.now() });
  return NextResponse.json(sanitizedProfile, { headers: privateNoStoreHeaders });
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
