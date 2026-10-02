'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePrivacy, PRIVACY_MASK } from '@/lib/privacy-context';
import type { BondHolding } from '@/types/bonds';
import { calculateTypeDistribution } from '@/lib/calc/bondAnalytics';

interface BondInvestmentTypeCardProps {
  bonds: BondHolding[];
  isLoading?: boolean;
}

const RADIAN = Math.PI / 180;
function CustomDonutSliceLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: any) {
  // Normalize percent: if already on 0-100 scale, don't multiply by 100
  const normalizedPct = percent > 1 ? percent : (percent || 0) * 100;
  if (normalizedPct < 4) return null;

  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-xs font-bold drop-shadow-sm pointer-events-none select-none"
    >
      {`${Math.round(normalizedPct)}%`}
    </text>
  );
}

function fmtCurrency(val: number, isHidden: boolean): string {
  if (isHidden) return PRIVACY_MASK;
  return `₹${val.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function BondInvestmentTypeCard({
  bonds,
  isLoading = false,
}: BondInvestmentTypeCardProps) {
  const { isHidden } = usePrivacy();

  const types = useMemo(() => {
    return calculateTypeDistribution(bonds);
  }, [bonds]);

  const totalInvestment = useMemo(() => {
    return types.reduce((acc, curr) => acc + curr.value, 0);
  }, [types]);

  return (
    <Card className="rounded-2xl border-border/50 shadow-sm flex flex-col justify-between bg-card transition-all">
      <CardHeader className="pb-2">
        <CardTitle className="text-base sm:text-lg font-bold text-foreground tracking-tight">
          Investment Type
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-2 pb-4 flex flex-col justify-between flex-1">
        {isLoading ? (
          <Skeleton className="h-[220px] w-full rounded-xl bg-white/5" />
        ) : types.length === 0 ? (
          <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">
            No investment types available.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            {/* Donut Chart with Center Hole text (6 cols) */}
            <div className="sm:col-span-6 h-[220px] relative flex items-center justify-center">
              {/* Centered Total Investment Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none text-center z-10 px-4">
                <span className="text-[11px] text-muted-foreground font-medium">
                  Total Investment
                </span>
                <span className="text-sm sm:text-base font-bold text-foreground tabular-nums tracking-tight mt-0.5">
                  {fmtCurrency(totalInvestment, isHidden)}
                </span>
              </div>

              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={types}
                    dataKey="value"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={92}
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth={1.5}
                    labelLine={false}
                    label={CustomDonutSliceLabel as never}
                  >
                    {types.map((entry) => (
                      <Cell key={entry.type} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const item = payload[0].payload;
                      return (
                        <div className="bg-slate-900 border border-slate-800 text-white rounded-lg shadow-xl p-3 text-xs min-w-[140px]">
                          <div className="font-semibold text-slate-100 mb-1">{item.type}</div>
                          <div className="flex items-center justify-between gap-4 font-bold text-emerald-400">
                            <span>{item.percent.toFixed(1)}%</span>
                            <span className="tabular-nums">{fmtCurrency(item.value, isHidden)}</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Right Legend List (6 cols) */}
            <div className="sm:col-span-6 flex flex-col gap-3 max-h-[220px] overflow-y-auto pr-1">
              {types.map((item) => (
                <div key={item.type} className="flex items-start gap-2.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-foreground tracking-tight">
                      {item.type}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium tabular-nums">
                      {fmtCurrency(item.value, isHidden)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disclosure */}
        <p className="text-[11px] text-muted-foreground/80 leading-relaxed pt-3 border-t border-border/30 mt-3 font-normal">
          Disclosure: Above chart is based on outstanding principal value of investment on a
          particular date.
        </p>
      </CardContent>
    </Card>
  );
}
