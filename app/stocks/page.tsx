'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, TrendingUp, TrendingDown, ArrowUpDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Topbar } from '@/components/layout/Topbar';
import { SectorAllocationChart } from '@/components/charts/SectorAllocationChart';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { useStockModal } from '@/lib/stock-modal-context';
import { usePrivacy, PRIVACY_MASK } from '@/lib/privacy-context';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell,
} from 'recharts';

function fmt(v: number, isHidden: boolean = false) {
  if (isHidden) return PRIVACY_MASK;
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPrice(v: number, isHidden: boolean = false) {
  if (isHidden) return PRIVACY_MASK;
  return `₹${Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtChange(v: number) {
  const sign = v > 0 ? '+' : v < 0 ? '-' : '';
  return `${sign}₹${Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function StocksPage() {
  const { equity, winners, losers, isLoading, lastFetched, apiErrors, sectorAllocation } = usePortfolioData();
  const { isHidden } = usePrivacy();
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: '', direction: 'asc' });
  const { openStock } = useStockModal();

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const equitySectors = useMemo(() =>
    sectorAllocation.filter((s) => s.equityValue > 0).map((s) => ({ ...s, totalValue: s.equityValue })),
    [sectorAllocation]
  );

  const filteredAndSorted = useMemo(() => {
    let result = [...equity].filter((h) =>
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

  const SortIcon = ({ columnKey }: { columnKey: string }) => (
    <ArrowUpDown className={`inline-block ml-1 w-3 h-3 transition-colors ${sortConfig.key === columnKey ? 'text-foreground' : 'text-muted-foreground/50'}`} />
  );

  return (
    <>
      <Topbar lastFetched={lastFetched} pageTitle="Stocks" apiErrors={apiErrors} />
      <div className="p-3 sm:p-4 md:p-6 space-y-4 animate-fade-in-up">
        {/* Winners / Losers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-border/50">
            <CardHeader className="pb-5">
              <CardTitle className="flex items-center gap-2 text-emerald-400">
                <TrendingUp className="w-4 h-4 text-emerald-400" /> Top Gainers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? <Skeleton className="h-10 bg-white/5" /> :
                winners.slice(0, 1).map((w) => (
                  <div key={w.ticker} className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                    <div>
                      <p className="text-sm font-bold text-foreground">{w.ticker}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[140px]">{w.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-400">+{(w.percentChange * 100).toFixed(2)}%</p>
                      <p className="text-xs text-muted-foreground tabular-nums">{fmtPrice(w.currentPrice, isHidden)}</p>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-5">
              <CardTitle className="flex items-center gap-2 text-red-400">
                <TrendingDown className="w-4 h-4 text-red-400" /> Top Losers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? <Skeleton className="h-10 bg-white/5" /> :
                losers.slice(0, 1).map((l) => (
                  <div key={l.ticker} className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-red-500/5 border border-red-500/10">
                    <div>
                      <p className="text-sm font-bold text-foreground">{l.ticker}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[140px]">{l.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-400">{(l.percentChange * 100).toFixed(2)}%</p>
                      <p className="text-xs text-muted-foreground tabular-nums">{fmtPrice(l.currentPrice, isHidden)}</p>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>

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
            <CardTitle>Equity Holdings ({equity.length})</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input id="stocks-search" placeholder="Search stocks…" value={search}
                onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-sm bg-card border-border/50 placeholder:text-muted-foreground text-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground cursor-pointer select-none" onClick={() => handleSort('ticker')}>Symbol <SortIcon columnKey="ticker" /></TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground cursor-pointer select-none" onClick={() => handleSort('name')}>Name <SortIcon columnKey="name" /></TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground cursor-pointer select-none" onClick={() => handleSort('sector')}>Sector <SortIcon columnKey="sector" /></TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground cursor-pointer select-none text-right" onClick={() => handleSort('shares')}>Shares <SortIcon columnKey="shares" /></TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground cursor-pointer select-none text-right" onClick={() => handleSort('currentPrice')}>CMP <SortIcon columnKey="currentPrice" /></TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground cursor-pointer select-none text-right" onClick={() => handleSort('currentValue')}>Value <SortIcon columnKey="currentValue" /></TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground cursor-pointer select-none text-right" onClick={() => handleSort('allocationPercent')}>Alloc % <SortIcon columnKey="allocationPercent" /></TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground cursor-pointer select-none text-right" onClick={() => handleSort('valuationRatio')}>P/E (P/B) <SortIcon columnKey="valuationRatio" /></TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground cursor-pointer select-none text-right" onClick={() => handleSort('priceChange')}>Price Chg <SortIcon columnKey="priceChange" /></TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground cursor-pointer select-none text-right" onClick={() => handleSort('percentChange')}>Change % <SortIcon columnKey="percentChange" /></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i} className="border-border/30">
                      {Array.from({ length: 10 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 bg-white/5" /></TableCell>
                      ))}
                    </TableRow>
                  )) : filteredAndSorted.map((h, i) => (
                    <motion.tr key={h.ticker} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.015 }} className="border-border/30 hover:bg-white/[0.02] transition-colors">
                      <TableCell
                        className="font-mono text-xs font-semibold text-blue-400 cursor-pointer hover:text-blue-300 hover:underline transition-colors"
                        onClick={() => openStock(h.ticker)}
                      >{h.ticker}</TableCell>
                      <TableCell
                        className="text-sm font-semibold text-foreground max-w-[160px] truncate cursor-pointer hover:text-blue-300 transition-colors"
                        title={h.name}
                        onClick={() => openStock(h.ticker)}
                      >{h.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground/80 font-normal">{h.sector}</TableCell>
                      <TableCell className="text-right text-sm font-medium tabular-nums text-foreground/90">{isHidden ? PRIVACY_MASK : h.shares.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm font-medium tabular-nums text-foreground/90">{fmtPrice(h.currentPrice, isHidden)}</TableCell>
                      <TableCell className="text-right text-sm font-medium tabular-nums text-foreground">{fmt(h.currentValue, isHidden)}</TableCell>
                      <TableCell className="text-right text-sm font-medium tabular-nums text-foreground/90">
                        {(h.allocationPercent).toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium tabular-nums">
                        {h.valuationRatio ? (
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <span className={h.valuationType === 'PB' ? 'text-amber-400 font-semibold' : 'text-foreground/90 font-medium'}>
                              {h.valuationRatio.toFixed(2)}x
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wider uppercase ${
                                h.valuationType === 'PB'
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              }`}
                              title={h.valuationType === 'PB' ? 'Price to Book Value (Banking)' : 'Price to Earnings Ratio'}
                            >
                              {h.valuationType}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium tabular-nums">
                        <span className={h.priceChange >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {fmtChange(h.priceChange)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium tabular-nums">
                        <span className={h.percentChange >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {h.percentChange >= 0 ? '+' : '-'}{Math.abs(h.percentChange * 100).toFixed(2)}%
                        </span>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
