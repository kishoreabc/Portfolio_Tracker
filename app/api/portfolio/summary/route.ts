import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getPortfolioSummary } from '@/lib/server/portfolioService';
import { checkRateLimit, getClientIdentifier, rateLimitResponse } from '@/lib/server/rateLimiter';
import { methodNotAllowed, privateNoStoreHeaders, safeErrorResponse, unauthorizedResponse } from '@/lib/server/apiHelpers';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return unauthorizedResponse();
  }

  const userId = session.user.id || session.user.email || null;
  const clientId = getClientIdentifier(request, userId);

  const limitResult = checkRateLimit(`portfolio-summary:${clientId}`, 60, 60 * 1000);
  if (!limitResult.allowed) {
    return rateLimitResponse(limitResult.resetTime);
  }

  const force = request.nextUrl.searchParams.get('force') === 'true';

  try {
    const summary = await getPortfolioSummary(force);
    return NextResponse.json(summary, {
      headers: {
        ...privateNoStoreHeaders,
      },
    });
  } catch (err) {
    return safeErrorResponse('api/portfolio/summary', err, 'Failed to load portfolio summary');
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
