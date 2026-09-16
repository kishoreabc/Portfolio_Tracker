'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, CheckCircle2, AlertTriangle, ShieldCheck, Quote } from 'lucide-react';
import type { FundamentalIntelligence } from '@/types/insights';

interface FundamentalIntelligenceCardProps {
  data?: FundamentalIntelligence;
}

export function FundamentalIntelligenceCard({ data }: FundamentalIntelligenceCardProps) {
  if (!data) return null;

  const score = Math.min(100, Math.max(0, data.score || 75));

  const getStatusColor = (val: number) => {
    if (val >= 80) return 'text-emerald-400';
    if (val >= 65) return 'text-indigo-400';
    if (val >= 50) return 'text-amber-400';
    return 'text-red-400';
  };

  const getHoldingStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'strong':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'weak':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'neutral':
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  return (
    <Card className="border-border/50 bg-gradient-to-br from-card via-card/70 to-card/40 shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-h4">Fundamental Intelligence</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Holdings-level profitability, valuation multiples, and balance sheet characteristics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest block font-medium">Quality Score</span>
            <span className={`text-lg font-bold tabular-nums ${getStatusColor(score)}`}>
              {score} <span className="text-xs text-muted-foreground font-normal">/ 100</span>
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-5">
        {/* Strengths & Watch Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Strengths */}
          <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Core Strengths</span>
            </div>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              {data.strengths.map((str, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold mt-0.5">✓</span>
                  <span className="leading-relaxed">{str}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Watch Items */}
          <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Watch Items</span>
            </div>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              {data.watchItems.map((watch, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold mt-0.5">⚠</span>
                  <span className="leading-relaxed">{watch}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* AI Interpretation Box */}
        {data.interpretation && (
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-border/40 text-xs text-muted-foreground flex items-start gap-2.5">
            <Quote className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-foreground block">Analytical Interpretation:</span>
              <p className="leading-relaxed italic">{data.interpretation}</p>
            </div>
          </div>
        )}

        {/* Stock-Level Table */}
        {data.holdings && data.holdings.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Holding-Level Fundamentals
              </h4>
              <span className="text-[11px] text-muted-foreground">Top {data.holdings.length} equities</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border/40">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/40 bg-white/5 text-muted-foreground">
                    <th className="p-2.5 font-semibold">Stock</th>
                    <th className="p-2.5 font-semibold text-right">Weight</th>
                    <th className="p-2.5 font-semibold text-right">P/E</th>
                    <th className="p-2.5 font-semibold text-right">Fwd P/E</th>
                    <th className="p-2.5 font-semibold text-right">P/B</th>
                    <th className="p-2.5 font-semibold text-right">Div Yield</th>
                    <th className="p-2.5 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 font-mono">
                  {data.holdings.map((h, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-2.5 font-sans font-medium text-foreground">
                        <div>{h.symbol}</div>
                        <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">{h.name}</div>
                      </td>
                      <td className="p-2.5 text-right text-foreground">{h.weight.toFixed(1)}%</td>
                      <td className="p-2.5 text-right text-foreground">{h.pe ? `${h.pe}x` : '—'}</td>
                      <td className="p-2.5 text-right text-muted-foreground">{h.forwardPe ? `${h.forwardPe}x` : '—'}</td>
                      <td className="p-2.5 text-right text-muted-foreground">{h.pb ? `${h.pb}x` : '—'}</td>
                      <td className="p-2.5 text-right text-muted-foreground">{h.dividendYield !== undefined ? `${h.dividendYield}%` : '—'}</td>
                      <td className="p-2.5 text-center font-sans">
                        <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md border ${getHoldingStatusBadge(h.status)}`}>
                          {h.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
