'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Quote, Scale, ArrowDown, ArrowUp } from 'lucide-react';
import type { ValuationIntelligence } from '@/types/insights';
import { getSectorPE, evaluateValuation } from '@/lib/calc/valuation';

interface ValuationIntelligenceCardProps {
  data?: ValuationIntelligence;
  equity?: Array<{
    ticker: string;
    name?: string;
    sector?: string;
    currentValue?: number;
    allocationPercent?: number;
  }>;
}

export function ValuationIntelligenceCard({ data, equity }: ValuationIntelligenceCardProps) {
  const isDiscount = (data?.relativeValuationPct ?? 0) <= 0;
  const absDiff = Math.abs(data?.relativeValuationPct ?? 0);

  const holdingsList = useMemo(() => {
    const base = data?.holdingsValuation ? [...data.holdingsValuation] : [];
    if (!equity || equity.length === 0) return base;

    const existingSymbols = new Set(base.map((h) => (h.symbol || '').trim().toUpperCase()));

    for (const eq of equity) {
      const sym = (eq.ticker || '').trim().toUpperCase();
      if (!sym || existingSymbols.has(sym)) continue;

      const sectorPe = getSectorPE(eq.sector, sym);
      const evalResult = evaluateValuation(undefined, sectorPe);
      base.push({
        symbol: sym,
        pe: undefined,
        benchmarkPe: sectorPe ?? 22.8,
        sectorPe,
        status: evalResult.status,
      });
      existingSymbols.add(sym);
    }

    return base;
  }, [data?.holdingsValuation, equity]);

  if (!data && holdingsList.length === 0) return null;

  return (
    <Card className="border-border/50 bg-gradient-to-br from-card via-card/70 to-card/40 shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
            <PieChart className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-h4">Valuation Intelligence</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Portfolio multiple evaluation relative to broader market benchmarks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-mono">
          <Scale className="w-3.5 h-3.5 text-purple-400" />
          <span>vs {data?.benchmarkName || 'NIFTY 50'}</span>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-5">
        {/* Core Valuation Multiples Comparison */}
        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-card/60 border border-border/40 space-y-1">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider block">Portfolio Trailing P/E</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-foreground tabular-nums">{data.portfolioPe.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground font-semibold">x</span>
              </div>
              <span className="text-[10px] text-muted-foreground block">Weighted across equity positions</span>
            </div>

            <div className="p-4 rounded-xl bg-card/60 border border-border/40 space-y-1">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider block">Benchmark ({data.benchmarkName})</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-muted-foreground tabular-nums">{data.benchmarkPe.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground font-semibold">x</span>
              </div>
              <span className="text-[10px] text-muted-foreground block">Long-term median multiple</span>
            </div>

            <div className={`p-4 rounded-xl border space-y-1 ${isDiscount ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-purple-500/5 border-purple-500/20'}`}>
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider block">Relative Valuation</span>
              <div className="flex items-center gap-1.5">
                {isDiscount ? (
                  <ArrowDown className="w-5 h-5 text-emerald-400" />
                ) : (
                  <ArrowUp className="w-5 h-5 text-purple-400" />
                )}
                <span className={`text-2xl font-extrabold tabular-nums ${isDiscount ? 'text-emerald-400' : 'text-purple-400'}`}>
                  {absDiff}%
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground block">
                {isDiscount ? 'Trading at a discount to Nifty' : 'Trading at a premium to Nifty'}
              </span>
            </div>
          </div>
        )}

        {/* AI Interpretation */}
        {data?.interpretation && (
          <div className="p-4 rounded-xl bg-white/[0.02] border border-border/40 text-xs text-muted-foreground flex items-start gap-2.5">
            <Quote className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-foreground block">Valuation Context & Driver:</span>
              <p className="leading-relaxed italic">{data.interpretation}</p>
            </div>
          </div>
        )}

        {/* Holdings Valuation Table */}
        {holdingsList.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Holding Valuation Multiples vs Sector
              </h4>
              <span className="text-[11px] text-muted-foreground font-mono">
                {holdingsList.length} Holdings
              </span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-border/40">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/40 bg-white/5 text-muted-foreground">
                    <th className="p-2.5 font-semibold">Stock</th>
                    <th className="p-2.5 font-semibold text-right">Holding P/E</th>
                    <th className="p-2.5 font-semibold text-right">Sector P/E</th>
                    <th className="p-2.5 font-semibold text-center">Valuation Stance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 font-mono">
                  {holdingsList.map((h, idx) => {
                    const sectorPe = h.sectorPe ?? (typeof h.benchmarkPe === 'number' && h.benchmarkPe !== 22.8 ? h.benchmarkPe : undefined) ?? getSectorPE(undefined, h.symbol);
                    return (
                      <tr key={idx} className="hover:bg-white/[0.02]">
                        <td className="p-2.5 font-sans font-medium text-foreground">{h.symbol}</td>
                        <td className="p-2.5 text-right text-foreground">{h.pe ? `${h.pe}x` : '—'}</td>
                        <td className="p-2.5 text-right text-muted-foreground">{typeof sectorPe === 'number' ? `${sectorPe.toFixed(1)}x` : '—'}</td>
                        <td className="p-2.5 text-center font-sans">
                          <span
                            className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md border ${
                              h.status === 'Undervalued'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : h.status === 'Elevated'
                                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                : 'bg-white/5 text-muted-foreground border-white/10'
                            }`}
                          >
                            {h.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
