'use client';

import { TrendingUp, TrendingDown, Minus, ExternalLink, Globe, Star, PlusCircle, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMarketCap } from '@/lib/analysis/calculations';
import type { CompanyProfile, ResearchQuote, KeyMetrics } from '@/types/research';
import Link from 'next/link';

interface CompanyHeaderProps {
  symbol: string;
  profile: CompanyProfile | null;
  quote: ResearchQuote | null;
  keyMetrics: KeyMetrics | null;
  isLoading: boolean;
}

function PriceBadge({ value, pct, isLoading }: { value: number | null; pct: number | null; isLoading: boolean }) {
  if (isLoading) return <div className="h-8 w-32 bg-white/5 rounded-lg animate-pulse" />;

  const isPositive = (pct ?? 0) >= 0;
  const Icon = pct == null ? Minus : isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="flex items-baseline gap-3 flex-wrap">
      <span className="text-3xl font-bold text-foreground">
        {value != null ? `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}
      </span>
      {pct != null && (
        <span className={cn(
          'flex items-center gap-1 text-sm font-semibold px-2 py-0.5 rounded-full',
          isPositive ? 'text-gain bg-gain/10' : 'text-loss bg-loss/10'
        )}>
          <Icon className="w-3.5 h-3.5" />
          {isPositive ? '+' : ''}{pct.toFixed(2)}%
        </span>
      )}
    </div>
  );
}

function SkeletonLine({ width = 'w-32' }: { width?: string }) {
  return <div className={cn('h-4 bg-white/5 rounded animate-pulse', width)} />;
}

export function CompanyHeaderSection({ symbol, profile, quote, keyMetrics, isLoading }: CompanyHeaderProps) {
  const name = profile?.name || symbol;
  const exchange = profile?.exchange || 'NSE';
  const sector = profile?.sector;
  const industry = profile?.industry;
  const website = profile?.website;

  const price = quote?.price ?? null;
  const changePct = quote?.changePct ?? null;
  const marketCap = keyMetrics?.marketCap ?? quote?.marketCap ?? null;
  const pe = keyMetrics?.pe ?? null;
  const pb = keyMetrics?.pb ?? null;
  const roe = keyMetrics?.roe ?? null;

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-5 space-y-4">
      {/* Top row: name + actions */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="space-y-1 min-w-0">
          {isLoading ? (
            <>
              <SkeletonLine width="w-48" />
              <SkeletonLine width="w-24" />
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-foreground truncate">{name}</h1>
                {profile?.reportingMode && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wide">
                    {profile.reportingMode}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                <span className="font-mono font-semibold text-foreground/70">{symbol}</span>
                <span className="text-white/20">·</span>
                <span>{exchange}</span>
                {sector && (
                  <>
                    <span className="text-white/20">·</span>
                    <span>{sector}</span>
                  </>
                )}
                {website && (
                  <>
                    <span className="text-white/20">·</span>
                    <a href={website} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-foreground transition-colors">
                      <Globe className="w-3 h-3" />
                      Website
                    </a>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-muted-foreground hover:text-foreground transition-all">
            <Star className="w-3.5 h-3.5" />
            Watchlist
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/20 text-blue-300 hover:text-blue-200 transition-all">
            <PlusCircle className="w-3.5 h-3.5" />
            Add to Portfolio
          </button>
        </div>
      </div>

      {/* Price row */}
      <PriceBadge value={price} pct={changePct} isLoading={isLoading} />

      {/* Quick metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        {[
          { label: 'Market Cap', value: marketCap != null ? formatMarketCap(marketCap) : null },
          { label: 'P/E Ratio', value: pe != null ? pe.toFixed(1) : null },
          { label: 'P/B Ratio', value: pb != null ? pb.toFixed(2) : null },
          { label: 'ROE', value: roe != null ? `${roe.toFixed(1)}%` : null },
        ].map(({ label, value }) => (
          <div key={label} className="space-y-0.5">
            <p className="text-xs text-muted-foreground">{label}</p>
            {isLoading ? (
              <div className="h-4 w-16 bg-white/5 rounded animate-pulse" />
            ) : (
              <p className="text-sm font-semibold text-foreground">{value ?? 'N/A'}</p>
            )}
          </div>
        ))}
      </div>

      {/* Data source footer */}
      {!isLoading && quote?.timestamp && (
        <p className="text-[11px] text-muted-foreground/50 pt-1">
          Price data from Yahoo Finance · Last updated: {new Date(quote.timestamp).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })}
        </p>
      )}
    </div>
  );
}
