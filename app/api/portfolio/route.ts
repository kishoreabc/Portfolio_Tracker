import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getPortfolioData } from '@/lib/server/portfolioService';
import { checkRateLimit, getClientIdentifier, rateLimitResponse } from '@/lib/server/rateLimiter';
import { methodNotAllowed, privateNoStoreHeaders, safeErrorResponse, unauthorizedResponse } from '@/lib/server/apiHelpers';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return unauthorizedResponse();
  }

  const userId = session.user.id || session.user.email || null;
  const clientId = getClientIdentifier(request, userId);

  // Rate limit: 45 requests per 1-minute window
  const limitResult = checkRateLimit(`portfolio:${clientId}`, 45, 60 * 1000);
  if (!limitResult.allowed) {
    return rateLimitResponse(limitResult.resetTime, 'Portfolio refresh rate limit reached. Please wait a moment.');
  }

  const force = request.nextUrl.searchParams.get('force') === 'true';

  try {
    const data = await getPortfolioData(force);
    return NextResponse.json(data, {
      headers: {
        ...privateNoStoreHeaders,
        'X-Last-Fetched': data.meta.lastFetched || '',
      },
    });
  } catch (err) {
    return safeErrorResponse('api/portfolio', err, 'Failed to load portfolio data');
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
