'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, ChevronDown, Database, TrendingUp, ShieldAlert, PieChart, Globe, BarChart3 } from 'lucide-react';
import type { ExecutiveSummaryInsight } from '@/types/insights';

interface ExecutiveSummaryCardProps {
  insights?: ExecutiveSummaryInsight[];
  summaryText?: string;
}

export function ExecutiveSummaryCard({ insights, summaryText }: ExecutiveSummaryCardProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!insights || insights.length === 0) {
    if (!summaryText) return null;
    return (
      <Card className="border-border/50 bg-gradient-to-br from-card to-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-h4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            AI Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <p className="text-sm text-muted-foreground leading-relaxed">{summaryText}</p>
        </CardContent>
      </Card>
    );
  }

  const toggleOpen = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'fundamental':
        return <BarChart3 className="w-4 h-4 text-emerald-400" />;
      case 'technical':
        return <TrendingUp className="w-4 h-4 text-blue-400" />;
      case 'risk':
        return <ShieldAlert className="w-4 h-4 text-amber-400" />;
      case 'valuation':
        return <PieChart className="w-4 h-4 text-purple-400" />;
      case 'macro':
        return <Globe className="w-4 h-4 text-cyan-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-indigo-400" />;
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'fundamental':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'technical':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'risk':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'valuation':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'macro':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      default:
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    }
  };

  return (
    <Card className="border-border/50 bg-gradient-to-br from-card via-card/70 to-card/40 shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-h4">AI Executive Summary</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              High-conviction analytical insights grounded in portfolio telemetry
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-1 space-y-3">
        {summaryText && (
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-border/40 text-xs text-muted-foreground leading-relaxed mb-4">
            {summaryText}
          </div>
        )}

        <div className="space-y-2.5">
          {insights.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-xl border border-border/40 bg-card/40 hover:bg-card/70 transition-all overflow-hidden"
              >
                <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-1.5 rounded-lg bg-white/5 flex-shrink-0 mt-0.5">
                      {getCategoryIcon(item.category)}
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getCategoryBadgeClass(item.category)}`}>
                          {item.category}
                        </span>
                        <span className="text-xs font-semibold text-foreground">{item.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.insight}</p>
                    </div>
                  </div>

                  {item.evidence && item.evidence.length > 0 && (
                    <button
                      onClick={() => toggleOpen(idx)}
                      className="self-end sm:self-center flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/20 flex-shrink-0"
                    >
                      <Database className="w-3 h-3" />
                      <span>{isOpen ? 'Hide Data' : 'View Data'}</span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>

                {/* Collapsible View Data Evidence Drawer */}
                {isOpen && item.evidence && item.evidence.length > 0 && (
                  <div className="px-4 pb-3.5 pt-1 border-t border-border/30 bg-black/20 animate-fade-in-up">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Database className="w-3 h-3 text-indigo-400" />
                      <span>Underlying Evidence & Telemetry</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {item.evidence.map((ev, evIdx) => (
                        <span
                          key={evIdx}
                          className="text-xs px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-foreground/90 font-mono"
                        >
                          {ev}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
