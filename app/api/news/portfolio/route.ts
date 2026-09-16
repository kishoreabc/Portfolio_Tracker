import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getPortfolioNews } from '@/lib/news/search';
import { checkRateLimit, getClientIdentifier, rateLimitResponse } from '@/lib/server/rateLimiter';
import { methodNotAllowed, privateNoStoreHeaders, safeErrorResponse, unauthorizedResponse } from '@/lib/server/apiHelpers';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return unauthorizedResponse();
  }

  const userId = session.user.id || session.user.email || null;
  const clientId = getClientIdentifier(request, userId);

  const limitResult = checkRateLimit(`news-portfolio:${clientId}`, 60, 60 * 1000);
  if (!limitResult.allowed) {
    return rateLimitResponse(limitResult.resetTime);
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '30', 10) || 30));

  try {
    const articles = await getPortfolioNews(limit);
    return NextResponse.json({ articles }, { headers: privateNoStoreHeaders });
  } catch (error) {
    return safeErrorResponse('api/news/portfolio', error, 'Failed to fetch portfolio news');
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
