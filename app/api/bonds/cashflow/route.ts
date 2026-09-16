import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { fetchNsdlCashFlow } from '@/lib/bonds/nsdl';
import type { NsdlCashFlowResponse } from '@/types/bonds';
import { checkRateLimit, getClientIdentifier, rateLimitResponse } from '@/lib/server/rateLimiter';
import { methodNotAllowed, privateNoStoreHeaders, safeErrorResponse, unauthorizedResponse } from '@/lib/server/apiHelpers';

// Simple in-memory cache: isin -> { data, ts }
const cache = new Map<string, { data: NsdlCashFlowResponse; ts: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return unauthorizedResponse();
  }

  const userId = session.user.id || session.user.email || null;
  const clientId = getClientIdentifier(req, userId);

  // Rate limit: 40 requests per minute
  const limitResult = checkRateLimit(`bonds-cashflow:${clientId}`, 40, 60 * 1000);
  if (!limitResult.allowed) {
    return rateLimitResponse(limitResult.resetTime, 'Bond cashflow request rate limit exceeded.');
  }

  const isin = req.nextUrl.searchParams.get('isin');

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

  const now = Date.now();
  const cached = cache.get(cleanIsin);
  if (cached && now - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json(cached.data, { headers: privateNoStoreHeaders });
  }

  try {
    const data = await fetchNsdlCashFlow(cleanIsin);

    // Only cache non-empty schedules for full TTL (10m); empty results get short TTL (30s)
    if (data.cashFlowSchedule.length > 0) {
      cache.set(cleanIsin, { data, ts: now });
    } else if (data.status === 200 || data.status === 400) {
      cache.set(cleanIsin, { data, ts: now - CACHE_TTL_MS + 30000 });
    }

    return NextResponse.json(data, { headers: privateNoStoreHeaders });
  } catch (err) {
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
