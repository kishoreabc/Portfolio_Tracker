'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, Activity, ArrowUpRight, ArrowDownRight, Compass } from 'lucide-react';
import type { TechnicalIntelligence } from '@/types/insights';

interface TechnicalIntelligenceCardProps {
  data?: TechnicalIntelligence;
}

export function TechnicalIntelligenceCard({ data }: TechnicalIntelligenceCardProps) {
  if (!data) return null;

  const score = Math.min(100, Math.max(0, data.breadthScore || 50));

  const getScoreColor = (val: number) => {
    if (val >= 65) return 'text-emerald-400';
    if (val >= 45) return 'text-indigo-400';
    return 'text-red-400';
  };

  const getTrendBadge = (trend: string) => {
    switch (trend?.toLowerCase()) {
      case 'bullish':
        return {
          icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />,
          class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        };
      case 'bearish':
        return {
          icon: <TrendingDown className="w-3.5 h-3.5 text-red-400" />,
          class: 'bg-red-500/10 text-red-400 border-red-500/20',
        };
      case 'neutral':
      default:
        return {
          icon: <Minus className="w-3.5 h-3.5 text-amber-400" />,
          class: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        };
    }
  };

  const getStructureBadge = (structure: string) => {
    if (/above/i.test(structure)) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
    if (/near/i.test(structure)) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
    return 'bg-red-500/10 text-red-400 border-red-500/20';
  };

  return (
    <Card className="border-border/50 bg-gradient-to-br from-card via-card/70 to-card/40 shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-h4">Technical Intelligence</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Moving average breadth, price trends, and structural market posture
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest block font-medium">Breadth Score</span>
          <span className={`text-lg font-bold tabular-nums ${getScoreColor(score)}`}>
            {score} <span className="text-xs text-muted-foreground font-normal">/ 100</span>
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-5">
        {/* Core Technical Pill Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-card/60 border border-border/40 flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Trend</span>
            <div className="flex items-center gap-1.5">
              {getTrendBadge(data.trend).icon}
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${getTrendBadge(data.trend).class}`}>
                {data.trend}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-card/60 border border-border/40 flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Momentum</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-foreground">
              {data.momentum}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-card/60 border border-border/40 flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Market Structure</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${getStructureBadge(data.marketStructure)}`}>
              {data.marketStructure}
            </span>
          </div>
        </div>

        {/* Technical Interpretation */}
        {data.interpretation && (
          <div className="p-3 rounded-xl bg-white/[0.02] border border-border/40 text-xs text-muted-foreground leading-relaxed">
            {data.interpretation}
          </div>
        )}

        {/* Per-Holding Technical Signal Cards */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Holding-Level Technical Signals
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.signals.map((sig, idx) => {
              const isAbove200 = (sig.priceVs200DMA ?? 0) >= 0;
              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-border/40 bg-card/40 hover:bg-card/70 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-foreground">{sig.symbol}</span>
                      <span className="text-[10px] text-muted-foreground ml-1.5 font-mono">
                        ₹{sig.currentPrice.toFixed(1)}
                      </span>
                    </div>

                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md border ${getStructureBadge(sig.marketStructure)}`}>
                      {sig.marketStructure}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
                    <div className="flex items-center justify-between p-1.5 rounded bg-black/20">
                      <span className="text-muted-foreground">vs 200DMA:</span>
                      <span className={sig.priceVs200DMA !== undefined && sig.priceVs200DMA >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {sig.priceVs200DMA !== undefined ? `${sig.priceVs200DMA >= 0 ? '+' : ''}${sig.priceVs200DMA}%` : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded bg-black/20">
                      <span className="text-muted-foreground">vs 50DMA:</span>
                      <span className={sig.priceVs50DMA !== undefined && sig.priceVs50DMA >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {sig.priceVs50DMA !== undefined ? `${sig.priceVs50DMA >= 0 ? '+' : ''}${sig.priceVs50DMA}%` : '—'}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed pt-1 border-t border-white/5">
                    {sig.signalExplanation}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
