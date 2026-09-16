import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { keywordSearch, semanticSearch } from '@/lib/news/search';
import { checkRateLimit, getClientIdentifier, rateLimitResponse } from '@/lib/server/rateLimiter';
import { methodNotAllowed, privateNoStoreHeaders, safeErrorResponse, unauthorizedResponse } from '@/lib/server/apiHelpers';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return unauthorizedResponse();
  }

  const userId = session.user.id || session.user.email || null;
  const clientId = getClientIdentifier(request, userId);

  const limitResult = checkRateLimit(`news-search:${clientId}`, 45, 60 * 1000);
  if (!limitResult.allowed) {
    return rateLimitResponse(limitResult.resetTime);
  }

  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get('q');
  const isSemantic = searchParams.get('semantic') === 'true';
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10) || 20));

  if (!rawQuery || !rawQuery.trim()) {
    return NextResponse.json({ articles: [] }, { headers: privateNoStoreHeaders });
  }

  // Sanitize query length to prevent abusive long vectors
  const query = rawQuery.trim().slice(0, 200);

  try {
    const results = isSemantic
      ? await semanticSearch(query, 0.65, limit)
      : await keywordSearch(query, limit);

    return NextResponse.json({ articles: results }, { headers: privateNoStoreHeaders });
  } catch (error) {
    return safeErrorResponse('api/news/search', error, 'Failed to search news');
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
