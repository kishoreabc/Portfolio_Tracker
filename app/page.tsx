'use client';

import { motion } from 'framer-motion';
import {
  Wallet, TrendingUp, Building2, Activity, ArrowUpDown, IndianRupee, Target
} from 'lucide-react';
import { isWeekend, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { KpiCard } from '@/components/shared/KpiCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { Topbar } from '@/components/layout/Topbar';
import { AssetAllocationPie } from '@/components/charts/AssetAllocationPie';
import { SectorAllocationChart } from '@/components/charts/SectorAllocationChart';
import { CashFlowChart } from '@/components/charts/CashFlowChart';
import { OverallAllocationPie } from '@/components/charts/OverallAllocationPie';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

function formatINR(value: number): string {
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  let formatted = '';
  if (absValue >= 1e7) {
    formatted = `${(absValue / 1e7).toFixed(2)} Cr`;
  } else if (absValue >= 1e5) {
    formatted = `${(absValue / 1e5).toFixed(2)} L`;
  } else {
    formatted = absValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return `${isNegative ? '-' : ''}₹${formatted}`;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

export default function DashboardPage() {
  const {
    isLoading,
    netWorth,
    equityTotal,
    bondTotal,
    todaysChange,
    todaysChangePct,
    cashFlowStats,
    assetAllocation,
    overallAllocation,
    sectorAllocation,
    lastFetched,
    apiErrors,
    equity,
    bonds,
    transactions,
  } = usePortfolioData();

  const equityCount = equity.length;
  const bondCount = bonds.length;

  const dashboardSectors = sectorAllocation
    .filter((s) => s.equityValue > 0)
    .map((s) => ({ ...s, totalValue: s.equityValue }));

  // Targets logic
  const DAILY_TARGET = 220;
  const today = new Date();

  // Today's target
  const todayTransaction = transactions?.find(t => isSameDay(t.date, today));
  const todaysInvestment = todayTransaction?.investment ?? 0;
  const isTodayWeekend = isWeekend(today);
  const todaysTarget = isTodayWeekend ? 0 : DAILY_TARGET;
  const todayInvestmentChange = todaysTarget === 0 ? undefined : (todaysInvestment - todaysTarget) / todaysTarget;

  // Month target
  let workingDaysThisMonth = 0;
  const start = startOfMonth(today);
  const end = endOfMonth(today);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (!isWeekend(d)) {
      workingDaysThisMonth++;
    }
  }

  const monthTarget = workingDaysThisMonth * DAILY_TARGET;
  const thisMonthInvestment = cashFlowStats?.monthlySummaries?.slice(-1)[0]?.investment ?? 0;
  const monthInvestmentChange = monthTarget === 0 ? undefined : (thisMonthInvestment - monthTarget) / monthTarget;

  return (
    <>
      <Topbar lastFetched={lastFetched} pageTitle="Dashboard" apiErrors={apiErrors} />

      <div className="p-3 sm:p-4 md:p-6 space-y-6 animate-fade-in-up">
        {/* KPI Row */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4"
        >
          <KpiCard
            id="kpi-net-worth"
            title="Net Worth"
            value={isLoading ? '—' : formatINR(netWorth)}
            subValue={isLoading ? undefined : `${equityCount + bondCount} holdings`}
            icon={Wallet}
            accentColor="blue"
            isLoading={isLoading}
            href="/portfolio"
          />
          <KpiCard
            id="kpi-equity"
            title="Equity Value"
            value={isLoading ? '—' : formatINR(equityTotal)}
            subValue={`${equityCount} stocks`}
            icon={TrendingUp}
            accentColor="green"
            isLoading={isLoading}
            href="/stocks"
          />
          <KpiCard
            id="kpi-bonds"
            title="Bond Value"
            value={isLoading ? '—' : formatINR(bondTotal)}
            subValue={`${bondCount} bonds`}
            icon={Building2}
            accentColor="purple"
            isLoading={isLoading}
            href="/bonds"
          />
          <KpiCard
            id="kpi-today-change"
            title="Today's Change"
            value={isLoading ? '—' : formatINR(Math.abs(todaysChange))}
            change={isLoading ? undefined : todaysChangePct}
            changeLabel="today"
            icon={Activity}
            accentColor={todaysChange >= 0 ? 'green' : 'red'}
            isLoading={isLoading}
            href="/stocks"
          />
          <KpiCard
            id="kpi-monthly-investment"
            title="Month Investment"
            value={isLoading ? '—' : formatINR(cashFlowStats.monthlySummaries.slice(-1)[0]?.investment ?? 0)}
            icon={ArrowUpDown}
            accentColor="amber"
            isLoading={isLoading}
            href="/cashflow"
          />
          <KpiCard
            id="kpi-monthly-expenses"
            title="Month Expenses"
            value={isLoading ? '—' : formatINR(cashFlowStats.monthlySummaries.slice(-1)[0]?.totalExpenses ?? 0)}
            icon={IndianRupee}
            accentColor="red"
            isLoading={isLoading}
            note={cashFlowStats.monthlySummaries.length === 0 ? 'No expense data' : undefined}
            href="/cashflow"
          />
          <KpiCard
            id="kpi-today-target"
            title="Today's Target"
            value={isLoading ? '—' : formatINR(Math.abs(todaysTarget - todaysInvestment))}
            subValue={isLoading ? undefined : `Target: ${formatINR(todaysTarget)}`}
            icon={Target}
            isLoading={isLoading}
            href="/cashflow"
            valueClassName={!isLoading && (todaysTarget - todaysInvestment) < 0 ? 'text-red-400' : ''}
          />
          <KpiCard
            id="kpi-month-target"
            title="Month Target"
            value={isLoading ? '—' : formatINR(Math.abs(monthTarget - thisMonthInvestment))}
            subValue={isLoading ? undefined : `Target: ${formatINR(monthTarget)}`}
            icon={Target} 
            isLoading={isLoading}
            href="/cashflow"
            valueClassName={!isLoading && (monthTarget - thisMonthInvestment) < 0 ? 'text-red-400' : ''}
          />
        </motion.div>

        {/* Asset Breakdown Table */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-border/50">
            <CardHeader className="pb-5">
              <CardTitle>Asset Breakdown</CardTitle>
              <CardDescription>Allocation computed from portfolio totals</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-body-lg font-semibold text-foreground/90 tracking-wide">Asset Class</TableHead>
                    <TableHead className="text-body-lg font-semibold text-foreground/90 tracking-wide text-right">Holdings</TableHead>
                    <TableHead className="text-body-lg font-semibold text-foreground/90 tracking-wide text-right">Value</TableHead>
                    <TableHead className="text-body-lg font-semibold text-foreground/90 tracking-wide text-right">Allocation %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [0, 1, 2].map((i) => (
                      <TableRow key={i} className="border-border/30">
                        {[0, 1, 2, 3].map((j) => (
                          <TableCell key={j}><Skeleton className="h-4 bg-white/5" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (() => {
                    const total = equityTotal + bondTotal;
                    const rows = [
                      {
                        id: 'equity',
                        label: 'Equity',
                        icon: TrendingUp,
                        color: 'text-blue-400',
                        bg: 'bg-blue-500/10',
                        count: equityCount,
                        unit: 'stocks',
                        value: equityTotal,
                        alloc: total > 0 ? (equityTotal / total) * 100 : 0,
                      },
                      {
                        id: 'bonds',
                        label: 'Bonds',
                        icon: Building2,
                        color: 'text-purple-400',
                        bg: 'bg-purple-500/10',
                        count: bondCount,
                        unit: 'bonds',
                        value: bondTotal,
                        alloc: total > 0 ? (bondTotal / total) * 100 : 0,
                      },
                    ];
                    return (
                      <>
                        {rows.map((r, i) => (
                          <motion.tr key={r.id}
                            initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 + i * 0.05 }}
                            className="border-border/30 hover:bg-white/[0.02] transition-colors"
                          >
                            <TableCell className="text-body font-semibold text-foreground max-w-[200px] truncate">
                              <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-lg ${r.bg} flex items-center justify-center flex-shrink-0`}>
                                  <r.icon className={`w-3.5 h-3.5 ${r.color}`} />
                                </div>
                                <span className={`text-body font-semibold ${r.color}`}>{r.label}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-small text-muted-foreground/80 tabular-nums">
                              {r.count} {r.unit}
                            </TableCell>
                            <TableCell className="text-right text-body font-medium tabular-nums text-foreground">
                              {formatINR(r.value)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-700 ${r.id === 'equity' ? 'bg-blue-400' : 'bg-purple-400'
                                      }`}
                                    style={{ width: `${r.alloc}%` }}
                                  />
                                </div>
                                <span className={`text-body font-semibold tabular-nums ${r.color}`}>
                                  {r.alloc.toFixed(2)}%
                                </span>
                              </div>
                            </TableCell>
                          </motion.tr>
                        ))}
                        {/* Total row */}
                        <TableRow className="border-border/50 border-t bg-white/[0.015]">
                          <TableCell className="text-body font-bold text-foreground">Total Portfolio</TableCell>
                          <TableCell className="text-right text-small text-muted-foreground/80 tabular-nums">
                            {equityCount + bondCount} holdings
                          </TableCell>
                          <TableCell className="text-right text-body font-bold tabular-nums text-foreground">
                            {formatINR(total)}
                          </TableCell>
                          <TableCell className="text-right text-body font-bold tabular-nums text-foreground">100.00%</TableCell>
                        </TableRow>
                      </>
                    );
                  })()}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sector Allocation Row */}
        <div className="grid grid-cols-1 gap-4 mb-4">
          <Card className="border-border/50">
            <CardHeader className="pb-5">
              <CardTitle>Sector Allocation</CardTitle>
              <CardDescription>Total equity value by sector</CardDescription>
            </CardHeader>
            <CardContent>
              <SectorAllocationChart data={dashboardSectors} />
            </CardContent>
          </Card>
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-border/50">
            <CardHeader className="pb-5">
              <CardTitle>Asset Allocation</CardTitle>
              <CardDescription>Equity vs. Bonds</CardDescription>
            </CardHeader>
            <CardContent>
              <AssetAllocationPie data={assetAllocation} />
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-5">
              <CardTitle>Overall Allocation</CardTitle>
              <CardDescription>Bonds, Gold, and Equity Sectors</CardDescription>
            </CardHeader>
            <CardContent>
              <OverallAllocationPie data={overallAllocation} />
            </CardContent>
          </Card>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 gap-4">
          <Card className="border-border/50">
            <CardHeader className="pb-5">
              <CardTitle>Monthly Cash Flow</CardTitle>
              <CardDescription>Investment & expenses from Daily Transaction</CardDescription>
            </CardHeader>
            <CardContent>
              <CashFlowChart data={cashFlowStats.monthlySummaries} />
            </CardContent>
          </Card>
        </div>

        {/* Quick summary row */}
        {!isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
          >
            {[
              { label: 'Total Invested', value: formatINR(cashFlowStats.totalInvestment) },
              { label: 'Total Expenses', value: formatINR(cashFlowStats.totalExpenses) },
              { label: 'Food & Ent.', value: formatINR(cashFlowStats.totalFoodAndEntertainment) },
              { label: 'Others', value: formatINR(cashFlowStats.totalOthers) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-border/40 px-4 py-3 bg-card/50">
                <p className="text-small text-muted-foreground font-medium mb-1">{label}</p>
                <p className="text-body font-semibold text-foreground tabular-nums">{value}</p>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </>
  );
}