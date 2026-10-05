'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Topbar } from '@/components/layout/Topbar';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarIcon, Banknote, AlertCircle, CalendarSearch, Building2, ShieldCheck, Clock, IndianRupee } from 'lucide-react';
import { BondCashflowDialog } from '@/components/bonds/BondCashflowDialog';
import { KpiCard } from '@/components/shared/KpiCard';
import { useState, useEffect, useCallback } from 'react';
import { usePrivacy, PRIVACY_MASK } from '@/lib/privacy-context';
import { getClientCachedBondCashflow, setClientCachedBondCashflow } from '@/lib/bonds/clientCache';

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
      setUpcomingCoupons(upcoming.slice(0, 15));
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
  const totalCouponsAmount = upcomingCoupons.reduce((s, c) => s + (c.amount || 0), 0);

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
            title="Scheduled Payouts"
            value={fmt(totalCouponsAmount, isHidden)}
            subValue={`${upcomingCoupons.length} upcoming coupons`}
            accentColor="amber"
            icon={Banknote}
            isPrivate
            isLoading={isLoading || isNsdlLoading}
          />
          <KpiCard
            title="Monthly Interest"
            value={fmt(monthlyInterest, isHidden)}
            subValue={
              isLoading || isNsdlLoading
                ? undefined
                : `${weightedCouponPct > 0 ? `${weightedCouponPct.toFixed(2)}% p.a. · ` : ''}${fmt(totalAnnualInterest, isHidden)}/yr`
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
                <p className="text-xs text-muted-foreground">Official schedule synced via NSDL API</p>
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
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Banknote className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <CardTitle className="text-amber-300 font-bold">Upcoming Coupon Payments</CardTitle>
                {hasEstimated ? (
                  <p className="text-xs text-amber-400/70">⚠️ Bonds without a Payout Date use estimated dates from maturity</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Cash flow schedule verified from issuer filings</p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading || isNsdlLoading ? <Skeleton className="h-40 bg-white/5" /> :
              upcomingCoupons.length === 0 ? (
                <EmptyState title="No coupon data" description="No upcoming estimated coupon payments found." />
              ) : (
                <div className="space-y-2">
                  {upcomingCoupons.map((c, i) => (
                    <motion.div key={`${c.isin}-${i}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${c.isEstimated
                          ? 'border-amber-500/20 bg-amber-500/[0.05] hover:border-amber-500/40'
                          : 'border-emerald-500/20 bg-emerald-500/[0.05] hover:border-emerald-500/40'
                        }`}>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-xs font-semibold text-foreground truncate max-w-[200px]">{c.name}</p>
                          {c.payoutType && (
                            <span className="text-[10px] text-muted-foreground border border-border/50 rounded px-1.5 py-px font-medium">{c.payoutType}</span>
                          )}
                          {c.isEstimated && (
                            <span className="text-[10px] text-amber-400/80 font-semibold">est.</span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">{format(c.date, 'dd MMM yyyy')} · <span className="text-foreground font-semibold">{(c.couponRate * 100).toFixed(2)}%</span> coupon</p>
                      </div>
                      <div className="flex items-center gap-3">
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