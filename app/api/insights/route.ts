import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { buildAIInsights, type PortfolioInput } from '@/lib/ai/pipeline';
import type { AgentActivityEvent } from '@/types/agent-activity';

// Cache: 15-minute window, keyed by payload hash
let insightCache: { prompt_hash: string; result: unknown; fetchedAt: number } | null = null;
const CACHE_MS = 15 * 60 * 1000;

function hashString(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return String(h >>> 0);
}

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized', insights: null }, { status: 401 });
  }

  if (insightCache) {
    return NextResponse.json({ insights: insightCache.result, cached: true });
  }

  return NextResponse.json({ insights: null, cached: false });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized', insights: null }, { status: 401 });
  }

  const insightsKey = process.env.GEMINI_INSIGHTS_API_KEY || process.env.GEMINI_API_KEY;
  if (!insightsKey) {
    return NextResponse.json(
      { error: 'No Gemini API key configured (GEMINI_INSIGHTS_API_KEY or GEMINI_API_KEY)', insights: null },
      { status: 503 }
    );
  }

  try {
    const body: PortfolioInput & { force?: boolean } = await request.json();
    const { force, ...inputPayload } = body;
    const promptHash = hashString(JSON.stringify(inputPayload));

    // Serve from server cache if not forced and within cache window
    if (
      !force &&
      insightCache &&
      insightCache.prompt_hash === promptHash &&
      Date.now() - insightCache.fetchedAt < CACHE_MS
    ) {
      return NextResponse.json({ insights: insightCache.result, cached: true });
    }

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
        const insights = await buildAIInsights(inputPayload as PortfolioInput, (event: AgentActivityEvent) => {
          sendEvent({ type: 'agent_event', event });
        });

        insightCache = { prompt_hash: promptHash, result: insights, fetchedAt: Date.now() };
        await sendEvent({ type: 'pipeline_completed', insights, cached: false });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'AI pipeline error';
        console.error('[api/insights/stream] Execution error:', message);
        await sendEvent({ type: 'pipeline_failed', error: message });
      } finally {
        try {
          await writer.close();
        } catch {}
      }
    })();

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI pipeline error';
    console.error('[api/insights]', message);
    return NextResponse.json({ error: message, insights: null }, { status: 500 });
  }
}
