import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { syncNews } from '@/lib/news/sync';
import { checkRateLimit, getClientIdentifier, rateLimitResponse } from '@/lib/server/rateLimiter';
import { methodNotAllowed, privateNoStoreHeaders, safeErrorResponse, unauthorizedResponse } from '@/lib/server/apiHelpers';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return unauthorizedResponse();
  }

  const userId = session.user.id || session.user.email || null;
  const clientId = getClientIdentifier(request, userId);

  // Rate limit news sync: maximum 5 manual syncs per 10-minute window
  const limitResult = checkRateLimit(`news-sync:${clientId}`, 5, 10 * 60 * 1000);
  if (!limitResult.allowed) {
    return rateLimitResponse(limitResult.resetTime, 'News synchronization rate limit reached. Please wait before syncing again.');
  }

  try {
    const body = await request.json().catch(() => ({}));
    const rawCompanies = Array.isArray(body.portfolioCompanies) ? body.portfolioCompanies : [];
    
    // Sanitize and limit company names to prevent unbounded payloads
    const portfolioCompanies = rawCompanies
      .filter((c: unknown): c is string => typeof c === 'string' && c.trim().length > 0)
      .slice(0, 50)
      .map((c: string) => c.trim().slice(0, 50));

    const result = await syncNews(portfolioCompanies);
    return NextResponse.json(result, { headers: privateNoStoreHeaders });
  } catch (error) {
    return safeErrorResponse('api/news/sync', error, 'Failed to complete news synchronization');
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
