'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Grid, HelpCircle } from 'lucide-react';
import type { FundamentalTechnicalMatrix, MatrixStock } from '@/types/insights';

interface FundTechMatrixProps {
  data?: FundamentalTechnicalMatrix;
}

export function FundTechMatrix({ data }: FundTechMatrixProps) {
  if (!data || !data.stocks || data.stocks.length === 0) return null;

  const rows: ('Strong' | 'Neutral' | 'Weak')[] = ['Strong', 'Neutral', 'Weak'];
  const cols: ('Weak' | 'Neutral' | 'Strong')[] = ['Weak', 'Neutral', 'Strong'];

  const getCellStocks = (f: 'Strong' | 'Neutral' | 'Weak', t: 'Weak' | 'Neutral' | 'Strong') => {
    return data.stocks.filter((s) => s.fundamental === f && s.technical === t);
  };

  const getCellBg = (f: string, t: string) => {
    if (f === 'Strong' && t === 'Strong') return 'bg-emerald-500/10 border-emerald-500/30';
    if (f === 'Strong' && t === 'Weak') return 'bg-indigo-500/10 border-indigo-500/30'; // Value opportunity / accumulating
    if (f === 'Weak' && t === 'Strong') return 'bg-amber-500/10 border-amber-500/30'; // Momentum without fundamentals
    if (f === 'Weak' && t === 'Weak') return 'bg-red-500/10 border-red-500/30'; // Dual headwind
    return 'bg-card/40 border-border/40';
  };

  const getCellHint = (f: string, t: string) => {
    if (f === 'Strong' && t === 'Strong') return 'Leading Compounders';
    if (f === 'Strong' && t === 'Weak') return 'Value / Consolidation';
    if (f === 'Weak' && t === 'Strong') return 'Momentum Overhang';
    if (f === 'Weak' && t === 'Weak') return 'Under Review';
    return '';
  };

  return (
    <Card className="border-border/50 bg-gradient-to-br from-card via-card/70 to-card/40 shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Grid className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-h4">Fundamental × Technical Matrix</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Two-dimensional analytical positioning across balance sheet quality and price momentum
            </p>
          </div>
        </div>

        <span className="text-[10px] text-muted-foreground uppercase tracking-widest px-2 py-0.5 rounded bg-white/5 border border-white/10 font-mono">
          Analytical Grid
        </span>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        <div className="overflow-x-auto">
          <div className="min-w-[500px]">
            {/* Column Headers (Technicals) */}
            <div className="grid grid-cols-12 text-center text-xs font-semibold mb-2">
              <div className="col-span-3 text-left text-muted-foreground text-[11px] uppercase tracking-wider pl-2 self-end">
                Fundamentals ↓
              </div>
              <div className="col-span-9 text-center text-indigo-400 text-xs font-bold uppercase tracking-wider pb-1">
                Technical Condition →
              </div>
            </div>

            <div className="grid grid-cols-12 text-center text-xs font-semibold mb-2">
              <div className="col-span-3"></div>
              <div className="col-span-3 text-muted-foreground text-[11px] uppercase">Weak</div>
              <div className="col-span-3 text-muted-foreground text-[11px] uppercase">Neutral</div>
              <div className="col-span-3 text-muted-foreground text-[11px] uppercase">Strong</div>
            </div>

            {/* Matrix Rows */}
            <div className="space-y-2">
              {rows.map((rowLabel) => (
                <div key={rowLabel} className="grid grid-cols-12 gap-2 items-stretch min-h-[90px]">
                  {/* Row Header */}
                  <div className="col-span-3 flex flex-col justify-center px-3 rounded-xl bg-card/60 border border-border/40 text-left">
                    <span className="text-xs font-bold text-foreground">{rowLabel}</span>
                    <span className="text-[10px] text-muted-foreground">Fundamentals</span>
                  </div>

                  {/* 3 Cells */}
                  {cols.map((colLabel) => {
                    const stocks = getCellStocks(rowLabel, colLabel);
                    const cellBg = getCellBg(rowLabel, colLabel);
                    const hint = getCellHint(rowLabel, colLabel);
                    return (
                      <div
                        key={colLabel}
                        className={`col-span-3 p-2.5 rounded-xl border ${cellBg} flex flex-col justify-between transition-all`}
                      >
                        <div className="flex flex-wrap gap-1.5">
                          {stocks.length > 0 ? (
                            stocks.map((stk) => (
                              <span
                                key={stk.symbol}
                                className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/15 border border-white/15 text-[11px] font-bold text-foreground font-mono transition-colors"
                                title={`${stk.name} (${stk.weight.toFixed(1)}%)`}
                              >
                                {stk.symbol}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-muted-foreground/40 italic">None</span>
                          )}
                        </div>

                        {hint && (
                          <span className="text-[9px] text-muted-foreground/70 uppercase tracking-widest font-semibold mt-2 text-right">
                            {hint}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground/60 italic text-center pt-1">
          This matrix represents an analytical classification of current data and does not constitute automated buy or sell signals.
        </p>
      </CardContent>
    </Card>
  );
}
