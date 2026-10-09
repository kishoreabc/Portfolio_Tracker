'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type {
  ValuationMetrics,
  ProfitabilityMetrics,
  SolvencyMetrics,
  EfficiencyMetrics,
  GrowthMetrics,
  ScreenerExtraRatios,
} from '@/types/research';
import { ResearchSection, DataStatusBanner } from './ResearchSection';
import { Info, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';

interface RatioRowProps {
  label: string;
  value: string | null | undefined;
  description?: string;
  isPositiveBetter?: boolean;
}

function RatioRow({ label, value, description }: RatioRowProps) {
  const isNA = value == null || value === 'N/A';
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0 group">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-sm text-muted-foreground truncate">{label}</span>
        {description && (
          <span title={description} className="cursor-help">
            <Info className="w-3 h-3 text-muted-foreground/40" />
          </span>
        )}
      </div>
      <span
        className={cn(
          'text-sm font-semibold ml-4 flex-shrink-0 tabular-nums',
          isNA ? 'text-muted-foreground/50' : 'text-foreground'
        )}
      >
        {value ?? 'N/A'}
      </span>
    </div>
  );
}

function RatioGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </div>
  );
}

function fmt(v: number | null | undefined, suffix = '', decimals = 2): string | null {
  if (v == null || !isFinite(v)) return null;
  return `${v.toFixed(decimals)}${suffix}`;
}

function fmtCurrency(v: number | null | undefined): string | null {
  if (v == null || !isFinite(v)) return null;
  return `₹ ${Math.round(v).toLocaleString('en-IN')}`;
}

interface ScreenerRatioItem {
  label: string;
  value: string;
  isNegative?: boolean;
  tooltip?: string;
}

interface RatiosSectionProps {
  valuation: ValuationMetrics | null;
  profitability: ProfitabilityMetrics | null;
  solvency: SolvencyMetrics | null;
  efficiency: EfficiencyMetrics | null;
  growth: GrowthMetrics | null;
  extraRatios?: ScreenerExtraRatios | null;
  isLoading: boolean;
}

export function RatiosSection({
  valuation,
  profitability,
  solvency,
  efficiency,
  growth,
  extraRatios,
  isLoading,
}: RatiosSectionProps) {
  // Construct the Screener 3-column top ratio grid (27 ratios)
  const screenerGrid = useMemo(() => {
    if (!extraRatios) return null;

    const r = extraRatios;

    const col1: ScreenerRatioItem[] = [
      {
        label: 'Market Cap',
        value: r.marketCap != null ? `₹ ${Math.round(r.marketCap).toLocaleString('en-IN')} Cr.` : 'N/A',
      },
      {
        label: 'Stock P/E',
        value: r.stockPe != null ? `${r.stockPe.toFixed(1)}` : 'N/A',
      },
      {
        label: 'ROCE',
        value: r.roce != null ? `${r.roce.toFixed(1)} %` : 'N/A',
      },
      {
        label: 'Return over 3years',
        value: r.returnOver3Years != null ? `${r.returnOver3Years > 0 ? '+' : ''}${r.returnOver3Years.toFixed(1)} %` : 'N/A',
        isNegative: r.returnOver3Years != null && r.returnOver3Years < 0,
      },
      {
        label: 'EPS',
        value: r.eps != null ? `₹ ${r.eps.toFixed(1)}` : 'N/A',
      },
      {
        label: 'PEG Ratio',
        value: r.pegRatio != null ? `${r.pegRatio.toFixed(2)}` : 'N/A',
      },
      {
        label: 'Reserves',
        value: r.reserves != null ? `₹ ${Math.round(r.reserves).toLocaleString('en-IN')} Cr.` : 'N/A',
      },
      {
        label: 'Debt to equity',
        value: r.debtToEquity != null ? `${r.debtToEquity.toFixed(2)}` : '0.00',
      },
      {
        label: 'Down from 52w high',
        value: r.downFrom52wHigh != null ? `${r.downFrom52wHigh.toFixed(1)} %` : 'N/A',
      },
    ];

    const col2: ScreenerRatioItem[] = [
      {
        label: 'Current Price',
        value: r.currentPrice != null ? `₹ ${Math.round(r.currentPrice).toLocaleString('en-IN')}` : 'N/A',
      },
      {
        label: 'Book Value',
        value: r.bookValue != null ? `₹ ${r.bookValue.toFixed(1)}` : 'N/A',
      },
      {
        label: 'ROE',
        value: r.roe != null ? `${r.roe.toFixed(1)} %` : 'N/A',
      },
      {
        label: 'ROE 5Yr',
        value: r.roe5Years != null ? `${r.roe5Years.toFixed(1)} %` : 'N/A',
      },
      {
        label: 'Promoter holding',
        value: r.promoterHolding != null ? `${r.promoterHolding.toFixed(2)} %` : '0.00 %',
      },
      {
        label: 'Sales growth',
        value: r.salesGrowth != null ? `${r.salesGrowth > 0 ? '+' : ''}${r.salesGrowth.toFixed(2)} %` : 'N/A',
        isNegative: r.salesGrowth != null && r.salesGrowth < 0,
      },
      {
        label: 'Sales growth 3Years',
        value: r.salesGrowth3Years != null ? `${r.salesGrowth3Years > 0 ? '+' : ''}${r.salesGrowth3Years.toFixed(2)} %` : 'N/A',
        isNegative: r.salesGrowth3Years != null && r.salesGrowth3Years < 0,
      },
      {
        label: 'Sales growth 5Years',
        value: r.salesGrowth5Years != null ? `${r.salesGrowth5Years > 0 ? '+' : ''}${r.salesGrowth5Years.toFixed(2)} %` : 'N/A',
        isNegative: r.salesGrowth5Years != null && r.salesGrowth5Years < 0,
      },
      {
        label: 'Qtr Sales Var',
        value: r.qtrSalesVar != null ? `${r.qtrSalesVar > 0 ? '+' : ''}${r.qtrSalesVar.toFixed(1)} %` : 'N/A',
        isNegative: r.qtrSalesVar != null && r.qtrSalesVar < 0,
      },
    ];

    const col3: ScreenerRatioItem[] = [
      {
        label: 'High / Low',
        value: r.highLow
          ? r.highLow
          : r.high != null && r.low != null
          ? `₹ ${Math.round(r.high)} / ${Math.round(r.low)}`
          : 'N/A',
      },
      {
        label: 'Dividend Yield',
        value: r.dividendYield != null ? `${r.dividendYield.toFixed(2)} %` : 'N/A',
      },
      {
        label: 'Face Value',
        value: r.faceValue != null ? `₹ ${r.faceValue.toFixed(2)}` : '₹ 1.00',
      },
      {
        label: 'CMP / FCF',
        value: r.cmpToFcf != null ? `${r.cmpToFcf.toFixed(1)}` : 'N/A',
      },
      {
        label: 'Pledged percentage',
        value: r.pledgedPercentage != null ? `${r.pledgedPercentage.toFixed(2)} %` : '0.00 %',
      },
      {
        label: 'Profit growth',
        value: r.profitGrowth != null ? `${r.profitGrowth > 0 ? '+' : ''}${r.profitGrowth.toFixed(2)} %` : 'N/A',
        isNegative: r.profitGrowth != null && r.profitGrowth < 0,
      },
      {
        label: 'Profit Var 3Yrs',
        value: r.profitVar3Years != null ? `${r.profitVar3Years > 0 ? '+' : ''}${r.profitVar3Years.toFixed(2)} %` : 'N/A',
        isNegative: r.profitVar3Years != null && r.profitVar3Years < 0,
      },
      {
        label: 'Profit Var 5Yrs',
        value: r.profitVar5Years != null ? `${r.profitVar5Years > 0 ? '+' : ''}${r.profitVar5Years.toFixed(2)} %` : 'N/A',
        isNegative: r.profitVar5Years != null && r.profitVar5Years < 0,
      },
      {
        label: 'Qtr Profit Var',
        value: r.qtrProfitVar != null ? `${r.qtrProfitVar > 0 ? '+' : ''}${r.qtrProfitVar.toFixed(1)} %` : 'N/A',
        isNegative: r.qtrProfitVar != null && r.qtrProfitVar < 0,
      },
    ];

    return { col1, col2, col3 };
  }, [extraRatios]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-6 animate-pulse">
          <div className="h-4 w-40 bg-white/10 rounded mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((col) => (
              <div key={col} className="space-y-3">
                {[1, 2, 3, 4, 5, 6].map((row) => (
                  <div key={row} className="h-4 bg-white/5 rounded" />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl bg-white/[0.03] border border-white/5 p-4 space-y-3">
              <div className="h-3 w-20 bg-white/5 rounded animate-pulse" />
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="flex justify-between">
                  <div className="h-4 w-28 bg-white/5 rounded animate-pulse" />
                  <div className="h-4 w-12 bg-white/5 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Resolved values for categorized cards
  const resolvedPb = extraRatios?.priceToBook ?? valuation?.pb;
  const resolvedPeg = extraRatios?.pegRatio ?? valuation?.pegRatio;
  const resolvedInterestCoverage = extraRatios?.interestCoverage ?? solvency?.interestCoverage;
  const resolvedDebtEquity = extraRatios?.debtToEquity ?? solvency?.debtToEquity;
  const resolvedSalesGrowth1Y = extraRatios?.salesGrowth ?? growth?.revenue?.oneYear;
  const resolvedSalesGrowth3Y = extraRatios?.salesGrowth3Years ?? growth?.revenue?.threeYear;
  const resolvedProfitGrowth1Y = extraRatios?.profitGrowth ?? growth?.profit?.oneYear;
  const resolvedProfitGrowth3Y = extraRatios?.profitVar3Years ?? growth?.profit?.threeYear;

  return (
    <div className="space-y-6">
      {/* ── Screener Top Ratios Card (27 Ratios Grid) ── */}
      {screenerGrid && (
        <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Key Financial Ratios
              </h3>
            </div>
           
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-0.5">
            {/* Column 1 */}
            <div className="space-y-0.5">
              {screenerGrid.col1.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] px-2 rounded-lg transition-colors"
                >
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span
                    className={cn(
                      'text-xs font-semibold tabular-nums text-right',
                      item.isNegative ? 'text-rose-400' : 'text-foreground'
                    )}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Column 2 */}
            <div className="space-y-0.5">
              {screenerGrid.col2.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] px-2 rounded-lg transition-colors"
                >
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span
                    className={cn(
                      'text-xs font-semibold tabular-nums text-right',
                      item.isNegative ? 'text-rose-400' : 'text-foreground'
                    )}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Column 3 */}
            <div className="space-y-0.5">
              {screenerGrid.col3.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] px-2 rounded-lg transition-colors"
                >
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span
                    className={cn(
                      'text-xs font-semibold tabular-nums text-right',
                      item.isNegative ? 'text-rose-400' : 'text-foreground'
                    )}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Categorized Detailed Ratios ── */}
      <ResearchSection
        title="Ratio Categories"
        id="ratios-detailed"
        description="Comprehensive valuation, profitability, solvency, and growth metrics."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Valuation */}
          <RatioGroup title="Valuation">
            <RatioRow
              label="P/E (Trailing)"
              value={fmt(extraRatios?.stockPe ?? valuation?.pe, 'x')}
              description="Price to trailing earnings"
            />
            <RatioRow
              label="P/E (Forward)"
              value={fmt(valuation?.forwardPe, 'x')}
              description="Price to forward earnings estimate"
            />
            <RatioRow
              label="P/B"
              value={fmt(resolvedPb, 'x')}
              description="Price to book value (Current Price / Book Value)"
            />
            <RatioRow
              label="EV/EBITDA"
              value={fmt(valuation?.evToEbitda, 'x')}
              description="Enterprise value to EBITDA"
            />
            <RatioRow
              label="EV/Sales"
              value={fmt(valuation?.evToSales, 'x')}
              description="Enterprise value to revenue"
            />
            <RatioRow
              label="Price/Sales"
              value={fmt(valuation?.priceSales, 'x')}
              description="Market cap to revenue"
            />
            <RatioRow
              label="PEG Ratio"
              value={fmt(resolvedPeg, 'x')}
              description="P/E relative to earnings growth"
            />
            <RatioRow
              label="Dividend Yield"
              value={fmt(extraRatios?.dividendYield ?? valuation?.dividendYield, '%')}
              description="Annual dividend / price"
            />
            {valuation?.meta && valuation.meta.status !== 'fresh' && (
              <DataStatusBanner {...valuation.meta} className="mt-2" />
            )}
          </RatioGroup>

          {/* Profitability */}
          <RatioGroup title="Profitability">
            <RatioRow
              label="ROE"
              value={fmt(extraRatios?.roe ?? profitability?.roe, '%')}
              description="Return on equity"
            />
            <RatioRow
              label="ROCE"
              value={fmt(extraRatios?.roce ?? profitability?.roce, '%')}
              description="Return on capital employed"
            />
            <RatioRow
              label="ROA"
              value={fmt(extraRatios?.roa ?? profitability?.roa, '%')}
              description="Return on assets"
            />
            <RatioRow
              label="Gross Margin"
              value={fmt(profitability?.grossMargin, '%')}
              description="Gross profit / revenue"
            />
            <RatioRow
              label="Operating Margin"
              value={fmt(profitability?.operatingMargin, '%')}
              description="Operating profit / revenue"
            />
            <RatioRow
              label="Net Margin"
              value={fmt(profitability?.netMargin, '%')}
              description="Net profit / revenue"
            />
            {profitability?.meta && profitability.meta.status !== 'fresh' && (
              <DataStatusBanner {...profitability.meta} className="mt-2" />
            )}
          </RatioGroup>

          {/* Solvency */}
          <RatioGroup title="Solvency & Leverage">
            <RatioRow
              label="Debt / Equity"
              value={fmt(resolvedDebtEquity, 'x')}
              description="Total debt to shareholder equity"
            />
            <RatioRow
              label="Net Debt / EBITDA"
              value={fmt(extraRatios?.netDebtToEbitda ?? solvency?.netDebtToEbitda, 'x')}
              description="Net debt to EBITDA"
            />
            <RatioRow
              label="Interest Coverage"
              value={fmt(resolvedInterestCoverage, 'x')}
              description="EBIT / interest expense"
            />
            <RatioRow
              label="Current Ratio"
              value={fmt(extraRatios?.currentRatio ?? solvency?.currentRatio, 'x')}
              description="Current assets / current liabilities"
            />
            <RatioRow
              label="Quick Ratio"
              value={fmt(extraRatios?.quickRatio ?? solvency?.quickRatio, 'x')}
              description="Liquid assets / current liabilities"
            />
            {solvency?.meta && solvency.meta.status !== 'fresh' && (
              <DataStatusBanner {...solvency.meta} className="mt-2" />
            )}
          </RatioGroup>

          {/* Growth */}
          <RatioGroup title="Growth (CAGR)">
            <p className="text-xs text-muted-foreground/60 mb-2">
              Multi-year compounded annualized growth rates derived from financial statements.
            </p>
            <RatioRow
              label="Revenue Growth (1Y)"
              value={fmt(resolvedSalesGrowth1Y, '%')}
              description="1-year sales growth"
            />
            <RatioRow
              label="Revenue Growth (3Y)"
              value={fmt(resolvedSalesGrowth3Y, '%')}
              description="3-year compounded sales growth"
            />
            <RatioRow
              label="Revenue Growth (5Y)"
              value={fmt(extraRatios?.salesGrowth5Years, '%')}
              description="5-year compounded sales growth"
            />
            <RatioRow
              label="Profit Growth (1Y)"
              value={fmt(resolvedProfitGrowth1Y, '%')}
              description="1-year profit growth"
            />
            <RatioRow
              label="Profit Growth (3Y)"
              value={fmt(resolvedProfitGrowth3Y, '%')}
              description="3-year compounded profit growth"
            />
            <RatioRow
              label="Profit Growth (5Y)"
              value={fmt(extraRatios?.profitVar5Years, '%')}
              description="5-year compounded profit growth"
            />
            {growth?.meta && growth.meta.status !== 'fresh' && (
              <DataStatusBanner {...growth.meta} className="mt-2" />
            )}
          </RatioGroup>
        </div>
      </ResearchSection>
    </div>
  );
}
