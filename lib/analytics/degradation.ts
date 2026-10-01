/**
 * lib/analytics/degradation.ts
 *
 * Pipeline Degradation Handler.
 *
 * Defines explicit degradation states:
 *   FULL → DEGRADED → PARTIAL → FAILED
 *
 * Ensures the pipeline continues producing useful output even when:
 *   - Tavily fails (news)
 *   - Yahoo Finance fails (technicals)
 *   - One or more LLM providers fail
 *   - Individual agents fail
 *
 * CRITICAL: The adapter MUST NEVER manufacture data.
 * It should transform: new value → old field
 * but never: missing value → fake value
 */

// ─── Types ──────────────────────────────────────────────────────────────────────

export type PipelineState = 'full' | 'degraded' | 'partial' | 'failed';

export interface DegradedComponent {
  component: string;
  reason: string;
  impact: string;
  fallbackUsed: string;
  severity: 'critical' | 'significant' | 'minor';
}

export interface PipelineDegradation {
  state: PipelineState;
  degradedComponents: DegradedComponent[];
  availableCapabilities: string[];
  unavailableCapabilities: string[];
  userMessage: string;
  technicalMessage: string;
  /** Should the final report include a degradation notice? */
  showDegradationNotice: boolean;
}

// ─── Per-Stage Timeout Config ───────────────────────────────────────────────────

export const STAGE_TIMEOUTS = {
  marketData: 15_000,       // 15s for Yahoo Finance
  news: 10_000,             // 10s for Tavily/RSS
  fundamentalAgent: 30_000, // 30s per LLM agent
  technicalAgent: 30_000,
  macroAgent: 30_000,
  riskAgent: 30_000,
  strategistAgent: 45_000,  // strategist gets more time (larger context)
  crossExaminer: 30_000,
  synthesizer: 30_000,
  totalPipeline: 180_000,   // 3 min hard ceiling
} as const;

// ─── Timeout Wrapper ────────────────────────────────────────────────────────────

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<{ result: T; timedOut: false } | { result: null; timedOut: true; error: string }> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs)
  );

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return { result, timedOut: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Degradation] ${label}: ${message}`);
    return { result: null, timedOut: true, error: message };
  }
}

// ─── Safe Agent Execution ───────────────────────────────────────────────────────

/**
 * Wraps an agent call with timeout and error handling.
 * Returns null on failure instead of throwing, allowing the pipeline to continue.
 */
export async function safeAgentCall<T>(
  agentName: string,
  agentFn: () => Promise<T>,
  timeoutMs: number
): Promise<{ result: T; error: null } | { result: null; error: string }> {
  try {
    const outcome = await withTimeout(agentFn(), timeoutMs, agentName);
    if (outcome.timedOut) {
      return { result: null, error: outcome.error };
    }
    return { result: outcome.result, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[safeAgentCall] ${agentName} failed: ${message}`);
    return { result: null, error: message };
  }
}

// ─── Degradation State Builder ──────────────────────────────────────────────────

export class DegradationTracker {
  private components: DegradedComponent[] = [];

  addDegradation(
    component: string,
    reason: string,
    impact: string,
    fallbackUsed: string,
    severity: DegradedComponent['severity'] = 'significant'
  ): void {
    this.components.push({ component, reason, impact, fallbackUsed, severity });
    console.warn(`[DegradationTracker] ${severity.toUpperCase()}: ${component} — ${reason}. Fallback: ${fallbackUsed}`);
  }

  build(): PipelineDegradation {
    const criticals = this.components.filter((c) => c.severity === 'critical');
    const significants = this.components.filter((c) => c.severity === 'significant');

    let state: PipelineState;
    if (criticals.length > 0) {
      state = criticals.length >= 3 ? 'failed' : 'partial';
    } else if (significants.length > 0) {
      state = significants.length >= 3 ? 'partial' : 'degraded';
    } else if (this.components.length > 0) {
      state = 'degraded';
    } else {
      state = 'full';
    }

    // Track capabilities
    const allCapabilities = [
      'Fundamental Analysis', 'Technical Analysis', 'Macro/News Analysis',
      'Risk Assessment', 'Stress Testing', 'Cross-Factor Intelligence',
      'AI Interpretation', 'Executive Synthesis', 'Claim Validation',
    ];

    const degradedNames = new Set(this.components.map((c) => c.component));
    const available = allCapabilities.filter((c) => !degradedNames.has(c));
    const unavailable = allCapabilities.filter((c) => degradedNames.has(c));

    // User message
    let userMessage: string;
    switch (state) {
      case 'full':
        userMessage = 'Full analysis completed with all data sources and AI agents.';
        break;
      case 'degraded':
        userMessage = `Analysis completed with ${this.components.length} component(s) in degraded mode. ` +
          `Results are reliable but some insights may be less detailed.`;
        break;
      case 'partial':
        userMessage = `Analysis completed with limited capabilities. ` +
          `${unavailable.length} component(s) were unavailable. Key findings are still based on deterministic analytics.`;
        break;
      case 'failed':
        userMessage = 'Analysis could not be completed. Too many critical components failed.';
        break;
    }

    const technicalMessage = this.components.length > 0
      ? `Degraded: ${this.components.map((c) => `${c.component} (${c.severity}: ${c.reason})`).join('; ')}`
      : 'All systems nominal.';

    return {
      state,
      degradedComponents: this.components,
      availableCapabilities: available,
      unavailableCapabilities: unavailable,
      userMessage,
      technicalMessage,
      showDegradationNotice: state !== 'full',
    };
  }
}
