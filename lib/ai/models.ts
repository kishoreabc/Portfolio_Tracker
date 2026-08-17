/**
 * lib/ai/models.ts
 *
 * Dedicated ModelManager for the AI Insights agentic pipeline.
 * Uses GEMINI_INSIGHTS_API_KEY (falls back to GEMINI_API_KEY) so it can be
 * rate-limited and billed separately from the news/translation workflow.
 * Reads the same GEMINI_MODEL + FALLBACK_MODELS env vars as the rest of the app.
 * Features:
 *  - Circular (round-robin) model switching
 *  - Rate limit & API key error blacklisting with automatic cooldowns
 *  - Inter-call pacing delays to avoid burst 429 errors
 */

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatGroq } from '@langchain/groq';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';

function requireInsightsKey(): string {
  // Prefer dedicated key; fall back to general key
  const key = process.env.GEMINI_INSIGHTS_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      'Neither GEMINI_INSIGHTS_API_KEY nor GEMINI_API_KEY is set. ' +
      'Please add GEMINI_INSIGHTS_API_KEY to your .env.local.'
    );
  }
  return key;
}

export interface ModelEntry {
  llm: BaseChatModel;
  name: string;
  provider: string;
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

function buildInsightsChain(temperature = 0.3): { llm: BaseChatModel; name: string; provider: string }[] {
  const specs: string[] = [];

  if (process.env.GEMINI_MODEL) {
    specs.push(...process.env.GEMINI_MODEL.split(',').map((s) => s.trim()).filter(Boolean));
  } else {
    specs.push('gemini:gemini-3.1-flash-lite', 'gemini:gemini-3.5-flash-lite');
  }

  if (process.env.FALLBACK_MODELS) {
    specs.push(...process.env.FALLBACK_MODELS.split(',').map((s) => s.trim()).filter(Boolean));
  } else if (specs.length <= 1) {
    specs.push('groq:openai/gpt-oss-120b', 'groq:qwen/qwen3.6-27b');
  }

  if (specs.length === 0) throw new Error('No models configured for AI Insights pipeline.');

  return specs.map((spec) => buildInsightsLlm(spec, temperature));
}

export class InsightsModelManager {
  private models: ModelEntry[];
  private currentIndex: number = 0;
  private lastCallTimestamp: number = 0;

  constructor(temperature = 0.3) {
    this.models = buildInsightsChain(temperature).map((item) => ({
      llm: item.llm,
      name: item.name,
      provider: item.provider,
      blacklistedUntil: 0,
    }));
  }

  /**
   * Applies an inter-call pacing delay to avoid triggering burst rate-limits.
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
   * Selects the next available model in circular (round-robin) order.
   * If all models are currently blacklisted, waits for the shortest cooldown and resets.
   */
  async getNext(): Promise<{ model: BaseChatModel; index: number; name: string; provider: string }> {
    const total = this.models.length;
    const now = Date.now();

    // Check if all models are blacklisted
    const allBlacklisted = this.models.every((m) => m.blacklistedUntil > now);
    if (allBlacklisted) {
      const remainingTimes = this.models.map((m) => Math.max(1000, m.blacklistedUntil - now));
      const minWait = Math.min(...remainingTimes, 10_000);
      console.warn(
        `[InsightsModelManager] All ${total} models rate-limited/cooling down. Waiting ${(minWait / 1000).toFixed(1)}s before circular retry...`
      );
      await new Promise((resolve) => setTimeout(resolve, minWait));
      // Reset cooldowns to allow next cycle
      this.models.forEach((m) => (m.blacklistedUntil = 0));
    }

    // Circular search starting from currentIndex
    for (let step = 0; step < total; step++) {
      const idx = (this.currentIndex + step) % total;
      const entry = this.models[idx];

      if (entry.blacklistedUntil <= Date.now()) {
        // Advance pointer circularly for next request
        this.currentIndex = (idx + 1) % total;
        return {
          model: entry.llm,
          index: idx,
          name: entry.name,
          provider: entry.provider,
        };
      }
    }

    // Fallback: pick current index
    const fallbackIdx = this.currentIndex % total;
    this.currentIndex = (fallbackIdx + 1) % total;
    const fallback = this.models[fallbackIdx];
    return {
      model: fallback.llm,
      index: fallbackIdx,
      name: fallback.name,
      provider: fallback.provider,
    };
  }

  blacklist(index: number, durationMs = 60_000, reason = 'Rate limit / error') {
    if (index >= 0 && index < this.models.length) {
      this.models[index].blacklistedUntil = Date.now() + durationMs;
      console.warn(
        `[InsightsModelManager] Model ${index + 1}/${this.models.length} (${this.models[index].name}) blacklisted for ${durationMs / 1000}s [Reason: ${reason}]`
      );
    }
  }

  get count() {
    return this.models.length;
  }
}

/** Singleton — one manager per process lifetime (reused across requests) */
let _insightsManager: InsightsModelManager | null = null;

export function getInsightsModelManager(): InsightsModelManager {
  if (!_insightsManager) {
    _insightsManager = new InsightsModelManager(0.3);
  }
  return _insightsManager;
}
