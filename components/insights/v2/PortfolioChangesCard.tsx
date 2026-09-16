'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { History, Info } from 'lucide-react';
import type { PortfolioChanges } from '@/types/insights';

interface PortfolioChangesCardProps {
  data?: PortfolioChanges;
}

export function PortfolioChangesCard({ data }: PortfolioChangesCardProps) {
  const isAvailable = data?.isAvailable ?? false;

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
              Comparison between current portfolio state and previous intelligence runs
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {!isAvailable ? (
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
          <div className="space-y-3">
            {data?.changes?.map((ch, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-card/60 border border-border/40 flex items-center justify-between text-xs"
              >
                <span className="font-medium text-foreground">{ch.metric}</span>
                <span className="font-mono text-muted-foreground">
                  {ch.previousValue} → <strong className="text-foreground">{ch.currentValue}</strong>
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
