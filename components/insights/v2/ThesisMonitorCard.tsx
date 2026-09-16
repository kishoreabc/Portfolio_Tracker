'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, AlertTriangle, AlertCircle, ChevronDown, BookmarkCheck } from 'lucide-react';
import type { ThesisHolding } from '@/types/insights';

interface ThesisMonitorCardProps {
  holdings?: ThesisHolding[];
}

export function ThesisMonitorCard({ holdings }: ThesisMonitorCardProps) {
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);

  if (!holdings || holdings.length === 0) return null;

  const toggleExpand = (sym: string) => {
    setExpandedSymbol(expandedSymbol === sym ? null : sym);
  };

  const getThesisBadge = (status: ThesisHolding['thesisStatus']) => {
    switch (status) {
      case 'Intact':
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
          badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        };
      case 'Monitor':
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
          badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        };
      case 'Review':
      default:
        return {
          icon: <AlertCircle className="w-3.5 h-3.5 text-red-400" />,
          badge: 'bg-red-500/10 text-red-400 border-red-500/20',
        };
    }
  };

  return (
    <Card className="border-border/50 bg-gradient-to-br from-card via-card/70 to-card/40 shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <BookmarkCheck className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-h4">Investment Thesis Monitor</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Continuous validation of core investment rationale for your top equity holdings
            </p>
          </div>
        </div>

        <span className="text-[10px] text-muted-foreground uppercase tracking-widest px-2.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono">
          {holdings.length} Holdings
        </span>
      </CardHeader>

      <CardContent className="pt-4 space-y-3">
        {holdings.map((h) => {
          const isExpanded = expandedSymbol === h.symbol;
          const meta = getThesisBadge(h.thesisStatus);

          return (
            <div
              key={h.symbol}
              className="rounded-xl border border-border/40 bg-card/40 hover:bg-card/70 transition-all overflow-hidden"
            >
              <div
                onClick={() => toggleExpand(h.symbol)}
                className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-foreground font-mono">{h.symbol}</span>
                    <span className="text-[11px] text-muted-foreground truncate max-w-[140px] sm:max-w-[200px]">
                      {h.name}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-white/5 border border-white/10 text-foreground font-mono">
                    {h.weight.toFixed(1)}% wt
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border ${meta.badge}`}>
                    {meta.icon}
                    <span>{h.thesisStatus}</span>
                  </div>

                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {/* Expandable Details Drawer */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-border/30 bg-black/20 space-y-3 animate-fade-in-up text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                      <span className="text-[10px] text-muted-foreground uppercase block">Fundamentals</span>
                      <span className="font-semibold text-foreground">{h.fundamentalsStatus}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                      <span className="text-[10px] text-muted-foreground uppercase block">Valuation</span>
                      <span className="font-semibold text-foreground">{h.valuationStatus}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                      <span className="text-[10px] text-muted-foreground uppercase block">Technical</span>
                      <span className="font-semibold text-foreground">{h.technicalStatus}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                      <span className="text-[10px] text-muted-foreground uppercase block">Risk Level</span>
                      <span className="font-semibold text-foreground">{h.riskLevel}</span>
                    </div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Thesis Reasoning & Monitoring Guidance:
                    </span>
                    <p className="text-muted-foreground leading-relaxed italic bg-card/60 p-2.5 rounded-lg border border-border/30">
                      &ldquo;{h.explanation}&rdquo;
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
