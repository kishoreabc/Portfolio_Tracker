import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';

const NVIDIA_BASE_URL =
  process.env.NVIDIA_BASE_URL ?? 'https://integrate.api.nvidia.com/v1';
const NVIDIA_LLM_MODEL =
  process.env.NVIDIA_LLM_MODEL ?? 'meta/llama-3.1-70b-instruct';
const NVIDIA_EMBEDDING_MODEL =
  process.env.NVIDIA_EMBEDDING_MODEL ?? 'nvidia/nv-embed-v1';

function requireNvidiaKey(): string {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) throw new Error('NVIDIA_API_KEY environment variable is not set.');
  return key;
}

/**
 * LangChain ChatOpenAI configured for NVIDIA NIM API.
 * Uses the OpenAI-compatible endpoint exposed by NVIDIA.
 */
export function getLLM(options?: { temperature?: number; maxTokens?: number }) {
  return new ChatOpenAI({
    apiKey: requireNvidiaKey(),
    model: NVIDIA_LLM_MODEL,
    temperature: options?.temperature ?? 0.1,
    maxTokens: options?.maxTokens ?? 2048,
    configuration: {
      baseURL: NVIDIA_BASE_URL,
    },
  });
}

/**
 * LangChain OpenAIEmbeddings configured for NVIDIA NIM API.
 * nvidia/nv-embedqa-e5-v5 → 1024 dimensions
 */
export function getEmbeddings() {
  return new OpenAIEmbeddings({
    apiKey: requireNvidiaKey(),
    model: NVIDIA_EMBEDDING_MODEL,
    configuration: {
      baseURL: NVIDIA_BASE_URL,
    },
  });
}
