'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Topbar } from '@/components/layout/Topbar';
import { KpiCard } from '@/components/shared/KpiCard';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Shield, PieChart, Activity, Layers, BarChart2 } from 'lucide-react';
import { usePrivacy, PRIVACY_MASK } from '@/lib/privacy-context';

function fmt(v: number, isHidden: boolean = false) {
  if (isHidden) return PRIVACY_MASK;
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AnalyticsPage() {
  const { winners, losers, concentrationRisk, sectorAllocation, isLoading, lastFetched, apiErrors } = usePortfolioData();
  const { isHidden } = usePrivacy();

  const diversificationAccent =
    concentrationRisk.diversificationScore >= 70 ? 'green' :
    concentrationRisk.diversificationScore >= 40 ? 'amber' : 'red';

  return (
    <>
      <Topbar lastFetched={lastFetched} pageTitle="Analytics" apiErrors={apiErrors} />
      <div className="p-3 sm:p-4 md:p-6 space-y-6 animate-fade-in-up">

        {/* ── Top Summary KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Diversification Score"
            value={`${concentrationRisk.diversificationScore}/100`}
            subValue={
              concentrationRisk.diversificationScore >= 70 ? 'Well Diversified' :
              concentrationRisk.diversificationScore >= 40 ? 'Moderate Spread' : 'High Concentration'
            }
            accentColor={diversificationAccent}
            icon={Shield}
            isLoading={isLoading}
          />
          <KpiCard
            title="Top 5 Concentration"
            value={`${(concentrationRisk.top5Percent * 100).toFixed(1)}%`}
            subValue="Weight of 5 largest holdings"
            accentColor="purple"
            icon={PieChart}
            isLoading={isLoading}
          />
          <KpiCard
            title="Herfindahl Index (HHI)"
            value={concentrationRisk.herfindahlIndex.toFixed(4)}
            subValue="Market concentration index"
            accentColor="cyan"
            icon={Activity}
            isLoading={isLoading}
          />
          <KpiCard
            title="Sector Spread"
            value={`${sectorAllocation.length} Sectors`}
            subValue="Active allocation segments"
            accentColor="teal"
            icon={Layers}
            isLoading={isLoading}
          />
        </div>

        {/* Top Concentration */}
        <Card className="border-cyan-500/20 bg-gradient-to-b from-cyan-950/10 via-card to-card shadow-sm hover:border-cyan-500/30 transition-all">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <BarChart2 className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <CardTitle className="text-cyan-300 font-bold">Top 5 Concentration Risk</CardTitle>
                <CardDescription>Largest single holdings by portfolio weight</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 bg-white/5" />) :
              concentrationRisk.top5Holdings.map((h, i) => (
                <div key={i} className="space-y-1.5 p-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{h.name}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 h-4 uppercase font-semibold ${
                          h.type === 'equity'
                            ? 'border-blue-500/40 text-blue-400 bg-blue-500/10'
                            : 'border-purple-500/40 text-purple-400 bg-purple-500/10'
                        }`}
                      >
                        {h.type}
                      </Badge>
                    </div>
                    <span className={`font-bold tabular-nums ${h.type === 'equity' ? 'text-blue-400' : 'text-purple-400'}`}>
                      {(h.percent * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        h.type === 'equity'
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-400'
                          : 'bg-gradient-to-r from-purple-500 to-indigo-400'
                      }`}
                      style={{ width: `${Math.min(h.percent * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>

        {/* Winners & Losers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-emerald-500/30 bg-gradient-to-b from-emerald-950/15 via-card to-card shadow-sm hover:border-emerald-500/40 transition-all">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <TrendingUp className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <CardTitle className="text-emerald-400 font-bold">Best Performers</CardTitle>
                  <CardDescription>Top gainers across portfolio</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 bg-white/5" />) :
                winners.map((w) => (
                  <motion.div key={w.ticker} whileHover={{ x: 4 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 transition-colors">
                    <div>
                      <p className="text-sm font-bold text-foreground">{w.ticker}</p>
                      <p className="text-xs text-muted-foreground max-w-[140px] truncate">{w.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-400">+{(w.percentChange * 100).toFixed(2)}%</p>
                      <p className="text-xs text-muted-foreground tabular-nums">{fmt(w.currentPrice)}</p>
                    </div>
                  </motion.div>
                ))}
            </CardContent>
          </Card>

          <Card className="border-rose-500/30 bg-gradient-to-b from-rose-950/15 via-card to-card shadow-sm hover:border-rose-500/40 transition-all">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <TrendingDown className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <CardTitle className="text-rose-400 font-bold">Worst Performers</CardTitle>
                  <CardDescription>Largest laggards across portfolio</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 bg-white/5" />) :
                losers.map((l) => (
                  <motion.div key={l.ticker} whileHover={{ x: 4 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 transition-colors">
                    <div>
                      <p className="text-sm font-bold text-foreground">{l.ticker}</p>
                      <p className="text-xs text-muted-foreground max-w-[140px] truncate">{l.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-rose-400">{(l.percentChange * 100).toFixed(2)}%</p>
                      <p className="text-xs text-muted-foreground tabular-nums">{fmt(l.currentPrice)}</p>
                    </div>
                  </motion.div>
                ))}
            </CardContent>
          </Card>
        </div>

        {/* Sector exposure */}
        <Card className="border-blue-500/20 bg-gradient-to-b from-blue-950/10 via-card to-card shadow-sm hover:border-blue-500/30 transition-all">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Layers className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <CardTitle className="text-blue-300 font-bold">Sector Exposure</CardTitle>
                <CardDescription>Distribution across industries & asset classes</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-6 bg-white/5" />) :
              sectorAllocation.map((s) => (
                <div key={s.sector} className="space-y-1.5 p-1 rounded-lg hover:bg-white/[0.02] transition-colors">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground font-semibold">{s.sector}</span>
                    <span className="font-bold text-foreground">{fmt(s.totalValue, isHidden)} <span className="text-xs text-blue-400 font-semibold">({(s.percent * 100).toFixed(1)}%)</span></span>
                  </div>
                  <div className="flex gap-0.5 h-2 rounded-full overflow-hidden bg-white/5">
                    <div style={{ width: `${s.totalValue > 0 ? (s.equityValue / s.totalValue) * (s.percent * 100) : 0}%`, minWidth: s.equityValue > 0 ? 2 : 0 }} className="rounded-l bg-gradient-to-r from-blue-600 to-cyan-500" />
                    <div style={{ width: `${s.totalValue > 0 ? (s.bondValue / s.totalValue) * (s.percent * 100) : 0}%`, minWidth: s.bondValue > 0 ? 2 : 0 }} className="rounded-r bg-gradient-to-r from-emerald-500 to-teal-400" />
                  </div>
                </div>
              ))}
            <div className="flex gap-4 pt-3 text-xs text-muted-foreground border-t border-border/40">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-xs inline-block" />Equity</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs inline-block" />Bonds</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
