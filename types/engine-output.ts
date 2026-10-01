/**
 * types/engine-output.ts
 *
 * Shared pattern for all deterministic engine outputs.
 *
 * Every engine MUST produce:
 *   { score, confidence, evidenceCount, missingMetrics, staleMetrics }
 *
 * Score ≠ Confidence. (Point #12)
 *
 * Example:
 *   score = 82, confidence = 'low'   → "We think it's good, but we're not sure"
 *   score = 82, confidence = 'high'  → "We're confident it's good"
 */

export interface EngineConfidence {
  /** The computed score (0–100) */
  score: number;
  /** Confidence in the score itself */
  confidence: 'high' | 'medium' | 'low';
  /** How many evidence metrics contributed to this score */
  evidenceCount: number;
  /** Expected total metrics for full confidence */
  expectedMetrics: number;
  /** Coverage ratio */
  coveragePct: number;
  /** Which metrics are missing */
  missingMetrics: string[];
  /** Which metrics are stale */
  staleMetrics: string[];
  /** Human-readable interpretation */
  interpretation: string;
}

export function computeEngineConfidence(
  score: number,
  available: number,
  expected: number,
  missingMetrics: string[] = [],
  staleMetrics: string[] = []
): EngineConfidence {
  const coveragePct = expected > 0 ? Math.round((available / expected) * 100) : 0;

  let confidence: 'high' | 'medium' | 'low';
  if (coveragePct >= 75 && staleMetrics.length === 0) {
    confidence = 'high';
  } else if (coveragePct >= 50) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  const interpretation =
    `Score: ${score}/100 (${confidence} confidence). ` +
    `Data coverage: ${coveragePct}% (${available}/${expected} metrics). ` +
    `${missingMetrics.length > 0 ? `Missing: ${missingMetrics.join(', ')}. ` : ''}` +
    `${staleMetrics.length > 0 ? `Stale: ${staleMetrics.join(', ')}. ` : ''}`;

  return {
    score,
    confidence,
    evidenceCount: available,
    expectedMetrics: expected,
    coveragePct,
    missingMetrics,
    staleMetrics,
    interpretation,
  };
}
