'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, AlertCircle, AlertTriangle, Eye, ShieldCheck, Quote } from 'lucide-react';
import type { RiskIntelligence } from '@/types/insights';

interface RiskIntelligenceCardProps {
  data?: RiskIntelligence;
}

export function RiskIntelligenceCard({ data }: RiskIntelligenceCardProps) {
  if (!data) return null;

  const score = Math.min(100, Math.max(0, data.overallRiskScore || 65));

  const getScoreColor = (val: number) => {
    if (val >= 75) return 'text-emerald-400';
    if (val >= 55) return 'text-indigo-400';
    if (val >= 40) return 'text-amber-400';
    return 'text-red-400';
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev?.toLowerCase()) {
      case 'high':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'medium':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'low':
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
  };

  return (
    <Card className="border-border/50 bg-gradient-to-br from-card via-card/70 to-card/40 shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-h4">Risk Intelligence</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Concentration thresholds, position sizing, and macro vulnerabilities
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest block font-medium">Risk Control</span>
          <span className={`text-lg font-bold tabular-nums ${getScoreColor(score)}`}>
            {score} <span className="text-xs text-muted-foreground font-normal">/ 100</span>
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-5">
        {/* Risk Concentration Telemetry Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-card/60 border border-border/40 space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block truncate">Top Sector</span>
            <span className="text-xs font-semibold text-foreground truncate block">{data.topSectorExposure.sector}</span>
            <span className="text-lg font-extrabold text-foreground tabular-nums">{data.topSectorExposure.percentage.toFixed(1)}%</span>
          </div>

          <div className="p-3 rounded-xl bg-card/60 border border-border/40 space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Top 5 Holdings</span>
            <span className="text-xs font-semibold text-foreground block">Concentration</span>
            <span className="text-lg font-extrabold text-foreground tabular-nums">{data.top5HoldingsWeight.toFixed(1)}%</span>
          </div>

          <div className="p-3 rounded-xl bg-card/60 border border-border/40 space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block truncate">Largest Position</span>
            <span className="text-xs font-semibold text-foreground truncate block">{data.largestPosition.symbol}</span>
            <span className="text-lg font-extrabold text-foreground tabular-nums">{data.largestPosition.percentage.toFixed(1)}%</span>
          </div>

          <div className="p-3 rounded-xl bg-card/60 border border-border/40 space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Debt Quality</span>
            <span className="text-xs font-semibold text-foreground block">AAA / Sovereign</span>
            <span className="text-lg font-extrabold text-emerald-400 tabular-nums">{data.debtQualityScore || 85}%</span>
          </div>
        </div>

        {/* AI Interpretation */}
        {data.interpretation && (
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-border/40 text-xs text-muted-foreground flex items-start gap-2.5">
            <Quote className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed italic">{data.interpretation}</p>
          </div>
        )}

        {/* Top Risk Factors Breakdown */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Top Risk Factors & Monitoring Framework
          </h4>

          <div className="space-y-3">
            {data.topRiskFactors.map((rf, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-border/40 bg-card/40 hover:bg-card/70 transition-all space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">{idx + 1}. {rf.title}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">({rf.category})</span>
                  </div>
                  <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md border ${getSeverityBadge(rf.severity)}`}>
                    {rf.severity} Severity
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1 border-t border-white/5">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Evidence</span>
                    <p className="text-foreground/90 font-mono text-[11px] leading-relaxed">{rf.evidence}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Potential Impact</span>
                    <p className="text-muted-foreground leading-relaxed">{rf.potentialImpact}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span>What to Monitor</span>
                    </span>
                    <p className="text-muted-foreground leading-relaxed">{rf.whatToMonitor}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
