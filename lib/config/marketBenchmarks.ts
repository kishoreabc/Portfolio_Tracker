/**
 * lib/config/marketBenchmarks.ts
 *
 * Versioned market benchmark constants with source and effective date.
 * All external financial assumptions must be declared here, not scattered in code.
 * Every value includes a source and effectiveDate for auditability.
 */

export interface BenchmarkValue {
  value: number;
  source: string;
  effectiveDate: string;
  description: string;
}

// Indian equity benchmarks
export const NIFTY_50_LONG_TERM_PE: BenchmarkValue = {
  value: 22.8,
  source: 'NSE India — Nifty 50 long-term median trailing P/E',
  effectiveDate: '2024-12-31',
  description: 'Long-term median trailing P/E for the Nifty 50 index',
};

export const NIFTY_50_FAIR_VALUE_PE_RANGE = {
  low: 18,
  high: 25,
  source: 'Historical Nifty 50 valuation band (10yr)',
  effectiveDate: '2024-12-31',
};

// Risk-free rate benchmark for India
export const INDIA_RISK_FREE_RATE: BenchmarkValue = {
  value: 7.0,
  source: '10Y Indian Government Bond Yield (approximate)',
  effectiveDate: '2024-12-31',
  description: 'Benchmark risk-free rate for equity risk premium calculation',
};

// Sector PE benchmarks — imported from existing calc/valuation.ts
// (Those remain canonical; this file only adds meta-benchmarks)
