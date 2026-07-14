'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface PerformanceCardsProps {
  performance: Record<string, number | null> | null;
  isLoading: boolean;
}

const LABELS: { key: string; label: string }[] = [
  { key: 'today', label: '1D' },
  { key: '1w', label: '1W' },
  { key: '1mo', label: '1M' },
  { key: '3mo', label: '3M' },
  { key: '6mo', label: '6M' },
  { key: '1y', label: '1Y' },
];

export const PerformanceCards = memo(function PerformanceCards({ performance, isLoading }: PerformanceCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {LABELS.map((l) => (
          <Skeleton key={l.key} className="h-16 bg-white/5 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Performance</h3>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {LABELS.map(({ key, label }, i) => {
          const value = performance?.[key];
          const isPos = value != null ? value >= 0 : null;

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className={`flex flex-col items-center justify-center rounded-xl border py-3 px-2 ${
                isPos === true
                  ? 'bg-emerald-500/5 border-emerald-500/20'
                  : isPos === false
                  ? 'bg-rose-500/5 border-rose-500/20'
                  : 'bg-white/[0.02] border-border/30'
              }`}
            >
              <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wide mb-1">{label}</span>
              {value != null ? (
                <div className={`flex items-center gap-0.5 ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span className="text-sm font-bold tabular-nums">
                    {isPos ? '+' : ''}{value.toFixed(2)}%
                  </span>
                </div>
              ) : (
                <span className="text-sm font-semibold text-muted-foreground">—</span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
});
