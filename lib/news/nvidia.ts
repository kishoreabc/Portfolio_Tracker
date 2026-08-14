import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { ChatGroq } from '@langchain/groq';
import { Embeddings } from '@langchain/core/embeddings';

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
    });
  } else if (provider === 'groq') {
    return new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: modelName,
      temperature: options?.temperature ?? 0.1,
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
    modelSpecs.push('gemini:gemini-1.5-flash');
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
  const primaryLlm = llms[0];
  const fallbacks = llms.slice(1);

  if (fallbacks.length > 0) {
    return primaryLlm.withFallbacks({ fallbacks });
  }
  
  return primaryLlm;
}

export function getTranslationLLM(options?: { temperature?: number }) {
  return getLLMChain(options);
}

export function getSummarizationLLM(options?: { temperature?: number }) {
  return getLLMChain(options);
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
