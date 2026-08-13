import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { getTranslationLLM } from './nvidia';

const TRANSLATION_SYSTEM_PROMPT = `You are a professional Indian financial news translator.

Translate the provided Tamil financial news into natural, accurate English.

Rules:
- Preserve every factual detail exactly.
- Preserve all names of people exactly as they appear.
- Preserve all company and stock names (e.g., TCS, GCPL, Infosys, Tata Motors).
- Preserve all numbers exactly (do not round or convert).
- Preserve all ₹ rupee values exactly (e.g., ₹552 crore stays ₹552 crore).
- Preserve all percentages exactly.
- Preserve all dates and fiscal years.
- Preserve all regulatory and market terminology.
- Do not add any facts not present in the original.
- Do not remove any facts from the original.
- Do not summarize — translate the full content.
- Do not provide commentary or explanation.
- Return ONLY the English translation, nothing else.`;

const TITLE_PROMPT = ChatPromptTemplate.fromMessages([
  ['system', TRANSLATION_SYSTEM_PROMPT],
  ['human', 'Translate this Tamil news headline to English:\n\n{title}'],
]);

const CONTENT_PROMPT = ChatPromptTemplate.fromMessages([
  ['system', TRANSLATION_SYSTEM_PROMPT],
  [
    'human',
    'Translate this Tamil financial news article to English:\n\n{content}',
  ],
]);

const MAX_RETRIES = 3;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryTranslate(
  chain: ReturnType<typeof TITLE_PROMPT.pipe>,
  input: Record<string, string>,
  label: string
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await chain.invoke(input);
      return (result as string).trim();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(
        `[news/translator] ${label} attempt ${attempt} failed: ${lastError.message}`
      );
      if (attempt < MAX_RETRIES) {
        await sleep(5000* attempt);
      }
    }
  }

  throw new Error(
    `Translation failed after ${MAX_RETRIES} attempts: ${lastError?.message}`
  );
}

export interface TranslationResult {
  translatedTitle: string;
  translatedContent: string;
}

/**
 * Translate a Tamil news article to English using NVIDIA NIM via LangChain.
 * Title and content are translated separately for quality.
 */
export async function translateArticle(
  title: string,
  content: string
): Promise<TranslationResult> {
  const llm = getTranslationLLM({ temperature: 0.1 });
  const outputParser = new StringOutputParser();

  const titleChain = TITLE_PROMPT.pipe(llm).pipe(outputParser);
  const contentChain = CONTENT_PROMPT.pipe(llm).pipe(outputParser);

  console.log('[news/translator] Translating Tamil article...');

  // Translate title and content in parallel
  const [translatedTitle, translatedContent] = await Promise.all([
    retryTranslate(titleChain, { title }, 'title'),
    retryTranslate(contentChain, { content }, 'content'),
  ]);

  console.log('[news/translator] Translation completed.');
  return { translatedTitle, translatedContent };
}
