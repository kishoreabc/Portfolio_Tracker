/**
 * lib/ai/models.ts
 *
 * Dedicated ModelManager for the AI Insights agentic pipeline.
 * Uses GEMINI_INSIGHTS_API_KEY (falls back to GEMINI_API_KEY) and GROQ_API_KEY.
 *
 * Priority-Based Tiered Model Selection:
 * Models are prioritized strictly by verified quota limits (RPD: Requests Per Day, RPM: Requests Per Minute).
 *
 * Tier 1 (Highest Quota: 1,000 RPD, 30 RPM):
 *  - groq:openai/gpt-oss-120b
 *  - groq:qwen/qwen3.8-27b
 *  - groq:openai/gpt-oss-20b
 *
 * Tier 2 (High Quota: 500 RPD, 15 RPM):
 *  - gemini:gemini-3.1-flash-lite
 *  - gemini:gemini-3.5-flash-lite
 *
 * Tier 3 (Standard / Reserve Quota: 20 RPD, 5-10 RPM):
 *  - gemini:gemini-3-flash (5 RPM, 20 RPD)
 *  - gemini:gemini-3.5-flash (5 RPM, 20 RPD)
 *  - gemini:gemini-3.6-flash (5 RPM, 20 RPD)
 *  - gemini:gemini-3.7-flash (5 RPM, 20 RPD)
 *  - gemini:gemini-3.8-flash (5 RPM, 20 RPD)
 */

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatGroq } from '@langchain/groq';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';

function requireInsightsKey(): string {
  const key = process.env.GEMINI_INSIGHTS_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      'Neither GEMINI_INSIGHTS_API_KEY nor GEMINI_API_KEY is set. ' +
      'Please add GEMINI_INSIGHTS_API_KEY to your .env.local.'
    );
  }
  return key;
}

export interface ModelLimitInfo {
  rpd: number; // Daily requests limit
  rpm: number; // Requests per minute
}

/** Verified quota limits mapped directly from Google AI Studio & Groq dashboard */
export const KNOWN_MODEL_LIMITS: Record<string, ModelLimitInfo> = {
  // Groq (Highest daily and minute limits: 1,000 RPD, 30 RPM)
  'groq:openai/gpt-oss-120b': { rpd: 1000, rpm: 30 },
  'groq:qwen/qwen3.8-27b': { rpd: 1000, rpm: 30 },
  'groq:openai/gpt-oss-20b': { rpd: 1000, rpm: 30 },

  // Gemini High Capacity (500 RPD, 15 RPM)
  'gemini:gemini-3.1-flash-lite': { rpd: 500, rpm: 15 },
  'gemini:gemini-3.5-flash-lite': { rpd: 500, rpm: 15 },

  // Gemini Standard / Reserve (20 RPD, 5-10 RPM)
  'gemini:gemini-3-flash': { rpd: 20, rpm: 5 },
  'gemini:gemini-3.5-flash': { rpd: 20, rpm: 5 },
  'gemini:gemini-3.6-flash': { rpd: 20, rpm: 5 },
  'gemini:gemini-3.7-flash': { rpd: 20, rpm: 5 },
  'gemini:gemini-3.8-flash': { rpd: 20, rpm: 5 },
};

export function getModelLimit(name: string): ModelLimitInfo {
  if (KNOWN_MODEL_LIMITS[name]) return KNOWN_MODEL_LIMITS[name];
  if (name.startsWith('groq:')) return { rpd: 1000, rpm: 30 };
  if (name.includes('flash-lite')) return { rpd: 500, rpm: 15 };
  if (name.includes('flash')) return { rpd: 20, rpm: 5 };
  return { rpd: 20, rpm: 5 };
}

export interface ModelEntry {
  llm: BaseChatModel;
  name: string;
  provider: string;
  rpd: number;
  rpm: number;
  blacklistedUntil: number;
}

function buildInsightsLlm(spec: string, temperature: number): { llm: BaseChatModel; name: string; provider: string } {
  let provider = 'gemini';
  let modelName = spec.trim();

  if (modelName.includes(':')) {
    const parts = modelName.split(':');
    provider = parts[0].toLowerCase();
    modelName = parts.slice(1).join(':');
  } else if (
    modelName.startsWith('llama') ||
    modelName.startsWith('mixtral') ||
    modelName.startsWith('gemma') ||
    modelName.startsWith('qwen') ||
    modelName.startsWith('openai/')
  ) {
    provider = 'groq';
  }

  if (provider === 'gemini') {
    return {
      llm: new ChatGoogleGenerativeAI({
        apiKey: requireInsightsKey(),
        model: modelName,
        temperature,
        maxRetries: 0,
      }),
      name: `gemini:${modelName}`,
      provider: 'gemini',
    };
  }

  if (provider === 'groq') {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) throw new Error('GROQ_API_KEY is not set.');
    return {
      llm: new ChatGroq({
        apiKey: groqKey,
        model: modelName,
        temperature,
        maxRetries: 0,
      }),
      name: `groq:${modelName}`,
      provider: 'groq',
    };
  }

  throw new Error(`Unknown provider in model spec: "${spec}"`);
}

function buildInsightsChain(temperature = 0.3): { llm: BaseChatModel; name: string; provider: string; rpd: number; rpm: number }[] {
  const specs: string[] = [];

  // Prioritize configured models from env
  if (process.env.FALLBACK_MODELS) {
    specs.push(...process.env.FALLBACK_MODELS.split(',').map((s) => s.trim()).filter(Boolean));
  }
  if (process.env.GEMINI_MODEL) {
    specs.push(...process.env.GEMINI_MODEL.split(',').map((s) => s.trim()).filter(Boolean));
  }

  // If no specs configured, include all 12 available models across Groq and Gemini
  if (specs.length === 0) {
    specs.push(
      // Groq (1000 RPD, 30 RPM)
      'groq:openai/gpt-oss-120b',
      'groq:qwen/qwen3.8-27b',
      'groq:openai/gpt-oss-20b',
      // Gemini High Limit (500 RPD, 15 RPM)
      'gemini:gemini-3.1-flash-lite',
      'gemini:gemini-3.5-flash-lite',
      // Gemini Reserve (20 RPD)
      'gemini:gemini-3-flash',
      'gemini:gemini-3.5-flash',
      'gemini:gemini-3.6-flash',
      'gemini:gemini-3.7-flash',
      'gemini:gemini-3.8-flash',
    );
  }

  // Deduplicate
  const uniqueSpecs = Array.from(new Set(specs));

  // Build model instances and attach quota limits
  const built = uniqueSpecs.map((spec) => {
    const item = buildInsightsLlm(spec, temperature);
    const limit = getModelLimit(item.name);
    return {
      ...item,
      rpd: limit.rpd,
      rpm: limit.rpm,
    };
  });

  // Sort strictly by priority: Higher Limits First (RPD descending, then RPM descending)
  built.sort((a, b) => {
    if (b.rpd !== a.rpd) return b.rpd - a.rpd;
    return b.rpm - a.rpm;
  });

  return built;
}

export class InsightsModelManager {
  private models: ModelEntry[];
  private tierPointers: Map<number, number> = new Map();
  private lastCallTimestamp: number = 0;

  constructor(temperature = 0.3) {
    this.models = buildInsightsChain(temperature).map((item) => ({
      llm: item.llm,
      name: item.name,
      provider: item.provider,
      rpd: item.rpd,
      rpm: item.rpm,
      blacklistedUntil: 0,
    }));
  }

  /**
   * Applies an inter-call pacing delay to avoid burst rate limits.
   */
  async applyPacingDelay(minIntervalMs = 1200): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastCallTimestamp;
    if (elapsed < minIntervalMs) {
      const waitTime = minIntervalMs - elapsed;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    this.lastCallTimestamp = Date.now();
  }

  /**
   * Selects the next available model prioritizing higher quota limits.
   *
   * Algorithm:
   * 1. Evaluates priority tiers ordered by RPD descending (1,000 RPD -> 500 RPD -> 20 RPD).
   * 2. Within the highest available tier, round-robins across models to balance RPM.
   * 3. Falls through to the next tier ONLY if all models in the higher tier are blacklisted.
   * 4. As soon as a higher-tier model's cooldown expires, subsequent requests immediately resume using the higher tier.
   */
  async getNext(): Promise<{ model: BaseChatModel; index: number; name: string; provider: string }> {
    const total = this.models.length;
    const now = Date.now();

    // Check if ALL models across all tiers are blacklisted
    const allBlacklisted = this.models.every((m) => m.blacklistedUntil > now);
    if (allBlacklisted) {
      const remainingTimes = this.models.map((m) => Math.max(1000, m.blacklistedUntil - now));
      const minWait = Math.min(...remainingTimes, 10_000);
      console.warn(
        `[InsightsModelManager] All ${total} models cooling down. Waiting ${(minWait / 1000).toFixed(1)}s before retry...`
      );
      await new Promise((resolve) => setTimeout(resolve, minWait));
      this.models.forEach((m) => (m.blacklistedUntil = 0));
    }

    // Group models by distinct priority tiers (RPD descending)
    const tiers = Array.from(new Set(this.models.map((m) => m.rpd))).sort((a, b) => b - a);

    for (const tierRpd of tiers) {
      const tierIndices: number[] = [];
      for (let i = 0; i < this.models.length; i++) {
        if (this.models[i].rpd === tierRpd) {
          tierIndices.push(i);
        }
      }

      // Filter to available models in this tier
      const availableIndices = tierIndices.filter((idx) => this.models[idx].blacklistedUntil <= Date.now());

      if (availableIndices.length > 0) {
        // Round-robin within this tier to distribute load
        const currentTierPtr = this.tierPointers.get(tierRpd) ?? 0;
        const selectedIdx = availableIndices[currentTierPtr % availableIndices.length];
        this.tierPointers.set(tierRpd, (currentTierPtr + 1) % availableIndices.length);

        const entry = this.models[selectedIdx];
        return {
          model: entry.llm,
          index: selectedIdx,
          name: entry.name,
          provider: entry.provider,
        };
      }
      // Higher tier is completely cooling down; fall through to next tier
    }

    // Fallback: pick index 0
    const fallback = this.models[0];
    return {
      model: fallback.llm,
      index: 0,
      name: fallback.name,
      provider: fallback.provider,
    };
  }

  blacklist(index: number, durationMs = 60_000, reason = 'Rate limit / error') {
    if (index >= 0 && index < this.models.length) {
      this.models[index].blacklistedUntil = Date.now() + durationMs;
      console.warn(
        `[InsightsModelManager] Model ${index + 1}/${this.models.length} (${this.models[index].name} [${this.models[index].rpd} RPD]) blacklisted for ${durationMs / 1000}s [Reason: ${reason}]`
      );
    }
  }

  get count() {
    return this.models.length;
  }

  get modelList(): ReadonlyArray<{ name: string; provider: string; rpd: number; rpm: number }> {
    return this.models.map((m) => ({
      name: m.name,
      provider: m.provider,
      rpd: m.rpd,
      rpm: m.rpm,
    }));
  }
}

/** Singleton — one manager per process lifetime */
let _insightsManager: InsightsModelManager | null = null;

export function getInsightsModelManager(): InsightsModelManager {
  if (!_insightsManager) {
    _insightsManager = new InsightsModelManager(0.3);
  }
  return _insightsManager;
}
