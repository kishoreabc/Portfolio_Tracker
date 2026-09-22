'use client';

import { useState, useMemo } from 'react';
import {
  Calendar,
  Landmark,
  Coins,
  Clock,
  Filter,
  CheckCircle,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePrivacy, PRIVACY_MASK } from '@/lib/privacy-context';
import type { BondMaturityEvent } from '@/types/bonds';

interface BondMaturityTimelineProps {
  events: BondMaturityEvent[];
  className?: string;
}

type EventFilterType = 'all' | 'maturities' | 'coupons';
type TimeWindowType = 'all' | '30d' | '90d' | 'this_year' | 'next_year';

interface TimelineItem {
  id: string;
  type: 'maturity' | 'coupon';
  date: Date;
  bondName: string;
  issuer: string;
  isin: string;
  amount: number;
  creditRating?: string;
  couponRate?: number;
  isEstimated?: boolean;
}

function formatINR(val: number, isHidden: boolean = false): string {
  if (isHidden) return PRIVACY_MASK;
  if (val >= 1e7) return `₹${(val / 1e7).toFixed(2)} Cr`;
  if (val >= 1e5) return `₹${(val / 1e5).toFixed(2)} L`;
  if (val >= 1e3) return `₹${(val / 1e3).toFixed(1)} k`;
  return `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function BondMaturityTimeline({ events, className = '' }: BondMaturityTimelineProps) {
  const { isHidden } = usePrivacy();
  const [eventTypeFilter, setEventTypeFilter] = useState<EventFilterType>('all');
  const [timeWindow, setTimeWindow] = useState<TimeWindowType>('all');

  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();

  // Flatten maturities & coupon payments into a unified timeline
  const allTimelineItems = useMemo(() => {
    const items: TimelineItem[] = [];

    (events || []).forEach((e) => {
      // 1. Maturity Event
      if (e.maturityDate) {
        const matDate = new Date(e.maturityDate);
        if (!isNaN(matDate.getTime())) {
          items.push({
            id: `mat-${e.isin}-${matDate.getTime()}`,
            type: 'maturity',
            date: matDate,
            bondName: e.securityName || e.issuer,
            issuer: e.issuer,
            isin: e.isin,
            amount: e.totalValue || (e.faceValue * e.unitsHeld) || 0,
            creditRating: e.creditRating,
            couponRate: e.couponRate,
          });
        }
      }

      // 2. Coupon Payments
      (e.couponPayments || []).forEach((cp, cpIdx) => {
        const cpDate = new Date(cp.date);
        if (!isNaN(cpDate.getTime()) && cpDate >= now) {
          items.push({
            id: `cp-${e.isin}-${cpIdx}-${cpDate.getTime()}`,
            type: 'coupon',
            date: cpDate,
            bondName: e.securityName || e.issuer,
            issuer: e.issuer,
            isin: e.isin,
            amount: cp.amount,
            creditRating: e.creditRating,
            couponRate: e.couponRate,
            isEstimated: cp.isEstimated,
          });
        }
      });
    });

    // Sort chronologically ascending
    return items.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [events, now]);

  // Compute Summary Metrics
  const summary = useMemo(() => {
    const futureMaturities = allTimelineItems.filter(
      (i) => i.type === 'maturity' && i.date >= now
    );
    const futureCoupons = allTimelineItems.filter(
      (i) => i.type === 'coupon' && i.date >= now
    );

    const nextMaturity = futureMaturities[0] ?? null;
    const nextCoupon = futureCoupons[0] ?? null;

    const maturitiesThisYear = futureMaturities.filter(
      (m) => m.date.getFullYear() === currentYear
    );
    const maturitiesThisYearTotal = maturitiesThisYear.reduce((acc, m) => acc + m.amount, 0);

    const annualCouponIncome = futureCoupons
      .filter((c) => c.date.getFullYear() === currentYear)
      .reduce((acc, c) => acc + c.amount, 0);

    return {
      nextMaturity,
      nextCoupon,
      maturitiesThisYearCount: maturitiesThisYear.length,
      maturitiesThisYearTotal,
      annualCouponIncome,
    };
  }, [allTimelineItems, now, currentYear]);

  // Apply filters
  const filteredItems = useMemo(() => {
    return allTimelineItems.filter((item) => {
      // Type filter
      if (eventTypeFilter === 'maturities' && item.type !== 'maturity') return false;
      if (eventTypeFilter === 'coupons' && item.type !== 'coupon') return false;

      // Time filter
      if (timeWindow === 'all') return true;

      const diffDays = (item.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (timeWindow === '30d') return diffDays >= 0 && diffDays <= 30;
      if (timeWindow === '90d') return diffDays >= 0 && diffDays <= 90;
      if (timeWindow === 'this_year') return item.date.getFullYear() === currentYear;
      if (timeWindow === 'next_year') return item.date.getFullYear() === currentYear + 1;

      return true;
    });
  }, [allTimelineItems, eventTypeFilter, timeWindow, now, currentYear]);

  // Group filtered items by Year -> Month
  const groupedTimeline = useMemo(() => {
    const groups: { [year: string]: { [month: string]: TimelineItem[] } } = {};

    filteredItems.forEach((item) => {
      const year = item.date.getFullYear().toString();
      const month = item.date.toLocaleString('en-IN', { month: 'long' });

      if (!groups[year]) groups[year] = {};
      if (!groups[year][month]) groups[year][month] = [];
      groups[year][month].push(item);
    });

    return groups;
  }, [filteredItems]);

  const years = Object.keys(groupedTimeline).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  return (
    <Card className={`border border-border/60 shadow-sm ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Bond Maturity & Cashflow Timeline
            </CardTitle>
            <CardDescription className="text-xs">
              Projected principal redemptions and scheduled coupon disbursements
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Type Filter */}
            <div className="flex items-center rounded-lg bg-muted/60 p-0.5 border border-border/40 text-xs">
              <button
                type="button"
                onClick={() => setEventTypeFilter('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  eventTypeFilter === 'all'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setEventTypeFilter('maturities')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  eventTypeFilter === 'maturities'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Maturities
              </button>
              <button
                type="button"
                onClick={() => setEventTypeFilter('coupons')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  eventTypeFilter === 'coupons'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Coupons
              </button>
            </div>

            {/* Time Window Filter */}
            <div className="flex items-center rounded-lg bg-muted/60 p-0.5 border border-border/40 text-xs">
              {(['all', '30d', '90d', 'this_year', 'next_year'] as TimeWindowType[]).map((tw) => {
                const labels: Record<TimeWindowType, string> = {
                  all: 'All Time',
                  '30d': '30D',
                  '90d': '90D',
                  this_year: `${currentYear}`,
                  next_year: `${currentYear + 1}`,
                };
                return (
                  <button
                    key={tw}
                    type="button"
                    onClick={() => setTimeWindow(tw)}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                      timeWindow === tw
                        ? 'bg-background text-foreground shadow-xs font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {labels[tw]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Next Maturity */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border/40 space-y-1">
            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-blue-400" /> Next Maturity
            </span>
            <p className="text-sm font-bold text-foreground">
              {summary.nextMaturity ? formatINR(summary.nextMaturity.amount, isHidden) : 'None'}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {summary.nextMaturity
                ? `${summary.nextMaturity.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · ${summary.nextMaturity.bondName}`
                : 'No upcoming maturity'}
            </p>
          </div>

          {/* Next Coupon */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border/40 space-y-1">
            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-400" /> Next Coupon
            </span>
            <p className="text-sm font-bold text-foreground">
              {summary.nextCoupon ? formatINR(summary.nextCoupon.amount, isHidden) : 'None'}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {summary.nextCoupon
                ? `${summary.nextCoupon.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · ${summary.nextCoupon.bondName}`
                : 'No upcoming coupon'}
            </p>
          </div>

          {/* Maturities This Year */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border/40 space-y-1">
            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Maturities {currentYear}
            </span>
            <p className="text-sm font-bold text-foreground">
              {formatINR(summary.maturitiesThisYearTotal, isHidden)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {summary.maturitiesThisYearCount} bond{summary.maturitiesThisYearCount === 1 ? '' : 's'} maturing
            </p>
          </div>

          {/* Expected Coupon Income */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border/40 space-y-1">
            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-purple-400" /> Est. Coupons {currentYear}
            </span>
            <p className="text-sm font-bold text-foreground">
              {formatINR(summary.annualCouponIncome, isHidden)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Across portfolio
            </p>
          </div>
        </div>

        {/* Timeline body */}
        {filteredItems.length === 0 ? (
          <div className="py-10 text-center text-xs text-muted-foreground border border-dashed border-border/50 rounded-lg">
            No bond cashflow or maturity events found for the selected filters.
          </div>
        ) : (
          <div className="relative pl-4 sm:pl-6 pt-2 space-y-6 before:absolute before:left-2 sm:before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-border/60">
            {years.map((year) => {
              const months = Object.keys(groupedTimeline[year]);
              return (
                <div key={year} className="space-y-4">
                  {/* Year Header badge */}
                  <div className="relative flex items-center gap-2">
                    <span className="relative z-10 inline-flex items-center justify-center px-2.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-xs font-bold font-mono">
                      {year}
                    </span>
                    <div className="h-px flex-1 bg-border/40" />
                  </div>

                  {/* Months in this year */}
                  {months.map((month) => {
                    const monthItems = groupedTimeline[year][month];
                    return (
                      <div key={`${year}-${month}`} className="space-y-2.5">
                        <span className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">
                          {month}
                        </span>

                        <div className="space-y-2">
                          {monthItems.map((item) => (
                            <div
                              key={item.id}
                              className="relative flex items-start justify-between gap-3 p-2.5 rounded-lg border border-border/50 bg-card/60 hover:bg-muted/30 transition-colors"
                            >
                              {/* Dot indicator */}
                              <span
                                className={`absolute -left-[21px] sm:-left-[27px] top-4 w-2.5 h-2.5 rounded-full ring-4 ring-background ${
                                  item.type === 'maturity'
                                    ? 'bg-blue-500 shadow-xs shadow-blue-500/50'
                                    : 'bg-amber-500 shadow-xs shadow-amber-500/50'
                                }`}
                              />

                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] font-medium px-1.5 py-0.5 ${
                                      item.type === 'maturity'
                                        ? 'border-blue-500/30 text-blue-400 bg-blue-500/10'
                                        : 'border-amber-500/30 text-amber-400 bg-amber-500/10'
                                    }`}
                                  >
                                    {item.type === 'maturity' ? 'Principal Redemption' : 'Coupon Payment'}
                                  </Badge>

                                  {item.isEstimated && (
                                    <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                                      Est.
                                    </span>
                                  )}

                                  {item.creditRating && (
                                    <span className="text-[10px] text-muted-foreground font-mono">
                                      [{item.creditRating}]
                                    </span>
                                  )}
                                </div>

                                <p className="text-xs font-semibold text-foreground">
                                  {item.bondName}
                                </p>
                                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                                  <span>{item.issuer}</span>
                                  <span>&bull;</span>
                                  <span className="font-mono">{item.isin}</span>
                                  {item.couponRate ? (
                                    <>
                                      <span>&bull;</span>
                                      <span>{item.couponRate*100}% p.a.</span>
                                    </>
                                  ) : null}
                                </div>
                              </div>

                              <div className="text-right shrink-0 space-y-0.5">
                                <p className="text-xs font-bold text-foreground tabular-nums">
                                  {formatINR(item.amount, isHidden)}
                                </p>
                                <p className="text-[10px] font-mono text-muted-foreground">
                                  {item.date.toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                  })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
