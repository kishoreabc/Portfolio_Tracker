import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { CashFlow } from '@/types/insights';

function fmt(v: number) {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  return `₹${v.toLocaleString('en-IN')}`;
}

export function CashFlowCard({ data }: { data?: CashFlow }) {
  if (!data) return null;

  const chartData = [
    { name: 'Invested', value: data.investment, color: '#3b82f6' }, // blue-500
    { name: 'Expenses', value: data.expenses, color: '#f43f5e' } // rose-500
  ];

  const netColor = data.net >= 0 ? 'text-emerald-400' : 'text-rose-400';

  return (
    <Card className="border-border/50 h-full">
      <CardHeader className="pb-2 flex flex-row items-center gap-2">
        <Wallet className="w-5 h-5 text-emerald-400" />
        <CardTitle className="text-h4">Cash Flow Insights</CardTitle>
      </CardHeader>
      <CardContent className="pt-4 flex flex-col gap-4">
        <div className="h-[140px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} tick={{ fill: '#94a3b8', fontSize: 13 }} />
              <Tooltip
                formatter={(value: any) => [fmt(value), 'Amount']}
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                itemStyle={{ color: '#f8fafc' }}
                cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="flex flex-col gap-1 border-t border-white/5 pt-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Net Cash Flow</span>
            <span className={`text-body font-bold tabular-nums ${netColor}`}>
              {data.net > 0 ? '+' : ''}{fmt(data.net)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mt-2">
            {data.summary}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
