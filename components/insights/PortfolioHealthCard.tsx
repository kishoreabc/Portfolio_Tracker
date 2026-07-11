import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import type { PortfolioHealth } from '@/types/insights';

export function PortfolioHealthCard({ data }: { data?: PortfolioHealth }) {
  if (!data) return null;

  const getStatusColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400';
    if (score >= 70) return 'text-blue-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-red-400';
  };
  
  const getStrokeColor = (score: number) => {
    if (score >= 90) return 'stroke-emerald-400';
    if (score >= 70) return 'stroke-blue-400';
    if (score >= 50) return 'stroke-amber-400';
    return 'stroke-red-400';
  };

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (data.score / 100) * circumference;

  return (
    <Card className="border-border/50 bg-gradient-to-br from-card to-card/50">
      <CardHeader className="pb-2 flex flex-row items-center gap-2">
        <Activity className="w-5 h-5 text-indigo-400" />
        <CardTitle className="text-h4">Portfolio Health</CardTitle>
      </CardHeader>
      <CardContent className="pt-4 flex items-center gap-6">
        <div className="relative w-24 h-24 flex-shrink-0 flex items-center justify-center">
          {/* Background Circle */}
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="stroke-muted/30"
              strokeWidth="8"
              fill="none"
            />
            {/* Progress Circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              className={`${getStrokeColor(data.score)} transition-all duration-1000 ease-out`}
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              style={{ strokeDasharray: circumference, strokeDashoffset: offset }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-foreground tabular-nums">{data.score}</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md bg-white/5 border border-white/10 ${getStatusColor(data.score)}`}>
              {data.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {data.summary}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
