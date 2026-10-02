'use client';

import { useState, useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  LabelList,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Maximize2 } from 'lucide-react';
import { usePrivacy, PRIVACY_MASK } from '@/lib/privacy-context';
import type { BondHolding } from '@/types/bonds';
import { calculateCashflowTimeline, type MonthlyCashflowItem } from '@/lib/calc/bondAnalytics';

interface CashflowToMaturityCardProps {
  bonds: BondHolding[];
  isLoading?: boolean;
}

/** Formats money accurately on top of bars (e.g., ₹602, ₹1.6K, ₹20.6K, ₹40.1K, ₹10K) */
function formatBarAmount(value: number, isHidden: boolean): string {
  if (isHidden) return '••••';
  if (!value || value <= 0) return ''; // Empty months have no label

  if (value < 1000) {
    return `₹${Math.round(value)}`;
  }
  if (value < 100000) {
    const k = (value / 1000).toFixed(1).replace(/\.0$/, '');
    return `₹${k}K`;
  }
  if (value < 10000000) {
    const l = (value / 100000).toFixed(1).replace(/\.0$/, '');
    return `₹${l}L`;
  }
  const cr = (value / 10000000).toFixed(2).replace(/\.00$/, '');
  return `₹${cr}Cr`;
}

function formatYAxis(value: number, isHidden: boolean): string {
  if (isHidden) return '••';
  if (value <= 0) return '0';
  if (value >= 1e7) return `${(value / 1e7).toFixed(1)}Cr`;
  if (value >= 1e5) return `${(value / 1e5).toFixed(0)}L`;
  if (value >= 1000) return `${Math.round(value / 1000)}K`;
  return `${value}`;
}

function fmtCurrency(val: number, isHidden: boolean): string {
  if (isHidden) return PRIVACY_MASK;
  return `₹${val.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Custom X-Axis Tick with 2 stacked lines: Month on line 1, Year on line 2 */
function CustomMonthYearTick({ x, y, payload, data }: any) {
  const item = data?.[payload?.index];
  if (!item) return null;
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={10}
        textAnchor="middle"
        fill="currentColor"
        className="text-[10px] sm:text-[11px] fill-muted-foreground font-medium"
      >
        {item.month}
      </text>
      <text
        x={0}
        y={22}
        textAnchor="middle"
        fill="currentColor"
        className="text-[9px] sm:text-[10px] fill-muted-foreground/70 font-normal"
      >
        {item.year}
      </text>
    </g>
  );
}

export function CashflowToMaturityCard({ bonds, isLoading = false }: CashflowToMaturityCardProps) {
  const { isHidden } = usePrivacy();
  const [horizon, setHorizon] = useState<1 | 2 | 5>(1);
  const [isExpanded, setIsExpanded] = useState(false);

  const timelineData = useMemo(() => {
    return calculateCashflowTimeline(bonds, horizon);
  }, [bonds, horizon]);

  const yAxisMax = useMemo(() => {
    const maxVal = Math.max(...timelineData.map((d) => d.total), 10000);
    return Math.ceil(maxVal / 2000) * 2000;
  }, [timelineData]);

  // Ensure each bar gets at least 50px of horizontal space so bars and labels never overlap
  const chartWidth = useMemo(() => {
    return Math.max(540, timelineData.length * 52);
  }, [timelineData.length]);

  // Calculate min and max positive interest across full 5y horizon for consistent visual scale
  const { minInterest, maxInterest } = useMemo(() => {
    const fullTimeline = calculateCashflowTimeline(bonds, 5);
    const positiveInterests = fullTimeline
      .map((d) => d.interest)
      .filter((v) => v > 0);
    if (positiveInterests.length === 0) {
      return { minInterest: 100, maxInterest: 100 };
    }
    return {
      minInterest: Math.min(...positiveInterests),
      maxInterest: Math.max(...positiveInterests),
    };
  }, [bonds]);

  const computeInterestHeight = (interestVal: number, plotHeight: number): number => {
    if (!interestVal || interestVal <= 0) return 0;

    // Smallest coupon (e.g. ₹82/₹84) gets a neat visible 5px (or 6px in expanded modal)
    const minH = plotHeight > 250 ? 6 : 5;
    // Largest coupon (e.g. ₹1.4K) gets 20px (or 28px in expanded modal)
    // This gives a dramatic 4x visual height contrast between ₹84 and ₹1.4K
    const maxH = plotHeight > 250 ? 28 : 20;

    if (maxInterest <= minInterest) {
      return maxH;
    }

    const ratio = Math.max(0, Math.min(1, (interestVal - minInterest) / (maxInterest - minInterest)));
    return minH + ratio * (maxH - minH);
  };

  const computePrincipalHeight = (principalVal: number, plotHeight: number): number => {
    if (!principalVal || principalVal <= 0) return 0;
    const labelHeadroom = 20;
    const maxInterestH = plotHeight > 250 ? 28 : 20;
    const availablePrincipalH = Math.max(20, plotHeight - maxInterestH - labelHeadroom);
    const linearH = (principalVal / yAxisMax) * availablePrincipalH;
    return Math.max(linearH, 8);
  };

  const renderInterestBar = (props: any, plotHeight: number, baselineY: number) => {
    const { x, width, payload } = props;
    if (!payload || !payload.interest || payload.interest <= 0) {
      return null;
    }

    const effectiveBaseline = typeof props.stackedBarStart === 'number' ? props.stackedBarStart : baselineY;
    const finalHeight = computeInterestHeight(payload.interest, plotHeight);
    const finalY = effectiveBaseline - finalHeight;
    const hasPrincipal = payload.principal > 0;

    const r = Math.min(3, width / 2, finalHeight / 2);
    if (!hasPrincipal && r > 0) {
      const pathD = `M ${x},${finalY + r} A ${r} ${r} 0 0 1 ${x + r},${finalY} L ${x + width - r},${finalY} A ${r} ${r} 0 0 1 ${x + width},${finalY + r} L ${x + width},${effectiveBaseline} L ${x},${effectiveBaseline} Z`;
      return <path d={pathD} fill="#22c55e" />;
    }

    return (
      <rect
        x={x}
        y={finalY}
        width={width}
        height={finalHeight}
        fill="#22c55e"
      />
    );
  };

  const renderPrincipalBar = (props: any, plotHeight: number, baselineY: number) => {
    const { x, width, payload } = props;
    if (!payload || !payload.principal || payload.principal <= 0) {
      return null;
    }

    const effectiveBaseline = typeof props.stackedBarStart === 'number' ? props.stackedBarStart : baselineY;
    const interestH = computeInterestHeight(payload.interest, plotHeight);
    const finalHeight = computePrincipalHeight(payload.principal, plotHeight);
    // Sits directly on top of interest bar (or baseline if interest is 0) with zero gap
    const principalBottom = payload.interest > 0 ? (effectiveBaseline - interestH) : effectiveBaseline;
    const finalY = principalBottom - finalHeight;

    const r = Math.min(3, width / 2, finalHeight / 2);
    if (r > 0) {
      const pathD = `M ${x},${finalY + r} A ${r} ${r} 0 0 1 ${x + r},${finalY} L ${x + width - r},${finalY} A ${r} ${r} 0 0 1 ${x + width},${finalY + r} L ${x + width},${principalBottom} L ${x},${principalBottom} Z`;
      return <path d={pathD} fill="#7c3aed" />;
    }

    return (
      <rect
        x={x}
        y={finalY}
        width={width}
        height={finalHeight}
        fill="#7c3aed"
      />
    );
  };

  const renderCustomBarLabel = (props: any, plotHeight: number, baselineY: number) => {
    const { x, value, index } = props;
    const numVal = Number(value);
    if (!numVal || numVal <= 0) return null;

    const formatted = formatBarAmount(numVal, isHidden);
    if (!formatted) return null;

    const item = timelineData[index];
    if (!item) return null;

    const interestH = computeInterestHeight(item.interest, plotHeight);
    const principalH = computePrincipalHeight(item.principal, plotHeight);

    let barTopY: number;
    if (item.principal > 0) {
      const principalBottom = item.interest > 0 ? (baselineY - interestH) : baselineY;
      barTopY = principalBottom - principalH;
    } else {
      barTopY = baselineY - interestH;
    }

    const finalY = barTopY - 6;

    return (
      <text
        x={x}
        y={finalY}
        textAnchor="middle"
        fontSize={10}
        fontWeight={600}
        fill="hsl(215 20% 75%)"
      >
        {formatted}
      </text>
    );
  };

  const chartContent = (height = 230, minWidthPx = chartWidth, isFullWidth = false) => {
    const plotHeight = height - 66;
    const baselineY = height - 44;
    return (
      <div
        style={{
          width: isFullWidth ? '100%' : `${minWidthPx}px`,
          minWidth: `${minWidthPx}px`,
          height: `${height}px`,
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={timelineData}
            margin={{ top: 22, right: 16, left: -16, bottom: 8 }}
            barCategoryGap="25%"
          >
            <XAxis
              dataKey="key"
              interval={0}
              tickLine={false}
              axisLine={false}
              tick={<CustomMonthYearTick data={timelineData} />}
              height={36}
            />
            <YAxis
              domain={[0, yAxisMax]}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatYAxis(v, isHidden)}
              tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }}
            />
            <Tooltip
              cursor={{ fill: 'currentColor', opacity: 0.04 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data: MonthlyCashflowItem = payload[0].payload;
                return (
                  <div className="bg-slate-900 border border-slate-800 text-white rounded-lg shadow-xl p-3 text-xs min-w-[170px]">
                    <div className="font-semibold text-slate-200 border-b border-slate-800 pb-1.5 mb-2">
                      {data.label}
                    </div>
                    <div className="flex items-center justify-between gap-3 text-emerald-400 py-0.5">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-sm bg-[#22c55e]" />
                        Interest:
                      </span>
                      <span className="font-semibold tabular-nums">
                        {fmtCurrency(data.interest, isHidden)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-purple-300 py-0.5">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-sm bg-[#7c3aed]" />
                        Principal:
                      </span>
                      <span className="font-semibold tabular-nums">
                        {fmtCurrency(data.principal, isHidden)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-white border-t border-slate-800/80 pt-1.5 mt-1 font-bold">
                      <span>Total:</span>
                      <span className="tabular-nums">{fmtCurrency(data.total, isHidden)}</span>
                    </div>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="interest"
              stackId="cashflow"
              fill="#22c55e"
              name="Interest"
              maxBarSize={28}
              shape={(props: any) => renderInterestBar(props, plotHeight, baselineY)}
            />
            <Bar
              dataKey="principal"
              stackId="cashflow"
              fill="#7c3aed"
              name="Principal"
              maxBarSize={28}
              shape={(props: any) => renderPrincipalBar(props, plotHeight, baselineY)}
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke="transparent"
              strokeWidth={0}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              legendType="none"
              tooltipType="none"
            >
              <LabelList
                dataKey="total"
                position="top"
                content={(props: any) => renderCustomBarLabel(props, plotHeight, baselineY)}
              />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <>
      <Card className="rounded-2xl border-border/50 shadow-sm flex flex-col justify-between relative overflow-hidden bg-card transition-all">
        <CardHeader className="pb-2">
          {/* Header Row: Title & Expand Button */}
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg font-bold text-foreground tracking-tight">
              Cashflow to Maturity/Call
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg"
              onClick={() => setIsExpanded(true)}
              aria-label="Expand cashflow chart"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Sub Row: Horizon Pills & Legend */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            {/* Filter pills: 1 yr, 2 yr, 5 yr */}
            <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/40">
              {([1, 2, 5] as const).map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setHorizon(y)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    horizon === y
                      ? 'bg-foreground text-background shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {y} yr
                </button>
              ))}
            </div>

            {/* Legend: Principal (Purple), Interest (Green) */}
            <div className="flex items-center gap-3 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#7c3aed]" />
                <span className="text-muted-foreground">Principal</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#22c55e]" />
                <span className="text-muted-foreground">Interest</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-2 pb-4">
          {isLoading ? (
            <Skeleton className="h-[230px] w-full rounded-xl bg-white/5" />
          ) : (
            <div className="w-full overflow-x-auto pb-2">
              {chartContent(230, chartWidth)}
            </div>
          )}

          {/* Disclosure */}
          <p className="text-[11px] text-muted-foreground/80 leading-relaxed pt-3 border-t border-border/30 mt-2 font-normal">
            Disclosure: Above chart is based on the outstanding principal amount and expected interest
            payment as per coupon of the bonds and FDs.
          </p>
        </CardContent>
      </Card>

      {/* Expanded Modal */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="w-[95vw] sm:max-w-4xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl max-h-[92vh] flex flex-col p-6 sm:p-8 bg-surface-100 border border-border/60 shadow-2xl rounded-2xl overflow-y-auto">
          <DialogHeader className="space-y-1.5 pb-1">
            <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Cashflow to Maturity/Call — Full Horizon
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
              Detailed breakdown of upcoming interest payments and principal redemptions across your holdings.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-y border-border/40 my-1">
            <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/40">
              {([1, 2, 5] as const).map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setHorizon(y)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    horizon === y
                      ? 'bg-foreground text-background shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {y} yr
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-[#7c3aed]" />
                <span className="text-muted-foreground">Principal</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-[#22c55e]" />
                <span className="text-muted-foreground">Interest</span>
              </div>
            </div>
          </div>

          <div className="w-full overflow-x-auto py-3">
            {chartContent(380, Math.max(900, timelineData.length * 58), true)}
          </div>

          <p className="text-xs text-muted-foreground/80 leading-relaxed border-t border-border/30 pt-3">
            Disclosure: Above chart is based on the outstanding principal amount and expected interest
            payment as per coupon of the bonds and FDs.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
