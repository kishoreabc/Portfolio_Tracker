'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, CheckCircle2, AlertTriangle, ShieldCheck, Quote, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { FundamentalIntelligence } from '@/types/insights';

interface FundamentalIntelligenceCardProps {
  data?: FundamentalIntelligence;
  equity?: Array<{
    ticker: string;
    name?: string;
    sector?: string;
    currentValue?: number;
    allocationPercent?: number;
  }>;
}

export function FundamentalIntelligenceCard({ data, equity }: FundamentalIntelligenceCardProps) {
  const score = Math.min(100, Math.max(0, data?.score || 75));

  const holdingsList = useMemo(() => {
    const base = data?.holdings ? [...data.holdings] : [];
    if (!equity || equity.length === 0) return base;

    const existingSymbols = new Set(base.map((h) => (h.symbol || '').trim().toUpperCase()));

    for (const eq of equity) {
      const sym = (eq.ticker || '').trim().toUpperCase();
      if (!sym || existingSymbols.has(sym)) continue;

      base.push({
        symbol: sym,
        name: eq.name || sym,
        weight: eq.allocationPercent || 0,
        pe: undefined,
        forwardPe: undefined,
        pb: undefined,
        dividendYield: undefined,
        status: 'Neutral',
      });
      existingSymbols.add(sym);
    }

    return base;
  }, [data?.holdings, equity]);

  if (!data && holdingsList.length === 0) return null;

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

  type FundamentalSortKey = 'symbol' | 'weight' | 'pe' | 'forwardPe' | 'pb' | 'dividendYield' | 'status';
  const [sortKey, setSortKey] = useState<FundamentalSortKey | null>('weight');
  const [sortAsc, setSortAsc] = useState(false);

  const toggleSort = (key: FundamentalSortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const renderSortIcon = (columnKey: FundamentalSortKey) => {
    if (sortKey !== columnKey) {
      return (
        <ArrowUpDown className="inline-block ml-1.5 w-3.5 h-3.5 text-muted-foreground/35 group-hover:text-muted-foreground/80 transition-colors" />
      );
    }
    return sortAsc ? (
      <ArrowUp className="inline-block ml-1.5 w-3.5 h-3.5 text-primary font-bold transition-transform" />
    ) : (
      <ArrowDown className="inline-block ml-1.5 w-3.5 h-3.5 text-primary font-bold transition-transform" />
    );
  };

  const sortedHoldings = useMemo(() => {
    if (!sortKey) return holdingsList;
    return [...holdingsList].sort((a, b) => {
      let valA: any = a[sortKey];
      let valB: any = b[sortKey];
      if (valA == null && valB == null) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;
      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(String(valB));
        return sortAsc ? cmp : -cmp;
      }
      return sortAsc ? valA - valB : valB - valA;
    });
  }, [holdingsList, sortKey, sortAsc]);

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
              Financial health, balance-sheet resilience, and valuation quality
            </p>
          </div>
        </div>

        {data && (
          <div className="flex items-center gap-2">
            <ShieldCheck className={`w-4 h-4 ${getStatusColor(score)}`} />
            <div className="flex items-baseline gap-1">
              <span className={`text-sm font-extrabold ${getStatusColor(score)} font-mono`}>
                {score}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">/100</span>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-4 space-y-5">
        {/* Core Strengths & Watch Items */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-card/60 border border-border/40 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Financial Quality Drivers</span>
              </div>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {data.strengths.map((s, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-400 mt-1">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-card/60 border border-border/40 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Fundamental Watchpoints</span>
              </div>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {data.watchItems.map((w, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-amber-400 mt-1">•</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* AI Fundamental Interpretation */}
        {data?.interpretation && (
          <div className="p-4 rounded-xl bg-white/[0.02] border border-border/40 text-xs text-muted-foreground flex items-start gap-2.5">
            <Quote className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-foreground block">Fundamental Context:</span>
              <p className="leading-relaxed italic">{data.interpretation}</p>
            </div>
          </div>
        )}

        {/* Stock-Level Table */}
        {holdingsList.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Holding-Level Fundamentals
              </h4>
              <span className="text-[11px] text-muted-foreground font-mono">{holdingsList.length} Holdings</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border/40">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/40 bg-white/5 text-muted-foreground">
                    {[
                      { key: 'symbol' as const, label: 'Stock', align: 'left' },
                      { key: 'weight' as const, label: 'Weight', align: 'right' },
                      { key: 'pe' as const, label: 'P/E', align: 'right' },
                      { key: 'forwardPe' as const, label: 'Fwd P/E', align: 'right' },
                      { key: 'pb' as const, label: 'P/B', align: 'right' },
                      { key: 'dividendYield' as const, label: 'Div Yield', align: 'right' },
                      { key: 'status' as const, label: 'Status', align: 'center' },
                    ].map((col) => (
                      <th
                        key={col.key}
                        className={`p-2.5 text-sm font-semibold uppercase tracking-wider select-none cursor-pointer group transition-colors hover:text-foreground ${
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                        } ${sortKey === col.key ? 'text-foreground font-bold' : 'text-muted-foreground'}`}
                        onClick={() => toggleSort(col.key)}
                      >
                        <span className={`inline-flex items-center ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''}`}>
                          {col.label}
                          {renderSortIcon(col.key)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 font-mono">
                  {sortedHoldings.map((h, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-2.5 font-sans font-medium text-foreground">
                        <div>{h.symbol}</div>
                        <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">{h.name}</div>
                      </td>
                      <td className="p-2.5 text-right text-foreground">{typeof h.weight === 'number' ? `${h.weight.toFixed(1)}%` : '—'}</td>
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
