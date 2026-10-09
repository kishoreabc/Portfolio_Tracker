'use client';

import { useState, useCallback } from 'react';
import { useResearch } from '@/hooks/useResearch';
import { CompanyHeaderSection } from '@/components/analysis/CompanyHeader';
import { ResearchTabs, type ResearchTabId } from '@/components/analysis/ResearchTabs';
import { OverviewSection } from '@/components/analysis/OverviewSection';
import { FinancialsSection } from '@/components/analysis/FinancialsSection';
import { ShareholdingSection } from '@/components/analysis/ShareholdingSection';
import { SegmentsSection } from '@/components/analysis/SegmentsSection';
import { PeerComparisonSection } from '@/components/analysis/PeerComparison';
import { CorporateActionsSection } from '@/components/analysis/CorporateActionsSection';
import { DocumentsSection } from '@/components/analysis/DocumentsSection';
import { AIResearchSection } from '@/components/analysis/AIResearchSection';
import { ResearchSection, ResearchErrorState } from '@/components/analysis/ResearchSection';
import { StockSearchBar } from '@/components/analysis/StockSearch';
import { ArrowLeft, RefreshCw, ExternalLink, Newspaper } from 'lucide-react';
import Link from 'next/link';

interface Props {
  symbol: string;
}

export function ResearchPageClient({ symbol }: Props) {
  const [activeTab, setActiveTab] = useState<ResearchTabId>('overview');
  const { data, isLoading, error, refetch, isFetching } = useResearch(symbol);

  const handleRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  const profile = data?.company ?? null;
  const quote = data?.quote ?? null;
  const keyMetrics = data?.keyMetrics ?? null;
  const valuation = data?.valuation ?? null;
  const profitability = data?.profitability ?? null;
  const solvency = data?.solvency ?? null;
  const efficiency = data?.efficiency ?? null;
  const growth = data?.growth ?? null;
  const peers = data?.peers ?? null;
  const shareholding = data?.shareholding ?? null;
  const corporateActions = data?.corporateActions ?? null;
  const documents = data?.documents ?? null;

  return (
    <div className="min-h-screen p-3 sm:p-4 md:p-6 max-w-7xl mx-auto">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/stock-analysis"
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Stock Research</span>
          </Link>
          <span className="text-white/20 hidden sm:inline">/</span>
          <span className="text-sm font-mono font-semibold text-blue-400 truncate">{symbol}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <StockSearchBar />
          </div>
          <button
            onClick={handleRefetch}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && !isLoading && (
        <div className="mb-4">
          <ResearchErrorState message={error.message || 'Failed to load research data.'} />
        </div>
      )}

      {/* Company Header */}
      <CompanyHeaderSection
        symbol={symbol}
        profile={profile}
        quote={quote}
        keyMetrics={keyMetrics}
        isLoading={isLoading}
      />

      {/* Navigation Tabs */}
      <div className="mt-4">
        <ResearchTabs activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Tab content */}
      <div className="mt-6 space-y-8 pb-16 animate-fade-in-up">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <OverviewSection
            quote={quote}
            keyMetrics={keyMetrics}
            valuation={valuation}
            profitability={profitability}
            solvency={solvency}
            efficiency={efficiency}
            growth={growth}
            extraRatios={data?.extraRatios}
            profile={profile}
            pros={data?.pros}
            cons={data?.cons}
            isLoading={isLoading}
          />
        )}

        {/* FINANCIALS TAB */}
        {activeTab === 'financials' && (
          <FinancialsSection
            quarterly={data?.quarterlyFinancials}
            annual={data?.annualFinancials}
            balanceSheet={data?.balanceSheet}
            cashFlow={data?.cashFlow}
            growth={growth}
            isLoading={isLoading}
          />
        )}

        {/* SHAREHOLDING TAB */}
        {activeTab === 'shareholding' && (
          <ShareholdingSection shareholding={shareholding} isLoading={isLoading} />
        )}

        {/* SEGMENTS TAB */}
        {activeTab === 'segments' && (
          <SegmentsSection
            symbol={symbol}
            keyPoints={data?.keyPoints}
            annualFinancials={data?.annualFinancials}
            quarterlyFinancials={data?.quarterlyFinancials}
            isLoading={isLoading}
          />
        )}

        {/* PEERS TAB */}
        {activeTab === 'peers' && (
          <PeerComparisonSection currentSymbol={symbol} peers={peers} isLoading={isLoading} />
        )}

        {/* CORPORATE ACTIONS TAB */}
        {activeTab === 'corporate-actions' && (
          <CorporateActionsSection corporateActions={corporateActions} isLoading={isLoading} />
        )}

        {/* DOCUMENTS TAB */}
        {activeTab === 'documents' && (
          <DocumentsSection documents={documents} isLoading={isLoading} />
        )}

        {/* NEWS TAB */}
        {activeTab === 'news' && (
          <ResearchSection
            title="Company News"
            id="news"
            description="Company-specific market news and disclosures"
          >
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-6 text-center py-10 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
                <Newspaper className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h4 className="text-sm font-semibold text-foreground">
                  Browse {profile?.name || symbol} Headlines
                </h4>
                <p className="text-xs text-muted-foreground">
                  Live market headlines, quarterly filing announcements, and analyst commentaries filtered for {symbol}.
                </p>
              </div>
              <div>
                <Link
                  href={`/news?search=${encodeURIComponent(symbol)}`}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-sm shadow-blue-500/25"
                >
                  Open News Center for {symbol}
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </ResearchSection>
        )}

        {/* AI RESEARCH TAB */}
        {activeTab === 'ai-research' && (
          <AIResearchSection
            symbol={symbol}
            profile={profile}
            quote={quote}
            keyMetrics={keyMetrics}
            valuation={valuation}
            profitability={profitability}
            solvency={solvency}
            growth={growth}
            isLoading={isLoading}
          />
        )}

        {/* Data attribution & compliance note */}
        {data && (
          <div className="text-[11px] text-muted-foreground/50 pt-4 border-t border-white/5 space-y-1">
            <p>
              Data Source: {data.company?.meta?.source || 'Yahoo Finance & Verified Disclosures'} · Refresh: {new Date(data.fetchedAt).toLocaleString('en-IN')}
            </p>
            <p>
              Audited quarterly figures, annual statements, shareholding distributions, and regulatory documents are presented strictly for informational and investment research purposes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
