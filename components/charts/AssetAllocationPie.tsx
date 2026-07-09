'use client';

import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { AssetClassSummary } from '@/types/holdings';
import { EmptyState } from '@/components/shared/EmptyState';
import { PieChartIcon } from 'lucide-react';
import { color } from 'framer-motion';

const RADIAN = Math.PI / 180;

interface Props {
  data: AssetClassSummary[];
}

function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: {
  cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number;
  percent: number; name: string;
}) {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.05) return null;
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-semibold">
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  );
}

export function AssetAllocationPie({ data }: Props) {
  if (!data.length) {
    return <EmptyState title="No allocation data" description="Equity and bond data will appear here once loaded." icon={PieChartIcon} />;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={110}
          paddingAngle={3}
          dataKey="value"
          nameKey="label"
          labelLine={false}
          label={CustomLabel as never}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip
          formatter={((value: number, name: string) => [
            `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
            name,
          ]) as never}
          contentStyle={{
            background: 'hsl(222 47% 13%)',
            border: '1px solid hsl(222 47% 20%)',
            borderRadius: '8px',
            color: 'hsl(210 40% 98%)',
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value, entry) => (
            <span style={{ color: 'hsl(215 20% 75%)', fontSize: '12px' }}>
              {String(value)}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
