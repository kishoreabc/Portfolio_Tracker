import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { auth } from '@/auth';

// Rate-limit: one Gemini call per 15-min window (same as data refresh)
let insightCache: { prompt_hash: string; result: any; fetchedAt: number } | null = null;
const CACHE_MS = 15 * 60 * 1000;

function hashString(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return String(h >>> 0);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized', insights: null }, { status: 401 });
  }

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

Provide a concise analysis and return ONLY valid JSON matching this schema:
{
  "health": {
    "score": number (0-100),
    "summary": "1 sentence overall summary",
    "status": "Excellent" | "Good" | "Fair" | "Poor"
  },
  "allocation": {
    "equity": number,
    "bonds": number,
    "gold": number,
    "cash": number
  },
  "opportunities": [
    {
      "title": "Short title",
      "description": "Specific actionable suggestion",
      "priority": "High" | "Medium" | "Low"
    }
  ],
  "risks": [
    {
      "title": "Short title",
      "description": "Risk description",
      "severity": "High" | "Medium" | "Low"
    }
  ],
  "cashFlow": {
    "investment": number,
    "expenses": number,
    "net": number,
    "summary": "1 sentence summary of cashflow"
  },
  "recommendations": ["string", "string"],
  "summary": "Overall portfolio executive summary"
}

Ensure gold and cash are 0 if no data is provided. Never return markdown formatting or explanations outside the JSON object.`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      }
    });
    const text = result.response.text();
    const parsedJSON = JSON.parse(text);

    insightCache = { prompt_hash: promptHash, result: parsedJSON, fetchedAt: Date.now() };
    return NextResponse.json({ insights: parsedJSON, cached: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gemini API error';
    return NextResponse.json({ error: message, insights: null }, { status: 500 });
  }
}
