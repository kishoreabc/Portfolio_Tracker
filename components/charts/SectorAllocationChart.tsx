'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import type { SectorAllocation } from '@/types/holdings';
import { EmptyState } from '@/components/shared/EmptyState';
import { BarChart2 } from 'lucide-react';

interface Props {
  data: SectorAllocation[];
}

const COLORS = [
  'hsl(221 83% 53%)',
  'hsl(142 71% 45%)',
  'hsl(270 76% 62%)',
  'hsl(38 92% 50%)',
  'hsl(0 84% 60%)',
  'hsl(196 73% 48%)',
  'hsl(330 80% 60%)',
  'hsl(160 60% 45%)',
];

function formatCrore(v: number) {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(1)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`;
  return `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: SectorAllocation }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: 'hsl(222 47% 13%)',
      border: '1px solid hsl(222 47% 22%)',
      borderRadius: '10px',
      padding: '10px 14px',
      color: 'hsl(210 40% 98%)',
      fontSize: 12,
      minWidth: 160,
    }}>
      <p style={{ fontWeight: 600, marginBottom: 6, color: 'hsl(210 40% 90%)' }}>{d.sector}</p>
      <p style={{ color: 'hsl(215 20% 65%)', marginBottom: 2 }}>
        Invested: <span style={{ color: 'hsl(210 40% 95%)', fontWeight: 600 }}>{formatCrore(d.totalValue)}</span>
      </p>
      <p style={{ color: 'hsl(215 20% 65%)' }}>
        Allocation: <span style={{ color: 'hsl(221 83% 70%)', fontWeight: 600 }}>{(d.percent * 100).toFixed(1)}%</span>
      </p>
      {d.equityValue > 0 && d.bondValue > 0 && (
        <p style={{ color: 'hsl(215 20% 55%)', marginTop: 4, fontSize: 11 }}>
          EQ {formatCrore(d.equityValue)} · BD {formatCrore(d.bondValue)}
        </p>
      )}
    </div>
  );
}

export function SectorAllocationChart({ data }: Props) {
  if (!data.length) {
    return <EmptyState title="No sector data" description="Sector breakdown will appear once holdings are loaded." icon={BarChart2} />;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ left: 16, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 20%)" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={formatCrore}
          tick={{ fontSize: 11, fill: 'hsl(215 20% 55%)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          dataKey="sector"
          type="category"
          width={100}
          tick={{ fontSize: 11, fill: 'hsl(215 20% 65%)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(222 47% 20% / 0.5)' }} />
        <Bar dataKey="totalValue" radius={[0, 4, 4, 0]} maxBarSize={24}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
