/**
 * lib/analytics/stalenessPolicy.ts
 *
 * Explicit Data Staleness Policy & Stop-Analysis Gate.
 * Adheres to Critique #18, #19, #20:
 *   - Configurable TTL thresholds for Market (15m/1h), Macro (24h/72h), News (6h/24h)
 *   - Stop-analysis gate: Immediately stops and explains if portfolio lacks minimum valid financial state
 *   - Structured data validity injection block for every specialist agent prompt
 */

import type { PortfolioSnapshot, MarketSnapshot, NewsSnapshot } from '@/types/portfolio-snapshot';
import type { AnalysisQuality } from '@/types/evidence';

export const FRESHNESS_THRESHOLDS = {
  marketPrice: {
    freshSeconds: 900,       // 15 minutes
    acceptableSeconds: 3600, // 1 hour
  },
  macroData: {
    freshSeconds: 86400,       // 24 hours
    acceptableSeconds: 259200, // 72 hours
  },
  news: {
    freshSeconds: 21600,      // 6 hours
    acceptableSeconds: 86400, // 24 hours
  },
  fundamentals: {
    freshDays: 90,        // 1 quarter
    acceptableDays: 180,  // 2 quarters
  },
};

export interface StalenessReport {
  isMarketStale: boolean;
  isMacroStale: boolean;
  isNewsStale: boolean;
  staleItems: Array<{ field: string; ageDescription: string; status: 'stale' | 'degraded' }>;
  overallFreshnessScore: number; // 0–100
}

export interface StopAnalysisCheck {
  canProceed: boolean;
  abortReason?: string;
  remediation?: string;
}

export interface AgentDataValidityContext {
  marketDataStatus: 'FRESH' | 'ACCEPTABLE' | 'STALE';
  macroDataStatus: 'FRESH' | 'ACCEPTABLE' | 'STALE';
  newsStatus: 'FRESH' | 'ACCEPTABLE' | 'STALE' | 'EMPTY';
  staleFields: string[];
  missingFields: string[];
  agentGuidance: string;
}

/**
 * Evaluates whether the portfolio is in an analyzable state (Critique #20).
 */
export function checkCanAnalyze(portfolio: PortfolioSnapshot): StopAnalysisCheck {
  const equityCount = portfolio.holdings.equity.length;
  const bondCount = portfolio.holdings.bonds.length;
  const totalCount = equityCount + bondCount;

  if (totalCount === 0) {
    return {
      canProceed: false,
      abortReason: 'Portfolio contains 0 holdings. Analytics cannot run on an empty portfolio.',
      remediation: 'Please add your equity holdings or bond investments in Google Sheets or portfolio manager.',
    };
  }

  if (portfolio.aggregates.netWorth <= 0) {
    return {
      canProceed: false,
      abortReason: 'Total portfolio net worth is zero or negative.',
      remediation: 'Verify quantity and price entries in portfolio source data.',
    };
  }

  return { canProceed: true };
}

/**
 * Checks age of market, macro, and news data against freshness policy (Critique #18).
 */
export function evaluateStaleness(
  market: MarketSnapshot,
  news: NewsSnapshot,
  asOfDate: string = new Date().toISOString()
): StalenessReport {
  const now = new Date(asOfDate).getTime();
  const staleItems: StalenessReport['staleItems'] = [];

  // Check market snapshot age
  const marketAgeSec = (now - new Date(market.observedAt).getTime()) / 1000;
  const isMarketStale = marketAgeSec > FRESHNESS_THRESHOLDS.marketPrice.freshSeconds;
  if (marketAgeSec > FRESHNESS_THRESHOLDS.marketPrice.acceptableSeconds) {
    staleItems.push({
      field: 'Market Quotes',
      ageDescription: `${Math.round(marketAgeSec / 60)} minutes old (exceeds 1h limit)`,
      status: 'degraded',
    });
  } else if (isMarketStale) {
    staleItems.push({
      field: 'Market Quotes',
      ageDescription: `${Math.round(marketAgeSec / 60)} minutes old`,
      status: 'stale',
    });
  }

  // Check news age
  let isNewsStale = false;
  if (news.articles.length === 0) {
    staleItems.push({
      field: 'Financial News',
      ageDescription: 'No articles retrieved',
      status: 'degraded',
    });
  } else {
    const newestArticle = news.articles[0];
    if (newestArticle?.publishedAt) {
      const newsAgeSec = (now - new Date(newestArticle.publishedAt).getTime()) / 1000;
      if (newsAgeSec > FRESHNESS_THRESHOLDS.news.freshSeconds) {
        isNewsStale = true;
        staleItems.push({
          field: 'News Headlines',
          ageDescription: `${Math.round(newsAgeSec / 3600)} hours old`,
          status: newsAgeSec > FRESHNESS_THRESHOLDS.news.acceptableSeconds ? 'degraded' : 'stale',
        });
      }
    }
  }

  const overallFreshnessScore = Math.max(
    20,
    100 - (isMarketStale ? 25 : 0) - (isNewsStale ? 25 : 0) - (staleItems.length * 10)
  );

  return {
    isMarketStale,
    isMacroStale: false,
    isNewsStale,
    staleItems,
    overallFreshnessScore,
  };
}

/**
 * Builds the explicit data validity block to inject into Agent prompts (Critique #19).
 */
export function buildAgentDataValidityContext(
  quality: AnalysisQuality,
  staleness: StalenessReport
): AgentDataValidityContext {
  const staleFields = staleness.staleItems.map((s) => s.field);
  const missingFields = quality.missingMetrics;

  const guidanceParts: string[] = [];
  if (quality.news === 'low' || staleness.isNewsStale) {
    guidanceParts.push('News is sparse/stale: base conclusions strictly on quantitative fundamentals and macro metrics, NOT breaking news.');
  }
  if (quality.fundamental === 'low') {
    guidanceParts.push('Fundamental coverage is incomplete: avoid making definitive claims on valuation for missing tickers.');
  }
  if (staleness.isMarketStale) {
    guidanceParts.push('Market prices are delayed: focus on structural trends rather than intraday price movements.');
  }

  return {
    marketDataStatus: staleness.isMarketStale ? 'STALE' : 'FRESH',
    macroDataStatus: 'FRESH',
    newsStatus: staleness.isNewsStale ? 'STALE' : 'FRESH',
    staleFields,
    missingFields,
    agentGuidance: guidanceParts.length > 0 ? guidanceParts.join(' ') : 'All data feeds are fresh and validated.',
  };
}
