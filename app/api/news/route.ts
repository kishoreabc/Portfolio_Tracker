import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getNews } from '@/lib/news/search';
import type { NewsFilters } from '@/types/news';
import { checkRateLimit, getClientIdentifier, rateLimitResponse } from '@/lib/server/rateLimiter';
import { methodNotAllowed, privateNoStoreHeaders, safeErrorResponse, unauthorizedResponse } from '@/lib/server/apiHelpers';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return unauthorizedResponse();
  }

  const userId = session.user.id || session.user.email || null;
  const clientId = getClientIdentifier(request, userId);

  const limitResult = checkRateLimit(`news:${clientId}`, 60, 60 * 1000);
  if (!limitResult.allowed) {
    return rateLimitResponse(limitResult.resetTime);
  }

  const { searchParams } = new URL(request.url);

  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10) || 20));

  const filters: NewsFilters = {
    page,
    limit,
    category: searchParams.get('category') ?? undefined,
    language: searchParams.get('language') ?? undefined,
    sentiment: searchParams.get('sentiment') as NewsFilters['sentiment'] ?? undefined,
    impact: searchParams.get('impact') as NewsFilters['impact'] ?? undefined,
    portfolioRelevant: searchParams.has('portfolioRelevant')
      ? searchParams.get('portfolioRelevant') === 'true'
      : undefined,
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
  };

  try {
    const data = await getNews(filters);
    return NextResponse.json(data, { headers: privateNoStoreHeaders });
  } catch (error) {
    return safeErrorResponse('api/news', error, 'Failed to fetch news articles');
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
