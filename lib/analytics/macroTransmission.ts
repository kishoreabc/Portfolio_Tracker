/**
 * lib/analytics/macroTransmission.ts
 *
 * Formal Macro Transmission Model.
 *
 * Models the full causal chain:
 *   Macro Variable → Input Costs / Revenue → Margins → Sector Earnings → Portfolio Impact
 *
 * This replaces simple "sensitivity coefficient" with an explicit transmission graph.
 */

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface TransmissionStep {
  from: string;
  to: string;
  mechanism: string;
  direction: 'positive' | 'negative' | 'neutral';
  magnitude: number; // 0–1
  stepConfidence: number; // 0–1 link confidence (Prompt #10)
}

export interface MacroWhyNow {
  what: string;
  whyNow: string;
  whyPortfolio: string;
  whatChangesView: string;
}

export interface TransmissionChain {
  macroVariable: string;
  currentValue: string;
  trend: string;

  /** The full causal chain */
  steps: TransmissionStep[];

  /** Joint chain confidence calculated across links (Prompt #10) */
  chainConfidence: number;

  /** Formal 7-stage transmission pipeline (Prompt #8) */
  transmissionStages: {
    macro: string;
    channel: string;
    sector: string;
    portfolioExposure: string;
    fundamentalImpact: string;
    technicalConfirmation: string;
    portfolioImplication: string;
  };

  /** "Why Now?" contextual quadrant (Prompt #9) */
  whyNow: MacroWhyNow;

  /** Affected portfolio sectors with exposure */
  sectorImpacts: {
    sector: string;
    portfolioWeight: number;
    channel: string;
    direction: 'tailwind' | 'headwind' | 'neutral';
    estimatedImpactPct: number;
  }[];

  /** Net portfolio effect */
  netPortfolioImpactPct: number;
  confidence: number;

  /** Evidence classification and derivation methodology (Critique Point #6) */
  evidenceClassification: 'rule_based' | 'model_estimate' | 'empirical_estimate';
  methodology: string;
  offsettingForces?: string;

  /** Plain-language summary */
  narrative: string;
}

export interface MacroTransmissionMap {
  chains: TransmissionChain[];
  netMacroEffect: number;
  dominantForce: string;
  interpretation: string;
}

// ─── Transmission Definitions ───────────────────────────────────────────────────

interface SectorProfile {
  sector: string;
  /** Sensitivity to each macro variable (-1 to +1) */
  crudeSensitivity: number;
  crudeChannel: string;
  fxSensitivity: number;
  fxChannel: string;
  rateSensitivity: number;
  rateChannel: string;
}

const SECTOR_PROFILES: SectorProfile[] = [
  {
    sector: 'information technology',
    crudeSensitivity: 0.0,
    crudeChannel: 'Minimal direct exposure',
    fxSensitivity: 0.8,
    fxChannel: 'USD revenue → INR reporting → revenue uplift',
    rateSensitivity: -0.3,
    rateChannel: 'Higher rates → lower US tech spending → demand pressure',
  },
  {
    sector: 'banking',
    crudeSensitivity: -0.2,
    crudeChannel: 'Higher crude → inflation → NPA risk in SME lending',
    fxSensitivity: -0.1,
    fxChannel: 'Minimal direct FX exposure for domestic banks',
    rateSensitivity: 0.5,
    rateChannel: 'Higher rates → wider NIM → improved profitability',
  },
  {
    sector: 'automobile',
    crudeSensitivity: -0.7,
    crudeChannel: 'Higher crude → higher fuel costs → demand destruction',
    fxSensitivity: -0.3,
    fxChannel: 'INR depreciation → imported component costs increase',
    rateSensitivity: -0.4,
    rateChannel: 'Higher rates → higher EMI → vehicle demand suppression',
  },
  {
    sector: 'fmcg',
    crudeSensitivity: -0.4,
    crudeChannel: 'Higher crude → packaging/transport costs → margin compression',
    fxSensitivity: -0.3,
    fxChannel: 'INR depreciation → imported raw material costs',
    rateSensitivity: -0.1,
    rateChannel: 'Minimal rate sensitivity for staples demand',
  },
  {
    sector: 'pharmaceuticals',
    crudeSensitivity: -0.2,
    crudeChannel: 'Higher crude → API transport costs',
    fxSensitivity: 0.6,
    fxChannel: 'USD export revenue → INR conversion → margin expansion',
    rateSensitivity: -0.1,
    rateChannel: 'Low rate sensitivity for essential healthcare demand',
  },
  {
    sector: 'energy',
    crudeSensitivity: 0.5,
    crudeChannel: 'Higher crude → higher realization for upstream producers',
    fxSensitivity: -0.4,
    fxChannel: 'INR depreciation → higher import bill for crude buyers',
    rateSensitivity: -0.2,
    rateChannel: 'Higher rates → higher capex financing costs',
  },
  {
    sector: 'real estate',
    crudeSensitivity: -0.3,
    crudeChannel: 'Higher crude → construction material cost escalation',
    fxSensitivity: -0.1,
    fxChannel: 'Minimal direct FX exposure',
    rateSensitivity: -0.7,
    rateChannel: 'Higher rates → higher mortgage costs → demand destruction',
  },
  {
    sector: 'metals',
    crudeSensitivity: 0.2,
    crudeChannel: 'Higher crude → energy costs but also commodity demand correlation',
    fxSensitivity: 0.3,
    fxChannel: 'USD-denominated metal prices → INR revenue uplift',
    rateSensitivity: -0.3,
    rateChannel: 'Higher rates → construction slowdown → demand pressure',
  },
  {
    sector: 'capital goods',
    crudeSensitivity: -0.2,
    crudeChannel: 'Higher crude → input cost escalation',
    fxSensitivity: -0.2,
    fxChannel: 'Imported machinery component costs',
    rateSensitivity: -0.3,
    rateChannel: 'Higher rates → infrastructure capex slowdown',
  },
  {
    sector: 'consumer discretionary',
    crudeSensitivity: -0.3,
    crudeChannel: 'Higher crude → inflation → discretionary spending compression',
    fxSensitivity: -0.2,
    fxChannel: 'Imported product costs increase',
    rateSensitivity: -0.4,
    rateChannel: 'Higher rates → EMI burden → spending reduction',
  },
];

function findSectorProfile(sector: string): SectorProfile | undefined {
  const key = sector.toLowerCase().trim();
  return SECTOR_PROFILES.find((p) =>
    key.includes(p.sector) || p.sector.includes(key) ||
    // Aliases
    (key.includes('it') && p.sector === 'information technology') ||
    (key.includes('tech') && p.sector === 'information technology') ||
    (key.includes('bank') && p.sector === 'banking') ||
    (key.includes('auto') && p.sector === 'automobile') ||
    (key.includes('pharma') && p.sector === 'pharmaceuticals') ||
    (key.includes('oil') && p.sector === 'energy') ||
    (key.includes('realty') && p.sector === 'real estate') ||
    (key.includes('metal') && p.sector === 'metals') ||
    (key.includes('consumer') && p.sector === 'consumer discretionary')
  );
}

// ─── Chain Builder ──────────────────────────────────────────────────────────────

function buildCrudeChain(
  price: number,
  changePct: number,
  sectorAlloc: { sector: string; percent: number }[]
): TransmissionChain {
  const isRising = changePct > 0;

  const sectorImpacts = sectorAlloc
    .map((s) => {
      const profile = findSectorProfile(s.sector);
      if (!profile || Math.abs(profile.crudeSensitivity) < 0.1) return null;

      const estimatedImpact = profile.crudeSensitivity * (changePct / 100) * s.percent * 100;

      return {
        sector: s.sector,
        portfolioWeight: Math.round(s.percent * 1000) / 10,
        channel: profile.crudeChannel,
        direction: (estimatedImpact > 0 ? 'tailwind' : estimatedImpact < 0 ? 'headwind' : 'neutral') as 'tailwind' | 'headwind' | 'neutral',
        estimatedImpactPct: Math.round(estimatedImpact * 100) / 100,
      };
    })
    .filter(Boolean) as TransmissionChain['sectorImpacts'];

  const netImpact = sectorImpacts.reduce((sum, s) => sum + s.estimatedImpactPct, 0);

  const steps: TransmissionStep[] = [
    { from: 'Brent Crude', to: 'Input Costs', mechanism: 'Transport, packaging, raw material costs', direction: isRising ? 'negative' : 'positive', magnitude: 0.6, stepConfidence: 0.85 },
    { from: 'Input Costs', to: 'Operating Margins', mechanism: 'Cost absorption vs pass-through', direction: isRising ? 'negative' : 'positive', magnitude: 0.4, stepConfidence: 0.75 },
    { from: 'Operating Margins', to: 'Sector Earnings', mechanism: 'Margin compression/expansion', direction: isRising ? 'negative' : 'positive', magnitude: 0.5, stepConfidence: 0.70 },
    { from: 'Crude Price', to: 'Inflation Expectations', mechanism: 'CPI input, RBI policy signal', direction: isRising ? 'negative' : 'positive', magnitude: 0.3, stepConfidence: 0.80 },
  ];

  const chainConfidence = Math.round(steps.reduce((acc, s) => acc * s.stepConfidence, 1) * 100) / 100;
  const topAffected = sectorImpacts[0];

  return {
    macroVariable: 'Brent Crude Oil',
    currentValue: `$${price.toFixed(1)}/bbl`,
    trend: isRising ? 'Rising' : 'Falling',
    steps,
    chainConfidence,
    transmissionStages: {
      macro: `Brent Crude at $${price.toFixed(1)}/bbl (${isRising ? '+' : ''}${changePct.toFixed(1)}%)`,
      channel: isRising ? 'Input cost escalation across fuel, packaging, petrochemical feedstock' : 'Input cost relief across transport and manufacturing',
      sector: topAffected ? `${topAffected.sector} (${topAffected.portfolioWeight}% weight)` : 'Energy, Auto & Paints',
      portfolioExposure: `${sectorImpacts.reduce((s, x) => s + x.portfolioWeight, 0).toFixed(1)}% total portfolio weight exposed to crude movements`,
      fundamentalImpact: `${netImpact > 0 ? '+' : ''}${netImpact.toFixed(2)}% estimated net corporate earnings effect`,
      technicalConfirmation: isRising ? 'Commodity and cyclical indices reflect cost margin pressure' : 'Defensive breadth intact',
      portfolioImplication: netImpact < -1.0 ? 'Material cost headwind requires monitoring operating margins' : 'Contained crude exposure preserves baseline return assumptions',
    },
    whyNow: {
      what: `Brent crude ${isRising ? 'surged' : 'softened'} to $${price.toFixed(1)}/bbl (${Math.abs(changePct).toFixed(1)}% move).`,
      whyNow: `Recent crude price volatility directly shifts industrial input price assumptions over the coming quarter.`,
      whyPortfolio: `${sectorImpacts.reduce((s, x) => s + x.portfolioWeight, 0).toFixed(1)}% of your portfolio is in sectors with direct commodity and transport cost sensitivity.`,
      whatChangesView: `Crude stabilizing back towards $75/bbl baseline or sector firms demonstrating pricing power to pass on input costs.`,
    },
    sectorImpacts,
    netPortfolioImpactPct: Math.round(netImpact * 100) / 100,
    confidence: sectorImpacts.length > 2 ? 0.65 : 0.45,
    evidenceClassification: 'rule_based',
    methodology: 'Sector input-cost elasticity matrix: sector crude sensitivity coefficient x crude % change x sector portfolio weight.',
    offsettingForces: 'Refining margins or domestic pricing power can partially offset input cost spikes for diversified conglomerates.',
    narrative: `Brent crude at $${price.toFixed(0)}/bbl (${isRising ? 'rising' : 'falling'} ${Math.abs(changePct).toFixed(1)}%). ` +
      `Transmission: crude → input costs → margins → sector earnings. ` +
      `Net portfolio effect: ${netImpact > 0 ? '+' : ''}${netImpact.toFixed(2)}% across ${sectorImpacts.length} affected sectors.`,
  };
}

function buildFXChain(
  rate: number,
  changePct: number,
  sectorAlloc: { sector: string; percent: number }[]
): TransmissionChain {
  const isDepreciating = changePct > 0; // higher USD/INR = weaker INR

  const sectorImpacts = sectorAlloc
    .map((s) => {
      const profile = findSectorProfile(s.sector);
      if (!profile || Math.abs(profile.fxSensitivity) < 0.1) return null;

      // If INR depreciating and positive FX sensitivity (exporters), it's a tailwind
      const direction = isDepreciating ? profile.fxSensitivity : -profile.fxSensitivity;
      const estimatedImpact = direction * Math.abs(changePct / 100) * s.percent * 100;

      return {
        sector: s.sector,
        portfolioWeight: Math.round(s.percent * 1000) / 10,
        channel: profile.fxChannel,
        direction: (estimatedImpact > 0 ? 'tailwind' : estimatedImpact < 0 ? 'headwind' : 'neutral') as 'tailwind' | 'headwind' | 'neutral',
        estimatedImpactPct: Math.round(estimatedImpact * 100) / 100,
      };
    })
    .filter(Boolean) as TransmissionChain['sectorImpacts'];

  const netImpact = sectorImpacts.reduce((sum, s) => sum + s.estimatedImpactPct, 0);

  const steps: TransmissionStep[] = [
    { from: 'USD/INR', to: 'Export Revenue', mechanism: 'USD-denominated revenue conversion', direction: isDepreciating ? 'positive' : 'negative', magnitude: 0.7, stepConfidence: 0.90 },
    { from: 'USD/INR', to: 'Import Costs', mechanism: 'Imported raw materials/components', direction: isDepreciating ? 'negative' : 'positive', magnitude: 0.5, stepConfidence: 0.80 },
    { from: 'USD/INR', to: 'FII Flows', mechanism: 'INR depreciation reduces $ returns for FIIs', direction: isDepreciating ? 'negative' : 'positive', magnitude: 0.4, stepConfidence: 0.70 },
    { from: 'Net FX Effect', to: 'Sector Earnings', mechanism: 'Export-import balance determines net effect', direction: 'neutral', magnitude: 0.5, stepConfidence: 0.75 },
  ];

  const chainConfidence = Math.round(steps.reduce((acc, s) => acc * s.stepConfidence, 1) * 100) / 100;
  const topAffected = sectorImpacts[0];

  return {
    macroVariable: 'USD/INR Exchange Rate',
    currentValue: `₹${rate.toFixed(2)}`,
    trend: isDepreciating ? 'Depreciating' : 'Appreciating',
    steps,
    chainConfidence,
    transmissionStages: {
      macro: `USD/INR at ₹${rate.toFixed(2)} (${isDepreciating ? 'INR depreciation' : 'INR appreciation'} of ${Math.abs(changePct).toFixed(1)}%)`,
      channel: isDepreciating ? 'Currency translation gains for USD earners vs higher landed costs for importers' : 'Translation compression on overseas dollar billings',
      sector: topAffected ? `${topAffected.sector} (${topAffected.portfolioWeight}% weight)` : 'Information Technology & Pharmaceuticals',
      portfolioExposure: `${sectorImpacts.reduce((s, x) => s + x.portfolioWeight, 0).toFixed(1)}% portfolio weight in export/import sensitive sectors`,
      fundamentalImpact: `${netImpact > 0 ? '+' : ''}${netImpact.toFixed(2)}% estimated net earnings translation impact`,
      technicalConfirmation: isDepreciating ? 'IT and export sector indices outperforming domestic cyclicals' : 'Domestic orientation showing relative resilience',
      portfolioImplication: netImpact > 0 ? 'Currency depreciation functions as a natural hedge for domestic inflation' : 'Currency pressure compounds domestic input costs',
    },
    whyNow: {
      what: `USD/INR shifted to ₹${rate.toFixed(2)} (${isDepreciating ? 'depreciating' : 'strengthening'} ${Math.abs(changePct).toFixed(1)}%).`,
      whyNow: `Foreign exchange shifts alter realized rupee revenues for dollar-billing export holdings immediately.`,
      whyPortfolio: `Portfolio has ${sectorImpacts.reduce((s, x) => s + x.portfolioWeight, 0).toFixed(1)}% exposure in export-heavy sectors (IT/Pharma).`,
      whatChangesView: `Reversal in USD/INR trend or client pricing concessions eating into realized dollar rates.`,
    },
    sectorImpacts,
    netPortfolioImpactPct: Math.round(netImpact * 100) / 100,
    confidence: sectorImpacts.length > 2 ? 0.6 : 0.4,
    evidenceClassification: 'rule_based',
    methodology: 'Export conversion and imported input matrix: sector FX sensitivity coefficient x USD/INR % change x sector portfolio weight.',
    offsettingForces: 'Currency tailwinds for export sectors can be dampened if global end-market tech spending or client demand compresses.',
    narrative: `USD/INR at ₹${rate.toFixed(2)} (${isDepreciating ? 'depreciating' : 'appreciating'} ${Math.abs(changePct).toFixed(1)}%). ` +
      `Transmission: FX → export revenue + import costs → net margins → sector earnings. ` +
      `Net portfolio effect: ${netImpact > 0 ? '+' : ''}${netImpact.toFixed(2)}%.`,
  };
}

function buildRateChain(
  yield10y: number,
  changePct: number,
  sectorAlloc: { sector: string; percent: number }[]
): TransmissionChain {
  const isRising = changePct > 0;

  const sectorImpacts = sectorAlloc
    .map((s) => {
      const profile = findSectorProfile(s.sector);
      if (!profile || Math.abs(profile.rateSensitivity) < 0.1) return null;

      const direction = isRising ? profile.rateSensitivity : -profile.rateSensitivity;
      const estimatedImpact = direction * Math.abs(changePct / 100) * s.percent * 100;

      return {
        sector: s.sector,
        portfolioWeight: Math.round(s.percent * 1000) / 10,
        channel: profile.rateChannel,
        direction: (estimatedImpact > 0 ? 'tailwind' : estimatedImpact < 0 ? 'headwind' : 'neutral') as 'tailwind' | 'headwind' | 'neutral',
        estimatedImpactPct: Math.round(estimatedImpact * 100) / 100,
      };
    })
    .filter(Boolean) as TransmissionChain['sectorImpacts'];

  const netImpact = sectorImpacts.reduce((sum, s) => sum + s.estimatedImpactPct, 0);

  const steps: TransmissionStep[] = [
    { from: 'US 10Y Yield', to: 'Global Discount Rate', mechanism: 'Risk-free rate anchor', direction: isRising ? 'negative' : 'positive', magnitude: 0.6, stepConfidence: 0.85 },
    { from: 'Global Discount Rate', to: 'FII Risk Appetite', mechanism: 'Higher US yields → capital repatriation', direction: isRising ? 'negative' : 'positive', magnitude: 0.5, stepConfidence: 0.70 },
    { from: 'FII Risk Appetite', to: 'EM Equity Valuations', mechanism: 'FII flows drive ~20% of Indian equity liquidity', direction: isRising ? 'negative' : 'positive', magnitude: 0.4, stepConfidence: 0.65 },
    { from: 'Rate Environment', to: 'Sector-Specific Impact', mechanism: 'NIMs, EMI costs, capex financing', direction: 'neutral', magnitude: 0.5, stepConfidence: 0.75 },
  ];

  const chainConfidence = Math.round(steps.reduce((acc, s) => acc * s.stepConfidence, 1) * 100) / 100;
  const topAffected = sectorImpacts[0];

  return {
    macroVariable: 'Interest Rates (US 10Y)',
    currentValue: `${yield10y.toFixed(2)}%`,
    trend: isRising ? 'Rising' : 'Falling',
    steps,
    chainConfidence,
    transmissionStages: {
      macro: `US 10Y Yield at ${yield10y.toFixed(2)}% (${isRising ? 'rising' : 'falling'} ${Math.abs(changePct).toFixed(1)}%)`,
      channel: isRising ? 'Higher risk-free benchmark discount rate compressing equity multiples and triggering capital rotation' : 'Easing yields expanding equity duration valuation multiples',
      sector: topAffected ? `${topAffected.sector} (${topAffected.portfolioWeight}% weight)` : 'Banking & Financial Services',
      portfolioExposure: `${sectorImpacts.reduce((s, x) => s + x.portfolioWeight, 0).toFixed(1)}% portfolio weight in rate-sensitive sectors`,
      fundamentalImpact: `${netImpact > 0 ? '+' : ''}${netImpact.toFixed(2)}% estimated net valuation multiple impact`,
      technicalConfirmation: isRising ? 'Growth/high-PE names underperforming value/dividend sectors' : 'Broad market multiple expansion',
      portfolioImplication: isRising ? 'Elevated rate regime favors defensive cash-flow generators over distant terminal growth' : 'Easing yield environment supports quality growth allocations',
    },
    whyNow: {
      what: `US 10Y yield moved to ${yield10y.toFixed(2)}% (${isRising ? 'up' : 'down'} ${Math.abs(changePct).toFixed(1)}%).`,
      whyNow: `Sovereign yield adjustments shift global equity hurdle rates and debt refinancing assumptions.`,
      whyPortfolio: `${sectorImpacts.reduce((s, x) => s + x.portfolioWeight, 0).toFixed(1)}% of portfolio is in financial and capital-intensive sectors.`,
      whatChangesView: `Central bank policy guidance pivoting towards rate cuts or domestic credit growth accelerating.`,
    },
    sectorImpacts,
    netPortfolioImpactPct: Math.round(netImpact * 100) / 100,
    confidence: sectorImpacts.length > 2 ? 0.55 : 0.35,
    evidenceClassification: 'model_estimate',
    methodology: 'Discount rate sensitivity & capital flow transmission: sector rate sensitivity coefficient x yield change x sector portfolio weight.',
    offsettingForces: 'Strong domestic DII mutual fund SIP inflows can counteract FII outflow pressure on valuations.',
    narrative: `US 10Y yield at ${yield10y.toFixed(2)}% (${isRising ? 'rising' : 'falling'} ${Math.abs(changePct).toFixed(1)}%). ` +
      `Transmission: yields → discount rates → FII flows → valuations + sector-specific channels. ` +
      `Net portfolio effect: ${netImpact > 0 ? '+' : ''}${netImpact.toFixed(2)}%.`,
  };
}

// ─── Main Engine ────────────────────────────────────────────────────────────────

interface TransmissionInput {
  sectorAllocation: { sector: string; percent: number }[];
  brentCrude?: { price: number; changePct: number };
  usdInr?: { price: number; changePct: number };
  us10y?: { price: number; changePct: number };
}

export function buildMacroTransmissionMap(input: TransmissionInput): MacroTransmissionMap {
  const chains: TransmissionChain[] = [];

  if (input.brentCrude) {
    chains.push(buildCrudeChain(input.brentCrude.price, input.brentCrude.changePct, input.sectorAllocation));
  }

  if (input.usdInr) {
    chains.push(buildFXChain(input.usdInr.price, input.usdInr.changePct, input.sectorAllocation));
  }

  if (input.us10y) {
    chains.push(buildRateChain(input.us10y.price, input.us10y.changePct, input.sectorAllocation));
  }

  const netMacroEffect = chains.reduce((sum, c) => sum + c.netPortfolioImpactPct, 0);

  // Determine dominant force
  let dominantForce = 'None';
  if (chains.length > 0) {
    const sorted = [...chains].sort((a, b) => Math.abs(b.netPortfolioImpactPct) - Math.abs(a.netPortfolioImpactPct));
    dominantForce = sorted[0].macroVariable;
  }

  const interpretation = chains.length > 0
    ? `Macro transmission map: ${chains.length} channels analyzed. Net macro effect: ${netMacroEffect > 0 ? '+' : ''}${netMacroEffect.toFixed(2)}%. ` +
      `Dominant force: ${dominantForce}. ` +
      chains.map((c) => `${c.macroVariable}: ${c.netPortfolioImpactPct > 0 ? '+' : ''}${c.netPortfolioImpactPct.toFixed(2)}%`).join('; ') + '.'
    : 'No macro data available for transmission analysis.';

  return {
    chains,
    netMacroEffect: Math.round(netMacroEffect * 100) / 100,
    dominantForce,
    interpretation,
  };
}
