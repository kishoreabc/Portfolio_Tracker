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
import { cn } from '@/lib/utils';

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

  const equitySectors = useMemo(
    () =>
      sectorAllocation
        .filter((s) => s.equityValue > 0)
        .map((s) => ({ ...s, totalValue: s.equityValue })),
    [sectorAllocation]
  );

  const filteredAndSorted = useMemo(() => {
    const result = [...equity].filter(
      (h) =>
        !search ||
        h.name.toLowerCase().includes(search.toLowerCase()) ||
        h.ticker.toLowerCase().includes(search.toLowerCase()) ||
        h.sector.toLowerCase().includes(search.toLowerCase())
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
  }, [equity, search, sortConfig]);

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

  return (
    <>
      <Topbar lastFetched={lastFetched} pageTitle="Stocks" apiErrors={apiErrors} />
      <div className="p-3 sm:p-4 md:p-6 space-y-4 animate-fade-in-up">
        {/* Top Summary KPIs — dynamically adapts to Holdings vs Watchlist */}
        {activeTab === 'holdings' ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <KpiCard
              id="kpi-stocks-equity"
              title="Equity Value"
              value={isLoading ? '—' : fmt(equityTotal, isHidden)}
              subValue={isLoading ? undefined : `${equity.length} holdings`}
              icon={TrendingUp}
              accentColor="blue"
              isLoading={isLoading}
              isPrivate
            />
            <KpiCard
              id="kpi-stocks-today-change"
              title="Today's Change"
              value={isLoading ? '—' : fmt(Math.abs(todaysChange), isHidden)}
              change={isLoading ? undefined : todaysChangePct}
              changeLabel="today"
              icon={Activity}
              accentColor={todaysChange >= 0 ? 'green' : 'red'}
              isLoading={isLoading}
              isPrivate
            />
            <KpiCard
              id="kpi-stocks-top-gainer"
              title="Top Gainer"
              value={isLoading || !winners[0] ? '—' : winners[0].ticker}
              subValue={
                isLoading || !winners[0]
                  ? undefined
                  : `${fmtPrice(winners[0].currentPrice)} · +${(winners[0].percentChange * 100).toFixed(2)}% (${winners[0].name})`
              }
              icon={ArrowUpRight}
              accentColor={(winners[0]?.percentChange ?? 0) >= 0 ? 'green' : 'red'}
              isLoading={isLoading}
              onClick={winners[0] ? () => openStock(winners[0].ticker) : undefined}
            />
            <KpiCard
              id="kpi-stocks-top-loser"
              title="Top Loser"
              value={isLoading || !losers[0] ? '—' : losers[0].ticker}
              subValue={
                isLoading || !losers[0]
                  ? undefined
                  : `${fmtPrice(losers[0].currentPrice)} · ${(losers[0].percentChange * 100).toFixed(2)}% (${losers[0].name})`
              }
              icon={ArrowDownRight}
              accentColor={(losers[0]?.percentChange ?? 0) >= 0 ? 'green' : 'red'}
              isLoading={isLoading}
              onClick={losers[0] ? () => openStock(losers[0].ticker) : undefined}
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

        {/* View Mode Switcher: Holdings vs Watchlist */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
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
                <CardTitle>Equity by Sector</CardTitle>
              </CardHeader>
              <CardContent>
                <SectorAllocationChart data={equitySectors} />
              </CardContent>
            </Card>

            {/* Holdings table */}
            <Card className="border-border/50">
              <CardHeader className="pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CardTitle>Equity Holdings ({equity.length})</CardTitle>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    id="stocks-search"
                    placeholder="Search stocks…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-8 text-sm bg-card border-border/50 placeholder:text-muted-foreground text-foreground"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/50 hover:bg-transparent">
                        <TableHead className="w-10 px-2 text-center" title="Watchlist status">
                          <Star className="w-3.5 h-3.5 text-muted-foreground/40 mx-auto" />
                        </TableHead>
                        {[
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
                        ].map((col) => (
                          <TableHead
                            key={col.key}
                            className={`text-sm font-semibold uppercase tracking-wider whitespace-nowrap select-none transition-colors cursor-pointer group hover:text-foreground ${
                              col.align === 'right' ? 'text-right' : 'text-left'
                            } ${
                              sortConfig.key === col.key
                                ? 'text-foreground font-bold'
                                : 'text-muted-foreground'
                            }`}
                            onClick={() => handleSort(col.key)}
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
                        Array.from({ length: 8 }).map((_, i) => (
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
                      ) : (
                        filteredAndSorted.map((h, i) => {
                          const isWatched = isInWatchlist(h.ticker);
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
                                className="font-mono text-xs font-semibold text-blue-400 cursor-pointer hover:text-blue-300 hover:underline transition-colors"
                                onClick={() => openStock(h.ticker)}
                              >
                                {h.ticker}
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
                                {isHidden ? PRIVACY_MASK : h.shares.toLocaleString()}
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
