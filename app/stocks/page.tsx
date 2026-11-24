'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  Plus,
  Briefcase,
  Layers,
  Compass,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Topbar } from '@/components/layout/Topbar';
import { SectorAllocationChart } from '@/components/charts/SectorAllocationChart';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { useStockModal } from '@/lib/stock-modal-context';
import { usePrivacy, PRIVACY_MASK } from '@/lib/privacy-context';
import { KpiCard } from '@/components/shared/KpiCard';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useWatchlistQuotes } from '@/hooks/useWatchlistQuotes';
import { WatchlistTable } from '@/components/stocks/WatchlistTable';
import { AddToWatchlistModal } from '@/components/stocks/AddToWatchlistModal';
import { isUSStock } from '@/lib/stocks/market';
import type { EquityHolding } from '@/types/holdings';
import { cn } from '@/lib/utils';

export type MarketTab = 'indian' | 'us' | 'all';

function fmt(v: number, isHidden: boolean = false) {
  if (isHidden) return PRIVACY_MASK;
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPrice(v: number) {
  if (typeof v !== 'number' || isNaN(v)) return '₹0.00';
  return `₹${Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtChange(v: number) {
  const sign = v > 0 ? '+' : v < 0 ? '-' : '';
  return `${sign}₹${Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface HoldingsTableComponentProps {
  items: EquityHolding[];
  isLoading: boolean;
  isHidden: boolean;
  sortConfig: { key: string; direction: 'asc' | 'desc' };
  onSort: (key: string) => void;
  openStock: (ticker: string) => void;
  isInWatchlist: (ticker: string) => boolean;
  toggleWatchlist: (ticker: string) => void;
  emptyMessage?: string;
}

function HoldingsTableComponent({
  items,
  isLoading,
  isHidden,
  sortConfig,
  onSort,
  openStock,
  isInWatchlist,
  toggleWatchlist,
  emptyMessage,
}: HoldingsTableComponentProps) {
  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig.key !== columnKey) {
      return (
        <ArrowUpDown className="inline-block ml-1.5 w-3.5 h-3.5 text-muted-foreground/35 group-hover:text-muted-foreground/80 transition-colors" />
      );
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="inline-block ml-1.5 w-3.5 h-3.5 text-primary font-bold transition-transform" />
    ) : (
      <ArrowDown className="inline-block ml-1.5 w-3.5 h-3.5 text-primary font-bold transition-transform" />
    );
  };

  const columns = [
    { key: 'ticker', label: 'Symbol', align: 'left' },
    { key: 'name', label: 'Name', align: 'left' },
    { key: 'sector', label: 'Sector', align: 'left' },
    { key: 'shares', label: 'Shares', align: 'right' },
    { key: 'currentPrice', label: 'CMP', align: 'right' },
    { key: 'currentValue', label: 'Value', align: 'right' },
    { key: 'allocationPercent', label: 'Alloc %', align: 'right' },
    { key: 'valuationRatio', label: 'P/E (P/B)', align: 'right' },
    { key: 'priceChange', label: 'Price Chg', align: 'right' },
    { key: 'percentChange', label: 'Change %', align: 'right' },
  ];

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border/50 hover:bg-transparent">
            <TableHead className="w-10 px-2 text-center" title="Watchlist status">
              <Star className="w-3.5 h-3.5 text-muted-foreground/40 mx-auto" />
            </TableHead>
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={`text-sm font-semibold uppercase tracking-wider whitespace-nowrap select-none transition-colors cursor-pointer group hover:text-foreground ${
                  col.align === 'right' ? 'text-right' : 'text-left'
                } ${
                  sortConfig.key === col.key
                    ? 'text-foreground font-bold'
                    : 'text-muted-foreground'
                }`}
                onClick={() => onSort(col.key)}
                aria-sort={
                  sortConfig.key === col.key
                    ? sortConfig.direction === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : undefined
                }
              >
                <span
                  className={`inline-flex items-center ${
                    col.align === 'right' ? 'justify-end' : ''
                  }`}
                >
                  {col.label}
                  <SortIcon columnKey={col.key} />
                </span>
              </TableHead>
            ))}
            <TableHead className="text-right text-sm font-semibold uppercase tracking-wider pr-4 text-muted-foreground">
              Analysis
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i} className="border-border/30">
                <TableCell className="px-2 text-center">
                  <Skeleton className="h-4 w-4 mx-auto bg-white/5" />
                </TableCell>
                {Array.from({ length: 11 }).map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 bg-white/5" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : items.length === 0 ? (
            <TableRow className="border-border/30 hover:bg-transparent">
              <TableCell colSpan={12} className="py-10 text-center text-sm text-muted-foreground">
                {emptyMessage || 'No holdings found.'}
              </TableCell>
            </TableRow>
          ) : (
            items.map((h, i) => {
              const isWatched = isInWatchlist(h.ticker);
              const isUS = isUSStock(h);

              return (
                <motion.tr
                  key={h.ticker}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.015 }}
                  className="border-border/30 hover:bg-white/[0.02] transition-colors group"
                >
                  {/* Watchlist toggle star */}
                  <TableCell className="text-center px-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWatchlist(h.ticker);
                      }}
                      className="p-1 rounded transition-transform hover:scale-110"
                      title={
                        isWatched
                          ? `Remove ${h.ticker} from Watchlist`
                          : `Add ${h.ticker} to Watchlist`
                      }
                      aria-label={`Toggle ${h.ticker} in Watchlist`}
                    >
                      <Star
                        className={`w-3.5 h-3.5 transition-colors ${
                          isWatched
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-muted-foreground/30 hover:text-amber-400/80'
                        }`}
                      />
                    </button>
                  </TableCell>

                  <TableCell
                    className="font-mono text-xs font-semibold text-blue-400 cursor-pointer hover:text-blue-300 hover:underline transition-colors whitespace-nowrap"
                    onClick={() => openStock(h.ticker)}
                  >
                    <div className="inline-flex items-center gap-1.5">
                      <span>{h.ticker}</span>
                      {isUS ? (
                        <span className="text-[10px] font-sans font-semibold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">
                          {h.exchange || 'NASDAQ'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-sans font-normal px-1 py-0.5 rounded bg-surface-200/60 text-muted-foreground/80 border border-border/30">
                          {h.exchange || 'NSE'}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell
                    className="text-sm font-semibold text-foreground max-w-[160px] truncate cursor-pointer hover:text-blue-300 transition-colors"
                    title={h.name}
                    onClick={() => openStock(h.ticker)}
                  >
                    {h.name}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground/80 font-normal">
                    {h.sector}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium tabular-nums text-foreground/90">
                    {isHidden
                      ? PRIVACY_MASK
                      : h.shares < 1 && h.shares > 0
                      ? Number(h.shares.toFixed(4))
                      : h.shares.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium tabular-nums text-foreground/90">
                    {fmtPrice(h.currentPrice)}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium tabular-nums text-foreground">
                    {fmt(h.currentValue, isHidden)}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium tabular-nums text-foreground/90">
                    {h.allocationPercent.toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium tabular-nums">
                    {h.valuationRatio ? (
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <span
                          className={
                            h.valuationType === 'PB'
                              ? 'text-amber-400 font-semibold'
                              : 'text-foreground/90 font-medium'
                          }
                        >
                          {h.valuationRatio.toFixed(2)}x
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wider uppercase ${
                            h.valuationType === 'PB'
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}
                          title={
                            h.valuationType === 'PB'
                              ? 'Price to Book Value (Banking)'
                              : 'Price to Earnings Ratio'
                          }
                        >
                          {h.valuationType}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/40 text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium tabular-nums">
                    <span
                      className={
                        h.priceChange >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }
                    >
                      {fmtChange(h.priceChange)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium tabular-nums">
                    <span
                      className={
                        h.percentChange >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }
                    >
                      {h.percentChange >= 0 ? '+' : '-'}
                      {Math.abs(h.percentChange * 100).toFixed(2)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <Link
                      href={`/stock-analysis/${h.ticker}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 border border-blue-500/20 transition-all"
                      title={`View fundamental analysis for ${h.ticker}`}
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Research</span>
                    </Link>
                  </TableCell>
                </motion.tr>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default function StocksPage() {
  const {
    equity,
    winners,
    losers,
    isLoading,
    lastFetched,
    apiErrors,
    sectorAllocation,
    equityTotal,
    todaysChange,
    todaysChangePct,
  } = usePortfolioData();
  const { isHidden } = usePrivacy();

  const [activeTab, setActiveTab] = useState<'holdings' | 'watchlist'>('holdings');
  const [marketTab, setMarketTab] = useState<MarketTab>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: '',
    direction: 'asc',
  });
  const { openStock } = useStockModal();

  const { watchlist, isInWatchlist, toggleWatchlist } = useWatchlist();
  const { summary: watchlistSummary, isLoading: isWatchlistLoading } = useWatchlistQuotes(watchlist);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  // Segregate Indian vs US stocks (Groww model)
  const indianEquity = useMemo(() => equity.filter((h) => !isUSStock(h)), [equity]);
  const usEquity = useMemo(() => equity.filter((h) => isUSStock(h)), [equity]);

  const marketCounts = useMemo(
    () => ({
      indian: indianEquity.length,
      us: usEquity.length,
      all: equity.length,
    }),
    [indianEquity.length, usEquity.length, equity.length]
  );

  // Market-specific aggregates for dynamic KPIs and summaries
  const marketAggregates = useMemo(() => {
    const calc = (list: EquityHolding[]) => {
      const total = list.reduce((s, h) => s + h.currentValue, 0);
      const change = list.reduce((s, h) => s + h.priceChange * h.shares, 0);
      const changePct = total > 0 ? change / total : 0;
      const sortedByGain = [...list].sort((a, b) => b.percentChange - a.percentChange);
      const topWinner = sortedByGain[0] && sortedByGain[0].percentChange > 0 ? sortedByGain[0] : null;
      const sortedByLoss = [...list].sort((a, b) => a.percentChange - b.percentChange);
      const topLoser = sortedByLoss[0] && sortedByLoss[0].percentChange < 0 ? sortedByLoss[0] : null;
      return { total, change, changePct, topWinner, topLoser, count: list.length };
    };

    return {
      indian: calc(indianEquity),
      us: calc(usEquity),
      all: {
        total: equityTotal,
        change: todaysChange,
        changePct: todaysChangePct,
        topWinner: winners[0] ?? null,
        topLoser: losers[0] ?? null,
        count: equity.length,
      },
    };
  }, [indianEquity, usEquity, equity, equityTotal, todaysChange, todaysChangePct, winners, losers]);

  // Sector breakdown adapts to current market view
  const equitySectors = useMemo(() => {
    const activeList = marketTab === 'indian' ? indianEquity : marketTab === 'us' ? usEquity : equity;
    const totalVal = activeList.reduce((s, h) => s + h.currentValue, 0);
    const secMap = new Map<string, number>();
    for (const h of activeList) {
      const s = h.sector || 'Unknown';
      secMap.set(s, (secMap.get(s) || 0) + h.currentValue);
    }
    return Array.from(secMap.entries())
      .map(([sector, val]) => ({
        sector,
        equityValue: val,
        bondValue: 0,
        totalValue: val,
        percent: totalVal > 0 ? (val / totalVal) * 100 : 0,
      }))
      .sort((a, b) => b.totalValue - a.totalValue);
  }, [marketTab, indianEquity, usEquity, equity]);

  // Filter and sort holdings
  const filterAndSortList = (list: EquityHolding[]) => {
    const result = [...list].filter(
      (h) =>
        !search ||
        h.name.toLowerCase().includes(search.toLowerCase()) ||
        h.ticker.toLowerCase().includes(search.toLowerCase()) ||
        h.sector.toLowerCase().includes(search.toLowerCase()) ||
        h.exchange.toLowerCase().includes(search.toLowerCase())
    );
    if (sortConfig.key) {
      result.sort((a: any, b: any) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];

        if (valA == null && valB == null) return 0;
        if (valA == null) return 1;
        if (valB == null) return -1;

        if (typeof valA === 'string') {
          return sortConfig.direction === 'asc'
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  };

  const filteredIndian = useMemo(
    () => filterAndSortList(indianEquity),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [indianEquity, search, sortConfig]
  );
  const filteredUS = useMemo(
    () => filterAndSortList(usEquity),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [usEquity, search, sortConfig]
  );
  const filteredAll = useMemo(
    () => filterAndSortList(equity),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [equity, search, sortConfig]
  );

  const activeMarketAgg = marketAggregates[marketTab];

  return (
    <>
      <Topbar lastFetched={lastFetched} pageTitle="Stocks" apiErrors={apiErrors} />
      <div className="p-3 sm:p-4 md:p-6 space-y-4 animate-fade-in-up">
        {/* Top Summary KPIs — dynamically adapts to Market & View Mode */}
        {activeTab === 'holdings' ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <KpiCard
              id="kpi-stocks-equity"
              title={marketTab === 'indian' ? 'Indian Equity' : marketTab === 'us' ? 'US Equity' : 'Equity Value'}
              value={isLoading ? '—' : fmt(activeMarketAgg.total, isHidden)}
              subValue={
                isLoading
                  ? undefined
                  : `${activeMarketAgg.count} ${activeMarketAgg.count === 1 ? 'holding' : 'holdings'}${
                      marketTab === 'us'
                        ? ' · Traded in USD'
                        : marketTab === 'indian'
                        ? ' · NSE / BSE'
                        : ' · Consolidated'
                    }`
              }
              icon={TrendingUp}
              accentColor={marketTab === 'us' ? 'blue' : 'green'}
              isLoading={isLoading}
              isPrivate
            />
            <KpiCard
              id="kpi-stocks-today-change"
              title="Today's Change"
              value={isLoading ? '—' : fmt(Math.abs(activeMarketAgg.change), isHidden)}
              change={isLoading ? undefined : activeMarketAgg.changePct}
              changeLabel="today"
              icon={Activity}
              accentColor={activeMarketAgg.change >= 0 ? 'green' : 'red'}
              isLoading={isLoading}
              isPrivate
            />
            <KpiCard
              id="kpi-stocks-top-gainer"
              title={marketTab === 'us' ? 'Top US Gainer' : 'Top Gainer'}
              value={isLoading || !activeMarketAgg.topWinner ? '—' : activeMarketAgg.topWinner.ticker}
              subValue={
                isLoading || !activeMarketAgg.topWinner
                  ? undefined
                  : `${fmtPrice(activeMarketAgg.topWinner.currentPrice)} · +${(activeMarketAgg.topWinner.percentChange * 100).toFixed(2)}% (${activeMarketAgg.topWinner.name})`
              }
              icon={ArrowUpRight}
              accentColor={(activeMarketAgg.topWinner?.percentChange ?? 0) >= 0 ? 'green' : 'red'}
              isLoading={isLoading}
              onClick={activeMarketAgg.topWinner ? () => openStock(activeMarketAgg.topWinner!.ticker) : undefined}
            />
            <KpiCard
              id="kpi-stocks-top-loser"
              title={marketTab === 'us' ? 'Top US Loser' : 'Top Loser'}
              value={isLoading || !activeMarketAgg.topLoser ? '—' : activeMarketAgg.topLoser.ticker}
              subValue={
                isLoading || !activeMarketAgg.topLoser
                  ? undefined
                  : `${fmtPrice(activeMarketAgg.topLoser.currentPrice)} · ${(activeMarketAgg.topLoser.percentChange * 100).toFixed(2)}% (${activeMarketAgg.topLoser.name})`
              }
              icon={ArrowDownRight}
              accentColor={(activeMarketAgg.topLoser?.percentChange ?? 0) >= 0 ? 'green' : 'red'}
              isLoading={isLoading}
              onClick={activeMarketAgg.topLoser ? () => openStock(activeMarketAgg.topLoser!.ticker) : undefined}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <KpiCard
              id="kpi-watchlist-count"
              title="Watchlist Stocks"
              value={`${watchlist.length}`}
              subValue="Monitored in real-time"
              icon={Star}
              accentColor="amber"
              isLoading={isWatchlistLoading}
            />
            <KpiCard
              id="kpi-watchlist-avg-change"
              title="Watchlist Avg Change"
              value={
                watchlistSummary.totalCount > 0
                  ? `${watchlistSummary.avgChangePct >= 0 ? '+' : ''}${watchlistSummary.avgChangePct.toFixed(2)}%`
                  : '—'
              }
              subValue={`${watchlistSummary.gainersCount} gainers : ${watchlistSummary.losersCount} losers`}
              icon={Activity}
              accentColor={watchlistSummary.avgChangePct >= 0 ? 'green' : 'red'}
              isLoading={isWatchlistLoading}
            />
            <KpiCard
              id="kpi-watchlist-top-gainer"
              title="Top Watchlist Gainer"
              value={watchlistSummary.topPerformer?.symbol || '—'}
              subValue={
                watchlistSummary.topPerformer
                  ? `${fmtPrice(watchlistSummary.topPerformer.currentPrice)} : ${
                      watchlistSummary.topPerformer.percentChange >= 0 ? '+' : ''
                    }${watchlistSummary.topPerformer.percentChange.toFixed(2)}%`
                  : undefined
              }
              icon={ArrowUpRight}
              accentColor={
                (watchlistSummary.topPerformer?.percentChange ?? 0) >= 0 ? 'green' : 'red'
              }
              isLoading={isWatchlistLoading}
              onClick={
                watchlistSummary.topPerformer
                  ? () => openStock(watchlistSummary.topPerformer!.symbol)
                  : undefined
              }
            />
            <KpiCard
              id="kpi-watchlist-top-loser"
              title="Top Watchlist Loser"
              value={watchlistSummary.worstPerformer?.symbol || '—'}
              subValue={
                watchlistSummary.worstPerformer
                  ? `${fmtPrice(watchlistSummary.worstPerformer.currentPrice)} : ${
                      watchlistSummary.worstPerformer.percentChange >= 0 ? '+' : ''
                    }${watchlistSummary.worstPerformer.percentChange.toFixed(2)}%`
                  : undefined
              }
              icon={ArrowDownRight}
              accentColor={
                (watchlistSummary.worstPerformer?.percentChange ?? 0) >= 0 ? 'green' : 'red'
              }
              isLoading={isWatchlistLoading}
              onClick={
                watchlistSummary.worstPerformer
                  ? () => openStock(watchlistSummary.worstPerformer!.symbol)
                  : undefined
              }
            />
          </div>
        )}

        {/* View Mode & Groww-Style Market Switchers */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* Main Tabs: Holdings vs Watchlist */}
            <div className="flex items-center gap-1.5 p-1 bg-surface-100/90 border border-border/50 rounded-xl w-fit">
              <button
                id="tab-holdings"
                onClick={() => setActiveTab('holdings')}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer',
                  activeTab === 'holdings'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                )}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Equity Holdings</span>
                <span
                  className={cn(
                    'text-xs px-1.5 py-0.2 rounded-full font-mono',
                    activeTab === 'holdings'
                      ? 'bg-white/20 text-white'
                      : 'bg-surface-200 text-muted-foreground'
                  )}
                >
                  {equity.length}
                </span>
              </button>

              <button
                id="tab-watchlist"
                onClick={() => setActiveTab('watchlist')}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer',
                  activeTab === 'watchlist'
                    ? 'bg-amber-500 text-white font-bold shadow-sm shadow-amber-500/25'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                )}
              >
                <Star
                  className={cn(
                    'w-3.5 h-3.5',
                    activeTab === 'watchlist'
                      ? 'fill-white text-white'
                      : 'fill-amber-400 text-amber-400'
                  )}
                />
                <span>Watchlist</span>
                <span
                  className={cn(
                    'text-xs px-1.5 py-0.2 rounded-full font-mono font-bold',
                    activeTab === 'watchlist'
                      ? 'bg-white/20 text-white'
                      : 'bg-amber-500/15 text-amber-300'
                  )}
                >
                  {watchlist.length}
                </span>
              </button>
            </div>

            {/* Groww-style Market Segregation Pills under Equity Holdings */}
            {activeTab === 'holdings' && (
              <div className="flex items-center gap-1 p-1 bg-surface-100/90 border border-border/50 rounded-xl">
                <button
                  id="market-tab-all"
                  onClick={() => setMarketTab('all')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer',
                    marketTab === 'all'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  )}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>All</span>
                  <span
                    className={cn(
                      'text-xs px-1.5 py-0.2 rounded-full font-mono',
                      marketTab === 'all'
                        ? 'bg-white/20 text-white'
                        : 'bg-surface-200 text-muted-foreground'
                    )}
                  >
                    {marketCounts.all}
                  </span>
                </button>

                <button
                  id="market-tab-indian"
                  onClick={() => setMarketTab('indian')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer',
                    marketTab === 'indian'
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/25'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  )}
                >
                  <span className="text-sm leading-none">🇮🇳</span>
                  <span>Indian Stocks</span>
                  <span
                    className={cn(
                      'text-xs px-1.5 py-0.2 rounded-full font-mono',
                      marketTab === 'indian'
                        ? 'bg-white/20 text-white'
                        : 'bg-surface-200 text-muted-foreground'
                    )}
                  >
                    {marketCounts.indian}
                  </span>
                </button>

                <button
                  id="market-tab-us"
                  onClick={() => setMarketTab('us')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer',
                    marketTab === 'us'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  )}
                >
                  <span className="text-sm leading-none">🇺🇸</span>
                  <span>US Stocks</span>
                  <span
                    className={cn(
                      'text-xs px-1.5 py-0.2 rounded-full font-mono',
                      marketTab === 'us'
                        ? 'bg-white/20 text-white'
                        : 'bg-surface-200 text-muted-foreground'
                    )}
                  >
                    {marketCounts.us}
                  </span>
                </button>
              </div>
            )}
          </div>

          {activeTab === 'watchlist' && (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="h-9 px-3.5 text-xs sm:text-sm bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl shadow-sm shadow-blue-500/20"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add Stock to Watchlist
              </Button>
            </div>
          )}
        </div>

        {activeTab === 'holdings' ? (
          <>
            {/* Sector breakdown */}
            <Card className="border-border/50">
              <CardHeader className="pb-5">
                <CardTitle>
                  Equity by Sector{' '}
                  <span className="text-sm font-normal text-muted-foreground">
                    {marketTab === 'indian'
                      ? '(Indian Equities)'
                      : marketTab === 'us'
                      ? '(US Equities)'
                      : '(Consolidated)'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SectorAllocationChart data={equitySectors} />
              </CardContent>
            </Card>

            {/* Holdings Card */}
            <Card className="border-border/50">
              <CardHeader className="pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    {marketTab === 'indian' && (
                      <>
                        <span className="text-xl">🇮🇳</span>
                        <span>Indian Equity Holdings ({filteredIndian.length})</span>
                      </>
                    )}
                    {marketTab === 'us' && (
                      <>
                        <span className="text-xl">🇺🇸</span>
                        <span>US Equity Holdings ({filteredUS.length})</span>
                      </>
                    )}
                    {marketTab === 'all' && (
                      <>
                        <Briefcase className="w-5 h-5 text-blue-400" />
                        <span>Equity Holdings ({filteredAll.length})</span>
                      </>
                    )}
                  </CardTitle>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    id="stocks-search"
                    placeholder={
                      marketTab === 'indian'
                        ? 'Search Indian stocks…'
                        : marketTab === 'us'
                        ? 'Search US stocks…'
                        : 'Search stocks…'
                    }
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-8 text-sm bg-card border-border/50 placeholder:text-muted-foreground text-foreground"
                  />
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {marketTab === 'indian' && (
                  <HoldingsTableComponent
                    items={filteredIndian}
                    isLoading={isLoading}
                    isHidden={isHidden}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    openStock={openStock}
                    isInWatchlist={isInWatchlist}
                    toggleWatchlist={toggleWatchlist}
                    emptyMessage={
                      search
                        ? `No Indian stocks found matching "${search}"`
                        : 'No Indian equity holdings in portfolio'
                    }
                  />
                )}

                {marketTab === 'us' && (
                  <HoldingsTableComponent
                    items={filteredUS}
                    isLoading={isLoading}
                    isHidden={isHidden}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    openStock={openStock}
                    isInWatchlist={isInWatchlist}
                    toggleWatchlist={toggleWatchlist}
                    emptyMessage={
                      search
                        ? `No US stocks found matching "${search}"`
                        : 'No US equity holdings in portfolio'
                    }
                  />
                )}

                {marketTab === 'all' && (
                  <div>
                    {/* Indian Equities Section */}
                    <div className="p-3.5 bg-emerald-950/10 border-b border-border/40 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🇮🇳</span>
                        <h3 className="font-semibold text-xs sm:text-sm text-foreground">
                          Indian Equities ({filteredIndian.length})
                        </h3>
                        <span className="text-xs text-muted-foreground font-mono">
                          · {fmt(marketAggregates.indian.total, isHidden)}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
                          NSE / BSE
                        </span>
                      </div>
                      <span
                        className={cn(
                          'text-xs font-semibold',
                          marketAggregates.indian.change >= 0 ? 'text-emerald-400' : 'text-red-400'
                        )}
                      >
                        {fmtChange(marketAggregates.indian.change)} (
                        {(marketAggregates.indian.changePct * 100).toFixed(2)}%)
                      </span>
                    </div>
                    <HoldingsTableComponent
                      items={filteredIndian}
                      isLoading={isLoading}
                      isHidden={isHidden}
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      openStock={openStock}
                      isInWatchlist={isInWatchlist}
                      toggleWatchlist={toggleWatchlist}
                      emptyMessage={
                        search
                          ? `No Indian stocks found matching "${search}"`
                          : 'No Indian equity holdings in portfolio'
                      }
                    />

                    {/* US Equities Section */}
                    <div className="p-3.5 bg-blue-950/10 border-y border-border/40 flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🇺🇸</span>
                        <h3 className="font-semibold text-xs sm:text-sm text-foreground">
                          US Equities ({filteredUS.length})
                        </h3>
                        <span className="text-xs text-muted-foreground font-mono">
                          · {fmt(marketAggregates.us.total, isHidden)}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 font-medium">
                          NASDAQ / NYSE
                        </span>
                      </div>
                      <span
                        className={cn(
                          'text-xs font-semibold',
                          marketAggregates.us.change >= 0 ? 'text-emerald-400' : 'text-red-400'
                        )}
                      >
                        {fmtChange(marketAggregates.us.change)} (
                        {(marketAggregates.us.changePct * 100).toFixed(2)}%)
                      </span>
                    </div>
                    <HoldingsTableComponent
                      items={filteredUS}
                      isLoading={isLoading}
                      isHidden={isHidden}
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      openStock={openStock}
                      isInWatchlist={isInWatchlist}
                      toggleWatchlist={toggleWatchlist}
                      emptyMessage={
                        search
                          ? `No US stocks found matching "${search}"`
                          : 'No US equity holdings in portfolio'
                      }
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          /* Watchlist View */
          <Card className="border-border/50">
            <CardContent className="p-0">
              <WatchlistTable
                onOpenAddModal={() => setIsAddModalOpen(true)}
                openStock={openStock}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add to Watchlist Modal */}
      <AddToWatchlistModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        holdings={equity}
      />
    </>
  );
}
