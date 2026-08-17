import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, Clock } from 'lucide-react';
import type { Recommendation } from '@/types/insights';

export function RecommendationsCard({ data }: { data?: Recommendation[] }) {
  if (!data || data.length === 0) return null;

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'High': return { dot: 'bg-red-400', badge: 'bg-red-500/10 text-red-400 border-red-500/20' };
      case 'Medium': return { dot: 'bg-amber-400', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      case 'Low': return { dot: 'bg-green-400', badge: 'bg-green-500/10 text-green-400 border-green-500/20' };
      default: return { dot: 'bg-slate-400', badge: 'bg-white/5 text-slate-300 border-white/10' };
    }
  };

  return (
    <Card className="border-border/50 h-full">
      <CardHeader className="pb-4 flex flex-row items-center gap-2">
        <Target className="w-5 h-5 text-indigo-400" />
        <CardTitle className="text-h4">Actionable Recommendations</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-4">
          {data.map((rec, i) => {
            const style = getPriorityStyle(rec.priority);
            return (
              <li key={i} className="flex gap-4">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400">
                  {i + 1}
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-body font-semibold text-foreground">{rec.title ?? rec.action}</p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {rec.timeframe && (
                        <span className="flex items-center gap-1 text-[9px] text-muted-foreground bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
                          <Clock className="w-2.5 h-2.5" />
                          {rec.timeframe}
                        </span>
                      )}
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-sm border ${style.badge}`}>
                        {rec.priority}
                      </span>
                    </div>
                  </div>
                  {rec.title && rec.action && rec.action !== rec.title && (
                    <p className="text-sm text-foreground/80 font-medium">{rec.action}</p>
                  )}
                  {rec.rationale && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{rec.rationale}</p>
                  )}
                  {rec.evidence && (
                    <p className="text-xs text-indigo-400/70 italic">📊 {rec.evidence}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
