'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Topbar } from '@/components/layout/Topbar';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarIcon, Banknote, AlertCircle, CalendarSearch, Building2, ShieldCheck, Clock, IndianRupee, CalendarDays, CalendarRange, ChevronDown } from 'lucide-react';
import { BondCashflowDialog } from '@/components/bonds/BondCashflowDialog';
import { KpiCard } from '@/components/shared/KpiCard';
import { useState, useEffect, useCallback } from 'react';
import { usePrivacy, PRIVACY_MASK } from '@/lib/privacy-context';
import { getClientCachedBondCashflow, setClientCachedBondCashflow } from '@/lib/bonds/clientCache';
import { calculateBondSummaryMetrics } from '@/lib/calc/bondAnalytics';

function fmt(v: number, isHidden: boolean = false) {
  if (isHidden) return PRIVACY_MASK;
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CalendarPage() {
  const { bonds, bondMaturityEvents, isLoading, lastFetched, apiErrors } = usePortfolioData();
  const { isHidden } = usePrivacy();
  const [selectedIsin, setSelectedIsin] = useState<{ isin: string; name: string; units?: number } | null>(null);

  const [upcomingCoupons, setUpcomingCoupons] = useState<any[]>([]);
  const [nsdlMaturities, setNsdlMaturities] = useState<any[]>([]);
  const [isNsdlLoading, setIsNsdlLoading] = useState(true);
  const [couponView, setCouponView] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedCouponYear, setSelectedCouponYear] = useState<string>('All');
  const [isMonthlyExpanded, setIsMonthlyExpanded] = useState(false);
  const [isYearlyExpanded, setIsYearlyExpanded] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const e of nsdlMaturities) {
      const key = format(e.maturityDate, 'MMM yyyy');
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return Array.from(map.entries()).sort(
      ([a], [b]) => new Date(a).getTime() - new Date(b).getTime()
    );
  }, [nsdlMaturities]);

  const processScheduleResults = useCallback(
    (results: { isin: string; data: any }[]) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const upcoming: any[] = [];
      const maturities: any[] = [];

      for (const res of results) {
        if (!res || !res.data?.cashFlowSchedule) continue;
        const bond = bondMaturityEvents.find((e) => e.isin === res.isin);
        if (!bond) continue;

        let bondMaturityDate: Date | null = null;
        let bondTotalAmount = 0;

        for (const item of res.data.cashFlowSchedule) {
          const dateStr = item.dueDate || item.paymentDate;
          if (!dateStr || dateStr === '-' || dateStr === 'NA') continue;

          let d: Date | null = null;
          const parts = dateStr.split(/[-/]/);
          if (parts.length === 3) {
            if (parts[0].length === 4) {
              d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            } else {
              d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            }
          }

          if (d && !isNaN(d.getTime()) && d >= today) {
            const amtPerUnit =
              typeof item.amountPayable === 'number'
                ? item.amountPayable
                : parseFloat(String(item.amountPayable || '0').replace(/,/g, '')) || 0;

            upcoming.push({
              date: d,
              amount: amtPerUnit * bond.unitsHeld,
              isEstimated: false,
              name: bond.securityName,
              isin: bond.isin,
              couponRate: bond.couponRate,
              payoutType: item.cashFlowsEvent || 'Coupon',
              unitsHeld: bond.unitsHeld,
            });
          }

          if (item.cashFlowsEvent?.toLowerCase().includes('redemption') && d && !isNaN(d.getTime())) {
            bondMaturityDate = d;
            const amtPerUnit =
              typeof item.amountPayable === 'number'
                ? item.amountPayable
                : parseFloat(String(item.amountPayable || '0').replace(/,/g, '')) || 0;
            bondTotalAmount = amtPerUnit * bond.unitsHeld;
          }
        }

        maturities.push({
          maturityDate: bondMaturityDate || bond.maturityDate,
          totalValue: bondTotalAmount || bond.totalValue,
          securityName: bond.securityName,
          isin: bond.isin,
          issuer: bond.issuer,
          creditRating: bond.creditRating,
          unitsHeld: bond.unitsHeld,
        });
      }

      upcoming.sort((a, b) => a.date.getTime() - b.date.getTime());
      setUpcomingCoupons(upcoming);
      setNsdlMaturities(maturities);
    },
    [bondMaturityEvents]
  );

  useEffect(() => {
    async function fetchNsdl() {
      if (bondMaturityEvents.length === 0) {
        setIsNsdlLoading(false);
        return;
      }

      const uniqueIsins = Array.from(new Set(bondMaturityEvents.filter((e) => e.isin).map((e) => e.isin)));
      const cachedResults: { isin: string; data: any }[] = [];
      const isinsToFetch: string[] = [];

      for (const isin of uniqueIsins) {
        const cached = getClientCachedBondCashflow(isin);
        if (cached && (cached.status === 200 || (cached.cashFlowSchedule && cached.cashFlowSchedule.length > 0))) {
          cachedResults.push({ isin, data: cached });
        } else {
          isinsToFetch.push(isin);
        }
      }

      // If cached data exists for any/all ISINs, display it immediately (0ms delay)
      if (cachedResults.length > 0) {
        processScheduleResults(cachedResults);
        if (isinsToFetch.length === 0) {
          setIsNsdlLoading(false);
          return;
        }
      } else {
        setIsNsdlLoading(true);
      }

      // Fetch uncached ISINs in parallel (serviced by server-side disk cache or external NSDL)
      try {
        const promises = isinsToFetch.map(async (isin) => {
          try {
            const res = await fetch(`/api/bonds/cashflow?isin=${encodeURIComponent(isin)}`);
            if (!res.ok) return null;
            const data = await res.json();
            if (data && (data.status === 200 || (data.cashFlowSchedule && data.cashFlowSchedule.length > 0))) {
              setClientCachedBondCashflow(isin, data);
            }
            return { isin, data };
          } catch {
            return null;
          }
        });

        const freshResults = (await Promise.all(promises)).filter(Boolean) as { isin: string; data: any }[];
        const combined = [...cachedResults, ...freshResults];
        processScheduleResults(combined);
      } finally {
        setIsNsdlLoading(false);
      }
    }

    fetchNsdl();
  }, [bondMaturityEvents, processScheduleResults]);

  const hasEstimated = false;

  const totalMaturingValue = nsdlMaturities.reduce((s, e) => s + (e.totalValue || 0), 0);
  const nextMaturity = nsdlMaturities.length > 0 && nsdlMaturities[0].maturityDate
    ? format(new Date(nsdlMaturities[0].maturityDate), 'dd MMM yyyy')
    : 'None';
  const nextPayout = useMemo(() => {
    if (upcomingCoupons.length === 0) return null;
    const firstDateStr = new Date(upcomingCoupons[0].date).toDateString();
    const sameDayCoupons = upcomingCoupons.filter(
      (c) => new Date(c.date).toDateString() === firstDateStr
    );
    const amount = sameDayCoupons.reduce((sum, c) => sum + (c.amount || 0), 0);
    const name =
      sameDayCoupons.length === 1
        ? sameDayCoupons[0].name
        : `${sameDayCoupons[0].name} +${sameDayCoupons.length - 1} more`;

    return {
      formattedDate: format(new Date(upcomingCoupons[0].date), 'dd MMM yyyy'),
      amount,
      name,
      isin: upcomingCoupons[0].isin,
      unitsHeld: upcomingCoupons[0].unitsHeld,
    };
  }, [upcomingCoupons]);

  const availableCouponYears = useMemo(() => {
    const years = new Set<string>();
    for (const c of upcomingCoupons) {
      if (c.date) {
        years.add(String(new Date(c.date).getFullYear()));
      }
    }
    const sorted = Array.from(years).sort();
    return sorted.length > 1 ? ['All', ...sorted] : sorted;
  }, [upcomingCoupons]);

  const monthlyCoupons = useMemo(() => {
    const filtered = selectedCouponYear === 'All'
      ? upcomingCoupons
      : upcomingCoupons.filter((c) => String(new Date(c.date).getFullYear()) === selectedCouponYear);

    const map = new Map<string, { monthKey: string; monthDate: Date; coupons: any[]; totalAmount: number }>();
    for (const c of filtered) {
      const d = new Date(c.date);
      const key = format(d, 'MMM yyyy');
      const entry = map.get(key) ?? {
        monthKey: key,
        monthDate: new Date(d.getFullYear(), d.getMonth(), 1),
        coupons: [],
        totalAmount: 0,
      };
      entry.coupons.push(c);
      entry.totalAmount += (c.amount || 0);
      map.set(key, entry);
    }

    return Array.from(map.values()).sort(
      (a, b) => a.monthDate.getTime() - b.monthDate.getTime()
    );
  }, [upcomingCoupons, selectedCouponYear]);

  const yearlyCoupons = useMemo(() => {
    const yearsMap = new Map<string, {
      year: string;
      totalAmount: number;
      paymentCount: number;
      monthlyAvg: number;
      months: { monthIndex: number; monthName: string; amount: number; count: number }[];
      bonds: { isin: string; name: string; couponRate: number; totalAmount: number; paymentCount: number; unitsHeld: number }[];
    }>();

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (const c of upcomingCoupons) {
      const d = new Date(c.date);
      const yStr = String(d.getFullYear());
      const mIdx = d.getMonth();

      if (!yearsMap.has(yStr)) {
        yearsMap.set(yStr, {
          year: yStr,
          totalAmount: 0,
          paymentCount: 0,
          monthlyAvg: 0,
          months: monthNames.map((name, idx) => ({
            monthIndex: idx,
            monthName: name,
            amount: 0,
            count: 0,
          })),
          bonds: [],
        });
      }

      const yEntry = yearsMap.get(yStr)!;
      yEntry.totalAmount += (c.amount || 0);
      yEntry.paymentCount += 1;
      if (yEntry.months[mIdx]) {
        yEntry.months[mIdx].amount += (c.amount || 0);
        yEntry.months[mIdx].count += 1;
      }

      let bEntry = yEntry.bonds.find((b) => b.isin === c.isin);
      if (!bEntry) {
        bEntry = {
          isin: c.isin,
          name: c.name,
          couponRate: c.couponRate,
          totalAmount: 0,
          paymentCount: 0,
          unitsHeld: c.unitsHeld,
        };
        yEntry.bonds.push(bEntry);
      }
      bEntry.totalAmount += (c.amount || 0);
      bEntry.paymentCount += 1;
    }

    const result = Array.from(yearsMap.values()).map((y) => {
      y.monthlyAvg = y.totalAmount / 12;
      y.bonds.sort((a, b) => b.totalAmount - a.totalAmount);
      return y;
    }).sort((a, b) => Number(a.year) - Number(b.year));

    if (selectedCouponYear !== 'All') {
      return result.filter((y) => y.year === selectedCouponYear);
    }
    return result;
  }, [upcomingCoupons, selectedCouponYear]);

  const bondList = bonds && bonds.length > 0 ? bonds : bondMaturityEvents;

  const { totalAnnualInterest, monthlyInterest, weightedCouponPct } = useMemo(() => {
    let annualInterest = 0;
    let totalPrincipal = 0;

    for (const b of bondList) {
      const rawRate = Number(b.couponRate ?? 0);
      const rate = rawRate > 1 ? rawRate / 100 : rawRate;
      const principal = (b.unitsHeld > 0 && b.faceValue > 0)
        ? b.faceValue * b.unitsHeld
        : (b.totalValue || 0);

      annualInterest += principal * rate;
      totalPrincipal += principal;
    }

    const monthly = annualInterest / 12;
    const avgCoupon = totalPrincipal > 0 ? (annualInterest / totalPrincipal) * 100 : 0;

    return {
      totalAnnualInterest: annualInterest,
      monthlyInterest: monthly,
      weightedCouponPct: avgCoupon,
    };
  }, [bondList]);

  const weightedAvgYieldText = useMemo(() => {
    if (bonds && bonds.length > 0) {
      const metrics = calculateBondSummaryMetrics(bonds);
      if (metrics.weightedAvgYieldText && metrics.weightedAvgYieldText !== '—') {
        return metrics.weightedAvgYieldText;
      }
    }

    let totalWeightedYield = 0;
    let yieldWeightSum = 0;

    for (const b of bondList) {
      const val = (b.totalValue && b.totalValue > 0)
        ? b.totalValue
        : (b.unitsHeld * (b.faceValue || 0)) || 0;
      if (val <= 0) continue;

      let y = (b as any).ytm > 0 ? (b as any).ytm : (b.couponRate > 0 ? b.couponRate : 0);
      if (y > 1) y = y / 100;

      if (y > 0) {
        totalWeightedYield += val * y;
        yieldWeightSum += val;
      }
    }

    if (yieldWeightSum > 0) {
      return `${((totalWeightedYield / yieldWeightSum) * 100).toFixed(2)}% p.a.`;
    }

    return weightedCouponPct > 0 ? `${weightedCouponPct.toFixed(2)}% p.a.` : '—';
  }, [bonds, bondList, weightedCouponPct]);

  // Reset expansion when switching year filter or view mode
  useEffect(() => {
    setIsMonthlyExpanded(false);
    setIsYearlyExpanded(false);
  }, [selectedCouponYear, couponView]);

  const renderMonthGroup = (mGroup: (typeof monthlyCoupons)[0]) => (
    <div key={mGroup.monthKey} className="space-y-2.5">
      {/* Month Header Banner */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">{mGroup.monthKey}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-300/90 border border-amber-500/20 font-semibold">
          {mGroup.coupons.length} {mGroup.coupons.length === 1 ? 'payment' : 'payments'}
        </span>
        <div className="flex-1 h-px bg-amber-500/20" />
        <span className="text-xs font-bold text-foreground tabular-nums">
          {fmt(mGroup.totalAmount, isHidden)}{' '}
          <span className="text-[11px] text-muted-foreground font-normal">total</span>
        </span>
      </div>

      {/* Coupon items under this month */}
      <div className="space-y-2">
        {mGroup.coupons.map((c, i) => (
          <motion.div
            key={`${c.isin}-${c.date}-${i}`}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.02 }}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
              c.isEstimated
                ? 'border-amber-500/20 bg-amber-500/[0.05] hover:border-amber-500/40'
                : 'border-emerald-500/20 bg-emerald-500/[0.05] hover:border-emerald-500/40'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              {/* Date badge */}
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 flex flex-col items-center justify-center flex-shrink-0 shadow-xs">
                <span className="text-xs text-amber-400 font-extrabold">{format(new Date(c.date), 'dd')}</span>
                <span className="text-[9px] text-muted-foreground uppercase font-semibold">{format(new Date(c.date), 'MMM')}</span>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-xs font-semibold text-foreground truncate max-w-[200px] sm:max-w-[340px]">{c.name}</p>
                  {c.payoutType && (
                    <span className="text-[10px] text-muted-foreground border border-border/50 rounded px-1.5 py-px font-medium">{c.payoutType}</span>
                  )}
                  {c.isEstimated && (
                    <span className="text-[10px] text-amber-400/80 font-semibold">est.</span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {format(new Date(c.date), 'EEEE, dd MMM yyyy')} · <span className="text-foreground font-semibold">{(c.couponRate * 100).toFixed(2)}%</span> coupon
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-right">
                <p className={`text-sm font-bold tabular-nums ${c.isEstimated ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {c.isEstimated ? '~' : ''}{fmt(c.amount, isHidden)}
                </p>
                <p className="text-[11px] text-muted-foreground">{c.isEstimated ? 'est. payment' : 'payment'}</p>
              </div>
              <button
                onClick={() => setSelectedIsin({ isin: c.isin, name: c.name, units: c.unitsHeld })}
                className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/15 border border-blue-500/25 transition-all shadow-xs"
                title="View NSDL Cashflow Schedule"
              >
                <CalendarSearch className="w-4 h-4 stroke-[2.2]" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderYearGroup = (yGroup: (typeof yearlyCoupons)[0]) => (
    <div
      key={yGroup.year}
      className="p-4 sm:p-5 rounded-2xl border border-amber-500/25 bg-card/60 backdrop-blur-xs space-y-4"
    >
      {/* Year KPI Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-extrabold text-base">
            {yGroup.year}
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Annual Projected Coupons</p>
            <p className="text-xs text-muted-foreground">
              {yGroup.paymentCount} {yGroup.paymentCount === 1 ? 'payment' : 'payments'} across {yGroup.bonds.length} {yGroup.bonds.length === 1 ? 'bond holding' : 'bond holdings'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 self-start sm:self-auto">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Annual Income</p>
            <p className="text-base font-extrabold text-amber-300 tabular-nums">
              {fmt(yGroup.totalAmount, isHidden)}
            </p>
          </div>
          <div className="w-px h-8 bg-border/50" />
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Monthly Avg</p>
            <p className="text-sm font-bold text-emerald-400 tabular-nums">
              {fmt(yGroup.monthlyAvg, isHidden)}/mo
            </p>
          </div>
        </div>
      </div>

      {/* 12-Month Matrix / Calendar Strip */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">Monthly Distribution ({yGroup.year})</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
          {yGroup.months.map((m) => {
            const hasIncome = m.amount > 0;
            return (
              <div
                key={m.monthName}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  hasIncome
                    ? 'border-amber-500/30 bg-amber-500/10 hover:border-amber-500/50'
                    : 'border-border/20 bg-muted/20 opacity-40'
                }`}
              >
                <p className="text-[11px] font-bold text-muted-foreground uppercase">{m.monthName}</p>
                <p className={`text-xs font-extrabold tabular-nums mt-1 ${hasIncome ? 'text-amber-300' : 'text-muted-foreground'}`}>
                  {hasIncome ? fmt(m.amount, isHidden) : '—'}
                </p>
                {hasIncome && (
                  <span className="inline-block text-[9px] text-amber-400/80 font-semibold mt-0.5">
                    {m.count} {m.count === 1 ? 'payout' : 'payouts'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bond Contributions for this Year */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">Holdings Breakdown</p>
        <div className="space-y-2">
          {yGroup.bonds.map((b) => (
            <div
              key={b.isin}
              className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl border border-border/40 bg-background/50 hover:bg-amber-500/[0.03] transition-colors"
            >
              <div className="min-w-0 pr-3">
                <p className="text-xs font-semibold text-foreground truncate max-w-[220px] sm:max-w-[380px]">{b.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-mono text-purple-400">{b.isin}</span> · <span className="text-foreground font-semibold">{(b.couponRate * 100).toFixed(2)}%</span> coupon · {b.paymentCount} {b.paymentCount === 1 ? 'payout' : 'payouts'}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  <p className="text-xs sm:text-sm font-bold tabular-nums text-emerald-400">
                    {fmt(b.totalAmount, isHidden)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">annual total</p>
                </div>
                <button
                  onClick={() => setSelectedIsin({ isin: b.isin, name: b.name, units: b.unitsHeld })}
                  className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/15 border border-blue-500/25 transition-all shadow-xs"
                  title="View NSDL Cashflow Schedule"
                >
                  <CalendarSearch className="w-4 h-4 stroke-[2.2]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Topbar lastFetched={lastFetched} pageTitle="Calendar" apiErrors={apiErrors} />
      <div className="p-3 sm:p-4 md:p-6 space-y-6 animate-fade-in-up">

        {/* ── Top Summary KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Total Maturing Principal"
            value={fmt(totalMaturingValue, isHidden)}
            subValue={`${nsdlMaturities.length} active bonds`}
            accentColor="purple"
            icon={Building2}
            isPrivate
            isLoading={isLoading || isNsdlLoading}
          />
          <KpiCard
            title="Next Redemption"
            value={nextMaturity}
            subValue={nsdlMaturities.length > 0 ? (nsdlMaturities[0].securityName || 'Earliest maturity') : 'No maturity scheduled'}
            accentColor="blue"
            icon={CalendarIcon}
            isLoading={isLoading || isNsdlLoading}
          />
          <KpiCard
            title="Next Payout"
            value={nextPayout ? nextPayout.formattedDate : 'None'}
            subValue={
              isLoading || isNsdlLoading
                ? undefined
                : nextPayout
                ? `${fmt(nextPayout.amount, isHidden)} · ${nextPayout.name}`
                : 'No upcoming payout'
            }
            accentColor="amber"
            icon={Banknote}
            isLoading={isLoading || isNsdlLoading}
          />
          <KpiCard
            title="Monthly Interest"
            value={fmt(monthlyInterest, isHidden)}
            subValue={
              isLoading || isNsdlLoading
                ? undefined
                : `Weighted Avg. Yield: ${weightedAvgYieldText}`
            }
            accentColor="teal"
            icon={IndianRupee}
            isPrivate
            isLoading={isLoading || isNsdlLoading}
          />
        </div>

        {/* Bond Maturities */}
        <Card className="border-blue-500/25 bg-gradient-to-b from-blue-950/15 via-card to-card shadow-sm hover:border-blue-500/40 transition-all">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <CalendarIcon className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <CardTitle className="text-blue-300 font-bold">Bond Maturities</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading || isNsdlLoading ? <Skeleton className="h-40 bg-white/5" /> :
              nsdlMaturities.length === 0 ? (
                <EmptyState title="No maturity data" description="Bond maturity dates will appear here when bonds with valid Maturity Date values are loaded." />
              ) : (
                <div className="space-y-4">
                  {grouped.map(([month, events]) => (
                    <div key={month}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">{month}</span>
                        <div className="flex-1 h-px bg-blue-500/20" />
                        <span className="text-xs font-semibold text-muted-foreground">
                          {fmt(events.reduce((s, e) => s + e.totalValue, 0), isHidden)} maturing
                        </span>
                      </div>
                      <div className="space-y-2 ml-2">
                        {events.map((e) => (
                          <motion.div key={e.isin} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-3 p-3 rounded-xl border border-blue-500/20 bg-card/60 hover:bg-blue-500/[0.04] transition-colors">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border border-blue-500/30 flex flex-col items-center justify-center flex-shrink-0 shadow-xs">
                              <span className="text-xs text-blue-400 font-extrabold">{format(e.maturityDate, 'dd')}</span>
                              <span className="text-[10px] text-muted-foreground uppercase font-semibold">{format(e.maturityDate, 'MMM')}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{e.securityName}</p>
                              <p className="text-xs text-muted-foreground">{e.issuer} · <span className="font-mono text-purple-400">{e.isin}</span></p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-bold tabular-nums text-foreground">{fmt(e.totalValue, isHidden)}</p>
                              <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400 bg-emerald-500/10 font-bold">
                                {e.creditRating}
                              </Badge>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </CardContent>
        </Card>

        {/* Upcoming Coupons */}
        <Card className="border-amber-500/25 bg-gradient-to-b from-amber-950/15 via-card to-card shadow-sm hover:border-amber-500/40 transition-all">
          <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Banknote className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <CardTitle className="text-amber-300 font-bold">Upcoming Coupon Payments</CardTitle>
              </div>
            </div>

            {/* View Mode Toggle: Monthly / Yearly */}
            <div className="flex items-center gap-1 p-1 bg-muted/40 border border-border/50 rounded-xl self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setCouponView('monthly')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  couponView === 'monthly'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setCouponView('yearly')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  couponView === 'yearly'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'
                }`}
              >
                <CalendarRange className="w-3.5 h-3.5" />
                Yearly
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Year Filter Pills if multiple years are present */}
            {availableCouponYears.length > 2 && !isLoading && !isNsdlLoading && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <span className="text-xs text-muted-foreground font-medium mr-1 flex-shrink-0">Year:</span>
                {availableCouponYears.map((yr) => {
                  const isSelected = selectedCouponYear === yr;
                  return (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setSelectedCouponYear(yr)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex-shrink-0 ${
                        isSelected
                          ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-xs'
                          : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04] border border-border/40'
                      }`}
                    >
                      {yr}
                    </button>
                  );
                })}
              </div>
            )}

            {isLoading || isNsdlLoading ? (
              <Skeleton className="h-40 bg-white/5" />
            ) : upcomingCoupons.length === 0 ? (
              <EmptyState title="No coupon data" description="No upcoming estimated coupon payments found." />
            ) : couponView === 'monthly' ? (
              /* ── Monthly View ── */
              monthlyCoupons.length === 0 ? (
                <EmptyState title="No coupons for this period" description="No coupon payments scheduled for the selected year." />
              ) : (
                <div className="space-y-5">
                  {/* First month always visible */}
                  {renderMonthGroup(monthlyCoupons[0])}

                  {/* Remaining months with expand/collapse animation */}
                  {monthlyCoupons.length > 1 && (
                    <>
                      <AnimatePresence initial={false}>
                        {isMonthlyExpanded && (
                          <motion.div
                            key="more-months"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.35, ease: 'easeInOut' }}
                            className="overflow-hidden space-y-5"
                          >
                            {monthlyCoupons.slice(1).map(renderMonthGroup)}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Expand/Collapse Button with Down Arrow */}
                      <div className="pt-2 flex justify-center">
                        <button
                          type="button"
                          onClick={() => setIsMonthlyExpanded(!isMonthlyExpanded)}
                          className="group flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all shadow-xs"
                        >
                          <span>
                            {isMonthlyExpanded
                              ? 'Show less'
                              : `Show ${monthlyCoupons.length - 1} more ${monthlyCoupons.length - 1 === 1 ? 'month' : 'months'}`}
                          </span>
                          <motion.div
                            animate={{ rotate: isMonthlyExpanded ? 180 : 0 }}
                            transition={{ duration: 0.25 }}
                          >
                            <ChevronDown className="w-4 h-4 text-amber-400 group-hover:translate-y-0.5 transition-transform" />
                          </motion.div>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )
            ) : (
              /* ── Yearly View ── */
              yearlyCoupons.length === 0 ? (
                <EmptyState title="No coupons for this year" description="No coupon payments scheduled for the selected year." />
              ) : (
                <div className="space-y-6">
                  {/* First year always visible */}
                  {renderYearGroup(yearlyCoupons[0])}

                  {/* Remaining years with expand/collapse animation */}
                  {yearlyCoupons.length > 1 && (
                    <>
                      <AnimatePresence initial={false}>
                        {isYearlyExpanded && (
                          <motion.div
                            key="more-years"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.35, ease: 'easeInOut' }}
                            className="overflow-hidden space-y-6 pt-2"
                          >
                            {yearlyCoupons.slice(1).map(renderYearGroup)}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Expand/Collapse Button with Down Arrow */}
                      <div className="pt-2 flex justify-center">
                        <button
                          type="button"
                          onClick={() => setIsYearlyExpanded(!isYearlyExpanded)}
                          className="group flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all shadow-xs"
                        >
                          <span>
                            {isYearlyExpanded
                              ? 'Show less'
                              : `Show ${yearlyCoupons.length - 1} more ${yearlyCoupons.length - 1 === 1 ? 'year' : 'years'}`}
                          </span>
                          <motion.div
                            animate={{ rotate: isYearlyExpanded ? 180 : 0 }}
                            transition={{ duration: 0.25 }}
                          >
                            <ChevronDown className="w-4 h-4 text-amber-400 group-hover:translate-y-0.5 transition-transform" />
                          </motion.div>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )
            )}
          </CardContent>
        </Card>

        {/* Dividend dates — honest empty state */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Events</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              title="No event data source"
              description="There is no dividend/distribution data in the current Google Sheet. This section will be populated once a dividend/distribution data source is added."
              reason="v1 gap: dividend/distribution data have no source — not fabricated"
              icon={AlertCircle}
              className="py-8"
            />
          </CardContent>
        </Card>
      </div>

      <BondCashflowDialog
        open={Boolean(selectedIsin)}
        onOpenChange={(open) => {
          if (!open) setSelectedIsin(null);
        }}
        isin={selectedIsin?.isin ?? ''}
        securityName={selectedIsin?.name ?? ''}
        unitsHeld={selectedIsin?.units ?? 0}
      />
    </>
  );
}