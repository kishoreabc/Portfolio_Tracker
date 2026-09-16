'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Topbar } from '@/components/layout/Topbar';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { useAiInsights } from '@/hooks/useAiInsights';
import { useState, useMemo } from 'react';
import { Sparkles, AlertCircle, RefreshCw, Brain, Globe, TrendingUp, Network, Download, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePrivacy, maskInsightsData } from '@/lib/privacy-context';

// V2 AI Portfolio Intelligence Components
import { HealthScoreBanner } from '@/components/insights/v2/HealthScoreBanner';
import { SectionNav, type IntelligenceSection } from '@/components/insights/v2/SectionNav';
import { ExecutiveSummaryCard } from '@/components/insights/v2/ExecutiveSummaryCard';
import { ReviewFlagsCard } from '@/components/insights/v2/ReviewFlagsCard';
import { FundamentalIntelligenceCard } from '@/components/insights/v2/FundamentalIntelligenceCard';
import { TechnicalIntelligenceCard } from '@/components/insights/v2/TechnicalIntelligenceCard';
import { ValuationIntelligenceCard } from '@/components/insights/v2/ValuationIntelligenceCard';
import { RiskIntelligenceCard } from '@/components/insights/v2/RiskIntelligenceCard';
import { PortfolioIntelligenceCard } from '@/components/insights/v2/PortfolioIntelligenceCard';
import { MacroIntelligenceCard } from '@/components/insights/v2/MacroIntelligenceCard';
import { FundTechMatrix } from '@/components/insights/v2/FundTechMatrix';
import { ThesisMonitorCard } from '@/components/insights/v2/ThesisMonitorCard';
import { PortfolioChangesCard } from '@/components/insights/v2/PortfolioChangesCard';

// Retained V1 specialized cards for complete coverage
import { AssetAllocationCard } from '@/components/insights/AssetAllocationCard';
import { DiversificationCard } from '@/components/insights/DiversificationCard';
import { MarketConditionCard } from '@/components/insights/MarketConditionCard';
import { MarketOutlookCard } from '@/components/insights/MarketOutlookCard';
import { LongTermStrategyCard } from '@/components/insights/LongTermStrategyCard';
import { OpportunitiesCard } from '@/components/insights/OpportunitiesCard';
import { RisksCard } from '@/components/insights/RisksCard';
import { CashFlowCard } from '@/components/insights/CashFlowCard';
import { RecommendationsCard } from '@/components/insights/RecommendationsCard';
import { AgentExecutionPanel } from '@/components/insights/AgentExecutionPanel';

import type { PortfolioInput } from '@/lib/ai/pipeline';

export default function InsightsPage() {
  const { isHidden } = usePrivacy();
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
  const [activeSection, setActiveSection] = useState<IntelligenceSection>('overview');

  const holdingCounts = useMemo(
    () => [equity.length + bonds.length, equity.length, bonds.length],
    [equity.length, bonds.length]
  );

  const displayInsights = useMemo(() => {
    if (!insights || !isHidden) return insights;
    return maskInsightsData(insights, true, { holdingCounts });
  }, [insights, isHidden, holdingCounts]);

  const handleDownloadPdf = async () => {
    if (!displayInsights) return;
    setIsDownloadingPdf(true);
    try {
      const res = await fetch('/api/reports/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType: 'ai', insights: displayInsights }),
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
      topEquity: sortedEquity.map((h) => ({
        ticker: h.ticker,
        name: h.name,
        sector: h.sector,
        currentValue: h.currentValue,
        percentChange: h.percentChange,
        allocationPercent: h.allocationPercent,
        shares: h.shares,
      })),
      topBonds: sortedBonds.map((b) => ({
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
      sectorAllocation: sectorAllocation.map((s) => ({ sector: s.sector, percent: s.percent })),
      totalInvestment: cashFlowStats.totalInvestment,
      totalExpenses: cashFlowStats.totalExpenses,
      monthlyAvgInvestment: cashFlowStats.monthlySummaries.length
        ? cashFlowStats.totalInvestment / cashFlowStats.monthlySummaries.length
        : 0,
      lastMonthInvestment: cashFlowStats.monthlySummaries.slice(-1)[0]?.investment ?? 0,
      lastMonthExpenses: cashFlowStats.monthlySummaries.slice(-1)[0]?.totalExpenses ?? 0,
      previousReport: (() => {
        try {
          const saved = typeof window !== 'undefined' ? localStorage.getItem('portfolio_ai_insights_data') : null;
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed?.health) {
              return {
                health: parsed.health,
                portfolioHealthBreakdown: parsed.portfolioHealthBreakdown,
                valuationIntelligence: parsed.valuationIntelligence,
                reviewFlags: parsed.reviewFlags,
                riskIntelligence: parsed.riskIntelligence,
                generatedAt: parsed.generatedAt,
              };
            }
          }
        } catch {}
        return undefined;
      })(),
    };
    await fetchInsights(payload);
  };

  const pipelineSteps = [
    { icon: Brain, label: 'Portfolio Analytics', color: 'text-indigo-400' },
    { icon: Globe, label: 'Macro Grounding', color: 'text-blue-400' },
    { icon: TrendingUp, label: 'Strategy & Flags', color: 'text-emerald-400' },
    { icon: Network, label: 'Risk Scenarios', color: 'text-amber-400' },
    { icon: Sparkles, label: 'Intelligence Dossier', color: 'text-purple-400' },
  ];

  return (
    <>
      <Topbar lastFetched={lastFetched} pageTitle="AI Portfolio Intelligence" apiErrors={apiErrors} />
      <div className="p-3 sm:p-4 md:p-6 space-y-6 animate-fade-in-up max-w-7xl mx-auto">

        {/* Generate CTA (Before Generation) */}
        {!insights && !insightLoading && !error && (
          <Card className="border-border/50 bg-gradient-to-br from-indigo-950/50 via-card/80 to-purple-950/30 border-indigo-500/20 shadow-xl">
            <CardContent className="p-8 sm:p-12 flex flex-col items-center text-center gap-6">
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 shadow-inner">
                <Sparkles className="w-10 h-10 text-indigo-400" />
              </div>
              <div className="max-w-xl space-y-2">
                <span className="text-xs font-bold tracking-widest text-indigo-400 uppercase bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                  Bloomberg-Style Analytics Engine
                </span>
                <h2 className="text-3xl font-extrabold text-foreground tracking-tight">AI Portfolio Intelligence</h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Data-driven analysis of portfolio fundamentals, technicals, valuation, risk and market conditions.
                  Calculates structured metrics first, then delivers evidence-backed financial intelligence.
                </p>
              </div>

              {/* Pipeline preview */}
              <div className="flex items-center gap-1.5 flex-wrap justify-center py-2">
                {pipelineSteps.map((step, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs">
                      <step.icon className={`w-3.5 h-3.5 ${step.color}`} />
                      <span className="text-muted-foreground font-medium">{step.label}</span>
                    </div>
                    {i < pipelineSteps.length - 1 && (
                      <span className="text-muted-foreground/30 text-xs">→</span>
                    )}
                  </div>
                ))}
              </div>

              <motion.button
                id="generate-insights-btn"
                onClick={handleGenerate}
                disabled={dataLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="mt-2 flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25"
              >
                <Sparkles className="w-4 h-4" />
                Generate Intelligence Dossier
              </motion.button>
              <p className="text-xs text-muted-foreground/60">
                Calculates live moving averages, P/E multiples, and macro news grounding. Cached for 15 minutes.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Header when generated or loading */}
        {(insights || insightLoading || error) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-widest text-indigo-400 uppercase bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  AI INTELLIGENCE V2
                </span>
                {cached && (
                  <span className="text-[10px] text-muted-foreground bg-white/5 px-2 py-0.5 rounded border border-white/10 font-mono">
                    Cached
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2 mt-1">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                AI Portfolio Intelligence
              </h2>
              {insights?.generatedAt && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Report generated: {new Date(insights.generatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} at {new Date(insights.generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {insights && (
                <Button
                  variant="outline"
                  className="bg-indigo-600/15 text-indigo-400 border-indigo-500/30 hover:bg-indigo-600/25 transition-all text-xs"
                  onClick={handleDownloadPdf}
                  disabled={isDownloadingPdf || insightLoading}
                >
                  {isDownloadingPdf ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}>
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                    </motion.div>
                  ) : (
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  {isDownloadingPdf ? 'Generating PDF...' : 'Download PDF Dossier'}
                </Button>
              )}

              <Button
                variant="outline"
                className="bg-card border-border/50 text-foreground hover:bg-white/5 text-xs"
                onClick={handleGenerate}
                disabled={insightLoading || dataLoading}
              >
                {insightLoading ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  </motion.div>
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                )}
                {insightLoading ? 'Analyzing...' : 'Refresh Analysis'}
              </Button>
            </div>
          </div>
        )}

        {/* Live Execution Panel During Generation */}
        {insightLoading && (
          <AgentExecutionPanel
            pipelineState={pipelineState}
            isExecuting={insightLoading}
            hasCompleted={Boolean(insights)}
          />
        )}

        {/* Error Notification */}
        {error && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-red-500/30 bg-red-500/5 shadow-sm">
              <CardContent className="p-5 flex flex-col sm:flex-row items-center gap-4">
                <div className="p-3 rounded-full bg-red-500/10 flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h4 className="text-base font-bold text-red-400">Analysis Failed</h4>
                  <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{error}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" className="border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs" onClick={resetInsights}>
                    Clear
                  </Button>
                  <Button className="bg-red-500 hover:bg-red-600 text-white text-xs" onClick={handleGenerate}>
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Loading Skeletons */}
        {insightLoading && !insights && (
          <div className="space-y-6">
            <Card className="border-border/50">
              <CardContent className="p-6 h-[140px] flex items-center gap-6">
                <Skeleton className="w-24 h-24 rounded-full bg-white/5" />
                <div className="space-y-3 flex-1">
                  <Skeleton className="h-6 w-48 bg-white/5" />
                  <Skeleton className="h-4 w-full max-w-md bg-white/5" />
                </div>
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="border-border/50">
                  <CardContent className="p-6 h-[200px]">
                    <Skeleton className="h-full w-full bg-white/5" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Main V2 Intelligence Dashboard */}
        <AnimatePresence mode="popLayout">
          {displayInsights && !error && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6"
            >
              {/* 1. Health Score Banner (Computed Non-LLM Scoring Engine) */}
              <HealthScoreBanner
                breakdown={
                  displayInsights.portfolioHealthBreakdown || {
                    overall: displayInsights.health.score,
                    fundamental: 72,
                    technical: 50,
                    valuation: 70,
                    risk: 75,
                    diversification: displayInsights.diversification?.score || 65,
                    status: displayInsights.health.status,
                    summary: displayInsights.health.summary,
                  }
                }
                confidence={displayInsights.aiConfidence}
                weights={displayInsights.scoringWeights}
              />

              {/* 2. AI Executive Summary (3-5 items with [View Data] toggles) */}
              <ExecutiveSummaryCard
                insights={displayInsights.executiveSummaryInsights}
                summaryText={displayInsights.summary}
              />

              {/* 3. AI Review Flags (Color-coded 🔴 🟠 🟡 🟢) */}
              {displayInsights.reviewFlags && displayInsights.reviewFlags.length > 0 && (
                <ReviewFlagsCard flags={displayInsights.reviewFlags} />
              )}

              {/* 4. Section Navigation Tabs */}
              <SectionNav activeSection={activeSection} onSelectSection={setActiveSection} />

              {/* 5. Section Tab Panels */}

              {/* TAB: OVERVIEW (Comprehensive Curated View) */}
              {activeSection === 'overview' && (
                <div className="space-y-6 animate-fade-in-up">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <FundamentalIntelligenceCard data={displayInsights.fundamentalIntelligence} equity={equity} />
                    <TechnicalIntelligenceCard data={displayInsights.technicalIntelligence} />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ValuationIntelligenceCard data={displayInsights.valuationIntelligence} equity={equity} />
                    <RiskIntelligenceCard data={displayInsights.riskIntelligence} />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <OpportunitiesCard data={displayInsights.opportunities} />
                    <RisksCard data={displayInsights.risks} />
                  </div>

                  {displayInsights.recommendations && displayInsights.recommendations.length > 0 && (
                    <RecommendationsCard data={displayInsights.recommendations} />
                  )}
                </div>
              )}

              {/* TAB 1: FUNDAMENTAL */}
              {activeSection === 'fundamental' && (
                <div className="space-y-6 animate-fade-in-up">
                  <FundamentalIntelligenceCard data={displayInsights.fundamentalIntelligence} equity={equity} />
                </div>
              )}

              {/* TAB 2: TECHNICAL */}
              {activeSection === 'technical' && (
                <div className="space-y-6 animate-fade-in-up">
                  <TechnicalIntelligenceCard data={displayInsights.technicalIntelligence} />
                </div>
              )}

              {/* TAB 3: VALUATION */}
              {activeSection === 'valuation' && (
                <div className="space-y-6 animate-fade-in-up">
                  <ValuationIntelligenceCard data={displayInsights.valuationIntelligence} equity={equity} />
                </div>
              )}

              {/* TAB 4: RISK */}
              {activeSection === 'risk' && (
                <div className="space-y-6 animate-fade-in-up">
                  <RiskIntelligenceCard data={displayInsights.riskIntelligence} />
                  {displayInsights.diversification && (
                    <DiversificationCard data={displayInsights.diversification} />
                  )}
                </div>
              )}

              {/* TAB 5: PORTFOLIO */}
              {activeSection === 'portfolio' && (
                <div className="space-y-6 animate-fade-in-up">
                  <PortfolioIntelligenceCard data={displayInsights.portfolioIntelligence} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <AssetAllocationCard data={displayInsights.allocation} />
                    <CashFlowCard data={displayInsights.cashFlow} />
                  </div>
                </div>
              )}

              {/* TAB 6: MACRO */}
              {activeSection === 'macro' && (
                <div className="space-y-6 animate-fade-in-up">
                  <MacroIntelligenceCard data={displayInsights.macroIntelligence} />
                  {displayInsights.marketOutlook && (
                    <MarketOutlookCard data={displayInsights.marketOutlook} />
                  )}
                  {displayInsights.marketCondition && (
                    <MarketConditionCard data={displayInsights.marketCondition} />
                  )}
                </div>
              )}

              {/* TAB: MATRIX & THESIS MONITOR */}
              {activeSection === 'matrix_thesis' && (
                <div className="space-y-6 animate-fade-in-up">
                  <FundTechMatrix data={displayInsights.fundamentalTechnicalMatrix} />
                  <ThesisMonitorCard holdings={displayInsights.thesisMonitor} />
                  <PortfolioChangesCard data={displayInsights.portfolioChanges} />
                </div>
              )}

              {/* Long-Term Compounding Strategy (Always at bottom) */}
              {displayInsights.longTermStrategy && (
                <LongTermStrategyCard data={displayInsights.longTermStrategy} />
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </>
  );
}
