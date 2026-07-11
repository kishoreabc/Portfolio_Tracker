'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Topbar } from '@/components/layout/Topbar';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Shield } from 'lucide-react';

function fmt(v: number) {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AnalyticsPage() {
  const { winners, losers, concentrationRisk, sectorAllocation, isLoading, lastFetched, apiErrors } = usePortfolioData();

  const diversificationColor =
    concentrationRisk.diversificationScore >= 70 ? 'text-emerald-400' :
    concentrationRisk.diversificationScore >= 40 ? 'text-amber-400' : 'text-red-400';

  return (
    <>
      <Topbar lastFetched={lastFetched} pageTitle="Analytics" apiErrors={apiErrors} />
      <div className="p-3 sm:p-4 md:p-6 space-y-4 animate-fade-in-up">
        {/* Diversification Score */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-border/50">
            <CardHeader className="pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-400" /> Diversification Score
                  </CardTitle>
                  <CardDescription>Based on Herfindahl-Hirschman Index</CardDescription>
                </div>
                {isLoading ? <Skeleton className="h-10 w-20 bg-white/5" /> : (
                  <span className={`text-display font-bold tabular-nums ${diversificationColor}`}>
                    {concentrationRisk.diversificationScore}<span className="text-body text-muted-foreground/80 font-normal">/100</span>
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? <Skeleton className="h-2 bg-white/5" /> : (
                <Progress value={concentrationRisk.diversificationScore} className="h-2" />
              )}
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div className="text-center">
                  <p className="text-caption font-semibold text-muted-foreground/80 uppercase tracking-wide">HHI Index</p>
                  <p className="text-body font-bold text-foreground mt-0.5">{concentrationRisk.herfindahlIndex.toFixed(4)}</p>
                </div>
                <div className="text-center">
                  <p className="text-caption font-semibold text-muted-foreground/80 uppercase tracking-wide">Top 5 Holdings</p>
                  <p className="text-body font-bold text-foreground mt-0.5">{(concentrationRisk.top5Percent * 100).toFixed(1)}%</p>
                </div>
                <div className="text-center">
                  <p className="text-caption font-semibold text-muted-foreground/80 uppercase tracking-wide">Risk Level</p>
                  <p className={`text-body font-bold mt-0.5 ${diversificationColor}`}>
                    {concentrationRisk.diversificationScore >= 70 ? 'Well Div.' :
                     concentrationRisk.diversificationScore >= 40 ? 'Moderate' : 'Concentrated'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Concentration */}
        <Card className="border-border/50">
          <CardHeader className="pb-5">
            <CardTitle>Top 5 Concentration Risk</CardTitle>
            <CardDescription>Largest single holdings by portfolio weight</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 bg-white/5" />) :
              concentrationRisk.top5Holdings.map((h, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-body">
                    <span className="font-semibold text-foreground">{h.name}</span>
                    <span className={h.type === 'equity' ? 'text-blue-400' : 'text-green-400'}>
                      {(h.percent * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={h.percent * 100} className="h-1.5" />
                </div>
              ))}
          </CardContent>
        </Card>

        {/* Winners & Losers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-border/50">
            <CardHeader className="pb-5">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" /> Best Performers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 bg-white/5" />) :
                winners.map((w) => (
                  <motion.div key={w.ticker} whileHover={{ x: 4 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                    <div>
                      <p className="text-small font-semibold">{w.ticker}</p>
                      <p className="text-caption text-muted-foreground max-w-[120px] truncate">{w.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-body font-bold text-emerald-400">+{(w.percentChange * 100).toFixed(2)}%</p>
                      <p className="text-caption text-muted-foreground">{fmt(w.currentPrice)}</p>
                    </div>
                  </motion.div>
                ))}
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-5">
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-400" /> Worst Performers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 bg-white/5" />) :
                losers.map((l) => (
                  <motion.div key={l.ticker} whileHover={{ x: 4 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                    <div>
                      <p className="text-small font-semibold">{l.ticker}</p>
                      <p className="text-caption text-muted-foreground max-w-[120px] truncate">{l.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-body font-bold text-red-400">{(l.percentChange * 100).toFixed(2)}%</p>
                      <p className="text-caption text-muted-foreground">{fmt(l.currentPrice)}</p>
                    </div>
                  </motion.div>
                ))}
            </CardContent>
          </Card>
        </div>

        {/* Sector exposure */}
        <Card className="border-border/50">
          <CardHeader className="pb-5">
            <CardTitle>Sector Exposure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-6 bg-white/5" />) :
              sectorAllocation.map((s) => (
                <div key={s.sector} className="space-y-1">
                  <div className="flex justify-between text-body">
                    <span className="text-muted-foreground/80 font-medium">{s.sector}</span>
                    <span className="font-semibold text-foreground">{fmt(s.totalValue)} <span className="text-caption text-muted-foreground font-normal">({(s.percent * 100).toFixed(1)}%)</span></span>
                  </div>
                  <div className="flex gap-0.5 h-1.5 rounded overflow-hidden">
                    <div style={{ width: `${s.totalValue > 0 ? (s.equityValue / s.totalValue) * (s.percent * 100) : 0}%`, background: 'hsl(221 83% 53%)', minWidth: s.equityValue > 0 ? 2 : 0 }} className="rounded-l" />
                    <div style={{ width: `${s.totalValue > 0 ? (s.bondValue / s.totalValue) * (s.percent * 100) : 0}%`, background: 'hsl(142 71% 45%)', minWidth: s.bondValue > 0 ? 2 : 0 }} className="rounded-r" />
                  </div>
                </div>
              ))}
            <div className="flex gap-4 pt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-500 inline-block" />Equity</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" />Bonds</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
