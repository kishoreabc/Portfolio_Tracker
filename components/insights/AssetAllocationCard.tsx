import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { Allocation } from '@/types/insights';

export function AssetAllocationCard({ data }: { data?: Allocation }) {
  if (!data) return null;

  const chartData = useMemo(() => {
    return [
      { name: 'Equity', value: data.equity, color: '#60a5fa' }, // blue-400
      { name: 'Bonds', value: data.bonds, color: '#c084fc' }, // purple-400
      { name: 'Gold', value: data.gold, color: '#fbbf24' }, // amber-400
      { name: 'Cash', value: data.cash, color: '#34d399' }, // emerald-400
    ].filter(item => item.value > 0);
  }, [data]);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2 flex flex-row items-center gap-2">
        <PieChartIcon className="w-5 h-5 text-indigo-400" />
        <CardTitle className="text-h4">Asset Allocation</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: any, name: any) => [`${(value)}%`, name]}
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                itemStyle={{ color: '#f8fafc' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {chartData.map((item) => (
            <div key={item.name} className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-muted-foreground">{item.name}</span>
              <span className="font-medium text-foreground ml-auto">{(item.value)}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
