import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import type { Risk } from '@/types/insights';

export function RisksCard({ data }: { data?: Risk[] }) {
  if (!data || data.length === 0) return null;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'High': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'Medium': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Low': return 'bg-green-500/10 text-green-400 border-green-500/20';
      default: return 'bg-white/5 text-slate-300 border-white/10';
    }
  };

  return (
    <Card className="border-border/50 h-full bg-gradient-to-bl from-card to-red-950/5">
      <CardHeader className="pb-4 flex flex-row items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-red-400" />
        <CardTitle className="text-h4">Key Risks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.map((risk, i) => (
          <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/5">
            <div className="flex items-center justify-between gap-3 mb-1">
              <h4 className="text-body font-semibold text-foreground">{risk.title}</h4>
              <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-sm border ${getSeverityColor(risk.severity)}`}>
                {risk.severity}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{risk.description}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
