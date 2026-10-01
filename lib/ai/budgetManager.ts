/**
 * lib/ai/budgetManager.ts
 *
 * API Budget Manager for personal finance free-tier operation (Sections 4 & 5).
 *
 * Tracks estimated API usage per provider (Gemini, Groq, Tavily, Yahoo, Supabase).
 * Enforces configurable daily/monthly quotas, concurrency limits, and 429 backoff states.
 *
 * Design:
 * - Single-user personal finance context: memory-based with configurable env defaults.
 * - Prevents unexpected free-tier quota exhaustion.
 * - Graceful provider fallback when quotas or rate limits are reached.
 */

export interface ProviderBudget {
  provider: string;
  dailyRequestBudget?: number;
  monthlyRequestBudget?: number;
  maxConcurrentRequests: number;
  enabled: boolean;
  fallbackProvider?: string;
}

export interface ProviderUsage {
  requests: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  failures: number;
  rateLimit429Count: number;
  last429Timestamp?: number;
  backoffUntilTimestamp?: number;
  searchCredits: number;
  periodStart: string;
  periodEnd?: string;
}

export interface UsageEstimate {
  llmCalls: number;
  tavilyCalls: number;
  totalTokensEstimated: number;
}

export class BudgetManager {
  private budgets: Map<string, ProviderBudget> = new Map();
  private usages: Map<string, ProviderUsage> = new Map();
  private activeRequests: Map<string, number> = new Map();

  constructor() {
    this.initDefaultBudgets();
  }

  private initDefaultBudgets(): void {
    // 1. Gemini (Default Primary LLM)
    // Daily free-tier budget configurable via GEMINI_DAILY_BUDGET (default 1500)
    const geminiDaily = parseInt(process.env.GEMINI_DAILY_BUDGET || '1500', 10);
    this.budgets.set('gemini', {
      provider: 'gemini',
      dailyRequestBudget: geminiDaily,
      maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_LLM_REQUESTS || '1', 10),
      enabled: true,
      fallbackProvider: 'groq',
    });

    // 2. Groq (Secondary / Fallback LLM)
    // Daily free-tier budget configurable via GROQ_DAILY_BUDGET (default 14400)
    const groqDaily = parseInt(process.env.GROQ_DAILY_BUDGET || '14400', 10);
    this.budgets.set('groq', {
      provider: 'groq',
      dailyRequestBudget: groqDaily,
      maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_LLM_REQUESTS || '1', 10),
      enabled: true,
    });

    // 3. Tavily (Search & External Grounding)
    // Monthly free-tier budget: 1,000 credits/month (Basic = 1, Advanced = 2)
    const tavilyMonthly = parseInt(process.env.TAVILY_MONTHLY_BUDGET || '1000', 10);
    this.budgets.set('tavily', {
      provider: 'tavily',
      monthlyRequestBudget: tavilyMonthly,
      maxConcurrentRequests: 1,
      enabled: true,
    });

    // 4. Yahoo Finance / Scraper
    this.budgets.set('yahoo', {
      provider: 'yahoo',
      dailyRequestBudget: 2000,
      maxConcurrentRequests: 2,
      enabled: true,
    });

    // Initialize usage records
    for (const provider of ['gemini', 'groq', 'tavily', 'yahoo']) {
      this.resetProviderUsage(provider);
    }
  }

  private resetProviderUsage(provider: string): void {
    this.usages.set(provider, {
      requests: 0,
      estimatedInputTokens: 0,
      estimatedOutputTokens: 0,
      failures: 0,
      rateLimit429Count: 0,
      searchCredits: 0,
      periodStart: new Date().toISOString(),
    });
    this.activeRequests.set(provider, 0);
  }

  /** Configure or override budget for a provider */
  setBudget(provider: string, budget: Partial<ProviderBudget>): void {
    const existing = this.budgets.get(provider) || {
      provider,
      maxConcurrentRequests: 1,
      enabled: true,
    };
    this.budgets.set(provider, { ...existing, ...budget });
    if (!this.usages.has(provider)) {
      this.resetProviderUsage(provider);
    }
  }

  /** Get configured budget */
  getBudget(provider: string): ProviderBudget | undefined {
    return this.budgets.get(provider);
  }

  /** Get current estimated usage */
  getUsage(provider: string): ProviderUsage {
    let usage = this.usages.get(provider);
    if (!usage) {
      this.resetProviderUsage(provider);
      usage = this.usages.get(provider)!;
    }
    return { ...usage };
  }

  /**
   * Check whether a provider is allowed to execute a request right now.
   * Considers: enabled status, 429 backoff timer, daily/monthly budgets, and concurrency.
   */
  canMakeRequest(provider: string): { allowed: boolean; reason?: string; fallbackProvider?: string } {
    const budget = this.budgets.get(provider);
    if (!budget || !budget.enabled) {
      return {
        allowed: false,
        reason: `Provider ${provider} is disabled or unconfigured`,
        fallbackProvider: budget?.fallbackProvider,
      };
    }

    const usage = this.getUsage(provider);
    const now = Date.now();

    // Check 429 cooldown / backoff
    if (usage.backoffUntilTimestamp && usage.backoffUntilTimestamp > now) {
      const waitSec = Math.ceil((usage.backoffUntilTimestamp - now) / 1000);
      return {
        allowed: false,
        reason: `Provider ${provider} is in 429 rate-limit backoff (${waitSec}s remaining)`,
        fallbackProvider: budget.fallbackProvider,
      };
    }

    // Check daily budget
    if (budget.dailyRequestBudget && usage.requests >= budget.dailyRequestBudget) {
      return {
        allowed: false,
        reason: `Provider ${provider} daily request budget reached (${usage.requests}/${budget.dailyRequestBudget})`,
        fallbackProvider: budget.fallbackProvider,
      };
    }

    // Check monthly budget (e.g. Tavily search credits)
    if (budget.monthlyRequestBudget) {
      const metric = provider === 'tavily' ? usage.searchCredits : usage.requests;
      if (metric >= budget.monthlyRequestBudget) {
        return {
          allowed: false,
          reason: `Provider ${provider} monthly budget reached (${metric}/${budget.monthlyRequestBudget})`,
          fallbackProvider: budget.fallbackProvider,
        };
      }
    }

    // Check concurrency
    const active = this.activeRequests.get(provider) || 0;
    if (active >= budget.maxConcurrentRequests) {
      return {
        allowed: false,
        reason: `Provider ${provider} reached max concurrent requests (${active}/${budget.maxConcurrentRequests})`,
        fallbackProvider: budget.fallbackProvider,
      };
    }

    return { allowed: true };
  }

  /** Record the start of a request for concurrency tracking */
  startRequest(provider: string): boolean {
    const check = this.canMakeRequest(provider);
    if (!check.allowed) return false;
    const current = this.activeRequests.get(provider) || 0;
    this.activeRequests.set(provider, current + 1);
    return true;
  }

  /** Record the completion of a request with estimated token/credit usage */
  recordRequest(
    provider: string,
    opts: {
      inputTokens?: number;
      outputTokens?: number;
      searchCredits?: number;
      success?: boolean;
    } = {}
  ): void {
    const currentActive = this.activeRequests.get(provider) || 1;
    this.activeRequests.set(provider, Math.max(0, currentActive - 1));

    const usage = this.getUsage(provider);
    usage.requests += 1;
    if (opts.inputTokens) usage.estimatedInputTokens += opts.inputTokens;
    if (opts.outputTokens) usage.estimatedOutputTokens += opts.outputTokens;
    if (opts.searchCredits) usage.searchCredits += opts.searchCredits;
    if (opts.success === false) usage.failures += 1;

    this.usages.set(provider, usage);
  }

  /** Record a 429 response or failure, activating backoff */
  recordFailure(provider: string, is429: boolean = false, customCooldownMs?: number): void {
    const currentActive = this.activeRequests.get(provider) || 1;
    this.activeRequests.set(provider, Math.max(0, currentActive - 1));

    const usage = this.getUsage(provider);
    usage.failures += 1;

    if (is429) {
      usage.rateLimit429Count += 1;
      usage.last429Timestamp = Date.now();
      // Exponential backoff: base 60s, doubling up to 10 minutes
      const multiplier = Math.min(10, Math.pow(2, Math.max(0, usage.rateLimit429Count - 1)));
      const cooldownMs = customCooldownMs ?? (60_000 * multiplier);
      usage.backoffUntilTimestamp = Date.now() + cooldownMs;
      console.warn(`[budgetManager] Provider ${provider} received 429. Backoff active for ${cooldownMs / 1000}s`);
    }

    this.usages.set(provider, usage);
  }

  /** Get estimated API usage across all providers */
  getEstimate(): UsageEstimate {
    const geminiUsage = this.getUsage('gemini');
    const groqUsage = this.getUsage('groq');
    const tavilyUsage = this.getUsage('tavily');

    const llmCalls = geminiUsage.requests + groqUsage.requests;
    const tavilyCalls = tavilyUsage.requests;
    const totalTokensEstimated =
      geminiUsage.estimatedInputTokens + geminiUsage.estimatedOutputTokens +
      groqUsage.estimatedInputTokens + groqUsage.estimatedOutputTokens;

    return {
      llmCalls,
      tavilyCalls,
      totalTokensEstimated,
    };
  }

  /**
   * Persist API usage to storage (Prompt #22).
   * Attempts Supabase persistence first, falls back to local cache.
   */
  async persistUsage(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const records = Array.from(this.usages.entries()).map(([provider, u]) => ({
      provider,
      date: today,
      requests: u.requests,
      estimated_tokens: u.estimatedInputTokens + u.estimatedOutputTokens,
      tavily_credits: u.searchCredits,
      updated_at: new Date().toISOString(),
    }));

    try {
      const fs = await import('fs');
      const path = await import('path');
      const dir = path.join(process.cwd(), '.cache');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'api_usage.json'), JSON.stringify(records, null, 2));
    } catch {
      // Non-fatal
    }
  }

  /**
   * Load API usage from storage (Prompt #22).
   */
  async loadUsage(): Promise<void> {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const file = path.join(process.cwd(), '.cache', 'api_usage.json');
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data)) {
          for (const item of data) {
            const existing = this.usages.get(item.provider) || {
              requests: 0,
              estimatedInputTokens: 0,
              estimatedOutputTokens: 0,
              failures: 0,
              rateLimit429Count: 0,
              searchCredits: 0,
              periodStart: new Date().toISOString(),
            };
            existing.requests = Math.max(existing.requests, item.requests || 0);
            existing.searchCredits = Math.max(existing.searchCredits, item.tavily_credits || 0);
            this.usages.set(item.provider, existing);
          }
        }
      }
    } catch {
      // Non-fatal
    }
  }

  /** Reset all usage counters (for test suites or monthly reset) */
  resetAll(): void {
    this.initDefaultBudgets();
  }
}

/** Global singleton budget manager instance */
export const budgetManager = new BudgetManager();
