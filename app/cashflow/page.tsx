'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Topbar } from '@/components/layout/Topbar';
import { CashFlowChart } from '@/components/charts/CashFlowChart';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { MonthlySummary } from '@/types/transactions';

function fmt(v: number) {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const RADIAN = Math.PI / 180;
function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.05) return null;
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-[11px] font-bold" style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.8)' }}>
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  );
}

export default function CashFlowPage() {
  const { cashFlowStats, transactions, isLoading, lastFetched, apiErrors } = usePortfolioData();
  const summaries = cashFlowStats.monthlySummaries;

  const [selectedMonth, setSelectedMonth] = useState<MonthlySummary | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const selectedTransactions = useMemo(() => {
    if (!selectedMonth) return [];
    return transactions.filter(t =>
      t.date.getFullYear() === selectedMonth.year &&
      t.date.getMonth() === selectedMonth.month
    );
  }, [selectedMonth, transactions]);

  const pieData = useMemo(() => {
    if (!selectedMonth) return [];
    return [
      { name: 'Food & Ent.', value: selectedMonth.foodAndEntertainment, color: 'hsl(38 92% 50%)' },
      { name: 'Investment', value: selectedMonth.investment, color: 'hsl(221 83% 53%)' },
      { name: 'Others', value: selectedMonth.others, color: 'hsl(270 70% 55%)' },
    ].filter(d => d.value > 0);
  }, [selectedMonth]);

  return (
    <>
      <Topbar lastFetched={lastFetched} pageTitle="Cash Flow" apiErrors={apiErrors} />
      <div className="p-3 sm:p-4 md:p-6 space-y-4 animate-fade-in-up">
        {/* Summary KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">{label}</p>
                  <p className={`text-xl sm:text-2xl lg:text-3xl xl:text-h2 font-bold tabular-nums ${color}`}>{fmt(value)}</p>
                </>
              )}
            </motion.div>
          ))}
        </div>

        {/* Monthly chart */}
        <Card className="border-border/50">
          <CardHeader className="pb-5">
            <CardTitle>Monthly Breakdown</CardTitle>
            <p className="text-small text-muted-foreground font-normal">From Daily Transaction sheet · {cashFlowStats.startDate?.toLocaleDateString('en-IN') ?? '—'} to {cashFlowStats.endDate?.toLocaleDateString('en-IN') ?? '—'}</p>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[280px] bg-white/5" /> : <CashFlowChart data={summaries} />}
          </CardContent>
        </Card>

        {/* Monthly table */}
        <Card className="border-border/50">
          <CardHeader className="pb-5">
            <CardTitle>Monthly Detail</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    {['Month', 'Investment', 'Food & Ent.', 'Others', 'Total Expenses'].map(h => (
                      <TableHead key={h} className="text-xs sm:text-sm md:text-base font-semibold text-foreground/90 tracking-wide whitespace-nowrap">{h}</TableHead>
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
                      className="border-border/30 hover:bg-white/[0.05] cursor-pointer transition-colors"
                      onClick={() => setSelectedMonth(m)}>
                      <TableCell className="text-xs sm:text-sm md:text-base font-semibold text-foreground whitespace-nowrap">{m.label}</TableCell>
                      <TableCell className="text-xs sm:text-sm md:text-base text-blue-400 tabular-nums font-medium whitespace-nowrap">{fmt(m.investment)}</TableCell>
                      <TableCell className="text-xs sm:text-sm md:text-base text-amber-400 tabular-nums font-medium whitespace-nowrap">{fmt(m.foodAndEntertainment)}</TableCell>
                      <TableCell className="text-xs sm:text-sm md:text-base text-purple-400 tabular-nums font-medium whitespace-nowrap">{fmt(m.others)}</TableCell>
                      <TableCell className="text-xs sm:text-sm md:text-base text-red-400 font-bold tabular-nums whitespace-nowrap">{fmt(m.totalExpenses)}</TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Transactions Dialog */}
      <Dialog open={!!selectedMonth} onOpenChange={(open) => {
        if (!open) {
          setSelectedMonth(null);
          setShowTooltip(false);
        }
      }}>
        <DialogContent className="sm:max-w-5xl w-full h-[90vh] md:h-[80vh] flex flex-col p-4 sm:p-6 bg-surface-100 border border-border/50 shadow-2xl">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-xl">{selectedMonth?.label}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col lg:flex-row gap-6 mt-4 flex-1 min-h-0 overflow-hidden">
            {/* Pie Chart */}
            <div className="lg:w-[340px] flex-shrink-0 flex flex-col border border-border/40 rounded-xl bg-background/50 p-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-4">Spending Breakdown</h3>
              <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart onMouseMove={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
                    <Pie stroke="none" isAnimationActive={false} data={pieData} dataKey="value" nameKey="name" cx="40%" cy="50%" innerRadius={0} outerRadius={80} labelLine={false} label={CustomLabel as any}>
                      {pieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    {showTooltip && (
                      <Tooltip formatter={((v: number) => fmt(v)) as any}
                        contentStyle={{ background: 'hsl(222 47% 13%)', border: '1px solid hsl(222 47% 20%)', borderRadius: '8px', color: 'white', fontSize: 12 }}
                        itemStyle={{ color: 'white', fontWeight: 500 }} />
                    )}
                    <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontWeight: 500 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Daily Table */}
            <div className="flex-1 min-h-0 border border-border/40 rounded-xl bg-background/50 flex flex-col">
              <Table wrapperClassName="flex-1 overflow-auto rounded-xl">
                <TableHeader className="sticky top-0 bg-surface-100 z-10 shadow-sm">
                  <TableRow className="border-border/50 hover:bg-transparent">
                    {['Date', 'Food & Ent.', 'Investment', 'Others', 'Total'].map(h => (
                      <TableHead key={h} className="text-xs sm:text-sm md:text-base font-semibold text-foreground/90 tracking-wide whitespace-nowrap">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedTransactions.map((t, i) => (
                    <TableRow key={i} className="border-border/30 hover:bg-white/[0.02]">
                      <TableCell className="text-[10px] sm:text-xs md:text-sm font-medium text-muted-foreground whitespace-nowrap">{t.date.toLocaleDateString('en-IN')}</TableCell>
                      <TableCell className="text-[10px] sm:text-xs md:text-sm text-amber-400 tabular-nums whitespace-nowrap">{fmt(t.foodAndEntertainment)}</TableCell>
                      <TableCell className="text-[10px] sm:text-xs md:text-sm text-blue-400 tabular-nums whitespace-nowrap">{fmt(t.investment)}</TableCell>
                      <TableCell className="text-[10px] sm:text-xs md:text-sm text-purple-400 tabular-nums whitespace-nowrap">{fmt(t.others)}</TableCell>
                      <TableCell className="text-[10px] sm:text-xs md:text-sm text-foreground font-semibold tabular-nums whitespace-nowrap">{fmt(t.dailyTotal)}</TableCell>
                    </TableRow>
                  ))}
                  {/* Totals row */}
                  {selectedMonth && (
                    <TableRow className="border-border/50 hover:bg-transparent bg-white/[0.02]">
                      <TableCell className="text-[10px] sm:text-xs md:text-sm font-bold text-foreground whitespace-nowrap">Total</TableCell>
                      <TableCell className="text-[10px] sm:text-xs md:text-sm font-bold text-amber-400 tabular-nums whitespace-nowrap">{fmt(selectedMonth.foodAndEntertainment)}</TableCell>
                      <TableCell className="text-[10px] sm:text-xs md:text-sm font-bold text-blue-400 tabular-nums whitespace-nowrap">{fmt(selectedMonth.investment)}</TableCell>
                      <TableCell className="text-[10px] sm:text-xs md:text-sm font-bold text-purple-400 tabular-nums whitespace-nowrap">{fmt(selectedMonth.others)}</TableCell>
                      <TableCell className="text-[10px] sm:text-xs md:text-sm font-bold text-foreground tabular-nums whitespace-nowrap">{fmt(selectedMonth.totalExpenses + selectedMonth.investment)}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
