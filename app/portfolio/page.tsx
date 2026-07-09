'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, ArrowUpDown, TrendingUp, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Topbar } from '@/components/layout/Topbar';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import type { PortfolioRow } from '@/types/holdings';
import type { Metadata } from 'next';

function fmt(v: number) {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type SortKey = 'name' | 'currentValue' | 'allocationPercent' | 'percentChange';

export default function PortfolioPage() {
  const { portfolio, isLoading, lastFetched, apiErrors } = usePortfolioData();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'equity' | 'bond'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('currentValue');
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = useMemo(() => {
    let rows = portfolio.filter((r) => {
      const matchType = typeFilter === 'all' || r.type === typeFilter;
      const matchSearch = !search ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.ticker.toLowerCase().includes(search.toLowerCase()) ||
        r.sector.toLowerCase().includes(search.toLowerCase());
      return matchType && matchSearch;
    });

    rows = [...rows].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      if (typeof av === 'string') return sortAsc
        ? av.localeCompare(String(bv))
        : String(bv).localeCompare(av);
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });

    return rows;
  }, [portfolio, search, typeFilter, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  return (
    <>
      <Topbar lastFetched={lastFetched} pageTitle="Portfolio" apiErrors={apiErrors} />
      <div className="p-6 space-y-4 animate-fade-in-up">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="portfolio-search"
              placeholder="Search by name, ticker, or sector…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card border-border/50"
            />
          </div>
          <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as 'all' | 'equity' | 'bond')}>
            <TabsList className="bg-card border border-border/50">
              <TabsTrigger value="all" id="filter-all">All</TabsTrigger>
              <TabsTrigger value="equity" id="filter-equity">
                <TrendingUp className="w-3.5 h-3.5 mr-1" />Equity
              </TabsTrigger>
              <TabsTrigger value="bond" id="filter-bond">
                <Building2 className="w-3.5 h-3.5 mr-1" />Bonds
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              {sorted.length} holdings
              {search && <span className="text-muted-foreground font-normal ml-2">matching "{search}"</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-xs text-muted-foreground w-12">Type</TableHead>
                    <TableHead className="text-xs text-muted-foreground cursor-pointer" onClick={() => toggleSort('name')}>
                      Name <ArrowUpDown className="w-3 h-3 inline ml-1" />
                    </TableHead>
                    <TableHead className="text-xs text-muted-foreground">Ticker / ISIN</TableHead>
                    <TableHead className="text-xs text-muted-foreground">Sector</TableHead>
                    <TableHead className="text-xs text-muted-foreground text-right cursor-pointer" onClick={() => toggleSort('currentValue')}>
                      Value <ArrowUpDown className="w-3 h-3 inline ml-1" />
                    </TableHead>
                    <TableHead className="text-xs text-muted-foreground text-right cursor-pointer" onClick={() => toggleSort('allocationPercent')}>
                      Alloc % <ArrowUpDown className="w-3 h-3 inline ml-1" />
                    </TableHead>
                   
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i} className="border-border/30">
                        {Array.from({ length: 7 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 bg-white/5" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : sorted.map((row, i) => (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-border/30 hover:bg-white/[0.02] transition-colors"
                    >
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0.5 ${row.type === 'equity' ? 'border-blue-500/40 text-blue-400' : 'border-green-500/40 text-green-400'}`}
                        >
                          {row.type === 'equity' ? 'EQ' : 'BD'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-sm text-foreground max-w-[180px] truncate">{row.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{row.ticker}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.sector}</TableCell>
                      <TableCell className="text-right text-sm font-medium tabular-nums">{fmt(row.currentValue)}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                        {(row.allocationPercent * 100).toFixed(2)}%
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
