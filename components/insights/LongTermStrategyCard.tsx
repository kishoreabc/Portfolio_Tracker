import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Compass, CheckCircle2 } from 'lucide-react';
import type { LongTermStrategy } from '@/types/insights';

export function LongTermStrategyCard({ data }: { data?: LongTermStrategy | string }) {
  if (!data) return null;

  // Handle string strategy from pipeline
  if (typeof data === 'string') {
    return (
      <Card className="border-border/50 h-full bg-gradient-to-br from-card to-indigo-950/10">
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <Compass className="w-5 h-5 text-indigo-400" />
          <CardTitle className="text-h4">Long-Term Wealth Strategy</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/15">
            <p className="text-sm text-foreground/90 leading-relaxed">{data}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Aligned with long-term capital compounding and systematic portfolio rebalancing.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const rawScore = Number(data.alignmentScore);
  const score = isNaN(rawScore) ? 75 : Math.min(100, Math.max(0, rawScore));

  const getAlignmentColor = (s: number) => {
    if (s >= 80) return { text: 'text-emerald-400', stroke: 'stroke-emerald-400', label: 'Well Aligned' };
    if (s >= 60) return { text: 'text-blue-400', stroke: 'stroke-blue-400', label: 'Moderately Aligned' };
    if (s >= 40) return { text: 'text-amber-400', stroke: 'stroke-amber-400', label: 'Partially Aligned' };
    return { text: 'text-red-400', stroke: 'stroke-red-400', label: 'Misaligned' };
  };

  const colors = getAlignmentColor(score);
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <Card className="border-border/50 h-full bg-gradient-to-br from-card to-indigo-950/10">
      <CardHeader className="pb-2 flex flex-row items-center gap-2">
        <Compass className="w-5 h-5 text-indigo-400" />
        <CardTitle className="text-h4">Long-Term Strategy</CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Alignment score */}
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 flex-shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 70 70">
              <circle cx="35" cy="35" r={radius} className="stroke-muted/30" strokeWidth="6" fill="none" />
              <circle
                cx="35" cy="35" r={radius}
                className={`${colors.stroke} transition-all duration-1000 ease-out`}
                strokeWidth="6" fill="none" strokeLinecap="round"
                style={{ strokeDasharray: circumference, strokeDashoffset: isNaN(offset) ? 0 : offset }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-base font-bold tabular-nums ${colors.text}`}>{score}</span>
            </div>
          </div>
          <div>
            <p className={`text-sm font-bold ${colors.text}`}>{colors.label}</p>
            {data.currentApproach && (
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{data.currentApproach}</p>
            )}
          </div>
        </div>

        {/* Target Allocation */}
        {data.targetAllocation && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">Suggested Target Allocation</p>
            <div className="grid grid-cols-4 gap-1.5">
              {Object.entries(data.targetAllocation)
                .filter(([, v]) => typeof v === 'number' && v > 0)
                .map(([key, value]) => {
                  const colorMap: Record<string, string> = {
                    equity: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
                    bonds: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
                    gold: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                    cash: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                  };
                  return (
                    <div key={key} className={`p-2 rounded-lg border text-center ${colorMap[key] ?? 'text-slate-400 bg-white/5 border-white/10'}`}>
                      <p className="text-[10px] font-semibold uppercase">{key}</p>
                      <p className="text-sm font-bold tabular-nums">{value}%</p>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {Array.isArray(data.suggestions) && data.suggestions.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">Suggested Actions</p>
            <ul className="space-y-1.5">
              {data.suggestions.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Compounding insight */}
        {data.compoundingInsight && (
          <div className="px-3 py-2.5 rounded-lg bg-amber-500/5 border border-amber-500/15">
            <p className="text-xs text-amber-300 leading-relaxed">⏳ <strong>Compounding:</strong> {data.compoundingInsight}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
