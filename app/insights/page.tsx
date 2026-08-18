'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Topbar } from '@/components/layout/Topbar';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { useAiInsights } from '@/hooks/useAiInsights';
import { useState } from 'react';
import { Sparkles, AlertCircle, RefreshCw, Brain, Globe, TrendingUp, Network, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import { PortfolioHealthCard } from '@/components/insights/PortfolioHealthCard';
import { AssetAllocationCard } from '@/components/insights/AssetAllocationCard';
import { DiversificationCard } from '@/components/insights/DiversificationCard';
import { MarketConditionCard } from '@/components/insights/MarketConditionCard';
import { MarketOutlookCard } from '@/components/insights/MarketOutlookCard';
import { LongTermStrategyCard } from '@/components/insights/LongTermStrategyCard';
import { OpportunitiesCard } from '@/components/insights/OpportunitiesCard';
import { RisksCard } from '@/components/insights/RisksCard';
import { CashFlowCard } from '@/components/insights/CashFlowCard';
import { RecommendationsCard } from '@/components/insights/RecommendationsCard';
import { AISummaryCard } from '@/components/insights/AISummaryCard';
import { AgentExecutionPanel } from '@/components/insights/AgentExecutionPanel';

import type { PortfolioInput } from '@/lib/ai/pipeline';

export default function InsightsPage() {
  const {
    equity, bonds, cashFlowStats, assetAllocation, sectorAllocation,
    concentrationRisk, winners, losers,
    netWorth, equityTotal, bondTotal,
    isLoading: dataLoading, lastFetched, apiErrors,
  } = usePortfolioData();

  const {
    insights,
    isLoading: insightLoading,
    error,
    cached,
    pipelineState,
    fetchInsights,
    resetInsights,
  } = useAiInsights();
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    if (!insights) return;
    setIsDownloadingPdf(true);
    try {
      const res = await fetch('/api/reports/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType: 'ai', insights }),
      });
      if (!res.ok) throw new Error('PDF export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `ai-portfolio-intelligence-${dateStr}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[insights/pdf]', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleGenerate = async () => {
    const sortedEquity = [...equity].sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0));
    const sortedBonds = [...bonds].sort((a, b) => (b.totalValue || 0) - (a.totalValue || 0));

    const payload: PortfolioInput = {
      netWorth,
      equityTotal,
      bondTotal,
      equityCount: equity.length,
      bondCount: bonds.length,
      diversificationScore: concentrationRisk.diversificationScore,
      herfindahlIndex: concentrationRisk.herfindahlIndex,
      top5Percent: concentrationRisk.top5Percent,
      topEquity: sortedEquity.slice(0, 10).map((h) => ({
        ticker: h.ticker,
        name: h.name,
        sector: h.sector,
        currentValue: h.currentValue,
        percentChange: h.percentChange,
        allocationPercent: h.allocationPercent,
        shares: h.shares,
      })),
      topBonds: sortedBonds.slice(0, 8).map((b) => ({
        isin: b.isin,
        securityName: b.securityName,
        sector: b.sector,
        creditRating: b.creditRating,
        ytm: b.ytm,
        couponRate: b.couponRate,
        duration: b.duration,
        totalValue: b.totalValue,
        maturityDate: b.maturityDate,
      })),
      winners: winners.slice(0, 5).map((w) => ({
        ticker: w.ticker,
        name: w.name,
        sector: equity.find((e) => e.ticker === w.ticker)?.sector ?? '',
        currentValue: w.currentValue,
        percentChange: w.percentChange,
        allocationPercent: equity.find((e) => e.ticker === w.ticker)?.allocationPercent ?? 0,
        shares: equity.find((e) => e.ticker === w.ticker)?.shares ?? 0,
      })),
      losers: losers.slice(0, 5).map((l) => ({
        ticker: l.ticker,
        name: l.name,
        sector: equity.find((e) => e.ticker === l.ticker)?.sector ?? '',
        currentValue: l.currentValue,
        percentChange: l.percentChange,
        allocationPercent: equity.find((e) => e.ticker === l.ticker)?.allocationPercent ?? 0,
        shares: equity.find((e) => e.ticker === l.ticker)?.shares ?? 0,
      })),
      assetAllocation: assetAllocation.map((a) => ({ label: a.label, percent: a.percent })),
      sectorAllocation: sectorAllocation.slice(0, 8).map((s) => ({ sector: s.sector, percent: s.percent })),
      totalInvestment: cashFlowStats.totalInvestment,
      totalExpenses: cashFlowStats.totalExpenses,
      monthlyAvgInvestment: cashFlowStats.monthlySummaries.length
        ? cashFlowStats.totalInvestment / cashFlowStats.monthlySummaries.length
        : 0,
      lastMonthInvestment: cashFlowStats.monthlySummaries.slice(-1)[0]?.investment ?? 0,
      lastMonthExpenses: cashFlowStats.monthlySummaries.slice(-1)[0]?.totalExpenses ?? 0,
    };
    await fetchInsights(payload);
  };

  const pipelineSteps = [
    { icon: Brain, label: 'Portfolio Analysis', color: 'text-indigo-400' },
    { icon: Globe, label: 'Market Grounding', color: 'text-blue-400' },
    { icon: TrendingUp, label: 'Strategy Engine', color: 'text-emerald-400' },
    { icon: Network, label: 'Risk Scenarios', color: 'text-amber-400' },
    { icon: Sparkles, label: 'Report Assembly', color: 'text-purple-400' },
  ];

  return (
    <>
      <Topbar lastFetched={lastFetched} pageTitle="AI Insights" apiErrors={apiErrors} />
      <div className="p-3 sm:p-4 md:p-6 space-y-6 animate-fade-in-up">

        {/* Generate CTA */}
        {!insights && !insightLoading && !error && (
          <Card className="border-border/50 bg-gradient-to-br from-indigo-950/50 to-purple-950/30 border-indigo-500/20">
            <CardContent className="p-10 flex flex-col items-center text-center gap-5">
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                <Sparkles className="w-10 h-10 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-foreground">Premium AI Analysis</h2>
                <p className="text-body text-muted-foreground mt-2 max-w-lg mx-auto leading-relaxed">
                  Powered by a 5-node agentic pipeline with live market grounding. Get a SEBI-grade analysis
                  of your portfolio, macro conditions, risk scenarios, and long-term strategy.
                </p>
              </div>
              {/* Pipeline preview */}
              <div className="flex items-center gap-1 flex-wrap justify-center">
                {pipelineSteps.map((step, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10">
                      <step.icon className={`w-3.5 h-3.5 ${step.color}`} />
                      <span className="text-[11px] text-muted-foreground">{step.label}</span>
                    </div>
                    {i < pipelineSteps.length - 1 && (
                      <span className="text-muted-foreground/40 text-xs">→</span>
                    )}
                  </div>
                ))}
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
                Generate Intelligence Report
              </motion.button>
              <p className="text-xs text-muted-foreground/50">
                Analysis takes 15–30 seconds. Results are cached for 15 minutes.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Header when generated */}
        {(insights || insightLoading || error) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
            <div>
              <h2 className="text-h2 font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                Portfolio Intelligence
              </h2>
              {insights?.generatedAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Generated: {new Date(insights.generatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} at {new Date(insights.generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              {insights && (
                <Button
                  variant="outline"
                  className="bg-indigo-600/15 text-indigo-400 border-indigo-500/30 hover:bg-indigo-600/25 transition-all shadow-sm"
                  onClick={handleDownloadPdf}
                  disabled={isDownloadingPdf || insightLoading}
                >
                  {isDownloadingPdf ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}>
                      <Download className="w-4 h-4 mr-2" />
                    </motion.div>
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  {isDownloadingPdf ? 'Generating PDF...' : 'Download PDF Report'}
                </Button>
              )}
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
                {insightLoading ? 'Analysing...' : 'Refresh Analysis'}
              </Button>
            </div>
          </div>
        )}

        {/* Transient Single-Agent Reasoning Indicator (ChatGPT-Style) */}
        {insightLoading && (
          <AgentExecutionPanel
            pipelineState={pipelineState}
            isExecuting={insightLoading}
            hasCompleted={Boolean(insights)}
          />
        )}

        {/* Error */}
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
              <CardContent className="p-6 flex items-center gap-6">
                <Skeleton className="w-24 h-24 rounded-full bg-white/5" />
                <div className="space-y-3 flex-1">
                  <Skeleton className="h-6 w-32 bg-white/5" />
                  <Skeleton className="h-4 w-full max-w-md bg-white/5" />
                </div>
              </CardContent>
            </Card>
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-6 h-[220px]">
                  <Skeleton className="h-full w-full bg-white/5" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Main Dashboard */}
        <AnimatePresence mode="popLayout">
          {insights && !error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {/* Row 1: Health (full width) */}
              <div className="md:col-span-2">
                <PortfolioHealthCard data={insights.health} />
              </div>

              {/* Row 2: Allocation + Cash Flow */}
              <AssetAllocationCard data={insights.allocation} />
              <CashFlowCard data={insights.cashFlow} />

              {/* Row 3: Diversification + Market Condition */}
              <DiversificationCard data={insights.diversification} />
              <MarketConditionCard data={insights.marketCondition} />

              {/* Row 4: Market Outlook (full width) */}
              {insights.marketOutlook && (
                <div className="md:col-span-2">
                  <MarketOutlookCard data={insights.marketOutlook} />
                </div>
              )}

              {/* Row 5: Opportunities + Risks */}
              <OpportunitiesCard data={insights.opportunities} />
              <RisksCard data={insights.risks} />

              {/* Row 6: Long-Term Strategy (full width) */}
              {insights.longTermStrategy && (
                <div className="md:col-span-2">
                  <LongTermStrategyCard data={insights.longTermStrategy} />
                </div>
              )}

              {/* Row 7: Recommendations (full width) */}
              <div className="md:col-span-2">
                <RecommendationsCard data={insights.recommendations} />
              </div>

              {/* Row 8: Executive Summary (full width) */}
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
