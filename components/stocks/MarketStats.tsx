'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { formatLargeNumber } from './MarketHeader';

interface MarketStatsProps {
  quote: Record<string, unknown> | null;
  profile: Record<string, unknown> | null;
  isLoading: boolean;
}

function fmtPrice(v: number | undefined | null): string {
  if (v == null) return '—';
  return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtNum(v: number | undefined | null, decimals = 2): string {
  if (v == null) return '—';
  return v.toFixed(decimals);
}

function fmtVol(v: number | undefined | null): string {
  if (v == null) return '—';
  if (v >= 1e7) return `${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `${(v / 1e5).toFixed(2)}L`;
  return v.toLocaleString('en-IN');
}

export const MarketStats = memo(function MarketStats({ quote, profile, isLoading }: MarketStatsProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prof = profile as any;
  const eps = quote?.trailingEps ?? prof?.defaultKeyStatistics?.trailingEps;
  const sector = quote?.sector ?? prof?.assetProfile?.sector ?? prof?.summaryProfile?.sector;
  const industry = quote?.industry ?? prof?.assetProfile?.industry ?? prof?.summaryProfile?.industry;

  const stats = [
    { label: 'Open', value: fmtPrice(quote?.regularMarketOpen as number) },
    { label: 'High', value: fmtPrice(quote?.regularMarketDayHigh as number) },
    { label: 'Low', value: fmtPrice(quote?.regularMarketDayLow as number) },
    { label: 'Prev Close', value: fmtPrice(quote?.regularMarketPreviousClose as number) },
    { label: '52W High', value: fmtPrice(quote?.fiftyTwoWeekHigh as number) },
    { label: '52W Low', value: fmtPrice(quote?.fiftyTwoWeekLow as number) },
    { label: 'Volume', value: fmtVol(quote?.regularMarketVolume as number) },
    { label: 'Avg Volume', value: fmtVol(quote?.averageDailyVolume3Month as number) },
    { label: 'Market Cap', value: quote?.marketCap ? formatLargeNumber(quote.marketCap as number) : '—' },
    { label: 'PE Ratio', value: fmtNum(quote?.trailingPE as number) },
    { label: 'EPS', value: fmtNum(eps as number) },
    { label: 'Div Yield', value: quote?.dividendYield ? `${((quote.dividendYield as number) * 100).toFixed(2)}%` : '—' },
    { label: 'Sector', value: (sector as string) || '—' },
    { label: 'Industry', value: (industry as string) || '—' },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 bg-white/5 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Market Statistics</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="bg-white/[0.03] border border-border/30 rounded-xl px-3 py-2.5"
          >
            <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wide mb-0.5">{stat.label}</p>
            <p className="text-sm font-semibold text-foreground tabular-nums truncate" title={stat.value}>{stat.value}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
});
