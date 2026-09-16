'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { ReviewFlag } from '@/types/insights';

interface ReviewFlagsCardProps {
  flags?: ReviewFlag[];
}

export function ReviewFlagsCard({ flags }: ReviewFlagsCardProps) {
  if (!flags || flags.length === 0) return null;

  const getSeverityMeta = (severity: ReviewFlag['severity']) => {
    switch (severity) {
      case 'red':
        return {
          icon: <AlertCircle className="w-4 h-4 text-red-400" />,
          dot: 'bg-red-400',
          badge: 'bg-red-500/10 text-red-400 border-red-500/20',
          border: 'border-red-500/30 bg-red-500/5',
          label: 'Critical / Action Required',
        };
      case 'orange':
        return {
          icon: <AlertTriangle className="w-4 h-4 text-orange-400" />,
          dot: 'bg-orange-400',
          badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
          border: 'border-orange-500/30 bg-orange-500/5',
          label: 'Concentration Warning',
        };
      case 'yellow':
        return {
          icon: <Info className="w-4 h-4 text-amber-400" />,
          dot: 'bg-amber-400',
          badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          border: 'border-amber-500/30 bg-amber-500/5',
          label: 'Valuation Notice',
        };
      case 'green':
      default:
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
          dot: 'bg-emerald-400',
          badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          border: 'border-emerald-500/30 bg-emerald-500/5',
          label: 'Quality Confirmation',
        };
    }
  };

  return (
    <Card className="border-border/50 bg-gradient-to-br from-card via-card/70 to-card/40 shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-h4">AI Review Flags</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Identified portfolio anomalies, concentrations, and positive quality drivers
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">{flags.length} Flags</span>
        </div>
      </CardHeader>

      <CardContent className="pt-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {flags.map((flag, idx) => {
            const meta = getSeverityMeta(flag.severity);
            return (
              <div
                key={idx}
                className={`p-3.5 sm:p-4 rounded-xl border ${meta.border} transition-all space-y-2 flex flex-col justify-between`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {meta.icon}
                      <span className="text-xs font-bold text-foreground">{flag.title}</span>
                    </div>
                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md border ${meta.badge}`}>
                      {flag.type}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">{flag.description}</p>
                </div>

                <div className="pt-2 border-t border-white/5 space-y-1">
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <span className="font-semibold text-foreground/80">Evidence:</span>
                    <span className="font-mono text-foreground/90">{flag.evidence}</span>
                  </div>
                  {flag.actionRecommendation && (
                    <div className="text-[11px] text-indigo-400/90 flex items-start gap-1.5">
                      <span className="font-semibold text-indigo-300">Action:</span>
                      <span>{flag.actionRecommendation}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
