import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { getSummarizationModelManager } from './nvidia';
import type { NewsSentiment, NewsImpact } from '@/types/news';

const SUMMARIZE_SYSTEM = `You are a financial news analyst. 
Given an English financial news article, return a JSON object with exactly these fields:

{{
  "summary": "2-4 sentence factual summary preserving all key numbers, company names, and events. No investment recommendations.",
  "sentiment": "positive" | "negative" | "neutral" | "mixed",
  "impact": "low" | "medium" | "high"
}}

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
  const manager = getSummarizationModelManager({ temperature: 0.1 });
  
  // Truncate to avoid token limits
  const truncatedContent = content.slice(0, 4000);
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  let raw: string | undefined;
  let lastError: Error | null = null;
  
  // Loop up to 100 times to handle circular retries across all articles
  for (let attempt = 1; attempt <= 100; attempt++) {
    const { model, index, total } = await manager.getNextModel();
    const chain = SUMMARIZE_PROMPT.pipe(model).pipe(new StringOutputParser());
    
    try {
      raw = await chain.invoke({ title, content: truncatedContent });
      break; // Success! Break retry loop
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[news/summarizer] Model ${index+1}/${total} attempt ${attempt} failed: ${lastError.message}`);
      
      if (lastError.message.includes('429') || lastError.message.includes('404') || lastError.message.includes('400')) {
         // Blacklist the model for 60 seconds so other requests don't use it
         manager.blacklist(index, 60000);
      } else {
         // Unknown error, still wait a bit
         await sleep(2000);
      }
    }
  }

  if (!raw) {
    throw new Error(`Summarization failed after trying all fallback models repeatedly. Last error: ${lastError?.message}`);
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
