'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Topbar } from '@/components/layout/Topbar';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { useAiInsights } from '@/hooks/useAiInsights';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

function fmt(v: number) {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function InsightsPage() {
  const {
    equity, bonds, cashFlowStats, assetAllocation, concentrationRisk, winners, losers,
    netWorth, equityTotal, bondTotal, isLoading: dataLoading, lastFetched, apiErrors,
  } = usePortfolioData();

  const { insights, isLoading: insightLoading, error, cached, fetchInsights } = useAiInsights();

  const handleGenerate = async () => {
    await fetchInsights({
      equitySummary: {
        totalValue: equityTotal,
        count: equity.length,
        topHoldings: equity.slice(0, 5).map((h) => ({ ticker: h.ticker, value: h.currentValue, change: h.percentChange })),
        winners: winners.slice(0, 3),
        losers: losers.slice(0, 3),
      },
      bondSummary: {
        totalValue: bondTotal,
        count: bonds.length,
        avgYTM: bonds.length ? bonds.reduce((s, b) => s + b.ytm, 0) / bonds.length : 0,
        avgCoupon: bonds.length ? bonds.reduce((s, b) => s + b.couponRate, 0) / bonds.length : 0,
      },
      cashFlowSummary: {
        totalInvestment: cashFlowStats.totalInvestment,
        totalExpenses: cashFlowStats.totalExpenses,
        lastMonth: cashFlowStats.monthlySummaries.slice(-1)[0],
      },
      allocationSummary: {
        netWorth,
        assetAllocation: assetAllocation.map((a) => ({ label: a.label, percent: a.percent })),
        diversificationScore: concentrationRisk.diversificationScore,
        top5Concentration: concentrationRisk.top5Percent,
      },
    });
  };

  // Render markdown-ish insights as structured text
  const renderInsights = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('## ') || line.startsWith('# ')) {
        const content = line.replace(/^#+\s/, '');
        return <h3 key={i} className="text-sm font-bold text-foreground mt-4 mb-2 first:mt-0">{content}</h3>;
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="text-sm font-semibold text-blue-300 mt-3 mb-1">{line.replace(/\*\*/g, '')}</p>;
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return <li key={i} className="text-sm text-slate-300 ml-4 list-disc">{line.replace(/^[-*]\s/, '')}</li>;
      }
      if (!line.trim()) return <div key={i} className="h-2" />;
      return <p key={i} className="text-sm text-slate-300 leading-relaxed">{line}</p>;
    });
  };

  return (
    <>
      <Topbar lastFetched={lastFetched} pageTitle="AI Insights" apiErrors={apiErrors} />
      <div className="p-6 space-y-4 animate-fade-in-up">
        {/* Generate button */}
        <Card className="border-border/50 bg-gradient-to-br from-indigo-950/50 to-purple-950/30 border-indigo-500/20">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                <Sparkles className="w-8 h-8 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">AI Portfolio Analysis</h2>
                <p className="text-xs text-muted-foreground mt-1 max-w-md">
                  Powered by Gemini · Analyzes your real portfolio data server-side · Results cached for 15 minutes
                </p>
              </div>
              <motion.button
                id="generate-insights-btn"
                onClick={handleGenerate}
                disabled={insightLoading || dataLoading}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25"
              >
                {insightLoading ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                      <RefreshCw className="w-4 h-4" />
                    </motion.div>
                    Analyzing…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {insights ? 'Regenerate Analysis' : 'Generate Insights'}
                  </>
                )}
              </motion.button>
              {cached && <p className="text-xs text-muted-foreground/60">Showing cached result · Click to refresh</p>}
            </div>
          </CardContent>
        </Card>

        {/* Error state */}
        {error && (
          <Card className="border-red-500/30 bg-red-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-400">Failed to generate insights</p>
                <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
                {error.includes('GEMINI_API_KEY') && (
                  <p className="text-xs text-amber-400 mt-1">Add GEMINI_API_KEY to your .env.local file to enable AI insights.</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Insights output */}
        <AnimatePresence>
          {insights && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Card className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" /> Gemini Analysis
                    {cached && <span className="text-[10px] text-muted-foreground font-normal">· cached</span>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    {renderInsights(insights)}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading skeleton */}
        {insightLoading && (
          <Card className="border-border/50">
            <CardContent className="p-6 space-y-3">
              <Skeleton className="h-4 w-48 bg-white/5" />
              <Skeleton className="h-3 w-full bg-white/5" />
              <Skeleton className="h-3 w-4/5 bg-white/5" />
              <Skeleton className="h-3 w-full bg-white/5" />
              <Skeleton className="h-4 w-40 bg-white/5 mt-4" />
              <Skeleton className="h-3 w-full bg-white/5" />
              <Skeleton className="h-3 w-3/4 bg-white/5" />
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
