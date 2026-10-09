'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Star,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
  ExternalLink,
  Sparkles,
  BarChart2,
  Compass,
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useWatchlistQuotes } from '@/hooks/useWatchlistQuotes';
import type { WatchlistStockQuote } from '@/types/watchlist';

function fmtPrice(v?: number) {
  if (v == null || isNaN(v)) return '—';
  return `₹${Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtChange(v?: number) {
  if (v == null || isNaN(v)) return '—';
  const sign = v > 0 ? '+' : v < 0 ? '-' : '';
  return `${sign}₹${Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtMarketCap(v?: number) {
  if (!v || isNaN(v)) return '—';
  // Indian Standard Units: Lakh Crore (L Cr), Crore (Cr), Lakh (L)
  if (v >= 1e12) return `₹${(v / 1e12).toFixed(2)}L Cr`;
  if (v >= 1e7) return `₹${Math.round(v / 1e7).toLocaleString('en-IN')} Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toLocaleString('en-IN', { maximumFractionDigits: 1 })}L`;
  return `₹${v.toLocaleString('en-IN')}`;
}

interface WatchlistTableProps {
  onOpenAddModal: () => void;
  openStock: (ticker: string) => void;
}

export function WatchlistTable({ onOpenAddModal, openStock }: WatchlistTableProps) {
  const { watchlist, removeFromWatchlist, addToWatchlist, resetToDefault } = useWatchlist();
  const { quotes, list, isLoading, isFetching, refetch } = useWatchlistQuotes(watchlist);

  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: '',
    direction: 'asc',
  });

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  // Filter and sort items
  const filteredAndSorted = useMemo(() => {
    // If quote is not yet loaded, create placeholder item with symbol
    const items: (WatchlistStockQuote | { symbol: string; name?: string; sector?: string; exchange?: string })[] = watchlist.map((sym) => {
      const q = quotes[sym];
      if (q) {
        return q;
      }
      return {
        symbol: sym,
        name: sym,
        exchange: 'NSE',
        sector: '',
        currentPrice: 0,
        priceChange: 0,
        percentChange: 0,
      };
    });

    const filtered = items.filter((item) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const symMatch = item.symbol.toLowerCase().includes(q);
      const nameMatch = item.name ? item.name.toLowerCase().includes(q) : false;
      const sectorMatch = (item as WatchlistStockQuote).sector?.toLowerCase().includes(q);
      return symMatch || nameMatch || sectorMatch;
    });

    if (sortConfig.key) {
      filtered.sort((a: any, b: any) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];

        if (valA == null && valB == null) return 0;
        if (valA == null) return 1;
        if (valB == null) return -1;

        if (typeof valA === 'string') {
          return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [watchlist, quotes, search, sortConfig]);

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig.key !== columnKey) {
      return (
        <ArrowUpDown className="inline-block ml-1.5 w-3.5 h-3.5 text-muted-foreground/35 group-hover:text-muted-foreground/80 transition-colors" />
      );
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="inline-block ml-1.5 w-3.5 h-3.5 text-amber-400 font-bold transition-transform" />
    ) : (
      <ArrowDown className="inline-block ml-1.5 w-3.5 h-3.5 text-amber-400 font-bold transition-transform" />
    );
  };

  if (watchlist.length === 0) {
    return (
      <div className="py-16 px-4 text-center">
        <div className="max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400 shadow-lg shadow-amber-500/10">
            <Star className="w-8 h-8 fill-amber-400/30 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Your Watchlist is Empty</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Add stocks you want to monitor with real-time market prices, percentage changes, and charts without holding them.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              onClick={onOpenAddModal}
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-md shadow-blue-500/20"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Stock to Watchlist
            </Button>
            <Button
              variant="outline"
              onClick={resetToDefault}
              className="bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground border-border/50"
            >
              <Sparkles className="w-4 h-4 mr-1.5 text-amber-400" />
              Load Popular Stocks
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Table Control Header */}
      <div className="px-5 pt-2 pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {watchlist.length} {watchlist.length === 1 ? 'Stock' : 'Stocks'} Monitored
          </span>
          {isFetching && (
            <span className="inline-flex items-center gap-1 text-[11px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
              Updating live quotes
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              id="watchlist-search"
              placeholder="Filter watchlist…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm bg-card border-border/50 placeholder:text-muted-foreground text-foreground"
            />
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 px-2.5 bg-card border-border/50 hover:bg-white/5 text-muted-foreground hover:text-foreground shrink-0"
            title="Refresh watchlist quotes"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-blue-400' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Watchlist Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              {[
                { key: 'symbol', label: 'Symbol', align: 'left' },
                { key: 'name', label: 'Name', align: 'left' },
                { key: 'sector', label: 'Sector', align: 'left' },
                { key: 'currentPrice', label: 'CMP', align: 'right' },
                { key: 'priceChange', label: 'Price Chg', align: 'right' },
                { key: 'percentChange', label: 'Change %', align: 'right' },
                { key: 'fiftyTwoWeekHigh', label: '52W Range', align: 'center' },
                { key: 'trailingPE', label: 'P/E', align: 'right' },
                { key: 'marketCap', label: 'Mkt Cap', align: 'right' },
              ].map((col, index) => (
                <TableHead
                  key={col.key}
                  className={`text-sm font-semibold uppercase tracking-wider whitespace-nowrap select-none transition-colors cursor-pointer group hover:text-foreground ${
                    index === 0 ? 'pl-5' : ''
                  } ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  } ${sortConfig.key === col.key ? 'text-foreground font-bold' : 'text-muted-foreground'}`}
                  onClick={() => handleSort(col.key)}
                >
                  <span
                    className={`inline-flex items-center ${
                      col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''
                    }`}
                  >
                    {col.label}
                    <SortIcon columnKey={col.key} />
                  </span>
                </TableHead>
              ))}
              <TableHead className="text-right text-sm font-semibold uppercase tracking-wider text-muted-foreground pr-5">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: Math.min(watchlist.length, 6) }).map((_, i) => (
                <TableRow key={i} className="border-border/30">
                  {Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j} className={j === 0 ? 'pl-5' : ''}>
                      <Skeleton className="h-4 bg-white/5" />
                    </TableCell>
                  ))}
                  <TableCell className="pr-5">
                    <Skeleton className="h-4 w-12 ml-auto bg-white/5" />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              filteredAndSorted.map((item, i) => {
                const quote = item as WatchlistStockQuote;
                const isPositive = quote.percentChange > 0;
                const isNegative = quote.percentChange < 0;

                // 52W range calculation
                const low = quote.fiftyTwoWeekLow;
                const high = quote.fiftyTwoWeekHigh;
                const cmp = quote.currentPrice;
                let rangePercent = 50;
                if (low && high && high > low && cmp) {
                  rangePercent = Math.max(0, Math.min(100, ((cmp - low) / (high - low)) * 100));
                }

                return (
                  <motion.tr
                    key={item.symbol}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.015 }}
                    className="border-border/30 hover:bg-white/[0.02] transition-colors group"
                  >

                    {/* Symbol */}
                    <TableCell
                      className="font-mono text-xs font-semibold text-blue-400 cursor-pointer hover:text-blue-300 hover:underline transition-colors pl-5 whitespace-nowrap"
                      onClick={() => openStock(item.symbol)}
                    >
                      {item.symbol}
                    </TableCell>

                    {/* Name */}
                    <TableCell
                      className="text-sm font-semibold text-foreground max-w-[180px] truncate cursor-pointer hover:text-blue-300 transition-colors"
                      title={item.name}
                      onClick={() => openStock(item.symbol)}
                    >
                      {item.name || item.symbol}
                    </TableCell>

                    {/* Sector */}
                    <TableCell className="text-xs text-muted-foreground/80 font-normal">
                      {(() => {

                        const sectorName = quote.sector || '—';
                        return (
                          <div className="flex items-center gap-1.5">
                            <span className="text-foreground/90 font-medium truncate max-w-[140px]" title={sectorName}>
                              {sectorName}
                            </span>
                          </div>
                        );
                      })()}
                    </TableCell>

                    {/* CMP */}
                    <TableCell className="text-right text-sm font-medium tabular-nums text-foreground">
                      {fmtPrice(quote.currentPrice)}
                    </TableCell>

                    {/* Price Change */}
                    <TableCell className="text-right text-sm font-medium tabular-nums">
                      <span className={isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : 'text-foreground/80'}>
                        {fmtChange(quote.priceChange)}
                      </span>
                    </TableCell>

                    {/* Percent Change */}
                    <TableCell className="text-right text-sm font-medium tabular-nums">
                      <span
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold ${
                          isPositive
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                            : isNegative
                            ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {isPositive ? <ArrowUp className="w-3 h-3" /> : isNegative ? <ArrowDown className="w-3 h-3" /> : null}
                        {quote.percentChange != null
                          ? `${isPositive ? '+' : ''}${quote.percentChange.toFixed(2)}%`
                          : '—'}
                      </span>
                    </TableCell>

                    {/* 52W Range Indicator */}
                    <TableCell className="text-center align-middle">
                      {low && high ? (
                        <div
                          className="w-28 mx-auto space-y-1"
                          title={`52W Range: ₹${low.toFixed(2)} - ₹${high.toFixed(2)} (CMP is at ${rangePercent.toFixed(0)}%)`}
                        >
                          <div className="h-1.5 bg-surface-200 rounded-full overflow-hidden relative">
                            <div
                              className="h-full bg-gradient-to-r from-red-400 via-amber-400 to-emerald-400 rounded-full transition-all duration-300"
                              style={{ width: `${rangePercent}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[9px] font-mono text-muted-foreground/70">
                            <span>₹{low.toFixed(0)}</span>
                            <span>₹{high.toFixed(0)}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </TableCell>

                    {/* P/E */}
                    <TableCell className="text-right text-sm font-medium tabular-nums text-foreground/90">
                      {quote.trailingPE ? `${quote.trailingPE.toFixed(2)}x` : '—'}
                    </TableCell>

                    {/* Market Cap */}
                    <TableCell className="text-right text-sm font-medium tabular-nums text-foreground/90">
                      {fmtMarketCap(quote.marketCap)}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right pr-5">
                      <div className="inline-flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/stock-analysis/${item.symbol}`}
                          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                          title={`View fundamental analysis & Screener metrics for ${item.symbol}`}
                        >
                          <Compass className="w-3.5 h-3.5" />
                        </Link>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => openStock(item.symbol)}
                          className="h-7 w-7 text-muted-foreground hover:text-blue-400 hover:bg-blue-500/10"
                          title={`Open ${item.symbol} chart & analysis`}
                        >
                          <BarChart2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => removeFromWatchlist(item.symbol)}
                          className="h-7 w-7 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                          title={`Remove ${item.symbol} from watchlist`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
