'use client';

import { cn } from '@/lib/utils';
import type { PeersData, PeerEntry } from '@/types/research';
import { ResearchSection, EmptyState } from './ResearchSection';
import { formatMarketCap } from '@/lib/analysis/calculations';
import { ArrowUpDown, Building2, TrendingUp, ShieldCheck, PieChart, Sparkles } from 'lucide-react';
import { useState, useMemo } from 'react';
import Link from 'next/link';

type SortKey =
  | 'name'
  | 'cmp'
  | 'marketCap'
  | 'pe'
  | 'pb'
  | 'roe'
  | 'roce'
  | 'debtToEquity'
  | 'dividendYield'
  | 'profitGrowth'
  | 'revenueGrowth';

function fmt(v: number | null | undefined, suffix = '', decimals = 1): string {
  if (v == null || !isFinite(v)) return '—';
  return `${v.toFixed(decimals)}${suffix}`;
}

interface PeerTableProps {
  currentSymbol: string;
  peers: PeersData | null;
  isLoading: boolean;
}

export function PeerComparisonSection({ currentSymbol, peers, isLoading }: PeerTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('marketCap');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const rawPeers = peers?.peers || [];

  const sortedPeers = useMemo(() => {
    return [...rawPeers].sort((a, b) => {
      const av = sortKey === 'name' ? a.symbol : (a[sortKey] as number | null) ?? -Infinity;
      const bv = sortKey === 'name' ? b.symbol : (b[sortKey] as number | null) ?? -Infinity;
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [rawPeers, sortKey, sortAsc]);

  // Peer group statistics (Medians)
  const stats = useMemo(() => {
    if (rawPeers.length === 0) return null;

    const getMedian = (getter: (p: PeerEntry) => number | null | undefined): number | null => {
      const vals = rawPeers.map(getter).filter((v): v is number => v != null && isFinite(v));
      if (vals.length === 0) return null;
      vals.sort((a, b) => a - b);
      const mid = Math.floor(vals.length / 2);
      return vals.length % 2 !== 0 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
    };

    return {
      medianPe: getMedian((p) => p.pe),
      medianPb: getMedian((p) => p.pb),
      medianRoe: getMedian((p) => p.roe),
      medianRoce: getMedian((p) => p.roce),
      medianDe: getMedian((p) => p.debtToEquity),
      medianDivYield: getMedian((p) => p.dividendYield),
    };
  }, [rawPeers]);

  const columns: { key: SortKey; label: string; tooltip: string; align: 'left' | 'right' }[] = [
    { key: 'name', label: 'Company', tooltip: 'Ticker and Company Name', align: 'left' },
    { key: 'cmp', label: 'CMP (₹)', tooltip: 'Current Market Price', align: 'right' },
    { key: 'marketCap', label: 'Mkt Cap', tooltip: 'Market Capitalization', align: 'right' },
    { key: 'pe', label: 'P/E', tooltip: 'Price to Earnings Ratio', align: 'right' },
    { key: 'pb', label: 'P/B', tooltip: 'Price to Book Value (CMP / BV)', align: 'right' },
    { key: 'roe', label: 'ROE%', tooltip: 'Return on Equity (%)', align: 'right' },
    { key: 'roce', label: 'ROCE%', tooltip: 'Return on Capital Employed (%)', align: 'right' },
    { key: 'debtToEquity', label: 'D/E', tooltip: 'Debt to Equity Ratio', align: 'right' },
    { key: 'dividendYield', label: 'Div Yld%', tooltip: 'Dividend Yield (%)', align: 'right' },
    { key: 'profitGrowth', label: 'Qtr Profit Var%', tooltip: 'YOY Quarterly Profit Growth (%)', align: 'right' },
    { key: 'revenueGrowth', label: 'Qtr Sales Var%', tooltip: 'YOY Quarterly Sales Growth (%)', align: 'right' },
  ];

  if (isLoading) {
    return (
      <ResearchSection title="Peer Comparison" id="peers">
        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="border-b border-white/5">
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-3">
                      <div
                        className="h-4 bg-white/5 rounded animate-pulse"
                        style={{ width: c.key === 'name' ? '120px' : '60px' }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ResearchSection>
    );
  }

  const sourceName = peers?.meta?.source || 'Screener.in (Verified Financial Data)';

  return (
    <ResearchSection
      title="Peer Comparison"
      id="peers"
      description={`Sector peer comparison across valuation multiples (P/E, P/B), return ratios (ROE%, ROCE%), solvency (D/E), and quarterly growth · Verified from ${sourceName}.`}
      headerAction={
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/25">
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            Verified Sector Peers ({rawPeers.length} Co.)
          </span>
        </div>
      }
      meta={
        peers?.meta && peers.meta.status !== 'fresh'
          ? {
              source: peers.meta.source,
              status: peers.meta.status,
              fetchedAt: peers.meta.fetchedAt,
            }
          : undefined
      }
    >
      {!sortedPeers || sortedPeers.length === 0 ? (
        <EmptyState
          title="No peer data available"
          description="Peer comparison data is not available for this company from the current financial data feed."
        />
      ) : (
        <div className="space-y-4">
          {/* Peer Group Median Summary Cards */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-[11px] text-muted-foreground block">Median P/E</span>
                <span className="text-xs font-mono font-bold text-foreground">
                  {stats.medianPe != null ? `${stats.medianPe.toFixed(1)}x` : '—'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-[11px] text-muted-foreground block">Median P/B</span>
                <span className="text-xs font-mono font-bold text-blue-400">
                  {stats.medianPb != null ? `${stats.medianPb.toFixed(1)}x` : '—'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-[11px] text-muted-foreground block">Median ROE%</span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {stats.medianRoe != null ? `${stats.medianRoe.toFixed(1)}%` : '—'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-[11px] text-muted-foreground block">Median ROCE%</span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {stats.medianRoce != null ? `${stats.medianRoce.toFixed(1)}%` : '—'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-[11px] text-muted-foreground block">Median D/E</span>
                <span className="text-xs font-mono font-bold text-foreground">
                  {stats.medianDe != null ? `${stats.medianDe.toFixed(2)}x` : '—'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-[11px] text-muted-foreground block">Median Div Yld%</span>
                <span className="text-xs font-mono font-bold text-purple-300">
                  {stats.medianDivYield != null ? `${stats.medianDivYield.toFixed(1)}%` : '—'}
                </span>
              </div>
            </div>
          )}

          {/* Peer Table */}
          <div className="overflow-x-auto rounded-xl border border-white/5 bg-white/[0.01]">
            <table className="w-full text-sm min-w-[850px]">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      title={c.tooltip}
                      className={cn(
                        'px-3.5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground transition-colors select-none',
                        c.align === 'right' ? 'text-right' : 'text-left'
                      )}
                      onClick={() => handleSort(c.key)}
                    >
                      <span className={cn('inline-flex items-center gap-1', c.align === 'right' ? 'justify-end' : 'justify-start')}>
                        {c.align === 'left' && sortKey === c.key && (
                          <ArrowUpDown className="w-3 h-3 text-blue-400" />
                        )}
                        <span>{c.label}</span>
                        {c.align === 'right' && sortKey === c.key && (
                          <ArrowUpDown className="w-3 h-3 text-blue-400" />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sortedPeers.map((peer) => {
                  const isCurrent = peer.symbol === currentSymbol.toUpperCase();
                  return (
                    <tr
                      key={peer.symbol}
                      className={cn(
                        'transition-colors',
                        isCurrent
                          ? 'bg-blue-500/10 border-l-2 border-l-blue-400 font-medium'
                          : 'hover:bg-white/[0.02]'
                      )}
                    >
                      {/* Company Name / Link */}
                      <td className="px-3.5 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/stock-analysis/${peer.symbol}`}
                            className="font-semibold text-foreground hover:text-blue-400 transition-colors"
                          >
                            {peer.symbol}
                          </Link>
                          {isCurrent && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                              Current
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground/70 truncate max-w-[130px] hidden sm:block">
                            {peer.name}
                          </span>
                        </div>
                      </td>

                      {/* CMP (₹) */}
                      <td className="px-3.5 py-3 text-right font-mono text-xs text-foreground font-medium">
                        {peer.cmp != null ? `₹${peer.cmp.toLocaleString('en-IN')}` : '—'}
                      </td>

                      {/* Market Cap */}
                      <td className="px-3.5 py-3 text-right font-mono text-xs text-muted-foreground">
                        {peer.marketCap != null ? formatMarketCap(peer.marketCap) : '—'}
                      </td>

                      {/* P/E */}
                      <td className="px-3.5 py-3 text-right font-mono text-xs text-foreground font-semibold">
                        {fmt(peer.pe, 'x')}
                      </td>

                      {/* P/B (Price to Book) */}
                      <td className="px-3.5 py-3 text-right font-mono text-xs text-blue-400 font-semibold">
                        {fmt(peer.pb, 'x')}
                      </td>

                      {/* ROE% */}
                      <td className="px-3.5 py-3 text-right font-mono text-xs font-semibold text-emerald-400">
                        {fmt(peer.roe, '%')}
                      </td>

                      {/* ROCE% */}
                      <td className="px-3.5 py-3 text-right font-mono text-xs font-semibold text-emerald-300">
                        {fmt(peer.roce, '%')}
                      </td>

                      {/* D/E (Debt to Equity) */}
                      <td className="px-3.5 py-3 text-right font-mono text-xs">
                        {peer.debtToEquity != null ? (
                          <span
                            className={cn(
                              peer.debtToEquity <= 0.1
                                ? 'text-emerald-400 font-semibold'
                                : peer.debtToEquity > 1.0
                                ? 'text-red-400 font-semibold'
                                : 'text-foreground'
                            )}
                          >
                            {peer.debtToEquity.toFixed(2)}x
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Div Yld% */}
                      <td className="px-3.5 py-3 text-right font-mono text-xs text-purple-300">
                        {fmt(peer.dividendYield, '%')}
                      </td>

                      {/* Qtr Profit Var % */}
                      <td className="px-3.5 py-3 text-right font-mono text-xs">
                        {peer.profitGrowth != null ? (
                          <span
                            className={cn(
                              'font-medium',
                              peer.profitGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'
                            )}
                          >
                            {peer.profitGrowth >= 0 ? '+' : ''}
                            {peer.profitGrowth.toFixed(1)}%
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Qtr Sales Var % */}
                      <td className="px-3.5 py-3 text-right font-mono text-xs">
                        {peer.revenueGrowth != null ? (
                          <span
                            className={cn(
                              'font-medium',
                              peer.revenueGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'
                            )}
                          >
                            {peer.revenueGrowth >= 0 ? '+' : ''}
                            {peer.revenueGrowth.toFixed(1)}%
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 text-[11px] text-muted-foreground flex items-center justify-between">
            <span>
              <strong className="text-foreground">Definitions: </strong> P/B = Price to Book Value (CMP / Book Value)
              · ROE = Return on Equity · ROCE = Return on Capital Employed · D/E = Total Debt / Equity
            </span>
            <span className="font-mono text-blue-400">Ind AS Standard Disclosures</span>
          </div>
        </div>
      )}
    </ResearchSection>
  );
}
