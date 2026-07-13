'use client';

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { AssetClassSummary } from '@/types/holdings';
import { EmptyState } from '@/components/shared/EmptyState';
import { PieChartIcon } from 'lucide-react';

const RADIAN = Math.PI / 180;

interface Props {
  data: AssetClassSummary[];
}

function CustomOuterLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) {
  const radius = outerRadius * 1.25;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
  if (percent < 0.01) return null;

  return (
    <text 
      x={x} 
      y={y} 
      fill="hsl(var(--foreground))" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central" 
      className="text-xs font-medium"
    >
      <tspan x={x} dy="-0.5em">{name}</tspan>
      <tspan x={x} dy="1.2em" fill="hsl(var(--muted-foreground))">{`${(percent * 100).toFixed(1)}%`}</tspan>
    </text>
  );
}

export function OverallAllocationPie({ data }: Props) {
  if (!data.length) {
    return <EmptyState title="No allocation data" description="Data will appear here once loaded." icon={PieChartIcon} />;
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie
          stroke="none"
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={0}
          outerRadius={90}
          paddingAngle={1}
          dataKey="value"
          nameKey="label"
          labelLine={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
          label={CustomOuterLabel as any}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: any) => `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          contentStyle={{
            background: 'hsl(222 47% 11%)',
            border: '1px solid hsl(222 47% 20%)',
            borderRadius: '8px',
            color: 'white',
          }}
          itemStyle={{ color: 'white', fontWeight: 500 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
