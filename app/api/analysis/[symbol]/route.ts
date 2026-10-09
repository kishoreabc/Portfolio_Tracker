import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { checkRateLimit, getClientIdentifier, rateLimitResponse } from '@/lib/server/rateLimiter';
import { methodNotAllowed, privateNoStoreHeaders, unauthorizedResponse } from '@/lib/server/apiHelpers';
import { fetchResearchData } from '@/lib/analysis/researchService';

export const dynamic = 'force-dynamic';

const SYMBOL_PATTERN = /^[A-Za-z0-9_-]{1,30}$/;

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

  // Rate limit: 30 requests per minute for research (more expensive than quote)
  const limitResult = checkRateLimit(`research:${clientId}`, 30, 60 * 1000);
  if (!limitResult.allowed) {
    return rateLimitResponse(limitResult.resetTime);
  }

  const { symbol } = await params;
  if (!symbol || !SYMBOL_PATTERN.test(symbol)) {
    return NextResponse.json(
      { error: 'Invalid stock symbol. Use NSE symbol format (e.g. TITAN, RELIANCE).' },
      { status: 400, headers: privateNoStoreHeaders }
    );
  }

  try {
    const data = await fetchResearchData(symbol.toUpperCase());
    return NextResponse.json(data, { headers: privateNoStoreHeaders });
  } catch (err) {
    console.error('[Research API] Unhandled error for', symbol, err);
    return NextResponse.json(
      { error: 'Unable to fetch research data. Please try again.' },
      { status: 500, headers: privateNoStoreHeaders }
    );
  }
}

export async function POST() { return methodNotAllowed(['GET']); }
export async function PUT() { return methodNotAllowed(['GET']); }
export async function DELETE() { return methodNotAllowed(['GET']); }
export async function PATCH() { return methodNotAllowed(['GET']); }
