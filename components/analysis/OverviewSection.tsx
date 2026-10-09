'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Building2,
  Globe,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  FileText,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  SlidersHorizontal,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  CompanyProfile,
  ResearchQuote,
  KeyMetrics,
  ValuationMetrics,
  ProfitabilityMetrics,
  SolvencyMetrics,
  EfficiencyMetrics,
  GrowthMetrics,
  ScreenerExtraRatios,
} from '@/types/research';

interface RatioRowProps {
  label: string;
  value: string | null | undefined;
  description?: string;
}

function RatioRow({ label, value, description }: RatioRowProps) {
  const isNA = value == null || value === 'N/A';
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 group">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-xs text-muted-foreground truncate">{label}</span>
        {description && (
          <span title={description} className="cursor-help">
            <Info className="w-3 h-3 text-muted-foreground/40" />
          </span>
        )}
      </div>
      <span
        className={cn(
          'text-xs font-semibold ml-4 flex-shrink-0 tabular-nums',
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
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">{title}</h3>
      {children}
    </div>
  );
}

function fmt(v: number | null | undefined, suffix = '', decimals = 2): string | null {
  if (v == null || !isFinite(v)) return null;
  return `${v.toFixed(decimals)}${suffix}`;
}

interface KeyRatioCell {
  label: string;
  value: string;
  isNegative?: boolean;
}

interface OverviewSectionProps {
  quote: ResearchQuote | null;
  keyMetrics: KeyMetrics | null;
  valuation: ValuationMetrics | null;
  profitability: ProfitabilityMetrics | null;
  solvency: SolvencyMetrics | null;
  efficiency?: EfficiencyMetrics | null;
  growth?: GrowthMetrics | null;
  extraRatios?: ScreenerExtraRatios | null;
  profile: CompanyProfile | null;
  pros?: string[];
  cons?: string[];
  isLoading: boolean;
}

export function OverviewSection({
  quote,
  keyMetrics,
  valuation,
  profitability,
  solvency,
  efficiency,
  growth,
  extraRatios,
  profile,
  pros: externalPros,
  cons: externalCons,
  isLoading,
}: OverviewSectionProps) {
  const [isReadMoreOpen, setIsReadMoreOpen] = useState(false);
  const [showDetailedRatios, setShowDetailedRatios] = useState(false);

  // Close modal on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsReadMoreOpen(false);
    };
    if (isReadMoreOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReadMoreOpen]);

  // Derive automated Pros and Cons based on financial ratios as fallback
  const { pros: derivedPros, cons: derivedCons } = useMemo(() => {
    const p: string[] = [];
    const c: string[] = [];

    if (profitability?.roe && profitability.roe > 20) {
      p.push(`Company has a strong return on equity (ROE) track record: ${profitability.roe.toFixed(1)}%`);
    } else if (profitability?.roe && profitability.roe < 10) {
      c.push(`Subdued return on equity (ROE) of ${profitability.roe.toFixed(1)}%`);
    }

    if (profitability?.roce && profitability.roce > 20) {
      p.push(`High Return on Capital Employed (ROCE): ${profitability.roce.toFixed(1)}%`);
    }

    if (solvency?.debtToEquity != null) {
      if (solvency.debtToEquity < 0.1) {
        p.push('Company is virtually debt free');
      } else if (solvency.debtToEquity > 1.5) {
        c.push(`High debt-to-equity ratio of ${solvency.debtToEquity.toFixed(2)}x`);
      }
    }

    if (valuation?.dividendYield && valuation.dividendYield > 1.5) {
      p.push(`Healthy dividend yield of ${valuation.dividendYield.toFixed(2)}%`);
    }

    if (valuation?.pe && valuation.pe > 60) {
      c.push(`Stock is trading at a high valuation multiple of ${valuation.pe.toFixed(1)}x P/E`);
    } else if (valuation?.pe && valuation.pe > 0 && valuation.pe < 15) {
      p.push(`Attractive valuation: Trading at ${valuation.pe.toFixed(1)}x P/E`);
    }

    if (valuation?.pb && valuation.pb > 10) {
      c.push(`Stock is trading at ${valuation.pb.toFixed(1)} times its book value`);
    }

    if (solvency?.interestCoverage && solvency.interestCoverage > 5) {
      p.push(`Comfortable interest coverage ratio: ${solvency.interestCoverage.toFixed(1)}x`);
    }

    if (profitability?.operatingMargin && profitability.operatingMargin > 15) {
      p.push(`Robust operating margin of ${profitability.operatingMargin.toFixed(1)}%`);
    }

    // Fallbacks if data points are few
    if (p.length === 0) {
      p.push('Company maintains regular compliance filings and active market liquidity');
    }
    if (c.length === 0) {
      c.push('Requires monitoring for industry margin cycles and competitive pressures');
    }

    return { pros: p, cons: c };
  }, [profitability, solvency, valuation]);

  const pros = externalPros && externalPros.length > 0 ? externalPros : derivedPros;
  const cons = externalCons && externalCons.length > 0 ? externalCons : derivedCons;

  // Build the exact 9-row by 3-column Screener Key Ratios grid
  const keyRatioRows = useMemo<KeyRatioCell[][]>(() => {
    const r = extraRatios;

    // 1. Market Cap
    let mktCapStr = 'N/A';
    if (r?.marketCap != null) {
      mktCapStr = `₹ ${Math.round(r.marketCap).toLocaleString('en-IN')} Cr.`;
    } else if (keyMetrics?.marketCap != null) {
      mktCapStr = `₹ ${Math.round(keyMetrics.marketCap / 1e7).toLocaleString('en-IN')} Cr.`;
    } else if (quote?.marketCap != null) {
      mktCapStr = `₹ ${Math.round(quote.marketCap / 1e7).toLocaleString('en-IN')} Cr.`;
    }

    // 2. Current Price
    let priceStr = 'N/A';
    const curPrice = r?.currentPrice ?? quote?.price;
    if (curPrice != null) {
      priceStr = `₹ ${Math.round(curPrice).toLocaleString('en-IN')}`;
    }

    // 3. High / Low
    let highLowStr = 'N/A';
    if (r?.highLow) {
      highLowStr = r.highLow.startsWith('₹') ? r.highLow : `₹ ${r.highLow}`;
    } else if (r?.high != null && r?.low != null) {
      highLowStr = `₹ ${Math.round(r.high)} / ${Math.round(r.low)}`;
    } else if (quote?.week52High != null && quote?.week52Low != null) {
      highLowStr = `₹ ${Math.round(quote.week52High)} / ${Math.round(quote.week52Low)}`;
    }

    // 4. Stock P/E
    const peVal = r?.stockPe ?? valuation?.pe ?? quote?.trailingPE;
    const peStr = peVal != null ? peVal.toFixed(1) : 'N/A';

    // 5. Book Value
    const bvVal = r?.bookValue ?? keyMetrics?.bookValue ?? (curPrice && valuation?.pb ? curPrice / valuation.pb : null);
    const bvStr = bvVal != null ? `₹ ${bvVal.toFixed(1)}` : 'N/A';

    // 6. Dividend Yield
    const divVal = r?.dividendYield ?? valuation?.dividendYield ?? quote?.dividendYield;
    const divStr = divVal != null ? `${divVal.toFixed(2)} %` : 'N/A';

    // 7. ROCE
    const roceVal = r?.roce ?? profitability?.roce;
    const roceStr = roceVal != null ? `${roceVal.toFixed(1)} %` : 'N/A';

    // 8. ROE
    const roeVal = r?.roe ?? profitability?.roe;
    const roeStr = roeVal != null ? `${roeVal.toFixed(1)} %` : 'N/A';

    // 9. Face Value
    const fvVal = r?.faceValue ?? keyMetrics?.faceValue ?? 1.0;
    const fvStr = fvVal != null ? `₹ ${fvVal.toFixed(2)}` : '₹ 1.00';

    // 10. Return over 3years
    const ret3Val = r?.returnOver3Years;
    const ret3Str = ret3Val != null ? `${ret3Val.toFixed(1)} %` : 'N/A';

    // 11. ROE 5Yr
    const roe5Val = r?.roe5Years ?? (profitability?.roe != null ? profitability.roe : null);
    const roe5Str = roe5Val != null ? `${roe5Val.toFixed(1)} %` : 'N/A';

    // 12. CMP / FCF
    const cmpFcfVal = r?.cmpToFcf ?? keyMetrics?.cmpToFcf;
    const cmpFcfStr = cmpFcfVal != null ? cmpFcfVal.toFixed(1) : 'N/A';

    // 13. EPS
    const epsVal = r?.eps ?? keyMetrics?.eps ?? quote?.trailingEps;
    const epsStr = epsVal != null ? `₹ ${epsVal.toFixed(1)}` : 'N/A';

    // 14. Promoter holding
    const promVal = r?.promoterHolding ?? 0.0;
    const promStr = `${promVal.toFixed(2)} %`;

    // 15. Pledged percentage
    const pledVal = r?.pledgedPercentage ?? 0.0;
    const pledStr = `${pledVal.toFixed(2)} %`;

    // 16. PEG Ratio
    const pegVal = r?.pegRatio ?? valuation?.pegRatio ?? keyMetrics?.pegRatio;
    const pegStr = pegVal != null ? pegVal.toFixed(2) : 'N/A';

    // 17. Sales growth
    const sgVal = r?.salesGrowth ?? growth?.revenue?.oneYear;
    const sgStr = sgVal != null ? `${sgVal.toFixed(2)} %` : 'N/A';

    // 18. Profit growth
    const pgVal = r?.profitGrowth ?? growth?.profit?.oneYear;
    const pgStr = pgVal != null ? `${pgVal.toFixed(2)} %` : 'N/A';

    // 19. Reserves
    let resStr = 'N/A';
    if (r?.reserves != null) {
      resStr = `₹ ${Math.round(r.reserves).toLocaleString('en-IN')} Cr.`;
    }

    // 20. Sales growth 3Years
    const sg3Val = r?.salesGrowth3Years ?? growth?.revenue?.threeYear;
    const sg3Str = sg3Val != null ? `${sg3Val.toFixed(2)} %` : 'N/A';

    // 21. Profit Var 3Yrs
    const pv3Val = r?.profitVar3Years ?? growth?.profit?.threeYear;
    const pv3Str = pv3Val != null ? `${pv3Val.toFixed(2)} %` : 'N/A';

    // 22. Debt to equity
    const deVal = r?.debtToEquity ?? solvency?.debtToEquity;
    const deStr = deVal != null ? deVal.toFixed(2) : '0.00';

    // 23. Sales growth 5Years
    const sg5Val = r?.salesGrowth5Years ?? growth?.revenue?.fiveYear;
    const sg5Str = sg5Val != null ? `${sg5Val.toFixed(2)} %` : 'N/A';

    // 24. Profit Var 5Yrs
    const pv5Val = r?.profitVar5Years ?? growth?.profit?.fiveYear;
    const pv5Str = pv5Val != null ? `${pv5Val.toFixed(2)} %` : 'N/A';

    // 25. Down from 52w high
    let downVal = r?.downFrom52wHigh ?? keyMetrics?.downFrom52wHigh;
    if (downVal == null && quote?.week52High && quote?.price) {
      downVal = ((quote.week52High - quote.price) / quote.week52High) * 100;
    }
    const downStr = downVal != null ? `${downVal.toFixed(1)} %` : 'N/A';

    // 26. Qtr Sales Var
    const qsvVal = r?.qtrSalesVar;
    const qsvStr = qsvVal != null ? `${qsvVal.toFixed(1)} %` : 'N/A';

    // 27. Qtr Profit Var
    const qpvVal = r?.qtrProfitVar;
    const qpvStr = qpvVal != null ? `${qpvVal.toFixed(1)} %` : 'N/A';

    return [
      // Row 1
      [
        { label: 'Market Cap', value: mktCapStr },
        { label: 'Current Price', value: priceStr },
        { label: 'High / Low', value: highLowStr },
      ],
      // Row 2 (striped)
      [
        { label: 'Stock P/E', value: peStr },
        { label: 'Book Value', value: bvStr },
        { label: 'Dividend Yield', value: divStr },
      ],
      // Row 3
      [
        { label: 'ROCE', value: roceStr },
        { label: 'ROE', value: roeStr },
        { label: 'Face Value', value: fvStr },
      ],
      // Row 4 (striped)
      [
        { label: 'Return over 3years', value: ret3Str, isNegative: ret3Val != null && ret3Val < 0 },
        { label: 'ROE 5Yr', value: roe5Str },
        { label: 'CMP / FCF', value: cmpFcfStr },
      ],
      // Row 5
      [
        { label: 'EPS', value: epsStr },
        { label: 'Promoter holding', value: promStr },
        { label: 'Pledged percentage', value: pledStr },
      ],
      // Row 6 (striped)
      [
        { label: 'PEG Ratio', value: pegStr },
        { label: 'Sales growth', value: sgStr, isNegative: sgVal != null && sgVal < 0 },
        { label: 'Profit growth', value: pgStr, isNegative: pgVal != null && pgVal < 0 },
      ],
      // Row 7
      [
        { label: 'Reserves', value: resStr },
        { label: 'Sales growth 3Years', value: sg3Str, isNegative: sg3Val != null && sg3Val < 0 },
        { label: 'Profit Var 3Yrs', value: pv3Str, isNegative: pv3Val != null && pv3Val < 0 },
      ],
      // Row 8 (striped)
      [
        { label: 'Debt to equity', value: deStr },
        { label: 'Sales growth 5Years', value: sg5Str, isNegative: sg5Val != null && sg5Val < 0 },
        { label: 'Profit Var 5Yrs', value: pv5Str, isNegative: pv5Val != null && pv5Val < 0 },
      ],
      // Row 9
      [
        { label: 'Down from 52w high', value: downStr },
        { label: 'Qtr Sales Var', value: qsvStr, isNegative: qsvVal != null && qsvVal < 0 },
        { label: 'Qtr Profit Var', value: qpvStr, isNegative: qpvVal != null && qpvVal < 0 },
      ],
    ];
  }, [extraRatios, keyMetrics, quote, valuation, profitability, solvency, growth]);

  // Resolved values for optional detailed ratio cards
  const resolvedPe = extraRatios?.stockPe ?? valuation?.pe ?? quote?.trailingPE;
  const resolvedPb = extraRatios?.priceToBook ?? valuation?.pb;
  const resolvedPeg = extraRatios?.pegRatio ?? valuation?.pegRatio;
  const resolvedDivYield = extraRatios?.dividendYield ?? valuation?.dividendYield ?? quote?.dividendYield;
  const resolvedRoe = extraRatios?.roe ?? profitability?.roe;
  const resolvedRoce = extraRatios?.roce ?? profitability?.roce;
  const resolvedRoa = extraRatios?.roa ?? profitability?.roa;
  const resolvedInterestCoverage = extraRatios?.interestCoverage ?? solvency?.interestCoverage;
  const resolvedDebtEquity = extraRatios?.debtToEquity ?? solvency?.debtToEquity;
  const resolvedNetDebtEbitda = extraRatios?.netDebtToEbitda ?? solvency?.netDebtToEbitda;
  const resolvedCurrentRatio = extraRatios?.currentRatio ?? solvency?.currentRatio;
  const resolvedQuickRatio = extraRatios?.quickRatio ?? solvency?.quickRatio;
  const resolvedSalesGrowth1Y = extraRatios?.salesGrowth ?? growth?.revenue?.oneYear;
  const resolvedSalesGrowth3Y = extraRatios?.salesGrowth3Years ?? growth?.revenue?.threeYear;
  const resolvedProfitGrowth1Y = extraRatios?.profitGrowth ?? growth?.profit?.oneYear;
  const resolvedProfitGrowth3Y = extraRatios?.profitVar3Years ?? growth?.profit?.threeYear;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-5 animate-pulse">
          <div className="h-4 w-32 bg-white/10 rounded mb-3" />
          <div className="h-3 w-full bg-white/5 rounded mb-2" />
          <div className="h-3 w-3/4 bg-white/5 rounded" />
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-2 animate-pulse">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="h-8 bg-white/5 rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const keyPoints = profile?.keyPoints;
  const quickLinks = profile?.quickLinks ?? [];

  // Default quick links if none provided
  const resolvedQuickLinks =
    quickLinks.length > 0
      ? quickLinks
      : [
          ...(profile?.website ? [{ label: 'Website', url: profile.website }] : []),
          ...(profile?.symbol
            ? [
                {
                  label: 'BSE',
                  url: `https://www.bseindia.com/stock-share-price/${encodeURIComponent(profile.symbol)}/`,
                },
                {
                  label: 'NSE',
                  url: `https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(profile.symbol)}`,
                },
                {
                  label: 'F&O',
                  url: `https://www.nseindia.com/get-quotes/derivatives?symbol=${encodeURIComponent(profile.symbol)}`,
                },
              ]
            : []),
        ];

  return (
    <div className="space-y-6">
      {/* ── About the Company & Key Points ── */}
      {profile?.description && (
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-5 shadow-sm">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            About the Company
          </h3>

          <p className="text-sm text-foreground/90 leading-relaxed">
            {profile.description}
            {profile.aboutCitations && profile.aboutCitations.length > 0 && (
              <span className="inline-flex items-center gap-1 ml-1.5 align-super text-[10px]">
                {profile.aboutCitations.map((c) => (
                  <a
                    key={c.id}
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 hover:underline font-mono"
                    title={`Source [${c.id}]`}
                  >
                    [{c.id}]
                  </a>
                ))}
              </span>
            )}
          </p>

          {/* ── KEY POINTS (Screener Commentary) ── */}
          {keyPoints && (
            <div className="mt-4 pt-4 border-t border-white/5">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Key Points
              </h4>

              <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3.5">
                <div className="text-sm text-foreground/90 leading-relaxed font-normal">
                  <span className="font-semibold text-foreground">
                    {(keyPoints.text.split('\n\n')[0] || keyPoints.text).replace(/\s*\[\d+\]\s*/g, '')}
                  </span>
                  {keyPoints.citations.length > 0 && (
                    <span className="inline-flex items-center gap-1 ml-1.5 align-super text-[10px]">
                      {keyPoints.citations.slice(0, 3).map((c) => (
                        <a
                          key={c.id}
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 hover:underline font-mono"
                          title="Official BSE / Exchange Filing"
                        >
                          [{c.id}]
                        </a>
                      ))}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsReadMoreOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-3 py-1.5 rounded-lg transition-all group"
                  >
                    <span>
                      Read More {keyPoints.citations.length > 0 ? `(${keyPoints.citations.length} Sources & Detailed Segments)` : ''}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {keyPoints.citations.slice(0, 3).map((c) => (
                    <a
                      key={c.id}
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-blue-400 bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-md border border-white/5 transition-colors"
                    >
                      <FileText className="w-3 h-3" />
                      <span>Filing [{c.id}]</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </a>
                  ))}
                  {keyPoints.citations.length > 3 && (
                    <span className="text-[11px] text-muted-foreground/60 px-1">
                      +{keyPoints.citations.length - 3} more filings
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Quick Links (Website, BSE, NSE, F&O) ── */}
          {resolvedQuickLinks.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-white/5">
              {resolvedQuickLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/80 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 rounded-lg border border-white/10 transition-colors"
                >
                  {link.label === 'Website' ? (
                    <Globe className="w-3.5 h-3.5 text-blue-400" />
                  ) : link.label === 'F&O' ? (
                    <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                  <span>{link.label}</span>
                </a>
              ))}
              {profile.sector && (
                <span className="ml-auto text-xs text-muted-foreground">
                  Sector: <span className="text-foreground font-medium">{profile.sector}</span>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Screener Key Ratios (3-Columned Table Matching Screener) ── */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 sm:p-5 shadow-sm overflow-x-auto scrollbar-none">
        <div className="min-w-[620px] md:min-w-0 space-y-1">
          {keyRatioRows.map((row, rIdx) => (
            <div key={rIdx} className="grid grid-cols-3 gap-x-4 sm:gap-x-6 gap-y-1">
              {row.map((cell) => (
                <div
                  key={cell.label}
                  className={cn(
                    'flex items-center justify-between px-3.5 py-2 rounded-lg text-xs sm:text-sm transition-colors',
                    rIdx % 2 === 1 ? 'bg-white/[0.035]' : 'bg-transparent',
                    'hover:bg-white/[0.06]'
                  )}
                >
                  <span className="text-muted-foreground font-normal">{cell.label}</span>
                  <span
                    className={cn(
                      'font-semibold tabular-nums text-right ml-2',
                      cell.isNegative ? 'text-rose-400' : 'text-foreground'
                    )}
                  >
                    {cell.value}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Pros & Cons (Screener-style Strengths / Limitations) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pros */}
        <div className="rounded-xl bg-emerald-500/[0.04] border border-emerald-500/20 p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wide">
              Key Strengths (Pros)
            </h3>
          </div>
          <ul className="space-y-2.5">
            {pros.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-foreground/80 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Cons */}
        <div className="rounded-xl bg-amber-500/[0.04] border border-amber-500/20 p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wide">
              Limitations & Watchouts (Cons)
            </h3>
          </div>
          <ul className="space-y-2.5">
            {cons.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-foreground/80 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Expandable Detailed Financial Ratios ── */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowDetailedRatios(!showDetailedRatios)}
          className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 text-muted-foreground hover:text-foreground transition-all group"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              {showDetailedRatios
                ? 'Hide Detailed Financial Ratios'
                : 'Detailed Financial Ratios (Valuation, Efficiency, Solvency, Growth)'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-blue-400 group-hover:text-blue-300">
            <span>{showDetailedRatios ? 'Hide' : 'Expand'}</span>
            {showDetailedRatios ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showDetailedRatios && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 animate-fade-in">
            {/* Valuation Multiples */}
            <RatioGroup title="Valuation Multiples">
              <RatioRow
                label="P/E Ratio"
                value={fmt(resolvedPe, 'x')}
                description="Price to Earnings: Share price divided by EPS"
              />
              <RatioRow
                label="Forward P/E"
                value={fmt(valuation?.forwardPe, 'x')}
                description="Projected Price to Earnings multiple"
              />
              <RatioRow
                label="Price to Book (P/B)"
                value={fmt(resolvedPb, 'x')}
                description="Market price divided by book value per share"
              />
              <RatioRow
                label="EV / EBITDA"
                value={fmt(valuation?.evToEbitda, 'x')}
                description="Enterprise Value to EBITDA multiple"
              />
              <RatioRow
                label="EV / Sales"
                value={fmt(valuation?.evToSales, 'x')}
                description="Enterprise Value to Annual Sales"
              />
              <RatioRow
                label="Price to Sales"
                value={fmt(valuation?.priceSales, 'x')}
                description="Market capitalization divided by total revenue"
              />
              <RatioRow
                label="PEG Ratio"
                value={fmt(resolvedPeg, 'x')}
                description="P/E ratio divided by earnings growth rate"
              />
              <RatioRow
                label="Dividend Yield"
                value={fmt(resolvedDivYield, '%')}
                description="Annual dividend per share divided by stock price"
              />
            </RatioGroup>

            {/* Profitability & Returns */}
            <RatioGroup title="Profitability & Returns">
              <RatioRow
                label="Return on Equity (ROE)"
                value={fmt(resolvedRoe, '%')}
                description="Net Income as a percentage of shareholders equity"
              />
              <RatioRow
                label="ROCE"
                value={fmt(resolvedRoce, '%')}
                description="Return on Capital Employed: EBIT divided by capital employed"
              />
              <RatioRow
                label="Return on Assets (ROA)"
                value={fmt(resolvedRoa, '%')}
                description="Net income generated per unit of total assets"
              />
              <RatioRow
                label="Operating Margin"
                value={fmt(profitability?.operatingMargin, '%')}
                description="Operating income as a percentage of revenue"
              />
              <RatioRow
                label="Net Profit Margin"
                value={fmt(profitability?.netMargin, '%')}
                description="Net profit after tax as a percentage of revenue"
              />
              <RatioRow
                label="Gross Margin"
                value={fmt(profitability?.grossMargin, '%')}
                description="Gross profit as a percentage of revenue"
              />
            </RatioGroup>

            {/* Solvency & Financial Health */}
            <RatioGroup title="Solvency & Financial Health">
              <RatioRow
                label="Debt to Equity"
                value={fmt(resolvedDebtEquity, 'x')}
                description="Total debt divided by total shareholders equity"
              />
              <RatioRow
                label="Interest Coverage"
                value={fmt(resolvedInterestCoverage, 'x')}
                description="EBIT divided by interest expenses"
              />
              <RatioRow
                label="Net Debt / EBITDA"
                value={fmt(resolvedNetDebtEbitda, 'x')}
                description="Net debt divided by operating EBITDA"
              />
              <RatioRow
                label="Current Ratio"
                value={fmt(resolvedCurrentRatio, 'x')}
                description="Current assets divided by current liabilities"
              />
              <RatioRow
                label="Quick Ratio"
                value={fmt(resolvedQuickRatio, 'x')}
                description="Liquid assets divided by current liabilities"
              />
            </RatioGroup>

            {/* Efficiency & Working Capital */}
            <RatioGroup title="Efficiency & Working Capital">
              <RatioRow
                label="Asset Turnover"
                value={fmt(efficiency?.assetTurnover, 'x')}
                description="Revenue generated per rupee of assets"
              />
              <RatioRow
                label="Inventory Days"
                value={fmt(efficiency?.inventoryDays, ' days', 0)}
                description="Average days to turn inventory into sales"
              />
              <RatioRow
                label="Debtor Days"
                value={fmt(efficiency?.receivableDays, ' days', 0)}
                description="Average days to collect cash from credit sales"
              />
              <RatioRow
                label="Days Payable"
                value={fmt(efficiency?.payableDays, ' days', 0)}
                description="Average days taken to pay trade creditors"
              />
              <RatioRow
                label="Cash Conversion Cycle"
                value={fmt(efficiency?.cashConversionCycle, ' days', 0)}
                description="Days from cash outlay for materials to cash received from sales"
              />
            </RatioGroup>

            {/* Growth Trajectory */}
            <RatioGroup title="Growth Trajectory">
              <RatioRow
                label="Revenue Growth (1Y)"
                value={fmt(resolvedSalesGrowth1Y, '%')}
                description="One year revenue compound growth"
              />
              <RatioRow
                label="Revenue Growth (3Y)"
                value={fmt(resolvedSalesGrowth3Y, '%')}
                description="Three year revenue compound annual growth rate (CAGR)"
              />
              <RatioRow
                label="Revenue Growth (5Y)"
                value={fmt(extraRatios?.salesGrowth5Years ?? growth?.revenue?.fiveYear, '%')}
                description="Five year revenue compound annual growth rate (CAGR)"
              />
              <RatioRow
                label="Profit Growth (1Y)"
                value={fmt(resolvedProfitGrowth1Y, '%')}
                description="One year net profit growth rate"
              />
              <RatioRow
                label="Profit Growth (3Y)"
                value={fmt(resolvedProfitGrowth3Y, '%')}
                description="Three year net profit compound annual growth rate"
              />
              <RatioRow
                label="Profit Growth (5Y)"
                value={fmt(extraRatios?.profitVar5Years ?? growth?.profit?.fiveYear, '%')}
                description="Five year net profit compound annual growth rate"
              />
              <RatioRow
                label="EPS Growth (3Y)"
                value={fmt(growth?.eps?.threeYear, '%')}
                description="Three year compound EPS growth rate"
              />
            </RatioGroup>
          </div>
        )}
      </div>

      {/* ── Read More Modal Dialog ── */}
      {isReadMoreOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div
            className="relative w-full max-w-3xl bg-[#0f172a] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-foreground">
                    {profile?.name}
                  </h3>
                  <span className="text-xs font-mono font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md">
                    {profile?.symbol}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Comprehensive Business Segments, Operational Research & Regulatory Filings
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsReadMoreOpen(false)}
                className="p-1.5 text-muted-foreground hover:text-foreground bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* About Section */}
            {(profile?.description || profile?.aboutHtml) && (
              <div className="space-y-2.5 pb-4 border-b border-white/5">
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>About</span>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-sm text-foreground/90 leading-relaxed font-normal">
                  <span>{profile.description}</span>
                  {profile.aboutCitations && profile.aboutCitations.length > 0 && (
                    <span className="inline-flex items-center gap-1 ml-1.5 align-super text-[10px]">
                      {profile.aboutCitations.map((c) => (
                        <a
                          key={c.id}
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 hover:underline font-mono"
                          title="Official Citation"
                        >
                          [{c.id}]
                        </a>
                      ))}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Modal Content: Key Points & Segments */}
            {keyPoints && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  <span>Key Points & Research Notes</span>
                </div>
                {keyPoints.html ? (
                  <div
                    className="p-5 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-foreground/90 leading-relaxed font-normal"
                    dangerouslySetInnerHTML={{ __html: keyPoints.html }}
                  />
                ) : (
                  <div className="p-5 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-foreground/90 leading-relaxed whitespace-pre-line font-normal space-y-3">
                    {keyPoints.text}
                  </div>
                )}
              </div>
            )}

            {/* Official Source Filings / PDF Citations */}
            {keyPoints && keyPoints.citations.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider">
                    <FileText className="w-4 h-4" />
                    <span>Official Regulatory Filings & Sources ({keyPoints.citations.length})</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                  {keyPoints.citations.map((c) => (
                    <a
                      key={c.id}
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2.5 rounded-xl bg-blue-500/[0.03] hover:bg-blue-500/[0.08] border border-blue-500/15 transition-all group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-md bg-blue-500/10 text-blue-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                          {c.id}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-foreground group-hover:text-blue-400 transition-colors truncate">
                            {c.url.includes('bseindia')
                              ? 'BSE Official Corporate Filing (PDF)'
                              : c.url.includes('icra')
                              ? 'ICRA Credit Rating Rationale'
                              : c.url.includes('crisil')
                              ? 'CRISIL Rating Report'
                              : c.url.includes('itcportal')
                              ? 'ITC Corporate Profile & Annual Report'
                              : 'Corporate Regulatory Disclosure & Report'}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate font-mono">
                            {c.url}
                          </div>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-blue-400 shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                Source: Screener.in & Official Stock Exchange Filings
              </span>
              <button
                type="button"
                onClick={() => setIsReadMoreOpen(false)}
                className="px-4 py-2 text-xs font-semibold bg-white/10 hover:bg-white/15 text-foreground rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
