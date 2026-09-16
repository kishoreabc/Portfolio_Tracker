'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers, TrendingUp, TrendingDown, Quote, PieChart } from 'lucide-react';
import type { PortfolioIntelligence } from '@/types/insights';

interface PortfolioIntelligenceCardProps {
  data?: PortfolioIntelligence;
}

export function PortfolioIntelligenceCard({ data }: PortfolioIntelligenceCardProps) {
  if (!data) return null;

  return (
    <Card className="border-border/50 bg-gradient-to-br from-card via-card/70 to-card/40 shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-h4">Portfolio Intelligence</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Internal portfolio dynamics, performance contributors, and sector allocation
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-5">
        {/* Contributors vs Underperformers Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Top Contributors */}
          <div className="p-4 rounded-xl bg-gain-muted/20 border border-gain/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gain uppercase tracking-wider">
                <TrendingUp className="w-4 h-4" />
                <span>Top Contributors</span>
              </div>
              <span className="text-[10px] text-muted-foreground">Recent Gains</span>
            </div>

            <div className="space-y-2">
              {data.topContributors && data.topContributors.length > 0 ? (
                data.topContributors.map((c, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-card/60 border border-gain/15 flex items-center justify-between font-mono text-xs"
                  >
                    <div className="font-sans">
                      <span className="font-bold text-foreground">{c.symbol}</span>
                      <span className="text-[10px] text-muted-foreground ml-2">({c.weight.toFixed(1)}% wt)</span>
                    </div>
                    <span className="text-gain font-semibold">
                      +{c.returnPct.toFixed(1)}%
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic">No primary positive contributors tracked.</p>
              )}
            </div>
          </div>

          {/* Underperformers */}
          <div className="p-4 rounded-xl bg-loss-muted/20 border border-loss/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-loss uppercase tracking-wider">
                <TrendingDown className="w-4 h-4" />
                <span>Underperformers / Drags</span>
              </div>
              <span className="text-[10px] text-muted-foreground">Recent Lag</span>
            </div>

            <div className="space-y-2">
              {data.underperformers && data.underperformers.length > 0 ? (
                data.underperformers.map((u, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-card/60 border border-loss/15 flex items-center justify-between font-mono text-xs"
                  >
                    <div className="font-sans">
                      <span className="font-bold text-foreground">{u.symbol}</span>
                      <span className="text-[10px] text-muted-foreground ml-2">({u.weight.toFixed(1)}% wt)</span>
                    </div>
                    <span className="text-loss font-semibold">
                      {u.returnPct.toFixed(1)}%
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic">No persistent drag positions identified.</p>
              )}
            </div>
          </div>
        </div>

        {/* AI Interpretation */}
        {data.interpretation && (
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-border/40 text-xs text-muted-foreground flex items-start gap-2.5">
            <Quote className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed italic">{data.interpretation}</p>
          </div>
        )}

        {/* Sector Allocation Breakdown */}
        {data.sectorAllocationSummary && data.sectorAllocationSummary.length > 0 && (
          <div className="space-y-2 pt-1">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <PieChart className="w-3.5 h-3.5 text-indigo-400" />
              <span>Core Sector Exposures</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {data.sectorAllocationSummary.map((s, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-card/60 border border-border/40 flex items-center justify-between"
                >
                  <span className="text-xs text-muted-foreground truncate mr-2">{s.sector}</span>
                  <span className="text-xs font-bold text-foreground font-mono">{s.percentage.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
