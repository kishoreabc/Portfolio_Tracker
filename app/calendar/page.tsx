'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, isSameMonth, startOfMonth } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Topbar } from '@/components/layout/Topbar';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarIcon, Banknote, AlertCircle } from 'lucide-react';

function fmt(v: number) {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CalendarPage() {
  const { bondMaturityEvents, isLoading, lastFetched, apiErrors } = usePortfolioData();

  const grouped = useMemo(() => {
    const map = new Map<string, typeof bondMaturityEvents>();
    for (const e of bondMaturityEvents) {
      const key = format(e.maturityDate, 'MMM yyyy');
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return Array.from(map.entries()).sort(
      ([a], [b]) => new Date(a).getTime() - new Date(b).getTime()
    );
  }, [bondMaturityEvents]);

  // All upcoming estimated coupon dates
  const upcomingCoupons = useMemo(() => {
    const today = new Date();
    return bondMaturityEvents
      .flatMap((e) => e.estimatedCouponDates.map((d) => ({
        date: d,
        name: e.securityName,
        isin: e.isin,
        couponRate: e.couponRate,
        value: e.totalValue * e.couponRate / 2, // semi-annual estimate
      })))
      .filter((c) => c.date > today)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 10);
  }, [bondMaturityEvents]);

  return (
    <>
      <Topbar lastFetched={lastFetched} pageTitle="Calendar" apiErrors={apiErrors} />
      <div className="p-6 space-y-4 animate-fade-in-up">
        {/* Bond Maturities */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-blue-400" /> Bond Maturities
            </CardTitle>
            <p className="text-xs text-muted-foreground">Real data from Maturity Date column in Bond Folio</p>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-40 bg-white/5" /> :
              bondMaturityEvents.length === 0 ? (
                <EmptyState title="No maturity data" description="Bond maturity dates will appear here when bonds with valid Maturity Date values are loaded." />
              ) : (
                <div className="space-y-4">
                  {grouped.map(([month, events]) => (
                    <div key={month}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">{month}</span>
                        <div className="flex-1 h-px bg-border/40" />
                        <span className="text-xs text-muted-foreground">
                          {fmt(events.reduce((s, e) => s + e.totalValue, 0))} maturing
                        </span>
                      </div>
                      <div className="space-y-2 ml-2">
                        {events.map((e) => (
                          <motion.div key={e.isin} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-card hover:bg-white/[0.02]">
                            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex flex-col items-center justify-center flex-shrink-0">
                              <span className="text-xs text-blue-400 font-bold">{format(e.maturityDate, 'dd')}</span>
                              <span className="text-[10px] text-muted-foreground">{format(e.maturityDate, 'MMM')}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{e.securityName}</p>
                              <p className="text-xs text-muted-foreground">{e.issuer} · {e.isin}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-semibold">{fmt(e.totalValue)}</p>
                              <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-400">
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

        {/* Estimated Coupon Dates */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Banknote className="w-4 h-4 text-amber-400" /> Upcoming Coupon Payments
              <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400 ml-auto">
                Estimated
              </Badge>
            </CardTitle>
            <p className="text-xs text-amber-400/70">⚠️ Estimated from semi-annual coupon frequency — not actual payment dates from sheet</p>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-40 bg-white/5" /> :
              upcomingCoupons.length === 0 ? (
                <EmptyState title="No coupon data" description="No upcoming estimated coupon payments found." />
              ) : (
                <div className="space-y-2">
                  {upcomingCoupons.map((c, i) => (
                    <motion.div key={`${c.isin}-${i}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                      className="flex items-center justify-between p-3 rounded-lg border border-amber-500/10 bg-amber-500/5">
                      <div>
                        <p className="text-xs font-medium text-foreground truncate max-w-[200px]">{c.name}</p>
                        <p className="text-[11px] text-muted-foreground">{format(c.date, 'dd MMM yyyy')} · {(c.couponRate * 100).toFixed(2)}% coupon</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-amber-400">~{fmt(c.value)}</p>
                        <p className="text-[11px] text-muted-foreground">est. payment</p>
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
            <CardTitle className="text-sm font-semibold">Dividend Dates</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              title="No dividend data source"
              description="There is no dividend schedule in the current Google Sheet. This section will be populated once a dividend/distribution data source is added."
              reason="v1 gap: dividend dates have no source — not fabricated"
              icon={AlertCircle}
              className="py-8"
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
