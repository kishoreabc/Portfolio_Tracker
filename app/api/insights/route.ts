import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Rate-limit: one Gemini call per 15-min window (same as data refresh)
let insightCache: { prompt_hash: string; result: string; fetchedAt: number } | null = null;
const CACHE_MS = 15 * 60 * 1000;

function hashString(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return String(h >>> 0);
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY not configured', insights: null },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const promptHash = hashString(JSON.stringify(body));

    // Serve from cache if within window
    if (insightCache && insightCache.prompt_hash === promptHash &&
        Date.now() - insightCache.fetchedAt < CACHE_MS) {
      return NextResponse.json({ insights: insightCache.result, cached: true });
    }

    const { equitySummary, bondSummary, cashFlowSummary, allocationSummary } = body;

    const prompt = `You are a personal finance advisor analyzing an Indian investment portfolio.

Portfolio Summary:
${JSON.stringify({ equitySummary, bondSummary, cashFlowSummary, allocationSummary }, null, 2)}

Provide a concise analysis (max 400 words) covering:
1. Portfolio Health: Overall assessment of asset allocation and diversification
2. Top Opportunities: 2-3 specific actionable suggestions based on the data
3. Key Risks: 2-3 concentration or maturity risks to watch
4. Cash Flow: Assessment of investment vs spending patterns

Be specific, use the actual numbers from the data, and avoid generic advice. Format with clear headers.`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    insightCache = { prompt_hash: promptHash, result: text, fetchedAt: Date.now() };
    return NextResponse.json({ insights: text, cached: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gemini API error';
    return NextResponse.json({ error: message, insights: null }, { status: 500 });
  }
}
