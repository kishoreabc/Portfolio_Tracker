import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { buildAIInsightsV2 } from '@/lib/ai/pipeline-v2';
import type { PortfolioInput } from '@/lib/ai/pipeline';
import type { AgentActivityEvent } from '@/types/agent-activity';
import { checkRateLimit, rateLimitResponse } from '@/lib/server/rateLimiter';
import { methodNotAllowed, privateNoStoreHeaders, unauthorizedResponse } from '@/lib/server/apiHelpers';

// Cache: 15-minute window, isolated per user ID (Section 47)
const userInsightCache = new Map<string, { prompt_hash: string; result: unknown; fetchedAt: number }>();
const CACHE_MS = 15 * 60 * 1000;

// Active runs registry to prevent duplicate concurrent runs (Section 48)
const activeUserRuns = new Set<string>();

function hashString(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return String(h >>> 0);
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return unauthorizedResponse();
  }

  const userId = session.user.id || session.user.email || 'user';
  const userCache = userInsightCache.get(userId);

  if (userCache && Date.now() - userCache.fetchedAt < CACHE_MS) {
    return NextResponse.json(
      { insights: userCache.result, cached: true },
      { headers: privateNoStoreHeaders }
    );
  }

  return NextResponse.json(
    { insights: null, cached: false },
    { headers: privateNoStoreHeaders }
  );
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return unauthorizedResponse();
  }

  const userId = session.user.id || session.user.email || 'user';

  // Rate limit: maximum 10 generation runs per 10-minute window per user (Section 48)
  const limitResult = checkRateLimit(`insights:${userId}`, 10, 10 * 60 * 1000);
  if (!limitResult.allowed) {
    return rateLimitResponse(
      limitResult.resetTime,
      'AI insights rate limit exceeded. Please wait a few minutes before regenerating.'
    );
  }

  try {
    const body: PortfolioInput & { force?: boolean; mode?: 'quick' | 'deep' | 'auto' } = await request.json();
    const { force, mode = 'auto', ...inputPayload } = body;
    const promptHash = hashString(JSON.stringify(inputPayload));
    const runKey = `${userId}:${promptHash}:${mode}`;

    // Single active analysis protection (Section 48)
    if (activeUserRuns.has(runKey)) {
      return NextResponse.json(
        { error: 'An identical analysis is already in progress. Please wait for it to complete.', active: true },
        { status: 429, headers: privateNoStoreHeaders }
      );
    }

    const userCache = userInsightCache.get(userId);
    // Serve from user-specific server cache if not forced and within cache window
    if (
      !force &&
      userCache &&
      userCache.prompt_hash === promptHash &&
      Date.now() - userCache.fetchedAt < CACHE_MS
    ) {
      return NextResponse.json(
        { insights: userCache.result, cached: true },
        { headers: privateNoStoreHeaders }
      );
    }

    // Register active run
    activeUserRuns.add(runKey);

    // Server-Sent Events (SSE) stream for live agent activity execution
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    const sendEvent = async (data: object) => {
      try {
        await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      } catch (e) {
        console.warn('[api/insights/stream] Write error:', e);
      }
    };

    // Execute multi-agent workflow and stream operational telemetry
    (async () => {
      try {
        const insights = await buildAIInsightsV2(
          inputPayload as PortfolioInput,
          (event: AgentActivityEvent) => {
            sendEvent({ type: 'agent_event', event });
          },
          userId,
          {
            mode,
            force,
            abortSignal: request.signal,
          }
        );

        // Cache strictly scoped to this authenticated user
        userInsightCache.set(userId, { prompt_hash: promptHash, result: insights, fetchedAt: Date.now() });
        await sendEvent({ type: 'pipeline_completed', insights, cached: false });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[api/insights/stream] Execution error:', message);
        await sendEvent({ type: 'pipeline_failed', error: 'Failed to complete AI insights analysis. Please try again later.' });
      } finally {
        activeUserRuns.delete(runKey);
        try {
          await writer.close();
        } catch {}
      }
    })();

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform, private',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/insights] POST error:', message);
    return NextResponse.json(
      { error: 'Failed to process AI insights request', insights: null },
      { status: 500, headers: privateNoStoreHeaders }
    );
  }
}
