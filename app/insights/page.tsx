'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Topbar } from '@/components/layout/Topbar';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { useAiInsights } from '@/hooks/useAiInsights';
import { Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { PortfolioHealthCard } from '@/components/insights/PortfolioHealthCard';
import { AssetAllocationCard } from '@/components/insights/AssetAllocationCard';
import { OpportunitiesCard } from '@/components/insights/OpportunitiesCard';
import { RisksCard } from '@/components/insights/RisksCard';
import { CashFlowCard } from '@/components/insights/CashFlowCard';
import { RecommendationsCard } from '@/components/insights/RecommendationsCard';
import { AISummaryCard } from '@/components/insights/AISummaryCard';
import { Skeleton } from '@/components/ui/skeleton';

export default function InsightsPage() {
  const {
    equity, bonds, cashFlowStats, assetAllocation, concentrationRisk, winners, losers,
    netWorth, equityTotal, bondTotal, isLoading: dataLoading, lastFetched, apiErrors,
  } = usePortfolioData();

  const { insights, isLoading: insightLoading, error, cached, fetchInsights, resetInsights } = useAiInsights();

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

  return (
    <>
      <Topbar lastFetched={lastFetched} pageTitle="AI Insights" apiErrors={apiErrors} />
      <div className="p-3 sm:p-4 md:p-6 space-y-6 animate-fade-in-up">
        
        {/* Generate Header */}
        {!insights && !insightLoading && !error && (
          <Card className="border-border/50 bg-gradient-to-br from-indigo-950/50 to-purple-950/30 border-indigo-500/20">
            <CardContent className="p-10 flex flex-col items-center text-center gap-5">
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                <Sparkles className="w-10 h-10 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-foreground">Premium AI Analysis</h2>
                <p className="text-body text-muted-foreground mt-2 max-w-lg mx-auto leading-relaxed">
                  Powered by Gemini. Get a highly structured, data-driven analysis of your entire portfolio, cashflow, and risk distribution.
                </p>
              </div>
              <motion.button
                id="generate-insights-btn"
                onClick={handleGenerate}
                disabled={dataLoading}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="mt-2 flex items-center gap-2 px-8 py-3 rounded-xl text-body font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25"
              >
                <Sparkles className="w-5 h-5" />
                Generate Insights
              </motion.button>
            </CardContent>
          </Card>
        )}

        {/* Dashboard Header when generated */}
        {(insights || insightLoading || error) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
            <div>
              <h2 className="text-h2 font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" /> 
                Portfolio Intelligence
              </h2>
              {cached && <p className="text-xs text-muted-foreground mt-1">Showing cached analysis from the last 15 minutes.</p>}
            </div>
            <Button
              variant="outline"
              className="bg-card border-border/50 text-foreground hover:bg-white/5"
              onClick={handleGenerate}
              disabled={insightLoading || dataLoading}
            >
              {insightLoading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                </motion.div>
              ) : (
                <RefreshCw className="w-4 h-4 mr-2 opacity-70" />
              )}
              {insightLoading ? 'Analyzing...' : 'Refresh Analysis'}
            </Button>
          </div>
        )}

        {/* Error State */}
        {error && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="p-5 flex flex-col sm:flex-row items-center gap-4">
                <div className="p-3 rounded-full bg-red-500/10 flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h4 className="text-body font-bold text-red-400">Analysis Failed</h4>
                  <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{error}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" className="border-red-500/20 text-red-400 hover:bg-red-500/10" onClick={resetInsights}>
                    Clear
                  </Button>
                  <Button className="bg-red-500 hover:bg-red-600 text-white" onClick={handleGenerate}>
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Loading Skeletons */}
        {insightLoading && !insights && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border/50 md:col-span-2">
              <CardContent className="p-6 flex items-center gap-6"><Skeleton className="w-24 h-24 rounded-full bg-white/5" /><div className="space-y-3 flex-1"><Skeleton className="h-6 w-32 bg-white/5" /><Skeleton className="h-4 w-full max-w-md bg-white/5" /></div></CardContent>
            </Card>
            <Card className="border-border/50"><CardContent className="p-6 h-[250px]"><Skeleton className="h-full w-full bg-white/5" /></CardContent></Card>
            <Card className="border-border/50"><CardContent className="p-6 h-[250px]"><Skeleton className="h-full w-full bg-white/5" /></CardContent></Card>
          </div>
        )}

        {/* JSON Dashboard Layout */}
        <AnimatePresence mode="popLayout">
          {insights && !error && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.98 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {/* Row 1 */}
              <div className="md:col-span-2">
                <PortfolioHealthCard data={insights.health} />
              </div>

              {/* Row 2 */}
              <AssetAllocationCard data={insights.allocation} />
              <CashFlowCard data={insights.cashFlow} />

              {/* Row 3 */}
              <OpportunitiesCard data={insights.opportunities} />
              <RisksCard data={insights.risks} />

              {/* Row 4 */}
              <div className="md:col-span-2">
                <RecommendationsCard data={insights.recommendations} />
              </div>

              {/* Row 5 */}
              <div className="md:col-span-2">
                <AISummaryCard data={insights.summary} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </>
  );
}
