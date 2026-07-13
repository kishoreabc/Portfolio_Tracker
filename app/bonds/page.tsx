'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Topbar } from '@/components/layout/Topbar';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { format } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell,
  PieChart, Pie, Legend,
} from 'recharts';

function fmt(v: number) {
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

const RADIAN = Math.PI / 180;
function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.05) return null;
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-semibold">
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  );
}

export default function BondsPage() {
  const { bonds, bondLadder, creditRatingDistribution, bondMaturityEvents, isLoading, lastFetched, apiErrors } = usePortfolioData();

  // Build a map of ISIN → next upcoming coupon payment
  const nextPaymentMap = useMemo(() => {
    const map = new Map<string, { date: Date; amount: number; isEstimated: boolean }>();
    for (const e of bondMaturityEvents) {
      const next = e.couponPayments[0];
      if (next) map.set(e.isin, next);
    }
    return map;
  }, [bondMaturityEvents]);

  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: '', direction: 'asc' });

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const sortedBonds = useMemo(() => {
    let result = [...bonds];
    if (sortConfig.key) {
      result.sort((a: any, b: any) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      result.sort((a, b) => (a.maturityDate ?? '').localeCompare(b.maturityDate ?? ''));
    }
    return result;
  }, [bonds, sortConfig]);

  const SortIcon = ({ columnKey }: { columnKey: string }) => (
    <ArrowUpDown className={`inline-block ml-1 w-3 h-3 transition-colors ${sortConfig.key === columnKey ? 'text-foreground' : 'text-muted-foreground/50'}`} />
  );

  return (
    <>
      <Topbar lastFetched={lastFetched} pageTitle="Bonds" apiErrors={apiErrors} />
      <div className="p-3 sm:p-4 md:p-6 space-y-4 animate-fade-in-up">
        {/* Bond Ladder + Rating Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-border/50">
            <CardHeader className="pb-5">
              <CardTitle>Bond Maturity Ladder</CardTitle>
              <CardDescription>Total value maturing per year</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-[220px] bg-white/5" /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={bondLadder} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'hsl(215 20% 55%)' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmt} tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={((v: number) => [fmt(v), 'Maturing Value']) as never}
                      contentStyle={{ background: 'hsl(222 47% 13%)', border: '1px solid hsl(222 47% 20%)', borderRadius: '8px', color: 'white', fontSize: 12 }} 
                      itemStyle={{ color: 'white', fontWeight: 500 }} />
                    <Bar dataKey="totalValue" radius={[4, 4, 0, 0]} maxBarSize={36} fill="hsl(142 71% 45%)" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-5">
              <CardTitle>Credit Rating Distribution</CardTitle>
              <CardDescription>By total bond value</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-[220px] bg-white/5" /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={creditRatingDistribution} dataKey="totalValue" nameKey="rating"
                      cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}
                      labelLine={false} label={CustomLabel as never}>
                      {creditRatingDistribution.map((entry, i) => (
                        <Cell key={i} fill={getRatingColor(entry.rating)} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip formatter={((v: number, name: string) => [fmt(v), name]) as never}
                      contentStyle={{ background: 'hsl(222 47% 13%)', border: '1px solid hsl(222 47% 20%)', borderRadius: '8px', color: 'white', fontSize: 12 }} 
                      itemStyle={{ color: 'white', fontWeight: 500 }} />
                    <Legend iconType="circle" iconSize={8}
                      formatter={(value, entry: any) => <span style={{ color: entry.color || 'hsl(215 20% 65%)', fontSize: 11, fontWeight: 500 }}>{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming maturities */}
        <Card className="border-border/50">
          <CardHeader className="pb-5">
            <CardTitle>Upcoming Maturities</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  {['Security', 'ISIN', 'Issuer', 'Rating', 'Maturity', 'Payout Type', 'Upcoming Interest', 'Value', 'YTM', 'Coupon'].map(h => (
                    <TableHead key={h} className="text-body-lg font-semibold text-foreground/90 tracking-wide">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-border/30">
                    {Array.from({ length: 10 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 bg-white/5" /></TableCell>
                    ))}
                  </TableRow>
                )) : sortedBonds.map((b, i) => (
                  <motion.tr key={b.isin || i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }} className="border-border/30 hover:bg-white/[0.02] transition-colors">
                    <TableCell className="text-body font-semibold text-foreground max-w-[160px] truncate" title={b.securityName}>{b.securityName}</TableCell>
                    <TableCell className="text-small font-mono text-muted-foreground/80 font-medium">{b.isin}</TableCell>
                    <TableCell className="text-small text-muted-foreground/80 max-w-[100px] truncate" title={b.issuer}>{b.issuer}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-caption px-1.5 font-semibold"
                        style={{ borderColor: `${getRatingColor(b.creditRating, 'gray')}40`, color: getRatingColor(b.creditRating, 'gray') }}>
                        {b.creditRating}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-body tabular-nums text-foreground/90">{b.maturityDate ?? '—'}</TableCell>
                    {/* Payout Type column */}
                    <TableCell>
                      {b.payoutType ? (
                        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-caption font-semibold"
                          style={{
                            background: getPayoutStyle(b.payoutType).bg,
                            color: getPayoutStyle(b.payoutType).text,
                            border: `1px solid ${getPayoutStyle(b.payoutType).border}`,
                          }}>
                          {b.payoutType}
                        </span>
                      ) : (
                        <span className="text-body text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    {/* Upcoming Interest column */}
                    <TableCell>
                      {(() => {
                        const next = nextPaymentMap.get(b.isin);
                        if (!next) return <span className="text-body text-muted-foreground/50">—</span>;
                        return (
                          <div className="flex flex-col gap-0.5">
                            <span className={`text-body font-bold tabular-nums ${
                              next.isEstimated ? 'text-amber-400' : 'text-green-400'
                            }`}>
                              {next.isEstimated ? '~' : ''}{fmt(next.amount)}
                            </span>
                            <span className="text-caption text-muted-foreground/80 tabular-nums">
                              {format(next.date, 'dd MMM yyyy')}
                              {next.isEstimated && <span className="ml-1 text-amber-400/60 font-semibold">est.</span>}
                            </span>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-body font-semibold tabular-nums text-foreground">{fmt(b.totalValue)}</TableCell>
                    <TableCell className="text-body font-medium tabular-nums text-blue-400">{b.ytm ? `${(b.ytm * 100).toFixed(2)}%` : '—'}</TableCell>
                    <TableCell className="text-body font-medium tabular-nums text-amber-400">{b.couponRate ? `${(b.couponRate * 100).toFixed(2)}%` : '—'}</TableCell>
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
