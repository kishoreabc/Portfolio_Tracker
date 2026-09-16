import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { reprocessArticle } from '@/lib/news/sync';
import { checkRateLimit, getClientIdentifier, rateLimitResponse } from '@/lib/server/rateLimiter';
import { methodNotAllowed, privateNoStoreHeaders, safeErrorResponse, unauthorizedResponse } from '@/lib/server/apiHelpers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return unauthorizedResponse();
  }

  const userId = session.user.id || session.user.email || null;
  const clientId = getClientIdentifier(request, userId);

  // Reprocessing triggers LLM embeddings: rate limit to 10 per 10 minutes
  const limitResult = checkRateLimit(`news-reprocess:${clientId}`, 10, 10 * 60 * 1000);
  if (!limitResult.allowed) {
    return rateLimitResponse(limitResult.resetTime, 'Article reprocessing rate limit exceeded. Please wait a few minutes.');
  }

  const { id: idString } = await params;
  const id = parseInt(idString, 10);
  if (isNaN(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400, headers: privateNoStoreHeaders });
  }

  try {
    await reprocessArticle(id);
    return NextResponse.json({ success: true }, { headers: privateNoStoreHeaders });
  } catch (error) {
    return safeErrorResponse(`api/news/${id}/reprocess`, error, 'Failed to reprocess article');
  }
}

export async function GET() {
  return methodNotAllowed(['POST']);
}

export async function PUT() {
  return methodNotAllowed(['POST']);
}

export async function DELETE() {
  return methodNotAllowed(['POST']);
}

export async function PATCH() {
  return methodNotAllowed(['POST']);
}
