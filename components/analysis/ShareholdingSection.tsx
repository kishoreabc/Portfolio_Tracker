'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ResearchSection, EmptyState } from './ResearchSection';
import type { ShareholdingData, ShareholdingQuarter } from '@/types/research';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Users, PieChart as PieIcon, TrendingUp, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface ShareholdingSectionProps {
  shareholding: ShareholdingData | null | undefined;
  isLoading?: boolean;
}

const COLORS = {
  promoters: '#3b82f6', // Blue
  fii: '#10b981',       // Emerald
  dii: '#f59e0b',       // Amber
  public: '#8b5cf6',    // Purple
  others: '#64748b',    // Slate
};

export function ShareholdingSection({ shareholding, isLoading }: ShareholdingSectionProps) {
  const latest = shareholding?.latest;
  const history = shareholding?.history ?? [];

  // Pie chart data for latest quarter
  const pieData = useMemo(() => {
    if (!latest) return [];
    return [
      { name: 'Promoters', value: latest.promoters ?? 0, color: COLORS.promoters },
      { name: 'FIIs (Foreign)', value: latest.fii ?? 0, color: COLORS.fii },
      { name: 'DIIs (Domestic)', value: latest.dii ?? 0, color: COLORS.dii },
      { name: 'Public', value: latest.public ?? 0, color: COLORS.public },
      ...(latest.others ? [{ name: 'Others', value: latest.others, color: COLORS.others }] : []),
    ].filter((item) => item.value > 0);
  }, [latest]);

  // Compute QoQ changes between last two quarters
  const qoqChanges = useMemo(() => {
    if (history.length < 2) return null;
    const curr = history[history.length - 1];
    const prev = history[history.length - 2];
    return {
      promoters: curr.promoters != null && prev.promoters != null ? curr.promoters - prev.promoters : null,
      fii: curr.fii != null && prev.fii != null ? curr.fii - prev.fii : null,
      dii: curr.dii != null && prev.dii != null ? curr.dii - prev.dii : null,
      public: curr.public != null && prev.public != null ? curr.public - prev.public : null,
    };
  }, [history]);

  if (!shareholding || history.length === 0) {
    return (
      <ResearchSection
        title="Shareholding Pattern"
        id="shareholding"
        description="Quarterly promoter, institutional, and public holding distribution"
        meta={shareholding?.meta}
      >
        <EmptyState
          title="Shareholding data unavailable"
          description="Quarterly shareholding filings (promoters, FIIs, DIIs, public) are not available for this company from current live data providers. This requires official BSE/NSE shareholding records."
        />
      </ResearchSection>
    );
  }

  return (
    <div className="space-y-6">
      <ResearchSection
        title="Shareholding Pattern"
        id="shareholding"
        description={`Quarterly ownership distribution as of ${latest?.quarter ?? 'latest filing'}`}
        meta={shareholding.meta}
      >
        {/* ── Top Charts Grid: Donut + Historical Trend ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          {/* Current Quarter Donut */}
          <div className="lg:col-span-5 rounded-xl bg-white/[0.03] border border-white/5 p-5 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <PieIcon className="w-3.5 h-3.5 text-blue-400" />
                Latest Holdings ({latest?.quarter})
              </h4>
              <p className="text-xs text-muted-foreground/60 mb-4">Total equity distribution by investor category</p>
            </div>

            <div className="h-52 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`${Number(val).toFixed(2)}%`, 'Holding']}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Promoters</span>
                <span className="text-lg font-bold font-mono text-foreground">
                  {latest?.promoters?.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Legend badges with QoQ changes */}
            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/5 text-xs">
              <div className="flex items-center justify-between p-1.5 rounded bg-white/[0.02]">
                <div className="flex items-center gap-1.5 truncate">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.promoters }} />
                  <span className="text-muted-foreground truncate">Promoters</span>
                </div>
                <span className="font-mono font-semibold text-foreground">{latest?.promoters?.toFixed(2)}%</span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded bg-white/[0.02]">
                <div className="flex items-center gap-1.5 truncate">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.fii }} />
                  <span className="text-muted-foreground truncate">FII</span>
                </div>
                <div className="flex items-center gap-1 font-mono font-semibold text-foreground">
                  <span>{latest?.fii?.toFixed(2)}%</span>
                  {qoqChanges?.fii && Math.abs(qoqChanges.fii) >= 0.01 && (
                    <span className={cn('text-[10px]', qoqChanges.fii > 0 ? 'text-emerald-400' : 'text-red-400')}>
                      {qoqChanges.fii > 0 ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded bg-white/[0.02]">
                <div className="flex items-center gap-1.5 truncate">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.dii }} />
                  <span className="text-muted-foreground truncate">DII</span>
                </div>
                <div className="flex items-center gap-1 font-mono font-semibold text-foreground">
                  <span>{latest?.dii?.toFixed(2)}%</span>
                  {qoqChanges?.dii && Math.abs(qoqChanges.dii) >= 0.01 && (
                    <span className={cn('text-[10px]', qoqChanges.dii > 0 ? 'text-emerald-400' : 'text-red-400')}>
                      {qoqChanges.dii > 0 ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded bg-white/[0.02]">
                <div className="flex items-center gap-1.5 truncate">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.public }} />
                  <span className="text-muted-foreground truncate">Public</span>
                </div>
                <span className="font-mono font-semibold text-foreground">{latest?.public?.toFixed(2)}%</span>
              </div>
            </div>
          </div>

          {/* Historical Trend Area Chart */}
          <div className="lg:col-span-7 rounded-xl bg-white/[0.03] border border-white/5 p-5 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                Historical Institutional Shift
              </h4>
              <p className="text-xs text-muted-foreground/60 mb-4">Quarter-by-quarter holding percentage changes</p>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="quarter" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="promoters"
                    name="Promoters %"
                    stackId="1"
                    stroke={COLORS.promoters}
                    fill={COLORS.promoters}
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="fii"
                    name="FII %"
                    stackId="1"
                    stroke={COLORS.fii}
                    fill={COLORS.fii}
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="dii"
                    name="DII %"
                    stackId="1"
                    stroke={COLORS.dii}
                    fill={COLORS.dii}
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="public"
                    name="Public %"
                    stackId="1"
                    stroke={COLORS.public}
                    fill={COLORS.public}
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── Historical Shareholding Table (Screener-style) ── */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <Table className="w-full text-xs">
              <TableHeader>
                <TableRow className="border-b border-white/10 bg-white/[0.03] hover:bg-transparent">
                  <TableHead className="sticky left-0 z-10 bg-[#0d1322] font-semibold text-foreground min-w-[160px] py-3 pl-4">
                    Category
                  </TableHead>
                  {history.map((q, idx) => (
                    <TableHead
                      key={idx}
                      className="text-right font-mono font-semibold text-foreground/90 whitespace-nowrap px-4 py-3 min-w-[90px]"
                    >
                      {q.quarter}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { label: 'Promoters +', key: 'promoters' as const, highlight: true },
                  { label: 'FIIs +', key: 'fii' as const },
                  { label: 'DIIs +', key: 'dii' as const },
                  { label: 'Government', key: 'government' as const },
                  { label: 'Public', key: 'public' as const },
                  { label: 'Others', key: 'others' as const },
                  { label: 'Total', key: 'total' as const, highlight: true },
                ].map((row, rIdx) => (
                  <TableRow
                    key={rIdx}
                    className={cn(
                      'border-b border-white/5 hover:bg-white/[0.03] transition-colors',
                      row.highlight && 'bg-white/[0.01] font-semibold'
                    )}
                  >
                    <TableCell
                      className={cn(
                        'sticky left-0 z-10 bg-[#0d1322] font-medium text-foreground py-2.5 pl-4 whitespace-nowrap',
                        row.highlight && 'text-blue-400 font-semibold'
                      )}
                    >
                      {row.label}
                    </TableCell>
                    {history.map((q, cIdx) => {
                      const val = q[row.key];
                      return (
                        <TableCell
                          key={cIdx}
                          className="text-right font-mono tabular-nums px-4 py-2.5 whitespace-nowrap text-foreground/90"
                        >
                          {val != null ? `${val.toFixed(2)}%` : '—'}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
                {history.some((q) => q.numberOfShareholders != null) && (
                  <TableRow className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                    <TableCell className="sticky left-0 z-10 bg-[#0d1322] font-medium text-muted-foreground py-2.5 pl-4 whitespace-nowrap">
                      No. of Shareholders
                    </TableCell>
                    {history.map((q, cIdx) => (
                      <TableCell
                        key={cIdx}
                        className="text-right font-mono tabular-nums px-4 py-2.5 whitespace-nowrap text-muted-foreground"
                      >
                        {q.numberOfShareholders != null ? q.numberOfShareholders.toLocaleString('en-IN') : '—'}
                      </TableCell>
                    ))}
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </ResearchSection>
    </div>
  );
}
