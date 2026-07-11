'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, ArrowUpDown, TrendingUp, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  const [equitySearch, setEquitySearch] = useState('');
  const [bondSearch, setBondSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('currentValue');
  const [sortAsc, setSortAsc] = useState(false);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const SortIcon = () => <ArrowUpDown className="w-3 h-3 inline ml-1 opacity-60" />;

  const equityRows = useMemo(() => {
    const lc = equitySearch.toLowerCase();
    const eq = portfolio.filter((r) => r.type === 'equity' && (
      !equitySearch ||
      r.name.toLowerCase().includes(lc) ||
      r.ticker.toLowerCase().includes(lc) ||
      r.sector.toLowerCase().includes(lc)
    ));
    const eqTotal = eq.reduce((s, r) => s + r.currentValue, 0);
    return eq
      .map((r) => ({ ...r, localAllocPct: eqTotal > 0 ? (r.currentValue / eqTotal) * 100 : 0 }))
      .sort((a, b) => {
        const av = sortKey === 'localAllocPct' ? a.localAllocPct : (a as any)[sortKey] ?? 0;
        const bv = sortKey === 'localAllocPct' ? b.localAllocPct : (b as any)[sortKey] ?? 0;
        if (typeof av === 'string') return sortAsc ? av.localeCompare(String(bv)) : String(bv).localeCompare(av);
        return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
      });
  }, [portfolio, equitySearch, sortKey, sortAsc]);

  const bondRows = useMemo(() => {
    const lc = bondSearch.toLowerCase();
    const bd = portfolio.filter((r) => r.type === 'bond' && (
      !bondSearch ||
      r.name.toLowerCase().includes(lc) ||
      r.ticker.toLowerCase().includes(lc) ||
      r.sector.toLowerCase().includes(lc)
    ));
    const bdTotal = bd.reduce((s, r) => s + r.currentValue, 0);
    return bd
      .map((r) => ({ ...r, localAllocPct: bdTotal > 0 ? (r.currentValue / bdTotal) * 100 : 0 }))
      .sort((a, b) => {
        const av = sortKey === 'localAllocPct' ? a.localAllocPct : (a as any)[sortKey] ?? 0;
        const bv = sortKey === 'localAllocPct' ? b.localAllocPct : (b as any)[sortKey] ?? 0;
        if (typeof av === 'string') return sortAsc ? av.localeCompare(String(bv)) : String(bv).localeCompare(av);
        return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
      });
  }, [portfolio, bondSearch, sortKey, sortAsc]);

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
        {/* ── Equity Holdings ── */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border-border/50">
            <CardHeader className="pb-5 flex flex-row items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-blue-400">
                    Equity Holdings
                    <span className="ml-2 text-small text-muted-foreground font-normal">
                      ({equityRows.length} stocks · {fmt(equityTotal)})
                    </span>
                  </CardTitle>
                </div>
              </div>
              <div className="relative w-64 flex-shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search stocks…"
                  value={equitySearch}
                  onChange={(e) => setEquitySearch(e.target.value)}
                  className="pl-9 bg-background border-border/50 h-9 text-sm"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead className="text-body-lg font-semibold text-foreground/90 tracking-wide cursor-pointer hover:text-foreground" onClick={() => toggleSort('name')}>
                        Name <SortIcon />
                      </TableHead>
                      <TableHead className="text-body-lg font-semibold text-foreground/90 tracking-wide">Ticker</TableHead>
                      <TableHead className="text-body-lg font-semibold text-foreground/90 tracking-wide">Sector</TableHead>
                      <TableHead className="text-body-lg font-semibold text-foreground/90 tracking-wide text-right cursor-pointer hover:text-foreground" onClick={() => toggleSort('currentValue')}>
                        Value <SortIcon />
                      </TableHead>
                      <TableHead className="text-body-lg font-semibold text-foreground/90 tracking-wide text-right cursor-pointer hover:text-foreground" onClick={() => toggleSort('localAllocPct')}>
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
                        <TableCell className="text-body font-semibold text-foreground max-w-[200px] truncate">{row.name}</TableCell>
                        <TableCell className="text-small font-mono text-blue-400 font-semibold">{row.ticker}</TableCell>
                        <TableCell className="text-small text-muted-foreground/80 font-normal">{row.sector}</TableCell>
                        <TableCell className="text-right text-body font-medium tabular-nums text-foreground">{fmt(row.currentValue)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-12 h-1 rounded-full bg-white/10 overflow-hidden">
                              <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.min(row.localAllocPct, 100)}%` }} />
                            </div>
                            <span className="text-body text-blue-400 font-semibold tabular-nums w-12 text-right">
                              {row.localAllocPct.toFixed(2)}%
                            </span>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                    {/* Equity subtotal */}
                    {!isLoading && equityRows.length > 0 && (
                      <TableRow className="border-t border-border/50 bg-white/[0.015]">
                        <TableCell colSpan={3} className="text-body font-bold text-foreground">Total Equity</TableCell>
                        <TableCell className="text-right text-body font-bold tabular-nums text-foreground">{fmt(equityTotal)}</TableCell>
                        <TableCell className="text-right text-body font-bold text-blue-400">100.00%</TableCell>
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
            <CardHeader className="pb-5 flex flex-row items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-purple-400">
                    Bond Holdings
                    <span className="ml-2 text-small text-muted-foreground font-normal">
                      ({bondRows.length} bonds · {fmt(bondTotal)})
                    </span>
                  </CardTitle>
                </div>
              </div>
              <div className="relative w-64 flex-shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search bonds…"
                  value={bondSearch}
                  onChange={(e) => setBondSearch(e.target.value)}
                  className="pl-9 bg-background border-border/50 h-9 text-sm"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead className="text-body-lg font-semibold text-foreground/90 tracking-wide cursor-pointer hover:text-foreground" onClick={() => toggleSort('name')}>
                        Name <SortIcon />
                      </TableHead>
                      <TableHead className="text-body-lg font-semibold text-foreground/90 tracking-wide">ISIN</TableHead>
                      <TableHead className="text-body-lg font-semibold text-foreground/90 tracking-wide">Sector</TableHead>
                      <TableHead className="text-body-lg font-semibold text-foreground/90 tracking-wide text-right cursor-pointer hover:text-foreground" onClick={() => toggleSort('currentValue')}>
                        Value <SortIcon />
                      </TableHead>
                      <TableHead className="text-body-lg font-semibold text-foreground/90 tracking-wide text-right cursor-pointer hover:text-foreground" onClick={() => toggleSort('localAllocPct')}>
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
                        <TableCell className="text-body font-semibold text-foreground max-w-[200px] truncate">{row.name}</TableCell>
                        <TableCell className="text-small font-mono text-muted-foreground">{row.ticker}</TableCell>
                        <TableCell className="text-small text-muted-foreground/80 font-normal">{row.sector}</TableCell>
                        <TableCell className="text-right text-body font-medium tabular-nums text-foreground">{fmt(row.currentValue)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-12 h-1 rounded-full bg-white/10 overflow-hidden">
                              <div className="h-full bg-purple-400 rounded-full" style={{ width: `${Math.min(row.localAllocPct, 100)}%` }} />
                            </div>
                            <span className="text-body text-purple-400 font-semibold tabular-nums w-12 text-right">
                              {row.localAllocPct.toFixed(2)}%
                            </span>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                    {/* Bond subtotal */}
                    {!isLoading && bondRows.length > 0 && (
                      <TableRow className="border-t border-border/50 bg-white/[0.015]">
                        <TableCell colSpan={3} className="text-body font-bold text-foreground">Total Bonds</TableCell>
                        <TableCell className="text-right text-body font-bold tabular-nums text-foreground">{fmt(bondTotal)}</TableCell>
                        <TableCell className="text-right text-body font-bold text-purple-400">100.00%</TableCell>
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

