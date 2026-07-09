'use client';

import { motion } from 'framer-motion';
import {
  Wallet, TrendingUp, Building2, Activity, ArrowUpDown, IndianRupee,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from '@/components/shared/KpiCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { Topbar } from '@/components/layout/Topbar';
import { AssetAllocationPie } from '@/components/charts/AssetAllocationPie';
import { SectorAllocationChart } from '@/components/charts/SectorAllocationChart';
import { CashFlowChart } from '@/components/charts/CashFlowChart';
import { usePortfolioData } from '@/hooks/usePortfolioData';

function formatINR(value: number): string {
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(2)} Cr`;
  if (value >= 1e5) return `₹${(value / 1e5).toFixed(2)} L`;
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
    sectorAllocation,
    lastFetched,
    apiErrors,
    equity,
    bonds,
  } = usePortfolioData();

  const equityCount = equity.length;
  const bondCount = bonds.length;

  const dashboardSectors = sectorAllocation
    .filter((s) => s.equityValue > 0)
    .map((s) => ({ ...s, totalValue: s.equityValue }));

  return (
    <>
      <Topbar lastFetched={lastFetched} pageTitle="Dashboard" apiErrors={apiErrors} />

      <div className="p-6 space-y-6 animate-fade-in-up">
        {/* KPI Row */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"
        >
          <KpiCard
            id="kpi-net-worth"
            title="Net Worth"
            value={isLoading ? '—' : formatINR(netWorth)}
            subValue={isLoading ? undefined : `${equityCount + bondCount} holdings`}
            icon={Wallet}
            accentColor="blue"
            isLoading={isLoading}
          />
          <KpiCard
            id="kpi-equity"
            title="Equity Value"
            value={isLoading ? '—' : formatINR(equityTotal)}
            subValue={`${equityCount} stocks`}
            icon={TrendingUp}
            accentColor="green"
            isLoading={isLoading}
          />
          <KpiCard
            id="kpi-bonds"
            title="Bond Value"
            value={isLoading ? '—' : formatINR(bondTotal)}
            subValue={`${bondCount} bonds`}
            icon={Building2}
            accentColor="purple"
            isLoading={isLoading}
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
          />
          <KpiCard
            id="kpi-monthly-investment"
            title="Monthly Investment"
            value={isLoading ? '—' : formatINR(cashFlowStats.monthlySummaries.slice(-1)[0]?.investment ?? 0)}
            subValue="this month"
            icon={ArrowUpDown}
            accentColor="amber"
            isLoading={isLoading}
          />
          <KpiCard
            id="kpi-monthly-expenses"
            title="Monthly Expenses"
            value={isLoading ? '—' : formatINR(cashFlowStats.monthlySummaries.slice(-1)[0]?.totalExpenses ?? 0)}
            subValue="this month"
            icon={IndianRupee}
            accentColor="red"
            isLoading={isLoading}
            note={cashFlowStats.monthlySummaries.length === 0 ? 'No expense data' : undefined}
          />
        </motion.div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">Asset Allocation</CardTitle>
              <p className="text-xs text-muted-foreground">Equity vs. Bonds</p>
            </CardHeader>
            <CardContent>
              <AssetAllocationPie data={assetAllocation} />
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">Sector Allocation</CardTitle>
              <p className="text-xs text-muted-foreground">Total value by sector</p>
            </CardHeader>
            <CardContent>
              <SectorAllocationChart data={dashboardSectors} />
            </CardContent>
          </Card>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 gap-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">Monthly Cash Flow</CardTitle>
              <p className="text-xs text-muted-foreground">Investment & expenses from Daily Transaction</p>
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
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                <p className="text-sm font-semibold text-foreground tabular-nums">{value}</p>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </>
  );
}
