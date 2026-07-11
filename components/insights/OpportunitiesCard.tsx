import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, ArrowRight } from 'lucide-react';
import type { Opportunity } from '@/types/insights';

export function OpportunitiesCard({ data }: { data?: Opportunity[] }) {
  if (!data || data.length === 0) return null;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'Medium': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Low': return 'bg-green-500/10 text-green-400 border-green-500/20';
      default: return 'bg-white/5 text-slate-300 border-white/10';
    }
  };

  return (
    <Card className="border-border/50 h-full">
      <CardHeader className="pb-4 flex flex-row items-center gap-2">
        <Lightbulb className="w-5 h-5 text-amber-400" />
        <CardTitle className="text-h4">Top Opportunities</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.map((opp, i) => (
          <div key={i} className="group relative pl-4 pb-4 border-l border-white/10 last:border-0 last:pb-0">
            <div className="absolute w-2 h-2 rounded-full bg-amber-400 -left-[4.5px] top-1.5 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
            <div className="flex items-start justify-between gap-4 mb-1">
              <h4 className="text-body font-semibold text-foreground">{opp.title}</h4>
              <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-sm border ${getPriorityColor(opp.priority)}`}>
                {opp.priority}
              </span>
            </div>
            <p className="text-sm text-muted-foreground/90">{opp.description}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
