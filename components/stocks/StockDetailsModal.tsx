'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, ExternalLink, Check } from 'lucide-react';
import { useStockModal } from '@/lib/stock-modal-context';
import { useStockDetails } from '@/hooks/useStockDetails';
import type { TimeRange } from '@/hooks/useStockDetails';
import type { ChartType } from './ChartToolbar';
import { MarketHeader } from './MarketHeader';
import { StockChart } from './StockChart';
import { ChartToolbar } from './ChartToolbar';
import { MarketStats } from './MarketStats';
import { CompanyProfile } from './CompanyProfile';

export function StockDetailsModal() {
  const { activeSymbol, closeStock } = useStockModal();
  const [timeRange, setTimeRange] = useState<TimeRange>('1d');
  const [chartType, setChartType] = useState<ChartType>('area');
  const [copied, setCopied] = useState(false);

  const { quote, candles, profile, performance, isQuoteLoading, isHistoryLoading, isProfileLoading } = useStockDetails(
    activeSymbol,
    timeRange
  );

  // Close on Escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') closeStock();
  }, [closeStock]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Prevent body scroll when open and reset time range
  useEffect(() => {
    if (activeSymbol) {
      document.body.style.overflow = 'hidden';
      setTimeRange('1d');
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [activeSymbol]);

  const handleCopy = useCallback(async () => {
    if (!activeSymbol) return;
    await navigator.clipboard.writeText(activeSymbol);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [activeSymbol]);

  const yahooUrl = activeSymbol
    ? `https://finance.yahoo.com/quote/${activeSymbol}.NS`
    : '#';

  const perfKeyMap: Record<string, string> = {
    '1d': 'today', '5d': '1w', '1mo': '1mo', '3mo': '3mo',
    '6mo': '6mo', '1y': '1y', '3y': '3y', '5y': '5y', 'max': 'max'
  };
  const perfKey = timeRange ? perfKeyMap[timeRange] : 'today';
  const displayPct = performance ? (performance as Record<string, number | null>)[perfKey] : null;
  const isPositive = displayPct != null ? displayPct >= 0 : (quote?.regularMarketChange as number ?? 0) >= 0;

  return (
    <AnimatePresence>
      {activeSymbol && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={closeStock}
          />

          {/* Modal panel */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-[90vw] max-h-[95vh] flex flex-col"
            style={{ maxHeight: 'min(95vh, 900px)' }}
          >
            <div className="bg-[#0f172a] border border-border/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden">

              {/* Header bar */}
              <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4 border-b border-border/30 shrink-0">
                <MarketHeader
                  symbol={activeSymbol}
                  quote={quote as Record<string, unknown> | null}
                  performance={performance}
                  timeRange={timeRange}
                  isLoading={isQuoteLoading}
                />
                <button
                  onClick={closeStock}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all shrink-0 mt-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-5">

                {/* Chart toolbar + chart */}
                <div className="space-y-3">
                  <StockChart
                    candles={candles}
                    chartType={chartType}
                    timeRange={timeRange}
                    isLoading={isHistoryLoading}
                    isPositive={isPositive}
                  />
                  <ChartToolbar
                    chartType={chartType}
                    timeRange={timeRange}
                    onChartTypeChange={setChartType}
                    onTimeRangeChange={setTimeRange}
                    isLoading={isHistoryLoading}
                  />
                </div>

                {/* Market stats */}
                <MarketStats
                  quote={quote as Record<string, unknown> | null}
                  profile={profile as Record<string, unknown> | null}
                  isLoading={isQuoteLoading}
                />

                {/* Company profile */}
                <CompanyProfile
                  profile={profile as Record<string, unknown> | null}
                  isLoading={isProfileLoading}
                />
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-border/30 shrink-0 bg-white/[0.01]">
                <p className="text-xs text-muted-foreground/40">Data from Yahoo Finance · {activeSymbol}.NS</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 hover:bg-white/10 border border-border/30 text-muted-foreground hover:text-foreground transition-all"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied!' : 'Copy Symbol'}
                  </button>
                  <a
                    href={yahooUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 hover:text-indigo-200 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Yahoo Finance
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
