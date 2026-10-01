import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { ChatGroq } from '@langchain/groq';
import { Embeddings } from '@langchain/core/embeddings';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';

function requireGeminiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY environment variable is not set.');
  return key;
}



function buildLlmFromSpec(spec: string, options?: { temperature?: number }) {
  let provider = 'gemini';
  let modelName = spec;

  if (spec.includes(':')) {
    const parts = spec.split(':');
    provider = parts[0];
    modelName = parts.slice(1).join(':');
  }

  if (provider === 'gemini') {
    return new ChatGoogleGenerativeAI({
      apiKey: requireGeminiKey(),
      model: modelName,
      temperature: options?.temperature ?? 0.1,
      maxRetries: 0,
    });
  } else if (provider === 'groq') {
    return new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: modelName,
      temperature: options?.temperature ?? 0.1,
      maxRetries: 0,
    });
  }
  throw new Error(`Unknown provider in fallback spec: ${provider}`);
}

function getLLMChain(options?: { temperature?: number }) {
  const modelSpecs: string[] = [];

  if (process.env.FALLBACK_MODELS) {
    const fallbackSpecs = process.env.FALLBACK_MODELS.split(',').map(s => s.trim()).filter(Boolean);
    modelSpecs.push(...fallbackSpecs);
  }

  if (process.env.GEMINI_MODEL) {
    const geminiSpecs = process.env.GEMINI_MODEL.split(',').map(s => s.trim()).filter(Boolean);
    modelSpecs.push(...geminiSpecs);
  }

  if (modelSpecs.length === 0) {
    modelSpecs.push(
      'groq:openai/gpt-oss-120b',
      'groq:qwen/qwen3.8-27b',
      'groq:openai/gpt-oss-20b',
      'gemini:gemini-3.1-flash-lite',
      'gemini:gemini-3.5-flash-lite',
      'gemini:gemini-3-flash',
      'gemini:gemini-3.5-flash',
      'gemini:gemini-3.6-flash',
      'gemini:gemini-3.7-flash',
      'gemini:gemini-3.8-flash',
    );
  }

  // Deduplicate and prioritize higher limits first (1000 RPD -> 500 RPD -> 20 RPD)
  const unique = Array.from(new Set(modelSpecs));
  unique.sort((a, b) => {
    const getScore = (s: string) => {
      if (s.startsWith('groq:')) return 1000;
      if (s.includes('flash-lite')) return 500;
      return 20;
    };
    return getScore(b) - getScore(a);
  });

  const llms = unique.map(spec => buildLlmFromSpec(spec, options));
  return llms;
}

export class ModelManager {
  private models: { llm: BaseChatModel; blacklistedUntil: number }[];
  private currentIndex: number = 0;
  private lastCallTimestamp: number = 0;

  constructor(llms: BaseChatModel[]) {
    this.models = llms.map((llm) => ({ llm, blacklistedUntil: 0 }));
  }

  async applyPacingDelay(minIntervalMs = 1200): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastCallTimestamp;
    if (elapsed < minIntervalMs) {
      const waitTime = minIntervalMs - elapsed;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    this.lastCallTimestamp = Date.now();
  }

  async getNextModel(): Promise<{ model: BaseChatModel; index: number; total: number }> {
    const total = this.models.length;
    const now = Date.now();

    // Check if ALL models are currently blacklisted
    const allBlacklisted = this.models.every((m) => m.blacklistedUntil > now);
    if (allBlacklisted) {
      const remainingTimes = this.models.map((m) => Math.max(1000, m.blacklistedUntil - now));
      const minWait = Math.min(...remainingTimes, 10_000);
      console.warn(
        `[ModelManager] All ${total} models rate-limited. Waiting ${(minWait / 1000).toFixed(1)}s before circular retry...`
      );
      await new Promise((r) => setTimeout(r, minWait));
      // Reset all blacklists to force a circular retry
      this.models.forEach((m) => (m.blacklistedUntil = 0));
    }

    // Circular search starting from currentIndex
    for (let step = 0; step < total; step++) {
      const index = (this.currentIndex + step) % total;
      const status = this.models[index];

      if (status.blacklistedUntil <= Date.now()) {
        this.currentIndex = (index + 1) % total;
        return { model: status.llm, index, total };
      }
    }

    const fallbackIdx = this.currentIndex % total;
    this.currentIndex = (fallbackIdx + 1) % total;
    return { model: this.models[fallbackIdx].llm, index: fallbackIdx, total };
  }

  blacklist(index: number, durationMs: number = 60000, reason = 'Rate limit') {
    if (index >= 0 && index < this.models.length) {
      this.models[index].blacklistedUntil = Date.now() + durationMs;
      console.warn(
        `[ModelManager] Model ${index + 1}/${this.models.length} blacklisted for ${durationMs / 1000}s [Reason: ${reason}]`
      );
    }
  }
}

let translationManager: ModelManager | null = null;
let summarizationManager: ModelManager | null = null;

export function getTranslationModelManager(options?: { temperature?: number }) {
  if (!translationManager) {
    translationManager = new ModelManager(getLLMChain(options));
  }
  return translationManager;
}

export function getSummarizationModelManager(options?: { temperature?: number }) {
  if (!summarizationManager) {
    summarizationManager = new ModelManager(getLLMChain(options));
  }
  return summarizationManager;
}

function requireGeminiEmbeddingKey(): string {
  const key = process.env.GEMINI_EMBEDDING_API_KEY;
  if (!key) throw new Error('GEMINI_EMBEDDING_API_KEY environment variable is not set.');
  return key;
}

class GeminiPaddedEmbeddings extends Embeddings {
  private primaryEmbeddings: GoogleGenerativeAIEmbeddings;
  private fallbackEmbeddings: GoogleGenerativeAIEmbeddings;
  private targetDimensions = 3072;

  constructor() {
    super({});
    const apiKey = requireGeminiEmbeddingKey();
    this.primaryEmbeddings = new GoogleGenerativeAIEmbeddings({
      apiKey,
      model: 'gemini-embedding-2', // Primary modern embedding model
    });
    this.fallbackEmbeddings = new GoogleGenerativeAIEmbeddings({
      apiKey,
      model: 'gemini-embedding-001', // Fallback legacy embedding model
    });
  }

  private padVector(vector: number[]): number[] {
    if (vector.length > this.targetDimensions) {
      return vector.slice(0, this.targetDimensions);
    }
    if (vector.length === this.targetDimensions) return vector;
    
    const padded = new Array(this.targetDimensions).fill(0);
    for (let i = 0; i < vector.length; i++) {
      padded[i] = vector[i];
    }
    return padded;
  }

  async embedDocuments(documents: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    for (let i = 0; i < documents.length; i++) {
      if (i > 0) {
        console.log(`[news/embeddings] Sleeping for 10 seconds to avoid RPM/TPM limits...`);
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
      
      let raw: number[][] = [];
      try {
        raw = await this.primaryEmbeddings.embedDocuments([documents[i]]);
        if (!raw[0] || raw[0].length === 0) {
          throw new Error('Primary returned empty vector (silent failure)');
        }
      } catch (err) {
        console.warn(`[news/embeddings] Primary embedding failed, trying fallback... (${(err as Error).message})`);
        raw = await this.fallbackEmbeddings.embedDocuments([documents[i]]);
        if (!raw[0] || raw[0].length === 0) {
          throw new Error('Fallback also returned empty vector');
        }
      }
      
      embeddings.push(this.padVector(raw[0]));
    }
    return embeddings;
  }

  async embedQuery(document: string): Promise<number[]> {
    try {
      const raw = await this.primaryEmbeddings.embedQuery(document);
      if (!raw || raw.length === 0) throw new Error('Primary returned empty query vector');
      return this.padVector(raw);
    } catch (err) {
      console.warn(`[news/embeddings] Primary query embedding failed, trying fallback... (${(err as Error).message})`);
      const raw = await this.fallbackEmbeddings.embedQuery(document);
      if (!raw || raw.length === 0) throw new Error('Fallback returned empty query vector');
      return this.padVector(raw);
    }
  }
}

export function getEmbeddings() {
  return new GeminiPaddedEmbeddings();
}
