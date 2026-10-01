/**
 * types/evidence.ts
 *
 * Evidence provenance system — every financial claim must trace back to sourced evidence.
 * Every fact gets a unique ID so AI claims can reference specific evidence.
 */

// ─── Evidence Types ─────────────────────────────────────────────────────────────

export type EvidenceType =
  | 'observed'          // Raw market/portfolio values (e.g. Brent = $82.5, Nifty PE = 23.4)
  | 'calculated'        // Deterministic engine outputs (e.g. HHI = 1850, Portfolio Beta = 1.12)
  | 'rule_based'        // Heuristics/mappings (e.g. FMCG has negative oil margin sensitivity)
  | 'model_estimate'    // Statistical/stress models (e.g. 75bp hike -> -3.4% equity impact)
  | 'llm_interpretation';// Agent qualitative interpretation

// ─── Evidence with IDs ──────────────────────────────────────────────────────────

export interface MetricEvidence {
  /** Unique identifier, e.g. "E001", "E042" */
  id: string;

  /** Strict evidence classification (Point #5) */
  evidenceType?: EvidenceType;

  source: string;
  metric: string;
  value: number | string | null;

  observedAt: string;

  freshnessSeconds?: number;

  confidence: 'high' | 'medium' | 'low';

  sourceUrl?: string;

  /** Which holding/sector this evidence relates to */
  relatedSymbols?: string[];
  relatedSectors?: string[];
}

export interface NewsEvidence {
  id: string;

  title: string;
  source: string;
  url?: string;
  publishedAt?: string;

  relevanceScore: number;
  credibilityScore: number;
  freshnessScore: number;

  relatedSymbols: string[];
  relatedSectors: string[];

  sentiment?: 'positive' | 'negative' | 'neutral' | 'mixed';
  impact?: 'high' | 'medium' | 'low';
}

// ─── Data Quality Gate ──────────────────────────────────────────────────────────

export interface AnalysisQuality {
  overall: 'high' | 'medium' | 'low';

  fundamental: 'high' | 'medium' | 'low';
  technical: 'high' | 'medium' | 'low';
  macro: 'high' | 'medium' | 'low';
  news: 'high' | 'medium' | 'low';
  portfolio: 'high' | 'medium' | 'low';

  missingMetrics: string[];
  staleMetrics: string[];
  unreliableMetrics: string[];
}

// ─── Cross-Factor Relationships (Deterministic) ─────────────────────────────────

export interface CrossFactorFinding {
  id: string;

  factorA: 'macro' | 'fundamental' | 'technical' | 'valuation' | 'risk' | 'news';
  factorB: 'macro' | 'fundamental' | 'technical' | 'valuation' | 'risk' | 'news';

  relationship:
    | 'supports'
    | 'conflicts'
    | 'amplifies'
    | 'offsets'
    | 'neutral';

  title: string;
  conclusion: string;

  affectedSectors: string[];
  affectedHoldings: string[];

  evidenceIds: string[];

  magnitude?: number;
  confidence: number;

  whatWouldChangeTheView: string;
}

// ─── Cross-Examiner Challenge ───────────────────────────────────────────────────

export interface Challenge {
  id: string;

  claimId?: string;
  challengeType:
    | 'unsupported'
    | 'contradiction'
    | 'stale_data'
    | 'missing_context'
    | 'calculation_issue'
    | 'overreach';

  explanation: string;
  evidenceIds: string[];
  severity: 'high' | 'medium' | 'low';
}

// ─── Evidence Collection ────────────────────────────────────────────────────────

export interface EvidenceCollection {
  metrics: MetricEvidence[];
  news: NewsEvidence[];
  crossFactors: CrossFactorFinding[];
  challenges: Challenge[];

  /** Counter for generating sequential IDs */
  _nextId: number;
}

export function createEvidenceCollection(): EvidenceCollection {
  return {
    metrics: [],
    news: [],
    crossFactors: [],
    challenges: [],
    _nextId: 1,
  };
}

export function addMetricEvidence(
  collection: EvidenceCollection,
  evidence: Omit<MetricEvidence, 'id'>
): MetricEvidence {
  const id = `E${String(collection._nextId++).padStart(3, '0')}`;
  const full = { ...evidence, id };
  collection.metrics.push(full);
  return full;
}

export function addNewsEvidence(
  collection: EvidenceCollection,
  evidence: Omit<NewsEvidence, 'id'>
): NewsEvidence {
  const id = `N${String(collection._nextId++).padStart(3, '0')}`;
  const full = { ...evidence, id };
  collection.news.push(full);
  return full;
}

export function addCrossFactorFinding(
  collection: EvidenceCollection,
  finding: Omit<CrossFactorFinding, 'id'>
): CrossFactorFinding {
  const id = `CF${String(collection._nextId++).padStart(3, '0')}`;
  const full = { ...finding, id };
  collection.crossFactors.push(full);
  return full;
}

// ─── Evidence Graph (Point #11: Evidence -> Calculation -> Finding -> Claim) ───

export interface EvidenceGraphNode {
  id: string;
  type: EvidenceType;
  label: string;
  domain: 'market' | 'macro' | 'portfolio' | 'fundamental' | 'technical' | 'news' | 'synthesis' | 'qa';
  value?: number | string | null;
  confidence: 'high' | 'medium' | 'low';
}

export interface EvidenceGraphEdge {
  fromId: string;
  toId: string;
  relationship: 'derived_from' | 'supports' | 'conflicts' | 'amplifies' | 'offsets' | 'challenges';
  explanation?: string;
}

export interface EvidenceGraph {
  nodes: Map<string, EvidenceGraphNode>;
  edges: EvidenceGraphEdge[];
}

export function buildEvidenceGraph(collection: EvidenceCollection): EvidenceGraph {
  const nodes = new Map<string, EvidenceGraphNode>();
  const edges: EvidenceGraphEdge[] = [];

  // 1. Metric nodes
  for (const m of collection.metrics) {
    nodes.set(m.id, {
      id: m.id,
      type: m.evidenceType || 'observed',
      label: `${m.metric}: ${m.value}`,
      domain: m.source.toLowerCase().includes('macro') ? 'macro'
        : m.source.toLowerCase().includes('tech') ? 'technical'
        : m.source.toLowerCase().includes('fund') ? 'fundamental'
        : 'portfolio',
      value: m.value,
      confidence: m.confidence,
    });
  }

  // 2. News nodes
  for (const n of collection.news) {
    nodes.set(n.id, {
      id: n.id,
      type: 'observed',
      label: n.title,
      domain: 'news',
      confidence: n.credibilityScore >= 70 ? 'high' : n.credibilityScore >= 40 ? 'medium' : 'low',
    });
  }

  // 3. Cross-Factor finding nodes + edges to supporting evidence
  for (const cf of collection.crossFactors) {
    nodes.set(cf.id, {
      id: cf.id,
      type: 'calculated',
      label: `${cf.title} (${cf.relationship})`,
      domain: 'portfolio',
      confidence: cf.confidence >= 75 ? 'high' : cf.confidence >= 50 ? 'medium' : 'low',
    });

    for (const evId of cf.evidenceIds) {
      if (nodes.has(evId)) {
        edges.push({
          fromId: evId,
          toId: cf.id,
          relationship: cf.relationship === 'conflicts' ? 'conflicts' : 'supports',
          explanation: cf.conclusion,
        });
      }
    }
  }

  // 4. Challenges from Cross-Examiner
  for (const ch of collection.challenges) {
    nodes.set(ch.id, {
      id: ch.id,
      type: 'rule_based',
      label: `Challenge: ${ch.challengeType} (${ch.severity})`,
      domain: 'qa',
      confidence: ch.severity === 'high' ? 'high' : 'medium',
    });

    for (const evId of ch.evidenceIds) {
      if (nodes.has(evId)) {
        edges.push({
          fromId: evId,
          toId: ch.id,
          relationship: 'challenges',
          explanation: ch.explanation,
        });
      }
    }
  }

  return { nodes, edges };
}

