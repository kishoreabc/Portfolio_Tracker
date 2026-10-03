'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Topbar } from '@/components/layout/Topbar';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { useStockModal } from '@/lib/stock-modal-context';
import { usePrivacy, PRIVACY_MASK } from '@/lib/privacy-context';

function fmt(v: number, isHidden: boolean = false) {
  if (isHidden) return PRIVACY_MASK;
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type SortKey = 'name' | 'ticker' | 'sector' | 'currentValue' | 'localAllocPct';

function SkeletonRows({ cols }: { cols: number }) {
  return (
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
}

export default function PortfolioPage() {
  const { portfolio, isLoading, lastFetched, apiErrors } = usePortfolioData();
  const { isHidden } = usePrivacy();
  const [equitySearch, setEquitySearch] = useState('');
  const [bondSearch, setBondSearch] = useState('');
  const [equitySortKey, setEquitySortKey] = useState<SortKey>('currentValue');
  const [equitySortAsc, setEquitySortAsc] = useState(false);
  const [bondSortKey, setBondSortKey] = useState<SortKey>('currentValue');
  const [bondSortAsc, setBondSortAsc] = useState(false);
  const { openStock } = useStockModal();

  const toggleEquitySort = (key: SortKey) => {
    if (equitySortKey === key) setEquitySortAsc(!equitySortAsc);
    else { setEquitySortKey(key); setEquitySortAsc(false); }
  };

  const toggleBondSort = (key: SortKey) => {
    if (bondSortKey === key) setBondSortAsc(!bondSortAsc);
    else { setBondSortKey(key); setBondSortAsc(false); }
  };

  const renderSortIcon = (currentKey: SortKey, columnKey: SortKey, isAsc: boolean) => {
    if (currentKey !== columnKey) {
      return (
        <ArrowUpDown className="inline-block ml-1.5 w-3.5 h-3.5 text-muted-foreground/35 group-hover:text-muted-foreground/80 transition-colors" />
      );
    }
    return isAsc ? (
      <ArrowUp className="inline-block ml-1.5 w-3.5 h-3.5 text-primary font-bold transition-transform" />
    ) : (
      <ArrowDown className="inline-block ml-1.5 w-3.5 h-3.5 text-primary font-bold transition-transform" />
    );
  };

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
        const av = equitySortKey === 'localAllocPct' ? a.localAllocPct : (a as any)[equitySortKey] ?? 0;
        const bv = equitySortKey === 'localAllocPct' ? b.localAllocPct : (b as any)[equitySortKey] ?? 0;
        if (typeof av === 'string') return equitySortAsc ? av.localeCompare(String(bv)) : String(bv).localeCompare(av);
        return equitySortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
      });
  }, [portfolio, equitySearch, equitySortKey, equitySortAsc]);

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
        const av = bondSortKey === 'localAllocPct' ? a.localAllocPct : (a as any)[bondSortKey] ?? 0;
        const bv = bondSortKey === 'localAllocPct' ? b.localAllocPct : (b as any)[bondSortKey] ?? 0;
        if (typeof av === 'string') return bondSortAsc ? av.localeCompare(String(bv)) : String(bv).localeCompare(av);
        return bondSortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
      });
  }, [portfolio, bondSearch, bondSortKey, bondSortAsc]);

  const equityTotal = equityRows.reduce((s, r) => s + r.currentValue, 0);
  const bondTotal = bondRows.reduce((s, r) => s + r.currentValue, 0);

  return (
    <>
      <Topbar lastFetched={lastFetched} pageTitle="Portfolio" apiErrors={apiErrors} />
      <div className="p-3 sm:p-4 md:p-6 space-y-5 animate-fade-in-up">
        {/* ── Equity Holdings ── */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border-border/50">
            <CardHeader className="pb-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-blue-400">
                    Equity Holdings
                    <span className="ml-2 text-xs text-muted-foreground font-normal">
                      ({equityRows.length} stocks · {fmt(equityTotal, isHidden)})
                    </span>
                  </CardTitle>
                </div>
              </div>
              <div className="relative w-full sm:w-64 flex-shrink-0">
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
                      {[
                        { key: 'name' as const, label: 'Name', align: 'left' },
                        { key: 'ticker' as const, label: 'Ticker', align: 'left' },
                        { key: 'sector' as const, label: 'Sector', align: 'left' },
                        { key: 'currentValue' as const, label: 'Value', align: 'right' },
                        { key: 'localAllocPct' as const, label: 'Alloc', align: 'right' },
                      ].map((col) => (
                        <TableHead
                          key={col.key}
                          className={`text-sm font-semibold uppercase tracking-wider whitespace-nowrap select-none transition-colors cursor-pointer group hover:text-foreground ${
                            col.align === 'right' ? 'text-right' : 'text-left'
                          } ${equitySortKey === col.key ? 'text-foreground font-bold' : 'text-muted-foreground'}`}
                          onClick={() => toggleEquitySort(col.key)}
                          aria-sort={
                            equitySortKey === col.key
                              ? equitySortAsc
                                ? 'ascending'
                                : 'descending'
                              : undefined
                          }
                        >
                          <span className={`inline-flex items-center ${col.align === 'right' ? 'justify-end' : ''}`}>
                            {col.label}
                            {renderSortIcon(equitySortKey, col.key, equitySortAsc)}
                          </span>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? <SkeletonRows cols={5} /> : equityRows.map((row, i) => (
                      <motion.tr key={row.id}
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.015 }}
                        className="border-border/30 hover:bg-white/[0.02] transition-colors"
                      >
                        <TableCell
                          className="text-sm font-semibold text-foreground max-w-[200px] truncate cursor-pointer hover:text-blue-300 transition-colors"
                          onClick={() => openStock(row.ticker)}
                        >{row.name}</TableCell>
                        <TableCell
                          className="text-xs font-mono text-blue-400 font-semibold cursor-pointer hover:text-blue-300 hover:underline transition-colors"
                          onClick={() => openStock(row.ticker)}
                        >{row.ticker}</TableCell>
                        <TableCell className="text-xs text-muted-foreground/80 font-normal">{row.sector}</TableCell>
                        <TableCell className="text-right text-sm font-medium tabular-nums text-foreground">{fmt(row.currentValue, isHidden)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-12 h-1 rounded-full bg-white/10 overflow-hidden">
                              <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.min(row.localAllocPct, 100)}%` }} />
                            </div>
                            <span className="text-sm text-blue-400 font-semibold tabular-nums w-12 text-right">
                              {row.localAllocPct.toFixed(2)}%
                            </span>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                    {/* Equity subtotal */}
                    {!isLoading && equityRows.length > 0 && (
                      <TableRow className="border-t border-border/50 bg-white/[0.015]">
                        <TableCell colSpan={3} className="text-sm font-bold text-foreground">Total Equity</TableCell>
                        <TableCell className="text-right text-sm font-bold tabular-nums text-foreground">{fmt(equityTotal, isHidden)}</TableCell>
                        <TableCell className="text-right text-sm font-bold text-blue-400">100.00%</TableCell>
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
            <CardHeader className="pb-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-purple-400">
                    Bond Holdings
                    <span className="ml-2 text-xs text-muted-foreground font-normal">
                      ({bondRows.length} bonds · {fmt(bondTotal, isHidden)})
                    </span>
                  </CardTitle>
                </div>
              </div>
              <div className="relative w-full sm:w-64 flex-shrink-0">
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
                      {[
                        { key: 'name' as const, label: 'Name', align: 'left' },
                        { key: 'ticker' as const, label: 'ISIN', align: 'left' },
                        { key: 'sector' as const, label: 'Sector', align: 'left' },
                        { key: 'currentValue' as const, label: 'Value', align: 'right' },
                        { key: 'localAllocPct' as const, label: 'Alloc', align: 'right' },
                      ].map((col) => (
                        <TableHead
                          key={col.key}
                          className={`text-sm font-semibold uppercase tracking-wider whitespace-nowrap select-none transition-colors cursor-pointer group hover:text-foreground ${
                            col.align === 'right' ? 'text-right' : 'text-left'
                          } ${bondSortKey === col.key ? 'text-foreground font-bold' : 'text-muted-foreground'}`}
                          onClick={() => toggleBondSort(col.key)}
                          aria-sort={
                            bondSortKey === col.key
                              ? bondSortAsc
                                ? 'ascending'
                                : 'descending'
                              : undefined
                          }
                        >
                          <span className={`inline-flex items-center ${col.align === 'right' ? 'justify-end' : ''}`}>
                            {col.label}
                            {renderSortIcon(bondSortKey, col.key, bondSortAsc)}
                          </span>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? <SkeletonRows cols={5} /> : bondRows.map((row, i) => (
                      <motion.tr key={row.id}
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.015 }}
                        className="border-border/30 hover:bg-white/[0.02] transition-colors"
                      >
                        <TableCell className="text-sm font-semibold text-foreground max-w-[200px] truncate">{row.name}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{row.ticker}</TableCell>
                        <TableCell className="text-xs text-muted-foreground/80 font-normal">{row.sector}</TableCell>
                        <TableCell className="text-right text-sm font-medium tabular-nums text-foreground">{fmt(row.currentValue, isHidden)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-12 h-1 rounded-full bg-white/10 overflow-hidden">
                              <div className="h-full bg-purple-400 rounded-full" style={{ width: `${Math.min(row.localAllocPct, 100)}%` }} />
                            </div>
                            <span className="text-sm text-purple-400 font-semibold tabular-nums w-12 text-right">
                              {row.localAllocPct.toFixed(2)}%
                            </span>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                    {/* Bond subtotal */}
                    {!isLoading && bondRows.length > 0 && (
                      <TableRow className="border-t border-border/50 bg-white/[0.015]">
                        <TableCell colSpan={3} className="text-sm font-bold text-foreground">Total Bonds</TableCell>
                        <TableCell className="text-right text-sm font-bold tabular-nums text-foreground">{fmt(bondTotal, isHidden)}</TableCell>
                        <TableCell className="text-right text-sm font-bold text-purple-400">100.00%</TableCell>
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

