'use client';

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface MarketHeaderProps {
  symbol: string;
  quote: Record<string, unknown> | null;
  performance?: Record<string, number | null> | null;
  timeRange?: string;
  isLoading: boolean;
}

const TIME_LABELS: Record<string, string> = {
  '1d': '1D', '5d': '1W', '1mo': '1M', '3mo': '3M', '6mo': '6M',
  '1y': '1Y', '3y': '3Y', '5y': '5Y', 'max': 'MAX'
};

function formatPrice(v: number) {
  return v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatLargeNumber(v: number): string {
  if (v >= 1e12) return `₹${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `₹${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  return `₹${v.toLocaleString('en-IN')}`;
}

export const MarketHeader = memo(function MarketHeader({ symbol, quote, performance, timeRange, isLoading }: MarketHeaderProps) {
  const price = quote?.regularMarketPrice as number | undefined;
  
  // Map our actual API ranges to the keys used in performance object
  const perfKeyMap: Record<string, string> = {
    '1d': 'today',
    '5d': '1w',
    '1mo': '1mo',
    '3mo': '3mo',
    '6mo': '6mo',
    '1y': '1y',
    '3y': '3y',
    '5y': '5y',
    'max': 'max'
  };
  
  const perfKey = timeRange ? perfKeyMap[timeRange] : 'today';
  const displayPct = performance?.[perfKey];
  const displayLabel = timeRange ? TIME_LABELS[timeRange] : '1D';

  const prevClose = quote?.regularMarketPreviousClose as number | undefined;
  const companyName = (quote?.longName || quote?.shortName || symbol) as string;
  const exchange = (quote?.fullExchangeName || quote?.exchange || 'NSE') as string;
  const updatedAt = quote?.regularMarketTime;

  const isPositive = displayPct != null ? displayPct >= 0 : (quote?.regularMarketChange as number ?? 0) >= 0;

  const lastUpdated = updatedAt
    ? (() => {
        const ts = typeof updatedAt === 'number'
          ? new Date((updatedAt as number) * 1000)
          : new Date(updatedAt as string);
        return ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      })()
    : null;

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-5 w-48 bg-white/5" />
        <Skeleton className="h-10 w-36 bg-white/5" />
        <Skeleton className="h-4 w-32 bg-white/5" />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="text-base font-semibold text-foreground leading-tight truncate max-w-xs">{companyName}</h2>
        <span className="text-xs font-mono bg-white/10 text-muted-foreground px-2 py-0.5 rounded-md border border-border/30">{symbol}</span>
        <span className="text-xs text-muted-foreground/60 bg-white/5 px-2 py-0.5 rounded-md">{exchange}</span>
      </div>

      <div className="flex items-end gap-3 flex-wrap">
        <AnimatePresence mode="wait">
          <motion.span
            key={price}
            initial={{ opacity: 0.5, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-3xl font-bold tabular-nums tracking-tight ${
              isPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            ₹{price ? formatPrice(price) : '—'}
          </motion.span>
        </AnimatePresence>

        <div className={`flex items-center gap-1.5 text-sm font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
          {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <span>{displayPct != null ? `${isPositive ? '+' : ''}${displayPct.toFixed(2)}%` : '—'}</span>
          <span className="opacity-80 text-xs ml-0.5 px-1.5 py-0.5 rounded bg-white/5">({displayLabel})</span>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground/60 flex-wrap">
        {prevClose && <span>Prev Close: <span className="text-muted-foreground font-medium">₹{formatPrice(prevClose)}</span></span>}
        {lastUpdated && <span>Updated: <span className="text-muted-foreground">{lastUpdated}</span></span>}
      </div>
    </div>
  );
});

export { formatLargeNumber };
