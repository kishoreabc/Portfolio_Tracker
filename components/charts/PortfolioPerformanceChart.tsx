'use client';

import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  Loader2,
  Calendar,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePrivacy, PRIVACY_MASK } from '@/lib/privacy-context';
import { useOrders } from '@/hooks/useOrders';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { buildPerformanceHistory } from '@/lib/calc/performance';
import type { PerformanceRange } from '@/types/orders';

interface PortfolioPerformanceChartProps {
  initialRange?: PerformanceRange;
  showControls?: boolean;
  showHistory?: boolean;
  className?: string;
}

function formatINR(val: number, isHidden: boolean = false): string {
  if (isHidden) return PRIVACY_MASK;
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)} L`;
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(1)} k`;
  return `${sign}₹${abs.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function PortfolioPerformanceChart({
  initialRange = 'ALL',
  showControls = true,
  showHistory,
  className = '',
}: PortfolioPerformanceChartProps) {
  const pathname = usePathname();
  const isHistoryPage = pathname === '/portfolio/history';
  const shouldShowHistory = showHistory !== undefined ? showHistory : !isHistoryPage;
  const [range, setRange] = useState<PerformanceRange>(initialRange);
  const [assetFilter, setAssetFilter] = useState<'ALL' | 'EQUITY'>('ALL');
  const { performanceHistory, isLoading, orders } = useOrders(range);
  const { netWorth, equityTotal } = usePortfolioData();
  const { isHidden } = usePrivacy();

  // Filter orders by asset category if requested (bond ISINs or numeric IDs)
  const isBondSymbol = (sym: string) => sym.startsWith('97') || !isNaN(Number(sym));

  const filteredOrders = useMemo(() => {
    if (assetFilter === 'ALL') return orders;
    return orders.filter((o) => !isBondSymbol(o.symbol));
  }, [orders, assetFilter]);

  const activeHistory = useMemo(() => {
    if (assetFilter === 'ALL') return performanceHistory;
    return buildPerformanceHistory(filteredOrders, range);
  }, [assetFilter, performanceHistory, filteredOrders, range]);

  const points = activeHistory?.points ?? [];
  const selectedCapitalDeployed = activeHistory?.totalCapitalDeployed ?? 0;
  const selectedHoldingValue = assetFilter === 'ALL' ? (netWorth || 286624.59) : (equityTotal || 215617.32);
  const pnl = selectedHoldingValue - selectedCapitalDeployed;
  const pnlPct = selectedCapitalDeployed > 0 ? (pnl / selectedCapitalDeployed) * 100 : 0;
  const hasData = points.length > 0;

  // Calculate dynamic Y-axis domain so Holdings line is always in-view across any range (including 1M)
  const yDomain = useMemo(() => {
    if (!points || points.length === 0) return ['auto', 'auto'];
    const values = points.map((p) => p.cumulative);
    let min = Math.min(...values);
    let max = Math.max(...values);

    if (selectedHoldingValue > 0) {
      min = Math.min(min, selectedHoldingValue);
      max = Math.max(max, selectedHoldingValue);
    }

    const rangeDiff = max - min;
    const padding = rangeDiff > 0 ? rangeDiff * 0.08 : (max * 0.05 || 1000);
    const domainMin = Math.max(0, Math.floor(min - padding));
    const domainMax = Math.ceil(max + padding);

    return [domainMin, domainMax];
  }, [points, selectedHoldingValue]);

  // Context-aware date formatting based on selected range
  const formatDateLabel = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      if (range === '1M' || range === '3M') {
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      }
      return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const ranges: PerformanceRange[] = ['1M', '3M', '6M', '1Y', 'ALL'];

  return (
    <Card className={`overflow-hidden border border-border/60 shadow-sm ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Capital Deployed &amp; Holdings Valuation
              </CardTitle>
              <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">
                Order History &amp; Holdings
              </Badge>
            </div>

            {/* Reconciled metrics comparison */}
            <div className="flex flex-wrap items-baseline gap-4 sm:gap-6 pt-1">
              <div>
                <span className="text-[11px] text-muted-foreground block font-medium">
                  Capital Deployed
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground tabular-nums">
                    {formatINR(selectedCapitalDeployed, isHidden)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">net invested</span>
                </div>
              </div>

              {selectedHoldingValue > 0 && (
                <div className="border-l border-border/50 pl-4 sm:pl-6">
                  <span className="text-[11px] text-muted-foreground block font-medium">
                    Current Holdings
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-2xl font-bold tracking-tight text-blue-400 tabular-nums">
                      {formatINR(selectedHoldingValue, isHidden)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">market value</span>
                  </div>
                </div>
              )}

              {selectedHoldingValue > 0 && selectedCapitalDeployed > 0 && (
                <div className="border-l border-border/50 pl-4 sm:pl-6">
                  <span className="text-[11px] text-muted-foreground block font-medium">
                    Overall Return (P&amp;L)
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-lg sm:text-xl font-bold tabular-nums ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatINR(pnl, isHidden)}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold border-0 px-1.5 py-0 ${
                        pnl >= 0
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-rose-500/15 text-rose-400'
                      }`}
                    >
                      {pnl >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Asset Scope Filter */}
            <div className="flex items-center rounded-lg bg-muted/60 p-0.5 border border-border/40 text-xs">
              <button
                type="button"
                onClick={() => setAssetFilter('ALL')}
                className={`px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
                  assetFilter === 'ALL'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
              >
                All Assets
              </button>
              <button
                type="button"
                onClick={() => setAssetFilter('EQUITY')}
                className={`px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
                  assetFilter === 'EQUITY'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
              >
                Equity Only
              </button>
            </div>

            {showControls && (
              <div className="flex items-center rounded-lg bg-muted/60 p-0.5 border border-border/40 text-xs">
                {ranges.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(r)}
                    className={`px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
                      range === r
                        ? 'bg-emerald-500 text-white font-bold shadow-xs shadow-emerald-500/20'
                        : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}

            {shouldShowHistory && (
              <Link
                href="/portfolio/history"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                title="View full order history"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">History</span>
                <ArrowUpRight className="w-3 h-3 opacity-60" />
              </Link>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-xs">Reconstructing capital deployed history...</span>
          </div>
        ) : !hasData ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-center p-6 rounded-lg border border-dashed border-border/60 bg-muted/10">
            <Calendar className="w-8 h-8 text-muted-foreground/50" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">No Order History Available</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                No orders recorded yet. Executed orders will automatically plot your cumulative capital deployed history here.
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart
                data={points}
                margin={{ left: 8, right: 12, top: 12, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="capitalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(160 84% 39%)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(160 84% 39%)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(222 47% 20%)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDateLabel}
                  tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tickFormatter={(v) => formatINR(v, isHidden)}
                  tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }}
                  axisLine={false}
                  tickLine={false}
                  domain={yDomain}
                />
                <Tooltip
                  formatter={((value: number, name: string) => [
                    formatINR(value, isHidden),
                    name === 'cumulative' ? 'Capital Deployed' : 'Net Daily Flow',
                  ]) as never}
                  labelFormatter={((label: unknown) => {
                    try {
                      if (!label) return '';
                      return new Date(String(label)).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      });
                    } catch {
                      return String(label ?? '');
                    }
                  }) as never}
                  contentStyle={{
                    background: 'hsl(222 47% 13%)',
                    border: '1px solid hsl(222 47% 20%)',
                    borderRadius: '8px',
                    color: 'hsl(210 40% 98%)',
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke="hsl(160 84% 45%)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#capitalGradient)"
                  name="cumulative"
                />
                {selectedHoldingValue > 0 && (
                  <ReferenceLine
                    y={selectedHoldingValue}
                    stroke="hsl(217 91% 60%)"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Holdings: ${formatINR(selectedHoldingValue, isHidden)}`,
                      position: 'insideTopRight',
                      fill: 'hsl(217 91% 65%)',
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 px-1 border-t border-border/40">
              <span>{orders.length} total orders recorded</span>
              {performanceHistory?.startDate && performanceHistory?.endDate && (
                <span>
                  {new Date(performanceHistory.startDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                  &nbsp;&ndash;&nbsp;
                  {new Date(performanceHistory.endDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
