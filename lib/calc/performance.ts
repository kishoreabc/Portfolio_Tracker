/**
 * Portfolio Performance History — Capital Deployed Calculator
 *
 * Builds a time-series of cumulative capital deployed from stored order history.
 *
 * IMPORTANT: This is NOT historical portfolio market value.
 * It reflects the actual cash put into (or taken out of) the market via orders.
 * Label in the UI must clearly say "Capital Deployed".
 */

import type { Order, CapitalDeployedPoint, PerformanceHistory, PerformanceRange } from '@/types/orders';

function getRangeStartDate(range: PerformanceRange, endDate: Date): Date {
  const d = new Date(endDate);
  switch (range) {
    case '1M': d.setMonth(d.getMonth() - 1); break;
    case '3M': d.setMonth(d.getMonth() - 3); break;
    case '6M': d.setMonth(d.getMonth() - 6); break;
    case '1Y': d.setFullYear(d.getFullYear() - 1); break;
    case 'ALL': d.setFullYear(2000); break; // effectively no limit
  }
  return d;
}

/**
 * Groups orders by calendar date (YYYY-MM-DD) and computes:
 * - daily net value (BUY value - SELL value)
 * - cumulative running total
 *
 * Returns only data points within the requested range.
 * If no orders exist for the range, returns empty points.
 */
export function buildPerformanceHistory(
  orders: Order[],
  range: PerformanceRange = 'ALL',
): PerformanceHistory {
  if (!orders || orders.length === 0) {
    return {
      points: [],
      totalCapitalDeployed: 0,
      dataSource: 'order-history',
      startDate: null,
      endDate: null,
    };
  }

  // Sort chronologically
  const sorted = [...orders].sort(
    (a, b) => new Date(a.executedAt).getTime() - new Date(b.executedAt).getTime()
  );

  // Group all orders by date to compute daily net values
  const dailyMap = new Map<string, number>();
  for (const o of sorted) {
    const dateKey = new Date(o.executedAt).toISOString().slice(0, 10); // YYYY-MM-DD
    const sign = o.orderType === 'BUY' ? 1 : -1;
    dailyMap.set(dateKey, (dailyMap.get(dateKey) ?? 0) + sign * o.value);
  }

  // Sort dates
  const allDates = Array.from(dailyMap.keys()).sort();
  const now = new Date();
  const rangeStart = getRangeStartDate(range, now);

  // Build cumulative series over ALL dates, then filter for the range window
  let cumulative = 0;
  const allPoints: CapitalDeployedPoint[] = [];
  for (const date of allDates) {
    const daily = dailyMap.get(date) ?? 0;
    cumulative += daily;
    allPoints.push({ date, cumulative, daily });
  }

  // Filter to requested range
  const filteredPoints = allPoints.filter(
    (p) => new Date(p.date) >= rangeStart
  );

  // If range excludes some early data, anchor the starting cumulative correctly
  // by prepending a synthetic "baseline" point if needed
  const points = filteredPoints;
  if (filteredPoints.length > 0 && allPoints.length > filteredPoints.length) {
    // The cumulative at the first filtered point already includes all prior orders
    // so filteredPoints is already correct — no synthetic point needed
  }

  const totalCapitalDeployed = allPoints.length > 0
    ? allPoints[allPoints.length - 1].cumulative
    : 0;

  return {
    points,
    totalCapitalDeployed,
    dataSource: 'order-history',
    startDate: allDates[0] ?? null,
    endDate: allDates[allDates.length - 1] ?? null,
  };
}

/**
 * Returns the set of ranges that have actual data.
 * Use this to disable range buttons in the UI when no data exists for them.
 */
export function getAvailableRanges(
  orders: Order[],
): PerformanceRange[] {
  if (!orders || orders.length === 0) return [];

  const sorted = [...orders].sort(
    (a, b) => new Date(a.executedAt).getTime() - new Date(b.executedAt).getTime()
  );
  const earliest = new Date(sorted[0].executedAt);
  const now = new Date();

  const ranges: PerformanceRange[] = ['1M', '3M', '6M', '1Y', 'ALL'];
  return ranges.filter((r) => {
    const start = getRangeStartDate(r, now);
    return earliest <= (r === 'ALL' ? now : start) || r === 'ALL';
  });
}
