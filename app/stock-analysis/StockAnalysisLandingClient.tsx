'use client';

import Link from 'next/link';
import { Compass } from 'lucide-react';
import { StockSearchBar } from '@/components/analysis/StockSearch';

export function StockAnalysisLandingClient() {
  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 max-w-4xl mx-auto animate-fade-in-up">
      {/* ── Hero Search Section ── */}
      <div className="text-center w-full max-w-2xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
          <Compass className="w-3.5 h-3.5" />
          <span>Fundamental Research & Financial Statements</span>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">
            Screener-Grade Stock Research
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Analyze historical quarterly results, 10-year P&L, balance sheets, cash flows, ratios, shareholding patterns, and peer comparisons for Indian listed companies.
          </p>
        </div>

        {/* Big Search Input */}
        <div className="pt-2 w-full max-w-xl mx-auto flex justify-center">
          <StockSearchBar placeholder="Search company by symbol or name (e.g. TITAN, TCS, ITC)..." />
        </div>

        {/* Quick Tickers Row */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs text-muted-foreground">
          <span className="text-muted-foreground/60">Popular:</span>
          {['TITAN', 'TCS', 'ITC', 'RELIANCE', 'HDFCBANK', 'INFY'].map((sym) => (
            <Link
              key={sym}
              href={`/stock-analysis/${sym}`}
              className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-blue-600/20 border border-white/5 hover:border-blue-500/30 text-foreground/80 hover:text-blue-300 font-mono transition-all"
            >
              {sym}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
