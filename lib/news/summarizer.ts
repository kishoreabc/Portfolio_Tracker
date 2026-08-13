import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { getLLM } from './nvidia';
import type { NewsSentiment, NewsImpact } from '@/types/news';

const SUMMARIZE_SYSTEM = `You are a financial news analyst. 
Given an English financial news article, return a JSON object with exactly these fields:

{
  "summary": "2-4 sentence factual summary preserving all key numbers, company names, and events. No investment recommendations.",
  "sentiment": "positive" | "negative" | "neutral" | "mixed",
  "impact": "low" | "medium" | "high"
}

Sentiment guidelines:
- positive: good earnings, growth, positive announcements
- negative: losses, CEO departures, regulatory issues, market declines
- neutral: routine updates, clarifications
- mixed: mixed results (some positive, some negative)

Impact guidelines:
- high: CEO changes, major earnings surprises, mergers, regulatory actions
- medium: quarterly results, product launches, analyst upgrades/downgrades
- low: routine filings, minor updates, general market commentary

Return ONLY the JSON object, no markdown, no explanation.`;

const SUMMARIZE_PROMPT = ChatPromptTemplate.fromMessages([
  ['system', SUMMARIZE_SYSTEM],
  [
    'human',
    'Article title: {title}\n\nArticle content:\n{content}\n\nReturn only the JSON object.',
  ],
]);

export interface SummarizationResult {
  summary: string;
  sentiment: NewsSentiment;
  impact: NewsImpact;
}

/**
 * Generate a summary, sentiment, and impact score for an English article.
 * Single NVIDIA NIM call for efficiency.
 */
export async function summarizeArticle(
  title: string,
  content: string
): Promise<SummarizationResult> {
  const llm = getLLM({ temperature: 0.1, maxTokens: 512 });
  const chain = SUMMARIZE_PROMPT.pipe(llm).pipe(new StringOutputParser());

  // Truncate to avoid token limits
  const truncatedContent = content.slice(0, 4000);

  let raw: string;
  try {
    raw = await chain.invoke({ title, content: truncatedContent });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[news/summarizer] Failed: ${msg}`);
    throw err;
  }

  // Extract JSON from response (handle possible markdown wrapping)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('[news/summarizer] Could not parse JSON from response:', raw.slice(0, 200));
    throw new Error('Summarizer returned invalid JSON');
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      summary: string;
      sentiment: string;
      impact: string;
    };

    const validSentiments: NewsSentiment[] = ['positive', 'negative', 'neutral', 'mixed'];
    const validImpacts: NewsImpact[] = ['low', 'medium', 'high'];

    return {
      summary: parsed.summary ?? '',
      sentiment: validSentiments.includes(parsed.sentiment as NewsSentiment)
        ? (parsed.sentiment as NewsSentiment)
        : 'neutral',
      impact: validImpacts.includes(parsed.impact as NewsImpact)
        ? (parsed.impact as NewsImpact)
        : 'medium',
    };
  } catch {
    throw new Error(`Failed to parse summarizer JSON: ${jsonMatch[0].slice(0, 200)}`);
  }
}
