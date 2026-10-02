'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Topbar } from '@/components/layout/Topbar';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { format } from 'date-fns';
import { BondCashflowDialog } from '@/components/bonds/BondCashflowDialog';
import { Button } from '@/components/ui/button';
import { CalendarSearch } from 'lucide-react';
import { usePrivacy, PRIVACY_MASK } from '@/lib/privacy-context';

import { BondAnalyticsOverview } from '@/components/bonds/BondAnalyticsOverview';

function fmt(v: number, isHidden: boolean = false) {
  if (isHidden) return PRIVACY_MASK;
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const RATING_COLORS: Record<string, string> = {
  AAA: 'hsl(142 71% 45%)',
  'AA+': 'hsl(142 71% 50%)',
  AA: 'hsl(142 71% 55%)',
  'AA-': 'hsl(180 60% 45%)',
  'A+': 'hsl(221 83% 58%)',
  A: 'hsl(221 83% 53%)',
  'A-': 'hsl(221 83% 48%)',
  'BBB+': 'hsl(38 92% 55%)',
  BBB: 'hsl(38 92% 50%)',
  'BBB-': 'hsl(38 92% 45%)',
  'BB+': 'hsl(20 90% 55%)',
  BB: 'hsl(20 90% 50%)',
  'BB-': 'hsl(20 90% 45%)',
  NR: 'hsla(72, 20%, 75%, 1.00)', // Brighter gray/silver for better visibility on dark background
};

const RATING_TIER_ORDER: Record<string, number> = {
  AAA: 14,
  'AA+': 13,
  AA: 12,
  'AA-': 11,
  'A+': 10,
  A: 9,
  'A-': 8,
  'BBB+': 7,
  BBB: 6,
  'BBB-': 5,
  'BB+': 4,
  BB: 3,
  'BB-': 2,
  B: 1,
  NR: 0,
};

function getRatingRank(rating?: string): number {
  if (!rating) return -1;
  const upper = rating.toUpperCase().trim();
  for (const [key, rank] of Object.entries(RATING_TIER_ORDER)) {
    if (upper.includes(key)) return rank;
  }
  return -1;
}

function getRatingColor(rating: string, fallback = 'hsl(215 20% 45%)') {
  if (!rating) return fallback;
  const parts = rating.split(' ');
  for (const part of parts) {
    if (RATING_COLORS[part]) return RATING_COLORS[part];
  }
  return RATING_COLORS[parts[parts.length - 1]] || fallback;
}

const PAYOUT_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  monthly:    { bg: 'hsl(142 71% 45% / 0.12)', text: 'hsl(142 71% 55%)', border: 'hsl(142 71% 45% / 0.3)' },
  quarterly:  { bg: 'hsl(180 60% 45% / 0.12)', text: 'hsl(180 60% 55%)', border: 'hsl(180 60% 45% / 0.3)' },
  'semi-annual': { bg: 'hsl(221 83% 53% / 0.12)', text: 'hsl(221 83% 68%)', border: 'hsl(221 83% 53% / 0.3)' },
  'half-yearly':{ bg: 'hsl(221 83% 53% / 0.12)', text: 'hsl(221 83% 68%)', border: 'hsl(221 83% 53% / 0.3)' },
  annual:     { bg: 'hsl(270 70% 55% / 0.12)', text: 'hsl(270 70% 70%)', border: 'hsl(270 70% 55% / 0.3)' },
  yearly:     { bg: 'hsl(270 70% 55% / 0.12)', text: 'hsl(270 70% 70%)', border: 'hsl(270 70% 55% / 0.3)' },
  'at maturity': { bg: 'hsl(215 20% 45% / 0.12)', text: 'hsl(215 20% 65%)', border: 'hsl(215 20% 45% / 0.3)' },
};

function getPayoutStyle(payoutType: string) {
  const key = payoutType.toLowerCase().trim();
  for (const [k, v] of Object.entries(PAYOUT_TYPE_COLORS)) {
    if (key.includes(k)) return v;
  }
  return PAYOUT_TYPE_COLORS['at maturity'];
}

const BOND_COLUMNS = [
  { label: 'Security', key: 'securityName' },
  { label: 'ISIN', key: 'isin' },
  { label: 'Issuer', key: 'issuer' },
  { label: 'Rating', key: 'creditRating' },
  { label: 'Maturity', key: 'maturityDate' },
  { label: 'Payout Type', key: 'payoutType' },
  { label: 'Upcoming Interest', key: 'upcomingInterest' },
  { label: 'Value', key: 'totalValue' },
  { label: 'YTM', key: 'ytm' },
  { label: 'Coupon', key: 'couponRate' },
  { label: 'Cashflow', key: null },
] as const;

export default function BondsPage() {
  const { bonds, bondMaturityEvents, isLoading, lastFetched, apiErrors } = usePortfolioData();
  const { isHidden } = usePrivacy();

  const [selectedBond, setSelectedBond] = useState<{ isin: string; securityName: string; unitsHeld: number; faceValue: number } | null>(null);

  // Build a map of ISIN → next upcoming coupon payment
  const nextPaymentMap = useMemo(() => {
    const map = new Map<string, { date: Date; amount: number; isEstimated: boolean }>();
    for (const e of bondMaturityEvents) {
      const next = e.couponPayments[0];
      if (next) map.set(e.isin, next);
    }
    return map;
  }, [bondMaturityEvents]);

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'maturityDate',
    direction: 'asc',
  });

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key) {
      direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
      if (['totalValue', 'ytm', 'couponRate', 'upcomingInterest'].includes(key)) {
        direction = 'desc';
      }
    }
    setSortConfig({ key, direction });
  };

  const sortedBonds = useMemo(() => {
    const result = [...bonds];
    const { key, direction } = sortConfig;
    if (!key) {
      return result.sort((a, b) => (a.maturityDate ?? '').localeCompare(b.maturityDate ?? ''));
    }

    result.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (key === 'upcomingInterest') {
        valA = nextPaymentMap.get(a.isin)?.amount ?? 0;
        valB = nextPaymentMap.get(b.isin)?.amount ?? 0;
      } else if (key === 'creditRating') {
        valA = getRatingRank(a.creditRating);
        valB = getRatingRank(b.creditRating);
      } else if (key === 'maturityDate') {
        valA = a.maturityDate ? new Date(a.maturityDate).getTime() : 0;
        valB = b.maturityDate ? new Date(b.maturityDate).getTime() : 0;
      } else {
        valA = (a as any)[key];
        valB = (b as any)[key];
      }

      if (valA == null && valB == null) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;

      if (typeof valA === 'string' && typeof valB === 'string') {
        const cmp = valA.localeCompare(valB, undefined, { sensitivity: 'base', numeric: true });
        return direction === 'asc' ? cmp : -cmp;
      }

      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [bonds, sortConfig, nextPaymentMap]);

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
      <Topbar lastFetched={lastFetched} pageTitle="Bonds" apiErrors={apiErrors} />
      <div className="p-3 sm:p-4 md:p-6 space-y-6 animate-fade-in-up">

        {/* Bond Analytics: 4 Purple KPI Cards + 4 Analytics Charts in 2x2 Grid */}
        <BondAnalyticsOverview bonds={bonds} isLoading={isLoading} />

        {/* Upcoming maturities */}
        <Card className="border-border/50">
          <CardHeader className="pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle>Holdings</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                {bonds.length} holdings • Click column headers to sort by security, rating, maturity, yield, or value
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  {BOND_COLUMNS.map((col) => (
                    <TableHead
                      key={col.label}
                      className={`text-sm font-semibold uppercase tracking-wider whitespace-nowrap select-none transition-colors ${
                        col.key
                          ? 'hover:text-foreground cursor-pointer group text-muted-foreground'
                          : 'text-muted-foreground cursor-default'
                      } ${sortConfig.key === col.key ? 'text-foreground font-bold' : ''}`}
                      onClick={() => col.key && handleSort(col.key)}
                      aria-sort={
                        col.key && sortConfig.key === col.key
                          ? sortConfig.direction === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : undefined
                      }
                    >
                      <span className="inline-flex items-center">
                        {col.label}
                        {col.key && <SortIcon columnKey={col.key} />}
                      </span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-border/30">
                    {Array.from({ length: 11 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 bg-white/5" /></TableCell>
                    ))}
                  </TableRow>
                )) : sortedBonds.map((b, i) => (
                  <motion.tr key={b.isin || i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }} className="border-border/30 hover:bg-white/[0.02] transition-colors">
                    <TableCell className="text-xs font-semibold text-foreground whitespace-normal break-words max-w-[320px]">{b.securityName}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground/90 font-medium">{b.isin}</TableCell>
                    <TableCell className="text-xs text-muted-foreground/90 whitespace-normal break-words max-w-[150px]">{b.issuer}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs px-2 py-0.5 font-semibold"
                        style={{ borderColor: `${getRatingColor(b.creditRating, 'gray')}40`, color: getRatingColor(b.creditRating, 'gray') }}>
                        {b.creditRating}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs tabular-nums text-foreground/90">{b.maturityDate ?? '—'}</TableCell>
                    {/* Payout Type column */}
                    <TableCell>
                      {b.payoutType ? (
                        <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold"
                          style={{
                            background: getPayoutStyle(b.payoutType).bg,
                            color: getPayoutStyle(b.payoutType).text,
                            border: `1px solid ${getPayoutStyle(b.payoutType).border}`,
                          }}>
                          {b.payoutType}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    {/* Upcoming Interest column */}
                    <TableCell>
                      {(() => {
                        const next = nextPaymentMap.get(b.isin);
                        if (!next) return <span className="text-xs text-muted-foreground/50">—</span>;
                        return (
                          <div className="flex flex-col gap-0.5">
                            <span className={`text-xs font-bold tabular-nums ${
                              next.isEstimated ? 'text-amber-400' : 'text-green-400'
                            }`}>
                              {next.isEstimated ? '~' : ''}{fmt(next.amount, isHidden)}
                            </span>
                            <span className="text-[11px] text-muted-foreground/80 tabular-nums">
                              {format(next.date, 'dd MMM yyyy')}
                              {next.isEstimated && <span className="ml-1 text-amber-400/60 font-semibold">est.</span>}
                            </span>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm font-bold tabular-nums text-foreground">{fmt(b.totalValue, isHidden)}</TableCell>
                    <TableCell className="text-xs sm:text-sm font-semibold tabular-nums text-blue-400">{b.ytm ? `${(b.ytm * 100).toFixed(2)}%` : '—'}</TableCell>
                    <TableCell className="text-xs sm:text-sm font-semibold tabular-nums text-amber-400">{b.couponRate ? `${(b.couponRate * 100).toFixed(2)}%` : '—'}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 px-2"
                        onClick={() => setSelectedBond({ isin: b.isin, securityName: b.securityName, unitsHeld: b.unitsHeld, faceValue: b.faceValue })}
                      >
                        <CalendarSearch className="w-3.5 h-3.5" />
                        Schedule
                      </Button>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <BondCashflowDialog
        open={Boolean(selectedBond)}
        onOpenChange={(open) => {
          if (!open) setSelectedBond(null);
        }}
        isin={selectedBond?.isin ?? ''}
        securityName={selectedBond?.securityName ?? ''}
        unitsHeld={selectedBond?.unitsHeld}
        faceValue={selectedBond?.faceValue}
      />
    </>
  );
}
