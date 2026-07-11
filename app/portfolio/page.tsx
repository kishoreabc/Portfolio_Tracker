'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, ArrowUpDown, TrendingUp, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Topbar } from '@/components/layout/Topbar';
import { usePortfolioData } from '@/hooks/usePortfolioData';

function fmt(v: number) {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type SortKey = 'name' | 'currentValue' | 'localAllocPct';

export default function PortfolioPage() {
  const { portfolio, isLoading, lastFetched, apiErrors } = usePortfolioData();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('currentValue');
  const [sortAsc, setSortAsc] = useState(false);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const SortIcon = () => <ArrowUpDown className="w-3 h-3 inline ml-1 opacity-60" />;

  // Separate and filter equity / bond rows
  const { equityRows, bondRows } = useMemo(() => {
    const lc = search.toLowerCase();
    const matches = (r: typeof portfolio[0]) =>
      !search ||
      r.name.toLowerCase().includes(lc) ||
      r.ticker.toLowerCase().includes(lc) ||
      r.sector.toLowerCase().includes(lc);

    const eq = portfolio.filter((r) => r.type === 'equity' && matches(r));
    const bd = portfolio.filter((r) => r.type === 'bond' && matches(r));

    // Totals for local allocation %
    const eqTotal = eq.reduce((s, r) => s + r.currentValue, 0);
    const bdTotal = bd.reduce((s, r) => s + r.currentValue, 0);

    const withAlloc = (rows: typeof portfolio, total: number) =>
      rows
        .map((r) => ({ ...r, localAllocPct: total > 0 ? (r.currentValue / total) * 100 : 0 }))
        .sort((a, b) => {
          const av = sortKey === 'localAllocPct' ? a.localAllocPct : (a as any)[sortKey] ?? 0;
          const bv = sortKey === 'localAllocPct' ? b.localAllocPct : (b as any)[sortKey] ?? 0;
          if (typeof av === 'string') return sortAsc ? av.localeCompare(String(bv)) : String(bv).localeCompare(av);
          return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
        });

    return {
      equityRows: withAlloc(eq, eqTotal),
      bondRows: withAlloc(bd, bdTotal),
    };
  }, [portfolio, search, sortKey, sortAsc]);

  const equityTotal = equityRows.reduce((s, r) => s + r.currentValue, 0);
  const bondTotal = bondRows.reduce((s, r) => s + r.currentValue, 0);

  const SkeletonRows = ({ cols }: { cols: number }) => (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i} className="border-border/30">
          {Array.from({ length: cols }).map((_, j) => (
            <TableCell key={j}><Skeleton className="h-4 bg-white/5" /></TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );

  return (
    <>
      <Topbar lastFetched={lastFetched} pageTitle="Portfolio" apiErrors={apiErrors} />
      <div className="p-6 space-y-5 animate-fade-in-up">

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="portfolio-search"
            placeholder="Search by name, ticker, or sector…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border/50"
          />
        </div>

        {/* ── Equity Holdings ── */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border-border/50">
            <CardHeader className="pb-2 flex flex-row items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-sm font-semibold text-blue-400">
                  Equity Holdings
                  <span className="ml-2 text-muted-foreground font-normal text-xs">
                    ({equityRows.length} stocks · {fmt(equityTotal)})
                  </span>
                </CardTitle>
                <p className="text-[11px] text-muted-foreground">Alloc % calculated from equity total only</p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead className="text-sm font-semibold text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => toggleSort('name')}>
                        Name <SortIcon />
                      </TableHead>
                      <TableHead className="text-sm font-semibold text-muted-foreground">Ticker</TableHead>
                      <TableHead className="text-sm font-semibold text-muted-foreground">Sector</TableHead>
                      <TableHead className="text-sm font-semibold text-muted-foreground text-right cursor-pointer hover:text-foreground" onClick={() => toggleSort('currentValue')}>
                        Value <SortIcon />
                      </TableHead>
                      <TableHead className="text-sm font-semibold text-muted-foreground text-right cursor-pointer hover:text-foreground" onClick={() => toggleSort('localAllocPct')}>
                        Alloc % <SortIcon />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? <SkeletonRows cols={5} /> : equityRows.map((row, i) => (
                      <motion.tr key={row.id}
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.015 }}
                        className="border-border/30 hover:bg-white/[0.02] transition-colors"
                      >
                        <TableCell className="text-xs font-medium text-foreground max-w-[200px] truncate">{row.name}</TableCell>
                        <TableCell className="text-xs font-mono text-blue-400 font-semibold">{row.ticker}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{row.sector}</TableCell>
                        <TableCell className="text-right text-xs font-medium tabular-nums">{fmt(row.currentValue)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-12 h-1 rounded-full bg-white/10 overflow-hidden">
                              <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.min(row.localAllocPct, 100)}%` }} />
                            </div>
                            <span className="text-xs text-blue-400 font-semibold tabular-nums w-12 text-right">
                              {row.localAllocPct.toFixed(2)}%
                            </span>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                    {/* Equity subtotal */}
                    {!isLoading && equityRows.length > 0 && (
                      <TableRow className="border-t border-border/50 bg-white/[0.015]">
                        <TableCell colSpan={3} className="text-xs font-bold text-foreground">Total Equity</TableCell>
                        <TableCell className="text-right text-xs font-bold tabular-nums">{fmt(equityTotal)}</TableCell>
                        <TableCell className="text-right text-xs font-bold text-blue-400">100.00%</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Bond Holdings ── */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-border/50">
            <CardHeader className="pb-2 flex flex-row items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-sm font-semibold text-purple-400">
                  Bond Holdings
                  <span className="ml-2 text-muted-foreground font-normal text-xs">
                    ({bondRows.length} bonds · {fmt(bondTotal)})
                  </span>
                </CardTitle>
                <p className="text-[11px] text-muted-foreground">Alloc % calculated from bond total only</p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead className="text-sm font-semibold text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => toggleSort('name')}>
                        Name <SortIcon />
                      </TableHead>
                      <TableHead className="text-sm font-semibold text-muted-foreground">ISIN</TableHead>
                      <TableHead className="text-sm font-semibold text-muted-foreground">Sector</TableHead>
                      <TableHead className="text-sm font-semibold text-muted-foreground text-right cursor-pointer hover:text-foreground" onClick={() => toggleSort('currentValue')}>
                        Value <SortIcon />
                      </TableHead>
                      <TableHead className="text-sm font-semibold text-muted-foreground text-right cursor-pointer hover:text-foreground" onClick={() => toggleSort('localAllocPct')}>
                        Alloc % <SortIcon />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? <SkeletonRows cols={5} /> : bondRows.map((row, i) => (
                      <motion.tr key={row.id}
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.015 }}
                        className="border-border/30 hover:bg-white/[0.02] transition-colors"
                      >
                        <TableCell className="text-xs font-medium text-foreground max-w-[200px] truncate">{row.name}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{row.ticker}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{row.sector}</TableCell>
                        <TableCell className="text-right text-xs font-medium tabular-nums">{fmt(row.currentValue)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-12 h-1 rounded-full bg-white/10 overflow-hidden">
                              <div className="h-full bg-purple-400 rounded-full" style={{ width: `${Math.min(row.localAllocPct, 100)}%` }} />
                            </div>
                            <span className="text-xs text-purple-400 font-semibold tabular-nums w-12 text-right">
                              {row.localAllocPct.toFixed(2)}%
                            </span>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                    {/* Bond subtotal */}
                    {!isLoading && bondRows.length > 0 && (
                      <TableRow className="border-t border-border/50 bg-white/[0.015]">
                        <TableCell colSpan={3} className="text-xs font-bold text-foreground">Total Bonds</TableCell>
                        <TableCell className="text-right text-xs font-bold tabular-nums">{fmt(bondTotal)}</TableCell>
                        <TableCell className="text-right text-xs font-bold text-purple-400">100.00%</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

      </div>
    </>
  );
}

