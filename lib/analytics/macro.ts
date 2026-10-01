/**
 * lib/analytics/macro.ts
 *
 * Macro analytics engine — separated from macro DATA COLLECTION.
 * This module analyzes a MarketSnapshot to produce portfolio-specific
 * macro exposure mapping and regime classification.
 * NO network calls — pure analytics on already-fetched data.
 */

import type { MarketSnapshot, PortfolioSnapshot, MarketRegime } from '@/types/portfolio-snapshot';
import type { EvidenceCollection } from '@/types/evidence';
import { addMetricEvidence } from '@/types/evidence';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface MacroExposureMapping {
  variable: string;
  currentValue: string;
  trend: string;
  sensitivity: string;
  direction: 'tailwind' | 'headwind' | 'neutral';
  affectedSectors: string[];
  affectedHoldings: string[];
  magnitude: number; // 0–1
}

export interface MacroAnalysis {
  regime: MarketRegime;
  regimeConfidence: number;
  regimeRationale: string;

  exposures: MacroExposureMapping[];

  /** Summary of indices */
  niftyStatus: string;
  sensexStatus: string;
  currencyStatus: string;
  commodityStatus: string;
  yieldStatus: string;

  interpretation: string;

  whatWouldChangeRegime: string;
}

// ─── Sector Sensitivity Maps ────────────────────────────────────────────────────

/** How each sector responds to macro variables (direction: +1 = benefits, -1 = hurt) */
const CRUDE_SENSITIVITY: Record<string, number> = {
  'automobile': -0.7,
  'auto': -0.7,
  'fmcg': -0.4,
  'consumer staples': -0.4,
  'consumer': -0.3,
  'paints': -0.6,
  'chemicals': -0.5,
  'airlines': -0.9,
  'oil & gas': 0.5,
  'energy': 0.4,
  'power': -0.2,
  'information technology': 0.0,
  'it': 0.0,
  'banking': -0.2,
  'financial services': -0.2,
};

const INR_DEPRECIATION_SENSITIVITY: Record<string, number> = {
  'information technology': 0.8,
  'it': 0.8,
  'pharmaceuticals': 0.6,
  'pharma': 0.6,
  'healthcare': 0.5,
  'auto components': 0.3,
  'fmcg': -0.3,
  'oil & gas': -0.6,
  'energy': -0.4,
};

const RATE_SENSITIVITY: Record<string, number> = {
  'banking': 0.5,
  'banks': 0.5,
  'financial services': 0.3,
  'nbfc': -0.4,
  'real estate': -0.7,
  'realty': -0.7,
  'infrastructure': -0.5,
  'capital goods': -0.3,
  'automobile': -0.4,
};

function getSectorSensitivity(sector: string, map: Record<string, number>): number {
  const key = sector.toLowerCase().trim();
  return map[key] ?? 0;
}

// ─── Regime Detection ───────────────────────────────────────────────────────────

function detectRegime(market: MarketSnapshot): {
  regime: MarketRegime;
  confidence: number;
  rationale: string;
  whatWouldChange: string;
} {
  const signals: string[] = [];
  let riskOnSignals = 0;
  let riskOffSignals = 0;
  let totalSignals = 0;

  // Nifty momentum
  if (market.nifty) {
    totalSignals++;
    if (market.nifty.changePct > 1) { riskOnSignals++; signals.push('Nifty rising'); }
    else if (market.nifty.changePct < -1) { riskOffSignals++; signals.push('Nifty falling'); }
  }

  // Crude oil — elevated = inflationary pressure
  if (market.brentCrude) {
    totalSignals++;
    if (market.brentCrude.price > 85) { riskOffSignals += 0.5; signals.push(`Crude elevated at $${market.brentCrude.price}`); }
    else if (market.brentCrude.price < 65) { riskOnSignals += 0.5; signals.push(`Crude supportive at $${market.brentCrude.price}`); }
  }

  // US 10Y yield — rising = tightening
  if (market.us10y) {
    totalSignals++;
    if (market.us10y.price > 4.5) { riskOffSignals++; signals.push(`US10Y elevated at ${market.us10y.price}%`); }
    else if (market.us10y.price < 3.8) { riskOnSignals++; signals.push(`US10Y supportive at ${market.us10y.price}%`); }
  }

  // USD/INR — depreciating rupee = FII pressure
  if (market.usdInr) {
    totalSignals++;
    if (market.usdInr.changePct > 0.3) { riskOffSignals += 0.5; signals.push('INR weakening'); }
    else if (market.usdInr.changePct < -0.3) { riskOnSignals += 0.5; signals.push('INR strengthening'); }
  }

  // Gold — safe haven proxy
  if (market.gold) {
    totalSignals++;
    if (market.gold.changePct > 1) { riskOffSignals += 0.3; signals.push('Gold rally (safe haven demand)'); }
  }

  // Classify
  let regime: MarketRegime;
  let rationale: string;
  let whatWouldChange: string;

  if (riskOnSignals >= 2.5 && riskOffSignals < 1) {
    regime = 'risk_on';
    rationale = `Risk-on conditions: ${signals.join(', ')}`;
    whatWouldChange = 'Sharp crude spike, US yield surge, or FII outflow reversal';
  } else if (riskOffSignals >= 2.5 && riskOnSignals < 1) {
    regime = 'risk_off';
    rationale = `Risk-off conditions: ${signals.join(', ')}`;
    whatWouldChange = 'Crude stabilization, rate cut signals, or FII buying resumption';
  } else if (market.brentCrude && market.brentCrude.price > 90) {
    regime = 'inflationary';
    rationale = `Inflationary pressure from crude at $${market.brentCrude.price}/bbl`;
    whatWouldChange = 'Crude falling below $80/bbl or central bank intervention';
  } else if (market.us10y && market.us10y.price > 4.8) {
    regime = 'monetary_tightening';
    rationale = `Monetary tightening with US 10Y at ${market.us10y.price}%`;
    whatWouldChange = 'Fed pivot signals or inflation cooling below 3%';
  } else if (riskOnSignals > riskOffSignals) {
    regime = 'recovery';
    rationale = `Recovery conditions with mixed signals: ${signals.join(', ')}`;
    whatWouldChange = 'Earnings disappointment or macro deterioration';
  } else {
    regime = 'mixed_uncertain';
    rationale = `Mixed/uncertain regime: ${signals.join(', ')}`;
    whatWouldChange = 'Clear directional breakout in indices, rates, or commodity prices';
  }

  const confidence = totalSignals > 0
    ? Math.round(Math.abs(riskOnSignals - riskOffSignals) / totalSignals * 100)
    : 30;

  return { regime, confidence: Math.min(confidence, 90), rationale, whatWouldChange };
}

// ─── Main Engine ────────────────────────────────────────────────────────────────

export function runMacroAnalysis(
  portfolio: PortfolioSnapshot,
  market: MarketSnapshot,
  evidence: EvidenceCollection
): MacroAnalysis {
  const { regime, confidence, rationale, whatWouldChange } = detectRegime(market);

  // Map portfolio sectors to macro exposures
  const portfolioSectors = portfolio.allocation.sectorAllocation;

  const exposures: MacroExposureMapping[] = [];

  // Crude oil exposure
  if (market.brentCrude) {
    const crudePrice = market.brentCrude.price;
    const affected = portfolioSectors.filter(
      (s) => Math.abs(getSectorSensitivity(s.sector, CRUDE_SENSITIVITY)) > 0.2
    );

    if (affected.length > 0) {
      const avgSensitivity = affected.reduce(
        (sum, s) => sum + getSectorSensitivity(s.sector, CRUDE_SENSITIVITY) * s.percent,
        0
      );

      exposures.push({
        variable: 'Brent Crude Oil',
        currentValue: `$${crudePrice.toFixed(1)}/bbl`,
        trend: market.brentCrude.changePct > 0 ? 'Rising' : market.brentCrude.changePct < 0 ? 'Falling' : 'Stable',
        sensitivity: `Portfolio weighted crude sensitivity: ${(avgSensitivity * 100).toFixed(0)}%`,
        direction: avgSensitivity > 0.1 ? 'tailwind' : avgSensitivity < -0.1 ? 'headwind' : 'neutral',
        affectedSectors: affected.map((s) => s.sector),
        affectedHoldings: portfolio.holdings.equity
          .filter((e) => affected.some((a) => a.sector.toLowerCase() === e.sector.toLowerCase()))
          .map((e) => e.ticker),
        magnitude: Math.abs(avgSensitivity),
      });

      addMetricEvidence(evidence, {
        source: 'Yahoo Finance',
        metric: 'Brent Crude Oil Price',
        value: crudePrice,
        observedAt: market.observedAt,
        confidence: 'high',
      });
    }
  }

  // Currency exposure
  if (market.usdInr) {
    const inrRate = market.usdInr.price;
    const affected = portfolioSectors.filter(
      (s) => Math.abs(getSectorSensitivity(s.sector, INR_DEPRECIATION_SENSITIVITY)) > 0.2
    );

    if (affected.length > 0) {
      const avgSensitivity = affected.reduce(
        (sum, s) => sum + getSectorSensitivity(s.sector, INR_DEPRECIATION_SENSITIVITY) * s.percent,
        0
      );

      const isDepreciating = market.usdInr.changePct > 0;
      exposures.push({
        variable: 'USD/INR Exchange Rate',
        currentValue: `₹${inrRate.toFixed(2)}`,
        trend: isDepreciating ? 'Depreciating' : 'Appreciating',
        sensitivity: `Portfolio weighted FX sensitivity: ${(avgSensitivity * 100).toFixed(0)}%`,
        direction: (isDepreciating && avgSensitivity > 0) || (!isDepreciating && avgSensitivity < 0) ? 'tailwind' : 'headwind',
        affectedSectors: affected.map((s) => s.sector),
        affectedHoldings: portfolio.holdings.equity
          .filter((e) => affected.some((a) => a.sector.toLowerCase() === e.sector.toLowerCase()))
          .map((e) => e.ticker),
        magnitude: Math.abs(avgSensitivity),
      });

      addMetricEvidence(evidence, {
        source: 'Yahoo Finance',
        metric: 'USD/INR Exchange Rate',
        value: inrRate,
        observedAt: market.observedAt,
        confidence: 'high',
      });
    }
  }

  // Interest rate exposure
  if (market.us10y) {
    const yieldVal = market.us10y.price;
    const affected = portfolioSectors.filter(
      (s) => Math.abs(getSectorSensitivity(s.sector, RATE_SENSITIVITY)) > 0.2
    );

    if (affected.length > 0) {
      const avgSensitivity = affected.reduce(
        (sum, s) => sum + getSectorSensitivity(s.sector, RATE_SENSITIVITY) * s.percent,
        0
      );

      exposures.push({
        variable: 'Interest Rates (US 10Y Proxy)',
        currentValue: `${yieldVal.toFixed(2)}%`,
        trend: market.us10y.changePct > 0 ? 'Rising' : 'Falling',
        sensitivity: `Portfolio weighted rate sensitivity: ${(avgSensitivity * 100).toFixed(0)}%`,
        direction: avgSensitivity > 0.1 ? 'tailwind' : avgSensitivity < -0.1 ? 'headwind' : 'neutral',
        affectedSectors: affected.map((s) => s.sector),
        affectedHoldings: portfolio.holdings.equity
          .filter((e) => affected.some((a) => a.sector.toLowerCase() === e.sector.toLowerCase()))
          .map((e) => e.ticker),
        magnitude: Math.abs(avgSensitivity),
      });

      addMetricEvidence(evidence, {
        source: 'Yahoo Finance',
        metric: 'US 10Y Treasury Yield',
        value: yieldVal,
        observedAt: market.observedAt,
        confidence: 'high',
      });
    }
  }

  // Index status strings
  const niftyStatus = market.nifty
    ? `${market.nifty.price.toLocaleString()} (${market.nifty.changePct >= 0 ? '+' : ''}${market.nifty.changePct.toFixed(2)}%)`
    : 'Unavailable';
  const sensexStatus = market.sensex
    ? `${market.sensex.price.toLocaleString()} (${market.sensex.changePct >= 0 ? '+' : ''}${market.sensex.changePct.toFixed(2)}%)`
    : 'Unavailable';
  const currencyStatus = market.usdInr ? `₹${market.usdInr.price.toFixed(2)}` : 'Unavailable';
  const commodityStatus = market.brentCrude ? `$${market.brentCrude.price.toFixed(1)}/bbl` : 'Unavailable';
  const yieldStatus = market.us10y ? `${market.us10y.price.toFixed(2)}%` : 'Unavailable';

  const interpretation = `Market regime: ${regime.replace(/_/g, ' ')} (confidence: ${confidence}%). ${rationale}. ` +
    `Nifty: ${niftyStatus}, USD/INR: ${currencyStatus}, Brent: ${commodityStatus}, US10Y: ${yieldStatus}. ` +
    `${exposures.length} portfolio-specific macro exposures identified.`;

  return {
    regime,
    regimeConfidence: confidence,
    regimeRationale: rationale,
    exposures,
    niftyStatus,
    sensexStatus,
    currencyStatus,
    commodityStatus,
    yieldStatus,
    interpretation,
    whatWouldChangeRegime: whatWouldChange,
  };
}
