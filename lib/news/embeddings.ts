import { getEmbeddings } from './nvidia';

const MAX_RETRIES = 3;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a 1024-dimensional embedding vector for a news article.
 * Combines title + summary/content for richer semantic representation.
 *
 * Uses nvidia/nv-embedqa-e5-v5 via NVIDIA NIM API.
 */
export async function generateEmbedding(
  title: string,
  content: string
): Promise<number[]> {
  const input = `${title}\n\n${content}`.slice(0, 100000);
  return fetchEmbedding(input, 'passage');
}

export async function generateQueryEmbedding(query: string): Promise<number[]> {
  return fetchEmbedding(query, 'query');
}

async function fetchEmbedding(input: string, inputType: 'passage' | 'query'): Promise<number[]> {
  let lastError: Error | null = null;
  const embeddings = getEmbeddings();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (inputType === 'query') {
        return await embeddings.embedQuery(input);
      } else {
        return (await embeddings.embedDocuments([input]))[0];
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`[news/embeddings] Attempt ${attempt} failed: ${lastError.message}`);
      if (attempt < MAX_RETRIES) await sleep(1000 * attempt);
    }
  }

  throw new Error(`Embedding generation failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}
