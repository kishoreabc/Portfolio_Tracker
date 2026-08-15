import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { getTranslationModelManager } from './nvidia';

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

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryTranslate(
  promptBuilder: typeof TITLE_PROMPT | typeof CONTENT_PROMPT,
  input: Record<string, string>,
  label: string
): Promise<string> {
  const manager = getTranslationModelManager({ temperature: 0.1 });
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 100; attempt++) {
    const { model, index, total } = await manager.getNextModel();
    const chain = promptBuilder.pipe(model).pipe(new StringOutputParser());

    try {
      const raw = await chain.invoke(input);
      return (raw as string).trim();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(
        `[news/translator] ${label} Model ${index+1}/${total} attempt ${attempt} failed: ${lastError.message}`
      );
      if (lastError.message.includes('429') || lastError.message.includes('404') || lastError.message.includes('400')) {
         // Blacklist the model for 60 seconds
         manager.blacklist(index, 60000);
      } else {
         await sleep(2000);
      }
    }
  }
  
  throw new Error(`${label} Translation failed after trying all fallback models repeatedly. Last error: ${lastError?.message}`);
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
  console.log('[news/translator] Translating Tamil article...');

  // Translate title and content in parallel
  const [translatedTitle, translatedContent] = await Promise.all([
    retryTranslate(TITLE_PROMPT, { title }, 'title'),
    retryTranslate(CONTENT_PROMPT, { content }, 'content'),
  ]);

  console.log('[news/translator] Translation completed.');
  return { translatedTitle, translatedContent };
}
