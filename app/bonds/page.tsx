'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Topbar } from '@/components/layout/Topbar';
import { usePortfolioData } from '@/hooks/usePortfolioData';
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
  A: 'hsl(221 83% 53%)',
  BBB: 'hsl(38 92% 50%)',
  BB: 'hsl(38 92% 55%)',
  NR: 'hsla(72, 20%, 75%, 1.00)', // Brighter gray/silver for better visibility on dark background
};

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
      <div className="p-6 space-y-4 animate-fade-in-up">
        {/* Bond Ladder + Rating Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Bond Maturity Ladder</CardTitle>
              <p className="text-xs text-muted-foreground">Total value maturing per year</p>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-[220px] bg-white/5" /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={bondLadder} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'hsl(215 20% 55%)' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmt} tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={((v: number) => [fmt(v), 'Maturing Value']) as never}
                      contentStyle={{ background: 'hsl(222 47% 13%)', border: '1px solid hsl(222 47% 20%)', borderRadius: '8px', color: 'white', fontSize: 12 }} />
                    <Bar dataKey="totalValue" radius={[4, 4, 0, 0]} maxBarSize={36} fill="hsl(142 71% 45%)" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Credit Rating Distribution</CardTitle>
              <p className="text-xs text-muted-foreground">By total bond value</p>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-[220px] bg-white/5" /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={creditRatingDistribution} dataKey="totalValue" nameKey="rating"
                      cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}
                      labelLine={false} label={CustomLabel as never}>
                      {creditRatingDistribution.map((entry, i) => (
                        <Cell key={i} fill={RATING_COLORS[entry.rating] ?? 'hsl(215 20% 45%)'} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip formatter={((v: number, name: string) => [fmt(v), name]) as never}
                      contentStyle={{ background: 'hsl(222 47% 13%)', border: '1px solid hsl(222 47% 20%)', borderRadius: '8px', color: 'white', fontSize: 12 }} />
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
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Upcoming Maturities</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  {['Security', 'ISIN', 'Issuer', 'Rating', 'Maturity', 'Value', 'YTM', 'Coupon'].map(h => (
                    <TableHead key={h} className="text-base font-semibold text-muted-foreground">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-border/30">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 bg-white/5" /></TableCell>
                    ))}
                  </TableRow>
                )) : sortedBonds.map((b, i) => (
                  <motion.tr key={b.isin || i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }} className="border-border/30 hover:bg-white/[0.02] transition-colors">
                    <TableCell className="text-xs font-medium max-w-[160px] truncate">{b.securityName}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{b.isin}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[100px] truncate">{b.issuer}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] px-1.5"
                        style={{ borderColor: `${RATING_COLORS[b.creditRating] ?? 'gray'}40`, color: RATING_COLORS[b.creditRating] ?? 'gray' }}>
                        {b.creditRating}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">{b.maturityDate ?? '—'}</TableCell>
                    <TableCell className="text-sm font-medium tabular-nums">{fmt(b.totalValue)}</TableCell>
                    <TableCell className="text-xs tabular-nums text-blue-400">{b.ytm ? `${(b.ytm * 100).toFixed(2)}%` : '—'}</TableCell>
                    <TableCell className="text-xs tabular-nums text-amber-400">{b.couponRate ? `${(b.couponRate * 100).toFixed(2)}%` : '—'}</TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
