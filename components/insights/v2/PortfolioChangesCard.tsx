'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { History, Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { PortfolioChanges } from '@/types/insights';

interface PortfolioChangesCardProps {
  data?: PortfolioChanges;
}

export function PortfolioChangesCard({ data }: PortfolioChangesCardProps) {
  const isAvailable = data?.isAvailable ?? false;
  const changes = data?.changes || [];

  return (
    <Card className="border-border/50 bg-gradient-to-br from-card via-card/70 to-card/40 shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
            <History className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-h4">What Changed?</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Differential analysis between consecutive portfolio intelligence reports & benchmark baseline
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-3">
        {data?.message && (
          <div className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/20 flex items-start gap-2.5 text-xs text-muted-foreground">
            <Info className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{data.message}</span>
          </div>
        )}

        {!isAvailable || changes.length === 0 ? (
          <div className="p-4 rounded-xl bg-white/[0.02] border border-border/40 flex items-start gap-3 text-xs text-muted-foreground">
            <Info className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-foreground block">Historical comparison unavailable</span>
              <p className="leading-relaxed">
                {data?.message ||
                  'Historical comparison will become available once multiple reports have been generated and archived across distinct reporting periods.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {changes.map((ch, idx) => {
              const isUp = ch.changeDirection === 'up';
              const isDown = ch.changeDirection === 'down';
              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-card/60 border border-border/40 hover:border-border/70 transition-all flex flex-col justify-between gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-xs text-foreground">{ch.metric}</span>
                    <div
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${
                        isUp
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : isDown
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-muted/30 text-muted-foreground border border-border/40'
                      }`}
                    >
                      {isUp && <TrendingUp className="w-3 h-3" />}
                      {isDown && <TrendingDown className="w-3 h-3" />}
                      {!isUp && !isDown && <Minus className="w-3 h-3" />}
                      <span>{isUp ? 'Positive' : isDown ? 'Attention' : 'Neutral'}</span>
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between text-xs pt-1 border-t border-border/30">
                    <span className="font-mono text-muted-foreground text-[11px]">{ch.previousValue}</span>
                    <span className="text-muted-foreground text-[11px]">→</span>
                    <span className="font-mono font-semibold text-foreground text-[11px]">{ch.currentValue}</span>
                  </div>

                  {ch.interpretation && (
                    <p className="text-[11px] text-muted-foreground leading-relaxed pt-0.5">
                      {ch.interpretation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
