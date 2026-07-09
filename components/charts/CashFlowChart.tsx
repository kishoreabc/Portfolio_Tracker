'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { MonthlySummary } from '@/types/transactions';
import { EmptyState } from '@/components/shared/EmptyState';
import { ArrowLeftRight } from 'lucide-react';

interface Props {
  data: MonthlySummary[];
}

function fmt(v: number) {
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`;
  return `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function CashFlowChart({ data }: Props) {
  if (!data.length) {
    return <EmptyState title="No transaction data" description="Daily transaction data will appear here once loaded." icon={ArrowLeftRight} />;
  }

  const chartData = data.map((m) => ({
    month: m.label,
    Investment: m.investment,
    'Food & Ent.': m.foodAndEntertainment,
    Others: m.others,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ left: 8, right: 8, top: 4, bottom: 4 }} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 20%)" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={fmt} tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={((value: number, name: string) => [fmt(value), name]) as never}
          contentStyle={{
            background: 'hsl(222 47% 13%)',
            border: '1px solid hsl(222 47% 20%)',
            borderRadius: '8px',
            color: 'hsl(210 40% 98%)',
            fontSize: 12,
          }}
        />
        <Legend iconType="square" iconSize={8} formatter={(v) => <span style={{ color: 'hsl(215 20% 65%)', fontSize: 11 }}>{v}</span>} />
        <Bar dataKey="Investment" fill="hsl(221 83% 53%)" radius={[3, 3, 0, 0]} maxBarSize={20} />
        <Bar dataKey="Food & Ent." fill="hsl(38 92% 50%)" radius={[3, 3, 0, 0]} maxBarSize={20} />
        <Bar dataKey="Others" fill="hsl(270 76% 62%)" radius={[3, 3, 0, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}
