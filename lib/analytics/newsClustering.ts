/**
 * lib/analytics/newsClustering.ts
 *
 * News Event Deduplication, Clustering, and Materiality Layer.
 * Adheres to Critique #8 & #9:
 *   - Article -> Event Cluster -> Event Importance -> Source Diversity -> Portfolio Relevance
 *   - Prevents 10 syndicated copies of 1 Reuters article from being treated as 10 independent facts
 *   - Sourced authority scoring & event materiality weighting
 */

import type { NewsArticle } from '@/types/portfolio-snapshot';
import type { EvidenceCollection } from '@/types/evidence';
import { addNewsEvidence } from '@/types/evidence';

export interface NewsEventCluster {
  clusterId: string;
  primaryHeadline: string;
  summary: string;
  articleCount: number;
  sources: string[];
  sourceDiversityScore: number; // 0-100 based on unique domain/source count
  credibilityScore: number;     // 0-100 weighted by source authority
  recencyHours: number;
  portfolioRelevanceScore: number; // 0-100 based on sector and holding ticker matches
  materiality: 'high' | 'medium' | 'low';
  materialityRationale: string;
  relatedSectors: string[];
  relatedSymbols: string[];
  evidenceId: string;

  /** Derived event confidence (authority + independence + freshness + relevance + materiality) (Prompt #7) */
  eventConfidence: number;

  /** Source independence vs syndicated reprinting (Critique Point #13) */
  primarySourceType: 'regulatory_primary' | 'institutional_primary' | 'wire_report' | 'syndicated_reprint';
  independentSourceCount: number;
  syndicatedCopiesCount: number;
  sourceLineage: Array<{
    sourceName: string;
    role: 'primary_origin' | 'independent_corroborator' | 'syndicated_copy';
    authority: number;
  }>;
}

export interface ClusteredNewsResult {
  clusters: NewsEventCluster[];
  totalRawArticles: number;
  uniqueEventsCount: number;
  highMaterialityCount: number;
  overallNewsQuality: 'high' | 'medium' | 'low';
  interpretation: string;
}

/** Known tier-1 financial sources with authority weighting (0-100) */
const SOURCE_AUTHORITY_MAP: Record<string, number> = {
  'rbi': 98,
  'reserve bank of india': 98,
  'sebi': 98,
  'reuters': 95,
  'bloomberg': 95,
  'financial times': 92,
  'economic times': 88,
  'livemint': 88,
  'mint': 88,
  'business standard': 86,
  'cnbc-tv18': 84,
  'moneycontrol': 82,
  'hindu businessline': 82,
  'tavily': 75,
  'google news': 70,
};

function getSourceCredibility(sourceName?: string): number {
  if (!sourceName) return 60;
  const clean = sourceName.toLowerCase();
  for (const [key, score] of Object.entries(SOURCE_AUTHORITY_MAP)) {
    if (clean.includes(key)) return score;
  }
  return 60;
}

/** Tokenize and clean text for title similarity */
function tokenizeTitle(title: string): Set<string> {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !['and', 'for', 'the', 'with', 'india', 'indian', 'market', 'stocks', 'share', 'shares'].includes(w));
  return new Set(words);
}

/** Jaccard similarity between two token sets */
/** Key financial synonyms to bridge headline variation */
const SYNONYM_MAP: Record<string, string> = {
  'holds': 'steady',
  'keeps': 'steady',
  'unchanged': 'steady',
  'pause': 'steady',
  'pauses': 'steady',
  'steady': 'steady',
  'rises': 'surge',
  'jumps': 'surge',
  'surges': 'surge',
  'climbs': 'surge',
  'drops': 'slips',
  'falls': 'slips',
  'slips': 'slips',
  'declines': 'slips',
};

/** Common Indian ticker to brand/company name mappings */
const TICKER_NAME_ALIASES: Record<string, string[]> = {
  'infy': ['infosys', 'infy'],
  'tcs': ['tcs', 'tata consultancy'],
  'hdfcbank': ['hdfc bank', 'hdfc'],
  'reliance': ['reliance', 'ril', 'jio'],
  'tatasteel': ['tata steel'],
  'itc': ['itc'],
  'sbin': ['sbi', 'state bank of india'],
  'icicibank': ['icici bank', 'icici'],
  'bhartiartl': ['airtel', 'bharti airtel'],
  'lt': ['larsen', 'l&t'],
  'wipro': ['wipro'],
  'maruti': ['maruti suzuki', 'maruti'],
  'hcltech': ['hcl tech', 'hcl'],
  'tatamotors': ['tata motors'],
};

/** Jaccard similarity between two token sets with synonym normalization */
function calculateSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;

  const normA = new Set(Array.from(a).map((w) => SYNONYM_MAP[w] || w));
  const normB = new Set(Array.from(b).map((w) => SYNONYM_MAP[w] || w));

  let intersection = 0;
  for (const token of normA) {
    if (normB.has(token)) intersection++;
  }
  const union = normA.size + normB.size - intersection;
  const jaccard = union > 0 ? intersection / union : 0;

  // Anchor topic match: e.g. both articles mention 'rbi' and 'repo'
  const hasRbiRepo = (normA.has('rbi') && normA.has('repo')) && (normB.has('rbi') && normB.has('repo'));
  if (hasRbiRepo) return Math.max(jaccard, 0.45);

  return jaccard;
}

/** Detect event materiality */
function classifyMateriality(title: string, content?: string): { materiality: 'high' | 'medium' | 'low'; rationale: string } {
  const text = `${title} ${content || ''}`.toLowerCase();

  // High materiality: monetary policy, interest rates, inflation surprises, earnings revisions, systemic regulations
  if (
    /repo rate|rbi mpc|rate hike|rate cut|inflation cpi|gdp growth|crude spike|fii selloff|sanctions|budget|sebi circular|default|debt downgrade|q[1-4] results beat|earnings surge|margin collapse/i.test(text)
  ) {
    return {
      materiality: 'high',
      rationale: 'Systemic macro driver, policy shift, or high-magnitude earnings impact',
    };
  }

  // Medium materiality: sector-level industry trends, product launches, minor commodity shifts
  if (/orders win|contract|guidance|capex|automobile sales|rupee slips|export surge|import duty|deal/i.test(text)) {
    return {
      materiality: 'medium',
      rationale: 'Sectoral development or operating performance catalyst',
    };
  }

  return {
    materiality: 'low',
    rationale: 'Routine financial news, opinion commentary, or speculative chatter',
  };
}

/** Match article against portfolio sectors and holdings */
function calculateRelevance(
  title: string,
  content: string,
  sectors: string[],
  holdingTickers: (string | { ticker: string; name?: string })[]
): { score: number; matchedSectors: string[]; matchedSymbols: string[] } {
  const text = `${title} ${content}`.toLowerCase();
  const matchedSectors: string[] = [];
  const matchedSymbols: string[] = [];

  for (const sec of sectors) {
    const sLower = sec.toLowerCase();
    if (text.includes(sLower) || (sLower.includes('it') && /\bit\b|software|tech/i.test(text))) {
      matchedSectors.push(sec);
    }
  }

  for (const item of holdingTickers) {
    const ticker = typeof item === 'string' ? item : item.ticker;
    const name = typeof item === 'string' ? '' : (item.name || '').toLowerCase();
    const cleanTicker = ticker.replace(/\.(NS|BO)/i, '').toLowerCase();

    const aliases = TICKER_NAME_ALIASES[cleanTicker] || [cleanTicker];
    if (name) aliases.push(name);

    const matches = aliases.some((alias) => {
      const escaped = alias.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
    });

    if (matches) {
      matchedSymbols.push(ticker);
    }
  }

  let score = 30; // base market relevance
  if (matchedSectors.length > 0) score += 35;
  if (matchedSymbols.length > 0) score += 35;

  return {
    score: Math.min(100, score),
    matchedSectors,
    matchedSymbols,
  };
}

export function clusterNewsArticles(
  articles: NewsArticle[],
  sectors: string[] = [],
  holdingTickers: (string | { ticker: string; name?: string })[] = [],
  evidence?: EvidenceCollection
): ClusteredNewsResult {
  if (articles.length === 0) {
    return {
      clusters: [],
      totalRawArticles: 0,
      uniqueEventsCount: 0,
      highMaterialityCount: 0,
      overallNewsQuality: 'low',
      interpretation: 'No financial news articles available for clustering.',
    };
  }

  const clusters: Array<{
    primaryHeadline: string;
    summary: string;
    articles: NewsArticle[];
    tokens: Set<string>;
    sectors: Set<string>;
    symbols: Set<string>;
    maxAuthority: number;
    newestTimestamp: number;
    materiality: 'high' | 'medium' | 'low';
    materialityRationale: string;
    relevanceSum: number;
  }> = [];

  for (const article of articles) {
    const tokens = tokenizeTitle(article.title);
    const content = article.content || '';
    const { materiality, rationale } = classifyMateriality(article.title, content);
    const relevance = calculateRelevance(article.title, content, sectors, holdingTickers);
    const authority = getSourceCredibility(article.source);
    const pubTime = article.publishedAt ? new Date(article.publishedAt).getTime() : Date.now();

    // Check if matches an existing cluster
    let matchedCluster = null;
    for (const cl of clusters) {
      const sim = calculateSimilarity(tokens, cl.tokens);
      if (sim >= 0.40) {
        matchedCluster = cl;
        break;
      }
    }

    if (matchedCluster) {
      matchedCluster.articles.push(article);
      relevance.matchedSectors.forEach((s) => matchedCluster.sectors.add(s));
      relevance.matchedSymbols.forEach((sym) => matchedCluster.symbols.add(sym));
      matchedCluster.maxAuthority = Math.max(matchedCluster.maxAuthority, authority);
      matchedCluster.newestTimestamp = Math.max(matchedCluster.newestTimestamp, pubTime);
      matchedCluster.relevanceSum += relevance.score;
      if (materiality === 'high') matchedCluster.materiality = 'high';
    } else {
      clusters.push({
        primaryHeadline: article.title,
        summary: content.slice(0, 200) || article.title,
        articles: [article],
        tokens,
        sectors: new Set(relevance.matchedSectors),
        symbols: new Set(relevance.matchedSymbols),
        maxAuthority: authority,
        newestTimestamp: pubTime,
        materiality,
        materialityRationale: rationale,
        relevanceSum: relevance.score,
      });
    }
  }

  // Format into final NewsEventCluster objects
  const finalClusters: NewsEventCluster[] = clusters.map((cl, idx) => {
    const clusterId = `C_NEWS_${String(idx + 1).padStart(2, '0')}`;
    const uniqueSources = Array.from(new Set(cl.articles.map((a) => a.source || 'General Wire')));
    const sourceDiversityScore = Math.min(100, uniqueSources.length * 35);
    const recencyHours = Math.max(0, Math.round((Date.now() - cl.newestTimestamp) / 3_600_000));
    const avgRelevance = Math.round(cl.relevanceSum / cl.articles.length);

    // Source independence & lineage analysis (Critique Point #13)
    let primarySourceType: NewsEventCluster['primarySourceType'] = 'wire_report';
    const sourceLineage = uniqueSources.map((src, i) => {
      const clean = src.toLowerCase();
      const isReg = clean.includes('rbi') || clean.includes('sebi');
      const isInst = clean.includes('reuters') || clean.includes('bloomberg') || clean.includes('financial times');
      const isAgg = clean.includes('google') || clean.includes('tavily');

      if (i === 0) {
        if (isReg) primarySourceType = 'regulatory_primary';
        else if (isInst) primarySourceType = 'institutional_primary';
        else if (isAgg) primarySourceType = 'syndicated_reprint';
        else primarySourceType = 'wire_report';
      }

      const role: 'primary_origin' | 'independent_corroborator' | 'syndicated_copy' =
        i === 0 ? 'primary_origin' : isReg || isInst ? 'independent_corroborator' : 'syndicated_copy';

      return {
        sourceName: src,
        role,
        authority: getSourceCredibility(src),
      };
    });

    const independentSourceCount = sourceLineage.filter((l) => l.role !== 'syndicated_copy').length;
    const syndicatedCopiesCount = sourceLineage.filter((l) => l.role === 'syndicated_copy').length;

    let evidenceId = '';
    if (evidence) {
      const ev = addNewsEvidence(evidence, {
        title: cl.primaryHeadline,
        source: uniqueSources.join(', '),
        relevanceScore: avgRelevance,
        credibilityScore: cl.maxAuthority,
        freshnessScore: Math.max(0, 100 - recencyHours * 2),
        relatedSymbols: Array.from(cl.symbols),
        relatedSectors: Array.from(cl.sectors),
        impact: cl.materiality,
      });
      evidenceId = ev.id;
    }

    // Derived Event Confidence (Prompt #7: authority + independence + freshness + relevance + materiality)
    const authorityPart = (cl.maxAuthority / 100) * 30;
    const independencePart = Math.min(30, independentSourceCount * 12);
    const freshnessPart = (Math.max(0, 100 - recencyHours * 2) / 100) * 20;
    const relevancePart = (avgRelevance / 100) * 10;
    const materialityPart = cl.materiality === 'high' ? 10 : cl.materiality === 'medium' ? 6 : 2;
    const eventConfidence = Math.min(100, Math.round(authorityPart + independencePart + freshnessPart + relevancePart + materialityPart));

    return {
      clusterId,
      primaryHeadline: cl.primaryHeadline,
      summary: cl.summary,
      articleCount: cl.articles.length,
      sources: uniqueSources,
      sourceDiversityScore,
      credibilityScore: cl.maxAuthority,
      recencyHours,
      portfolioRelevanceScore: avgRelevance,
      materiality: cl.materiality,
      materialityRationale: cl.materialityRationale,
      relatedSectors: Array.from(cl.sectors),
      relatedSymbols: Array.from(cl.symbols),
      evidenceId,
      eventConfidence,
      primarySourceType,
      independentSourceCount,
      syndicatedCopiesCount,
      sourceLineage,
    };
  });

  // Sort by materiality (high first) and relevance
  finalClusters.sort((a, b) => {
    const matRank = { high: 3, medium: 2, low: 1 };
    if (matRank[b.materiality] !== matRank[a.materiality]) {
      return matRank[b.materiality] - matRank[a.materiality];
    }
    return b.portfolioRelevanceScore - a.portfolioRelevanceScore;
  });

  const highMatCount = finalClusters.filter((c) => c.materiality === 'high').length;
  const overallQuality: 'high' | 'medium' | 'low' =
    finalClusters.length >= 3 && finalClusters.some((c) => c.credibilityScore >= 80)
      ? 'high'
      : finalClusters.length >= 1
      ? 'medium'
      : 'low';

  const interpretation = `Clustered ${articles.length} raw news articles into ${finalClusters.length} distinct events ` +
    `(${highMatCount} high materiality, ${finalClusters.reduce((sum, c) => sum + (c.articleCount > 1 ? c.articleCount - 1 : 0), 0)} duplicates pruned). ` +
    `Overall news quality: ${overallQuality}.`;

  return {
    clusters: finalClusters,
    totalRawArticles: articles.length,
    uniqueEventsCount: finalClusters.length,
    highMaterialityCount: highMatCount,
    overallNewsQuality: overallQuality,
    interpretation,
  };
}
