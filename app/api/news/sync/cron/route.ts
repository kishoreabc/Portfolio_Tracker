import { NextRequest, NextResponse } from 'next/server';
import { syncNews } from '@/lib/news/sync';
import { methodNotAllowed, privateNoStoreHeaders, safeErrorResponse, unauthorizedResponse } from '@/lib/server/apiHelpers';
import { checkRateLimit, getClientIdentifier, rateLimitResponse } from '@/lib/server/rateLimiter';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Fail closed: if CRON_SECRET is not configured or token does not match, reject
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return unauthorizedResponse('Unauthorized cron request');
  }

  const clientId = getClientIdentifier(request);
  const limitResult = checkRateLimit(`cron-sync:${clientId}`, 12, 60 * 60 * 1000); // 12 per hour max
  if (!limitResult.allowed) {
    return rateLimitResponse(limitResult.resetTime, 'Cron rate limit exceeded');
  }

  try {
    const result = await syncNews([]);

    return NextResponse.json({
      success: true,
      message: `Cron sync completed. ${result.newArticles} new articles added.`,
      result,
    }, { headers: privateNoStoreHeaders });
  } catch (error) {
    return safeErrorResponse('cron/news/sync', error, 'Failed to complete cron news sync');
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
