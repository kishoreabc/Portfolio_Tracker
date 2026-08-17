import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe } from 'lucide-react';
import type { MarketCondition } from '@/types/insights';

const STATUS_CONFIG: Record<string, { icon: string; color: string; bg: string; border: string }> = {
  'Bull Market': { icon: '🐂', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  'Bear Market': { icon: '🐻', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  'Sideways': { icon: '↔️', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  'Volatile': { icon: '⚡', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  'Recovery': { icon: '🔄', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
};

export function MarketConditionCard({ data }: { data?: MarketCondition }) {
  if (!data) return null;

  const cfg = STATUS_CONFIG[data.status] ?? STATUS_CONFIG['Sideways'];

  return (
    <Card className="border-border/50 h-full">
      <CardHeader className="pb-2 flex flex-row items-center gap-2">
        <Globe className="w-5 h-5 text-blue-400" />
        <CardTitle className="text-h4">Market Conditions</CardTitle>
        <span className="ml-auto text-[9px] text-muted-foreground bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
          AI Grounded
        </span>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Status badge */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${cfg.bg} ${cfg.border}`}>
          <span className="text-base">{cfg.icon}</span>
          <span className={`text-sm font-bold ${cfg.color}`}>{data.status}</span>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">{data.summary}</p>

        {/* Key Drivers */}
        {data.keyDrivers && data.keyDrivers.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">Key Market Drivers</p>
            <div className="flex flex-wrap gap-2">
              {data.keyDrivers.map((d, i) => (
                <span key={i} className="text-xs bg-white/5 border border-white/10 px-2 py-1 rounded-md text-foreground/80">
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Impact grid */}
        <div className="grid grid-cols-1 gap-2">
          {data.impactOnEquity && (
            <div className="p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/15">
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-0.5">Equity Impact</p>
              <p className="text-xs text-muted-foreground">{data.impactOnEquity}</p>
            </div>
          )}
          {data.impactOnBonds && (
            <div className="p-2.5 rounded-lg bg-purple-500/5 border border-purple-500/15">
              <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-0.5">Bond Impact</p>
              <p className="text-xs text-muted-foreground">{data.impactOnBonds}</p>
            </div>
          )}
          {data.impactOnPortfolio && (
            <div className="p-2.5 rounded-lg bg-indigo-500/5 border border-indigo-500/15">
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-0.5">Your Portfolio</p>
              <p className="text-xs text-muted-foreground">{data.impactOnPortfolio}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
