'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, ArrowUpRight, ArrowDownRight, Compass, Flame, DollarSign, Percent, TrendingUp } from 'lucide-react';
import type { MacroIntelligence } from '@/types/insights';

interface MacroIntelligenceCardProps {
  data?: MacroIntelligence;
}

export function MacroIntelligenceCard({ data }: MacroIntelligenceCardProps) {
  if (!data) return null;

  const getVariableIcon = (name: string) => {
    if (/crude|oil/i.test(name)) return <Flame className="w-4 h-4 text-amber-400" />;
    if (/usd|inr|dollar|currency/i.test(name)) return <DollarSign className="w-4 h-4 text-emerald-400" />;
    if (/rate|yield|10y|treasury/i.test(name)) return <Percent className="w-4 h-4 text-cyan-400" />;
    return <Globe className="w-4 h-4 text-indigo-400" />;
  };

  const getTrendBadge = (trend: string) => {
    if (/rising|elevated|up/i.test(trend)) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
    if (/falling|down/i.test(trend)) {
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
    return 'bg-white/5 text-muted-foreground border-white/10';
  };

  return (
    <Card className="border-border/50 bg-gradient-to-br from-card via-card/70 to-card/40 shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-h4">Market & Macro Intelligence</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Macroeconomic sensitivities mapped directly to your portfolio sectors
            </p>
          </div>
        </div>

        <span className="text-[10px] text-muted-foreground uppercase tracking-widest px-2.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono">
          Sensitivity Analysis
        </span>
      </CardHeader>

      <CardContent className="pt-4 space-y-5">
        {/* Macro Summary */}
        {data.summary && (
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-border/40 text-xs text-muted-foreground leading-relaxed">
            {data.summary}
          </div>
        )}

        {/* Macro Exposure Sensitivity Cards */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Macro Factor Sensitivities
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {data.exposures.map((exp, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-border/40 bg-card/40 hover:bg-card/70 transition-all space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-white/5">
                      {getVariableIcon(exp.variable)}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-foreground block">{exp.variable}</span>
                      {exp.currentValue && (
                        <span className="text-[11px] text-muted-foreground font-mono">{exp.currentValue}</span>
                      )}
                    </div>
                  </div>

                  <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md border ${getTrendBadge(exp.trend)}`}>
                    {exp.trend}
                  </span>
                </div>

                <div className="space-y-1.5 pt-1 border-t border-white/5 text-xs">
                  <div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Potential Sensitivity</span>
                    <p className="text-muted-foreground leading-relaxed mt-0.5">{exp.sensitivity}</p>
                  </div>

                  {exp.affectedHoldingsOrSectors && (
                    <div className="text-[11px] text-indigo-400/90 pt-1 flex items-center gap-1.5">
                      <span className="font-semibold text-indigo-300">Affected:</span>
                      <span className="text-muted-foreground font-mono">{exp.affectedHoldingsOrSectors}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground/60 italic text-center">
          Macro variable interpretations reflect analytical sensitivity models and are not directional market predictions.
        </p>
      </CardContent>
    </Card>
  );
}
