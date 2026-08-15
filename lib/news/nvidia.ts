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

  if (process.env.GEMINI_MODEL) {
    const geminiSpecs = process.env.GEMINI_MODEL.split(',').map(s => s.trim()).filter(Boolean);
    modelSpecs.push(...geminiSpecs);
  } else {
    modelSpecs.push('gemini:gemini-2.5-flash');
  }

  if (process.env.FALLBACK_MODELS) {
    const fallbackSpecs = process.env.FALLBACK_MODELS.split(',').map(s => s.trim()).filter(Boolean);
    modelSpecs.push(...fallbackSpecs);
  } else if (modelSpecs.length === 1) {
    modelSpecs.push('groq:llama-3.3-70b-versatile');
  }

  if (modelSpecs.length === 0) {
    throw new Error('No models configured for LLM chain');
  }

  const llms = modelSpecs.map(spec => buildLlmFromSpec(spec, options));
  return llms;
}

export class ModelManager {
  private models: { llm: BaseChatModel; blacklistedUntil: number }[];

  constructor(llms: BaseChatModel[]) {
    this.models = llms.map(llm => ({ llm, blacklistedUntil: 0 }));
  }

  async getNextModel(): Promise<{ model: BaseChatModel; index: number; total: number }> {
    const total = this.models.length;
    
    // Check if ALL models are currently blacklisted
    const allBlacklisted = this.models.every(m => m.blacklistedUntil > Date.now());
    if (allBlacklisted) {
      console.warn('[ModelManager] All models rate-limited. Waiting 10 seconds before circular retry...');
      await new Promise(r => setTimeout(r, 10000));
      // Reset all blacklists to force a circular retry
      this.models.forEach(m => m.blacklistedUntil = 0);
    }

    // Always start checking from index 0 to prioritize earlier models
    for (let index = 0; index < total; index++) {
      const status = this.models[index];
      
      if (status.blacklistedUntil <= Date.now()) {
        return { model: status.llm, index, total };
      }
    }
    
    return { model: this.models[0].llm, index: 0, total };
  }

  blacklist(index: number, durationMs: number = 60000) {
    this.models[index].blacklistedUntil = Date.now() + durationMs;
    console.warn(`[ModelManager] Model ${index + 1}/${this.models.length} blacklisted for ${durationMs/1000}s`);
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
