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
import { CalendarIcon, Banknote, AlertCircle, CalendarSearch } from 'lucide-react';
import { BondCashflowDialog } from '@/components/bonds/BondCashflowDialog';
import { useState, useEffect } from 'react';

function fmt(v: number) {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CalendarPage() {
  const { bondMaturityEvents, isLoading, lastFetched, apiErrors } = usePortfolioData();
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

  useEffect(() => {
    async function fetchNsdl() {
      if (bondMaturityEvents.length === 0) {
        setIsNsdlLoading(false);
        return;
      }
      setIsNsdlLoading(true);
      
      const uniqueIsins = Array.from(new Set(bondMaturityEvents.filter(e => e.isin).map(e => e.isin)));
      const promises = uniqueIsins.map(async (isin) => {
        try {
          const res = await fetch(`/api/bonds/cashflow?isin=${isin}`);
          if (!res.ok) return null;
          const data = await res.json();
          return { isin, data };
        } catch { return null; }
      });
      
      const results = await Promise.all(promises);
      const today = new Date();
      today.setHours(0,0,0,0);
      const upcoming: any[] = [];
      const maturities: any[] = [];
      
      for (const res of results) {
        if (!res || !res.data?.cashFlowSchedule) continue;
        const bond = bondMaturityEvents.find(e => e.isin === res.isin);
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
            const amtPerUnit = typeof item.amountPayable === 'number'
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
            const amtPerUnit = typeof item.amountPayable === 'number'
              ? item.amountPayable
              : parseFloat(String(item.amountPayable || '0').replace(/,/g, '')) || 0;
            bondTotalAmount = amtPerUnit * bond.unitsHeld;
          }
        }
        
        maturities.push({
          maturityDate: bondMaturityDate || bond.maturityDate, // fallback to sheet if missing
          totalValue: bondTotalAmount || bond.totalValue, // fallback to sheet if missing
          securityName: bond.securityName,
          isin: bond.isin,
          issuer: bond.issuer,
          creditRating: bond.creditRating,
          unitsHeld: bond.unitsHeld
        });
      }
      
      upcoming.sort((a,b) => a.date.getTime() - b.date.getTime());
      setUpcomingCoupons(upcoming.slice(0, 15));
      setNsdlMaturities(maturities);
      setIsNsdlLoading(false);
    }
    fetchNsdl();
  }, [bondMaturityEvents]);

  const hasEstimated = false;
  const allReal = upcomingCoupons.length > 0;

  return (
    <>
      <Topbar lastFetched={lastFetched} pageTitle="Calendar" apiErrors={apiErrors} />
      <div className="p-3 sm:p-4 md:p-6 space-y-4 animate-fade-in-up">
        {/* Bond Maturities */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-blue-400" /> Bond Maturities
            </CardTitle>
            <p className="text-xs text-muted-foreground">Fetched from official NSDL API</p>
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

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Banknote className="w-4 h-4 text-amber-400" /> Upcoming Coupon Payments
            </CardTitle>
            {hasEstimated && (
              <p className="text-xs text-amber-400/70">⚠️ Bonds without a Payout Date use estimated dates from maturity</p>
            )}
          </CardHeader>
          <CardContent>
            {isLoading || isNsdlLoading ? <Skeleton className="h-40 bg-white/5" /> :
              upcomingCoupons.length === 0 ? (
                <EmptyState title="No coupon data" description="No upcoming estimated coupon payments found." />
              ) : (
                <div className="space-y-2">
                  {upcomingCoupons.map((c, i) => (
                    <motion.div key={`${c.isin}-${i}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                      className={`flex items-center justify-between p-3 rounded-lg border ${c.isEstimated
                          ? 'border-amber-500/10 bg-amber-500/5'
                          : 'border-green-500/10 bg-green-500/5'
                        }`}>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-xs font-medium text-foreground truncate max-w-[200px]">{c.name}</p>
                          {c.payoutType && (
                            <span className="text-[10px] text-muted-foreground border border-border/50 rounded px-1 py-px">{c.payoutType}</span>
                          )}
                          {c.isEstimated && (
                            <span className="text-[10px] text-amber-400/70">est.</span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">{format(c.date, 'dd MMM yyyy')} · {(c.couponRate * 100).toFixed(2)}% coupon</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${c.isEstimated ? 'text-amber-400' : 'text-green-400'}`}>
                            {c.isEstimated ? '~' : ''}{fmt(c.amount)}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{c.isEstimated ? 'est. payment' : 'payment'}</p>
                        </div>
                        <button
                          onClick={() => setSelectedIsin({ isin: c.isin, name: c.name, units: c.unitsHeld })}
                          className="p-1.5 rounded text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-colors"
                          title="View NSDL Cashflow Schedule"
                        >
                          <CalendarSearch className="w-4 h-4" />
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
