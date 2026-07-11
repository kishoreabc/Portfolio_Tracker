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
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell,
} from 'recharts';

function fmt(v: number) {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPrice(v: number) {
  return `₹${Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtChange(v: number) {
  const sign = v > 0 ? '+' : v < 0 ? '-' : '';
  return `${sign}₹${Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function StocksPage() {
  const { equity, winners, losers, isLoading, lastFetched, apiErrors, sectorAllocation } = usePortfolioData();
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: '', direction: 'asc' });

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
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
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
      <div className="p-6 space-y-4 animate-fade-in-up">
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
                  <div key={w.ticker} className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                    <div>
                      <p className="text-small font-semibold text-foreground">{w.ticker}</p>
                      <p className="text-caption text-muted-foreground truncate max-w-[140px]">{w.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-body font-bold text-emerald-400">+{(w.percentChange * 100).toFixed(2)}%</p>
                      <p className="text-caption text-muted-foreground">{fmtPrice(w.currentPrice)}</p>
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
                  <div key={l.ticker} className="flex items-center justify-between px-3 py-2 rounded-lg bg-red-500/5 border border-red-500/10">
                    <div>
                      <p className="text-small font-semibold text-foreground">{l.ticker}</p>
                      <p className="text-caption text-muted-foreground truncate max-w-[140px]">{l.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-body font-bold text-red-400">{(l.percentChange * 100).toFixed(2)}%</p>
                      <p className="text-caption text-muted-foreground">{fmtPrice(l.currentPrice)}</p>
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
          <CardHeader className="pb-5 flex flex-row items-center justify-between">
            <CardTitle>Equity Holdings ({equity.length})</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input id="stocks-search" placeholder="Search stocks…" value={search}
                onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-small bg-card border-border/50 placeholder:text-body text-body" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-body-lg font-semibold text-foreground/90 hover:text-foreground cursor-pointer select-none tracking-wide" onClick={() => handleSort('ticker')}>Symbol <SortIcon columnKey="ticker" /></TableHead>
                    <TableHead className="text-body-lg font-semibold text-foreground/90 hover:text-foreground cursor-pointer select-none tracking-wide" onClick={() => handleSort('name')}>Name <SortIcon columnKey="name" /></TableHead>
                    <TableHead className="text-body-lg font-semibold text-foreground/90 hover:text-foreground cursor-pointer select-none tracking-wide" onClick={() => handleSort('sector')}>Sector <SortIcon columnKey="sector" /></TableHead>
                    <TableHead className="text-body-lg font-semibold text-foreground/90 hover:text-foreground cursor-pointer select-none text-right tracking-wide" onClick={() => handleSort('shares')}>Shares <SortIcon columnKey="shares" /></TableHead>
                    <TableHead className="text-body-lg font-semibold text-foreground/90 hover:text-foreground cursor-pointer select-none text-right tracking-wide" onClick={() => handleSort('currentPrice')}>CMP <SortIcon columnKey="currentPrice" /></TableHead>
                    <TableHead className="text-body-lg font-semibold text-foreground/90 hover:text-foreground cursor-pointer select-none text-right tracking-wide" onClick={() => handleSort('currentValue')}>Value <SortIcon columnKey="currentValue" /></TableHead>
                    <TableHead className="text-body-lg font-semibold text-foreground/90 hover:text-foreground cursor-pointer select-none text-right tracking-wide" onClick={() => handleSort('allocationPercent')}>Alloc % <SortIcon columnKey="allocationPercent" /></TableHead>
                    <TableHead className="text-body-lg font-semibold text-foreground/90 hover:text-foreground cursor-pointer select-none text-right tracking-wide" onClick={() => handleSort('priceChange')}>Price Chg <SortIcon columnKey="priceChange" /></TableHead>
                    <TableHead className="text-body-lg font-semibold text-foreground/90 hover:text-foreground cursor-pointer select-none text-right tracking-wide" onClick={() => handleSort('percentChange')}>Change % <SortIcon columnKey="percentChange" /></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i} className="border-border/30">
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 bg-white/5" /></TableCell>
                      ))}
                    </TableRow>
                  )) : filteredAndSorted.map((h, i) => (
                    <motion.tr key={h.ticker} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.015 }} className="border-border/30 hover:bg-white/[0.02] transition-colors">
                      <TableCell className="font-mono text-small font-semibold text-blue-400">{h.ticker}</TableCell>
                      <TableCell className="text-body font-semibold text-foreground max-w-[160px] truncate">{h.name}</TableCell>
                      <TableCell className="text-small text-muted-foreground/80 font-normal">{h.sector}</TableCell>
                      <TableCell className="text-right text-body font-medium tabular-nums text-foreground/90">{h.shares.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-body font-medium tabular-nums text-foreground/90">{fmtPrice(h.currentPrice)}</TableCell>
                      <TableCell className="text-right text-body font-medium tabular-nums text-foreground">{fmt(h.currentValue)}</TableCell>
                      <TableCell className="text-right text-body font-medium tabular-nums text-foreground/90">
                        {(h.allocationPercent).toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right text-body font-medium tabular-nums">
                        <span className={h.priceChange >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {fmtChange(h.priceChange)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-body font-medium tabular-nums">
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
