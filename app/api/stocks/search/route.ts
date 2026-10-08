import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { checkRateLimit, getClientIdentifier, rateLimitResponse } from '@/lib/server/rateLimiter';
import { methodNotAllowed, privateNoStoreHeaders, unauthorizedResponse, safeErrorResponse } from '@/lib/server/apiHelpers';
import { searchOfficialStocks } from '@/lib/stocks/stockDirectory';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return unauthorizedResponse();
  }

  const userId = session.user.id || session.user.email || null;
  const clientId = getClientIdentifier(req, userId);

  const limitResult = checkRateLimit(`stocks-search:${clientId}`, 60, 60 * 1000);
  if (!limitResult.allowed) {
    return rateLimitResponse(limitResult.resetTime);
  }

  const { searchParams } = new URL(req.url);
  const query = (searchParams.get('q') || '').trim();

  try {
    const results = await searchOfficialStocks(query, 15);
    return NextResponse.json({ results }, { headers: privateNoStoreHeaders });
  } catch (error) {
    return safeErrorResponse('api/stocks/search', error, 'Failed to search stocks');
  }
}

export async function POST() {
  return methodNotAllowed(['GET']);
}
