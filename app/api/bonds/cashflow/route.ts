import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { fetchNsdlCashFlow } from '@/lib/bonds/nsdl';
import { getCachedBondCashflow, saveCachedBondCashflow } from '@/lib/bonds/cache';
import { checkRateLimit, getClientIdentifier, rateLimitResponse } from '@/lib/server/rateLimiter';
import { methodNotAllowed, privateNoStoreHeaders, safeErrorResponse, unauthorizedResponse } from '@/lib/server/apiHelpers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return unauthorizedResponse();
  }

  const userId = session.user.id || session.user.email || null;
  const clientId = getClientIdentifier(req, userId);

  // Rate limit: 60 requests per minute
  const limitResult = checkRateLimit(`bonds-cashflow:${clientId}`, 60, 60 * 1000);
  if (!limitResult.allowed) {
    return rateLimitResponse(limitResult.resetTime, 'Bond cashflow request rate limit exceeded.');
  }

  const isin = req.nextUrl.searchParams.get('isin');
  const force = req.nextUrl.searchParams.get('force') === 'true';

  if (!isin) {
    return NextResponse.json(
      { isin: '', status: 400, message: 'Missing required query parameter: isin', cashFlowSchedule: [] },
      { status: 400, headers: privateNoStoreHeaders }
    );
  }

  const cleanIsin = isin.trim().toUpperCase();

  // Validate ISIN format (12 alphanumeric characters)
  if (!/^[A-Z0-9]{12}$/.test(cleanIsin)) {
    return NextResponse.json(
      { isin: cleanIsin, status: 400, message: 'Invalid ISIN format', cashFlowSchedule: [] },
      { status: 400, headers: privateNoStoreHeaders }
    );
  }

  // Check persistent disk & memory cache if not forced
  if (!force) {
    const cached = await getCachedBondCashflow(cleanIsin);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          ...privateNoStoreHeaders,
          'X-Cache': 'HIT',
        },
      });
    }
  }

  try {
    const data = await fetchNsdlCashFlow(cleanIsin);

    // Save to persistent cache
    if (data.cashFlowSchedule && data.cashFlowSchedule.length > 0) {
      await saveCachedBondCashflow(cleanIsin, data);
    } else if (data.status === 200) {
      await saveCachedBondCashflow(cleanIsin, data);
    }

    return NextResponse.json(data, {
      headers: {
        ...privateNoStoreHeaders,
        'X-Cache': 'MISS',
      },
    });
  } catch (err) {
    // If external call failed, fallback to stale cache if available
    const stale = await getCachedBondCashflow(cleanIsin, true);
    if (stale) {
      return NextResponse.json(stale, {
        headers: {
          ...privateNoStoreHeaders,
          'X-Cache': 'STALE',
        },
      });
    }
    return safeErrorResponse('api/bonds/cashflow', err, 'Failed to fetch bond cash flow schedule');
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
