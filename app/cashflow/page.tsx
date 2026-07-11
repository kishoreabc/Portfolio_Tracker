'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Topbar } from '@/components/layout/Topbar';
import { CashFlowChart } from '@/components/charts/CashFlowChart';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { motion } from 'framer-motion';

function fmt(v: number) {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CashFlowPage() {
  const { cashFlowStats, isLoading, lastFetched, apiErrors } = usePortfolioData();
  const summaries = cashFlowStats.monthlySummaries;

  return (
    <>
      <Topbar lastFetched={lastFetched} pageTitle="Cash Flow" apiErrors={apiErrors} />
      <div className="p-6 space-y-4 animate-fade-in-up">
        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Invested', value: cashFlowStats.totalInvestment, color: 'text-blue-400' },
            { label: 'Total Expenses', value: cashFlowStats.totalExpenses, color: 'text-red-400' },
            { label: 'Food & Entertainment', value: cashFlowStats.totalFoodAndEntertainment, color: 'text-amber-400' },
            { label: 'Others', value: cashFlowStats.totalOthers, color: 'text-purple-400' },
          ].map(({ label, value, color }) => (
            <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border/50 p-4 bg-card">
              {isLoading ? <Skeleton className="h-8 bg-white/5" /> : (
                <>
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className={`text-xl font-bold tabular-nums ${color}`}>{fmt(value)}</p>
                </>
              )}
            </motion.div>
          ))}
        </div>

        {/* Monthly chart */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Monthly Breakdown</CardTitle>
            <p className="text-xs text-muted-foreground">From Daily Transaction sheet · {cashFlowStats.startDate?.toLocaleDateString('en-IN') ?? '—'} to {cashFlowStats.endDate?.toLocaleDateString('en-IN') ?? '—'}</p>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[280px] bg-white/5" /> : <CashFlowChart data={summaries} />}
          </CardContent>
        </Card>

        {/* Monthly table */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Monthly Detail</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    {['Month', 'Investment', 'Food & Ent.', 'Others', 'Total Expenses'].map(h => (
                      <TableHead key={h} className="text-xs text-muted-foreground">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i} className="border-border/30">
                      {Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 bg-white/5" /></TableCell>)}
                    </TableRow>
                  )) : [...summaries].reverse().map((m, i) => (
                    <motion.tr key={m.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                      className="border-border/30 hover:bg-white/[0.02]">
                      <TableCell className="text-sm font-medium">{m.label}</TableCell>
                      <TableCell className="text-sm text-blue-400 tabular-nums">{fmt(m.investment)}</TableCell>
                      <TableCell className="text-sm text-amber-400 tabular-nums">{fmt(m.foodAndEntertainment)}</TableCell>
                      <TableCell className="text-sm text-purple-400 tabular-nums">{fmt(m.others)}</TableCell>
                      <TableCell className="text-sm text-red-400 font-semibold tabular-nums">{fmt(m.totalExpenses)}</TableCell>
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
