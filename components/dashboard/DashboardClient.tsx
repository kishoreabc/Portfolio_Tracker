'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet, TrendingUp, Building2, Activity, ArrowUpDown, ArrowUp, ArrowDown, IndianRupee, Target
} from 'lucide-react';
import { isWeekend, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { KpiCard } from '@/components/shared/KpiCard';
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
import { usePrivacy, PRIVACY_MASK } from '@/lib/privacy-context';

function formatINR(value: number, isHidden: boolean = false): string {
  if (isHidden) return PRIVACY_MASK;
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

export default function DashboardClient() {
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
  const { isHidden } = usePrivacy();

  const equityCount = equity.length;
  const bondCount = bonds.length;

  type AssetSortKey = 'label' | 'count' | 'value' | 'pct';
  const [assetSortKey, setAssetSortKey] = useState<AssetSortKey | null>(null);
  const [assetSortAsc, setAssetSortAsc] = useState(false);

  const toggleAssetSort = (key: AssetSortKey) => {
    if (assetSortKey === key) setAssetSortAsc(!assetSortAsc);
    else { setAssetSortKey(key); setAssetSortAsc(false); }
  };

  const renderAssetSortIcon = (colKey: AssetSortKey) => {
    if (assetSortKey !== colKey) {
      return (
        <ArrowUpDown className="inline-block ml-1.5 w-3.5 h-3.5 text-muted-foreground/35 group-hover:text-muted-foreground/80 transition-colors" />
      );
    }
    return assetSortAsc ? (
      <ArrowUp className="inline-block ml-1.5 w-3.5 h-3.5 text-primary font-bold transition-transform" />
    ) : (
      <ArrowDown className="inline-block ml-1.5 w-3.5 h-3.5 text-primary font-bold transition-transform" />
    );
  };

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
            isPrivate
            showPrivacyToggle
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
            isPrivate
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
            isPrivate
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
            isPrivate
          />
          <KpiCard
            id="kpi-monthly-investment"
            title="Month Investment"
            value={isLoading ? '—' : formatINR(cashFlowStats.monthlySummaries.slice(-1)[0]?.investment ?? 0)}
            icon={ArrowUpDown}
            accentColor="amber"
            isLoading={isLoading}
            href="/cashflow"
            isPrivate
          />
          <KpiCard
            id="kpi-monthly-expenses"
            title="Month Expenses"
            value={isLoading ? '—' : formatINR(cashFlowStats.monthlySummaries.slice(-1)[0]?.totalExpenses ?? 0)}
            icon={IndianRupee}
            accentColor="rose"
            isLoading={isLoading}
            note={cashFlowStats.monthlySummaries.length === 0 ? 'No expense data' : undefined}
            href="/cashflow"
            isPrivate
          />
          <KpiCard
            id="kpi-today-target"
            title="Today's Target"
            value={isLoading ? '—' : formatINR(Math.min(Math.max(0, todaysTarget - todaysInvestment), Math.max(0, monthTarget - thisMonthInvestment)))}
            subValue={isLoading ? undefined : `Target: ${formatINR(todaysTarget)}`}
            icon={Target}
            accentColor="cyan"
            isLoading={isLoading}
            href="/cashflow"
          />
          <KpiCard
            id="kpi-month-target"
            title="Month Target"
            value={isLoading ? '—' : formatINR(Math.max(0, monthTarget - thisMonthInvestment))}
            subValue={isLoading ? undefined : `Target: ${formatINR(monthTarget)}`}
            icon={Target}
            accentColor="teal"
            isLoading={isLoading}
            href="/cashflow"
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
                    {[
                      { key: 'label' as const, label: 'Asset Class', align: 'left' },
                      { key: 'count' as const, label: 'Holdings', align: 'right' },
                      { key: 'value' as const, label: 'Value', align: 'right' },
                      { key: 'pct' as const, label: 'Allocation %', align: 'right' },
                    ].map((col) => (
                      <TableHead
                        key={col.key}
                        className={`text-sm font-semibold uppercase tracking-wider whitespace-nowrap select-none transition-colors cursor-pointer group hover:text-foreground ${
                          col.align === 'right' ? 'text-right' : 'text-left'
                        } ${assetSortKey === col.key ? 'text-foreground font-bold' : 'text-muted-foreground'}`}
                        onClick={() => toggleAssetSort(col.key)}
                        aria-sort={
                          assetSortKey === col.key
                            ? assetSortAsc
                              ? 'ascending'
                              : 'descending'
                            : undefined
                        }
                      >
                        <span className={`inline-flex items-center ${col.align === 'right' ? 'justify-end' : ''}`}>
                          {col.label}
                          {renderAssetSortIcon(col.key)}
                        </span>
                      </TableHead>
                    ))}
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
                    const total = assetAllocation && assetAllocation.length > 0
                      ? assetAllocation.reduce((s, a) => s + a.value, 0)
                      : (equityTotal + bondTotal);

                    const rows = (assetAllocation && assetAllocation.length > 0)
                      ? assetAllocation.map((a, idx) => {
                          const lower = a.label.toLowerCase();
                          const isEquity = lower.includes('equity') || lower.includes('stock');
                          const isBond = lower.includes('bond') || lower.includes('debt');
                          const isGold = lower.includes('gold') || lower.includes('commodity');

                          let color = 'text-blue-400';
                          let barColor = 'bg-blue-400';
                          let bg = 'bg-blue-500/10';
                          let Icon = TrendingUp;
                          const unit = isEquity ? 'stocks' : isBond ? 'bonds' : 'holdings';
                          const count = isEquity
                            ? equityCount
                            : isBond
                            ? bondCount
                            : equity.filter((h) => h.sector?.toLowerCase() === lower).length || 1;

                          if (isBond) {
                            color = 'text-purple-400';
                            barColor = 'bg-purple-400';
                            bg = 'bg-purple-500/10';
                            Icon = Building2;
                          } else if (isGold) {
                            color = 'text-amber-400';
                            barColor = 'bg-amber-400';
                            bg = 'bg-amber-500/10';
                            Icon = Wallet;
                          } else if (idx % 2 === 1) {
                            color = 'text-emerald-400';
                            barColor = 'bg-emerald-400';
                            bg = 'bg-emerald-500/10';
                          }

                          return {
                            id: a.label.toLowerCase(),
                            label: a.label,
                            icon: Icon,
                            color,
                            barColor,
                            bg,
                            count,
                            unit,
                            value: a.value,
                            alloc: total > 0 ? (a.value / total) * 100 : 0,
                          };
                        })
                      : [
                          {
                            id: 'equity',
                            label: 'Equity',
                            icon: TrendingUp,
                            color: 'text-blue-400',
                            barColor: 'bg-blue-400',
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
                            barColor: 'bg-purple-400',
                            bg: 'bg-purple-500/10',
                            count: bondCount,
                            unit: 'bonds',
                            value: bondTotal,
                            alloc: total > 0 ? (bondTotal / total) * 100 : 0,
                          },
                        ];

                    const totalHoldings = rows.reduce((s, r) => s + r.count, 0) || (equityCount + bondCount);

                    const sortedRows = [...rows].sort((a, b) => {
                      if (!assetSortKey) return 0;
                      const valA: any = assetSortKey === 'pct' ? a.alloc : a[assetSortKey];
                      const valB: any = assetSortKey === 'pct' ? b.alloc : b[assetSortKey];
                      if (typeof valA === 'string') {
                        const cmp = valA.localeCompare(String(valB));
                        return assetSortAsc ? cmp : -cmp;
                      }
                      return assetSortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
                    });

                    return (
                      <>
                        {sortedRows.map((r, i) => (
                          <motion.tr key={r.id}
                            initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 + i * 0.05 }}
                            className="border-border/30 hover:bg-white/[0.02] transition-colors"
                          >
                            <TableCell className="text-sm font-semibold text-foreground max-w-[200px] truncate">
                              <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-lg ${r.bg} flex items-center justify-center flex-shrink-0`}>
                                  <r.icon className={`w-3.5 h-3.5 ${r.color}`} />
                                </div>
                                <span className={`text-sm font-semibold ${r.color}`}>{r.label}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground/80 font-medium tabular-nums">
                              {r.count} {r.unit}
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium tabular-nums text-foreground">
                              {formatINR(r.value, isHidden)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-700 ${r.barColor}`}
                                    style={{ width: `${r.alloc}%` }}
                                  />
                                </div>
                                <span className={`text-sm font-semibold tabular-nums ${r.color}`}>
                                  {r.alloc.toFixed(2)}%
                                </span>
                              </div>
                            </TableCell>
                          </motion.tr>
                        ))}
                        {/* Total row */}
                        <TableRow className="border-border/50 border-t bg-white/[0.015]">
                          <TableCell className="text-sm font-bold text-foreground">Total Portfolio</TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground/80 font-medium tabular-nums">
                            {totalHoldings} holdings
                          </TableCell>
                          <TableCell className="text-right text-sm font-bold tabular-nums text-foreground">
                            {formatINR(total, isHidden)}
                          </TableCell>
                          <TableCell className="text-right text-sm font-bold tabular-nums text-foreground">100.00%</TableCell>
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

        {/* Charts row 2: Monthly Cash Flow */}
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
              { label: 'Total Invested', value: formatINR(cashFlowStats.totalInvestment, isHidden) },
              { label: 'Total Expenses', value: formatINR(cashFlowStats.totalExpenses, isHidden) },
              { label: 'Food & Ent.', value: formatINR(cashFlowStats.totalFoodAndEntertainment, isHidden) },
              { label: 'Others', value: formatINR(cashFlowStats.totalOthers, isHidden) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-border/40 px-4 py-3.5 bg-card/50">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                <p className="text-lg sm:text-xl font-bold text-foreground tabular-nums tracking-tight">{value}</p>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </>
  );
}
