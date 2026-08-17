import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Network } from 'lucide-react';
import type { Diversification } from '@/types/insights';

const GRADE_COLORS: Record<string, { text: string; bg: string; stroke: string }> = {
  Excellent: { text: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', stroke: 'stroke-emerald-400' },
  Good: { text: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', stroke: 'stroke-blue-400' },
  Fair: { text: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', stroke: 'stroke-amber-400' },
  Poor: { text: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', stroke: 'stroke-red-400' },
};

export function DiversificationCard({ data }: { data?: Diversification }) {
  if (!data) return null;

  const colors = GRADE_COLORS[data.grade] ?? GRADE_COLORS.Fair;
  const rawScore = Number(data.score);
  const score = isNaN(rawScore) ? 70 : Math.min(100, Math.max(0, rawScore));

  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <Card className="border-border/50 h-full">
      <CardHeader className="pb-2 flex flex-row items-center gap-2">
        <Network className="w-5 h-5 text-cyan-400" />
        <CardTitle className="text-h4">Diversification Quality</CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Score ring + grade */}
        <div className="flex items-center gap-5">
          <div className="relative w-20 h-20 flex-shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r={radius} className="stroke-muted/30" strokeWidth="7" fill="none" />
              <circle
                cx="40" cy="40" r={radius}
                className={`${colors.stroke} transition-all duration-1000 ease-out`}
                strokeWidth="7" fill="none" strokeLinecap="round"
                style={{ strokeDasharray: circumference, strokeDashoffset: isNaN(offset) ? 0 : offset }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold tabular-nums text-foreground">{score}</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${colors.bg} ${colors.text}`}>
              {data.grade}
            </span>
            <p className="text-xs text-muted-foreground">
              HHI Index: <span className="font-mono text-foreground">{Number(data.hhi).toFixed(4)}</span>
              <span className="ml-1 text-muted-foreground/60">(lower = more diversified)</span>
            </p>
          </div>
        </div>

        {/* Strengths */}
        {data.strengths && data.strengths.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Strengths</p>
            <ul className="space-y-1">
              {data.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 mt-1.5" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Weaknesses */}
        {data.weaknesses && data.weaknesses.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Gaps</p>
            <ul className="space-y-1">
              {data.weaknesses.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggestion */}
        {data.suggestion && (
          <div className="px-3 py-2 rounded-lg bg-cyan-500/5 border border-cyan-500/15">
            <p className="text-xs text-cyan-300">💡 {data.suggestion}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
