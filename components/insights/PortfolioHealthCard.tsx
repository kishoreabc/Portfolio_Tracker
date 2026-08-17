import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, ChevronDown } from 'lucide-react';
import type { PortfolioHealth } from '@/types/insights';
import { useState } from 'react';

export function PortfolioHealthCard({ data }: { data?: PortfolioHealth }) {
  const [showReasons, setShowReasons] = useState(false);
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

  const rawScore = Number(data.score);
  const score = isNaN(rawScore) ? 75 : Math.min(100, Math.max(0, rawScore));

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <Card className="border-border/50 bg-gradient-to-br from-card to-card/50">
      <CardHeader className="pb-2 flex flex-row items-center gap-2">
        <Activity className="w-5 h-5 text-indigo-400" />
        <CardTitle className="text-h4">Portfolio Health</CardTitle>
      </CardHeader>
      <CardContent className="pt-4 flex flex-col sm:flex-row items-start gap-6">
        <div className="relative w-24 h-24 flex-shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={radius} className="stroke-muted/30" strokeWidth="8" fill="none" />
            <circle
              cx="50" cy="50" r={radius}
              className={`${getStrokeColor(score)} transition-all duration-1000 ease-out`}
              strokeWidth="8" fill="none" strokeLinecap="round"
              style={{ strokeDasharray: circumference, strokeDashoffset: isNaN(offset) ? 0 : offset }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-foreground tabular-nums">{score}</span>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md bg-white/5 border border-white/10 ${getStatusColor(data.score)}`}>
              {data.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{data.summary}</p>

          {data.reasons && data.reasons.length > 0 && (
            <div>
              <button
                onClick={() => setShowReasons((v) => !v)}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors mt-1"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showReasons ? 'rotate-180' : ''}`} />
                {showReasons ? 'Hide' : 'Show'} scoring reasons
              </button>
              {showReasons && (
                <ul className="mt-2 space-y-1">
                  {data.reasons.map((r, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0 mt-1.5" />
                      {r}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
