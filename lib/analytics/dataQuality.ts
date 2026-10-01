/**
 * lib/analytics/dataQuality.ts
 *
 * Enhanced data quality gate — evaluates completeness and freshness
 * of the AnalysisContext before engines run.
 */

import type { AnalysisQuality } from '@/types/evidence';
import type { PortfolioSnapshot, MarketSnapshot, NewsSnapshot } from '@/types/portfolio-snapshot';

function qualityFromPct(pct: number): 'high' | 'medium' | 'low' {
  if (pct >= 0.75) return 'high';
  if (pct >= 0.40) return 'medium';
  return 'low';
}

function freshnessMinutes(isoDate: string): number {
  return (Date.now() - new Date(isoDate).getTime()) / 60000;
}

/**
 * Evaluate the data quality of all snapshot domains.
 */
export function evaluateDataQuality(
  portfolio: PortfolioSnapshot,
  market: MarketSnapshot,
  news: NewsSnapshot
): AnalysisQuality {
  const missing: string[] = [];
  const stale: string[] = [];
  const unreliable: string[] = [];

  // ─── Portfolio quality ──────────────────────────────────────────────────────
  const portfolioQ: 'high' | 'medium' | 'low' = (() => {
    if (portfolio.holdings.equity.length === 0 && portfolio.holdings.bonds.length === 0) {
      missing.push('No holdings data');
      return 'low';
    }
    if (portfolio.aggregates.netWorth <= 0) {
      unreliable.push('Net worth is zero or negative');
      return 'low';
    }
    return 'high';
  })();

  // ─── Fundamental quality ────────────────────────────────────────────────────
  const holdingsWithPE = market.holdingData.filter((h) => h.trailingPE !== undefined).length;
  const totalHoldings = market.holdingData.length;
  const pePct = totalHoldings > 0 ? holdingsWithPE / totalHoldings : 0;

  if (pePct < 0.5) missing.push(`P/E ratios available for only ${holdingsWithPE}/${totalHoldings} holdings`);
  const fundamentalQ = qualityFromPct(pePct);

  // ─── Technical quality ──────────────────────────────────────────────────────
  const holdingsWith200DMA = market.holdingData.filter((h) => h.pctVs200DMA !== undefined).length;
  const dmaPct = totalHoldings > 0 ? holdingsWith200DMA / totalHoldings : 0;

  if (dmaPct < 0.5) missing.push(`200DMA data available for only ${holdingsWith200DMA}/${totalHoldings} holdings`);
  const technicalQ = qualityFromPct(dmaPct);

  // ─── Macro quality ──────────────────────────────────────────────────────────
  const macroDataPoints = [market.nifty, market.sensex, market.usdInr, market.brentCrude, market.gold, market.us10y];
  const macroAvailable = macroDataPoints.filter(Boolean).length;
  const macroPct = macroAvailable / macroDataPoints.length;

  if (!market.nifty) missing.push('Nifty 50 quote unavailable');
  if (!market.usdInr) missing.push('USD/INR rate unavailable');
  if (!market.brentCrude) missing.push('Brent crude quote unavailable');

  const macroFreshnessMin = freshnessMinutes(market.observedAt);
  if (macroFreshnessMin > 120) stale.push(`Market data is ${Math.round(macroFreshnessMin)} minutes old`);
  const macroQ = qualityFromPct(macroPct);

  // ─── News quality ──────────────────────────────────────────────────────────
  const newsCount = news.articles.length;
  const newsQ: 'high' | 'medium' | 'low' = newsCount >= 6 ? 'high' : newsCount >= 2 ? 'medium' : 'low';
  if (newsCount === 0) missing.push('No news articles available');

  const newsFreshnessMin = freshnessMinutes(news.observedAt);
  if (newsFreshnessMin > 240) stale.push(`News data is ${Math.round(newsFreshnessMin)} minutes old`);

  // ─── Overall ────────────────────────────────────────────────────────────────
  const qualities = [portfolioQ, fundamentalQ, technicalQ, macroQ, newsQ];
  const scores = qualities.map((q) => (q === 'high' ? 3 : q === 'medium' ? 2 : 1));
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const overall: 'high' | 'medium' | 'low' = avgScore >= 2.5 ? 'high' : avgScore >= 1.5 ? 'medium' : 'low';

  return {
    overall,
    fundamental: fundamentalQ,
    technical: technicalQ,
    macro: macroQ,
    news: newsQ,
    portfolio: portfolioQ,
    missingMetrics: missing,
    staleMetrics: stale,
    unreliableMetrics: unreliable,
  };
}
