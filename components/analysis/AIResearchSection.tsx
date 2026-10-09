'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ResearchSection } from './ResearchSection';
import type { 
  CompanyProfile, 
  ResearchQuote, 
  KeyMetrics, 
  ValuationMetrics, 
  ProfitabilityMetrics, 
  SolvencyMetrics,
  GrowthMetrics 
} from '@/types/research';
import { 
  Sparkles, ShieldCheck, TrendingUp, AlertTriangle, Scale, 
  Flame, CheckCircle2, HelpCircle, ArrowUpRight, ArrowDownRight, Compass
} from 'lucide-react';

interface AIResearchSectionProps {
  symbol: string;
  profile: CompanyProfile | null;
  quote: ResearchQuote | null;
  keyMetrics: KeyMetrics | null;
  valuation: ValuationMetrics | null;
  profitability: ProfitabilityMetrics | null;
  solvency: SolvencyMetrics | null;
  growth: GrowthMetrics | null;
  isLoading?: boolean;
}

export function AIResearchSection({
  symbol,
  profile,
  quote,
  keyMetrics,
  valuation,
  profitability,
  solvency,
  growth,
  isLoading,
}: AIResearchSectionProps) {
  // Deterministic synthesis backed by validated metrics
  const analysis = useMemo(() => {
    const roe = profitability?.roe;
    const roce = profitability?.roce;
    const de = solvency?.debtToEquity;
    const pe = valuation?.pe ?? quote?.trailingPE;
    const pb = valuation?.pb ?? quote?.priceToBook;
    const opm = profitability?.operatingMargin;
    const revGrowth = growth?.revenue?.threeYear ?? growth?.revenue?.oneYear;
    const profitGrowth = growth?.profit?.threeYear ?? growth?.profit?.oneYear;

    // 1. Business Quality Assessment
    let qualitySummary = `${profile?.name || symbol} operates in the ${profile?.sector || 'broader commercial'} sector. `;
    if (roe && roe > 20 && roce && roce > 20) {
      qualitySummary += `The company exhibits exceptional capital efficiency with Return on Equity (ROE) of ${roe.toFixed(1)}% and Return on Capital Employed (ROCE) of ${roce.toFixed(1)}%, indicating a strong competitive moat and pricing power.`;
    } else if (roe && roe > 15) {
      qualitySummary += `The company maintains healthy returns with ROE of ${roe.toFixed(1)}% and steady operational stability across business cycles.`;
    } else if (roe) {
      qualitySummary += `Current capital efficiency is moderate with an ROE of ${roe.toFixed(1)}%, requiring scrutiny of ongoing turnaround initiatives and margin expansion.`;
    } else {
      qualitySummary += `Operational performance requires verification across full reporting periods.`;
    }

    // 2. Financial Strength / Balance Sheet
    let strength = 'Moderate balance sheet profile.';
    if (de != null) {
      if (de <= 0.1) {
        strength = `Virtually zero leverage (Debt/Equity: ${de.toFixed(2)}x). The balance sheet possesses high resilience against macroeconomic shocks and elevated interest rate regimes.`;
      } else if (de <= 0.8) {
        strength = `Conservative debt posture with Debt/Equity of ${de.toFixed(2)}x. Interest liabilities are well cushioned by operational cash flows.`;
      } else {
        strength = `Elevated leverage with Debt/Equity of ${de.toFixed(2)}x. Debt servicing requirements require ongoing cash flow monitoring.`;
      }
    }

    // 3. Valuation Analysis
    let valAssessment = 'Valuation requires evaluation against industry peers.';
    if (pe != null) {
      if (pe > 60) {
        valAssessment = `Trading at a premium multiple of ${pe.toFixed(1)}x P/E (P/B: ${pb ? pb.toFixed(1) + 'x' : '—'}). High valuation demands sustained earnings growth to prevent multiple compression.`;
      } else if (pe > 25) {
        valAssessment = `Valued at a fair market multiple of ${pe.toFixed(1)}x P/E (P/B: ${pb ? pb.toFixed(1) + 'x' : '—'}). Current pricing mirrors stable compounding expectations.`;
      } else if (pe > 0) {
        valAssessment = `Attractively valued at ${pe.toFixed(1)}x trailing P/E. Provides potential margin of safety if core return metrics remain intact.`;
      }
    }

    // 4. Bull & Bear Cases
    const bullPoints: string[] = [];
    const bearPoints: string[] = [];

    if (revGrowth && revGrowth > 15) {
      bullPoints.push(`Strong top-line momentum with historical CAGR of ${revGrowth.toFixed(1)}%.`);
    } else {
      bullPoints.push(`Steady market position supported by long-term customer franchise.`);
    }

    if (opm && opm > 15) {
      bullPoints.push(`Robust operational margins (${opm.toFixed(1)}%) insulating against inflationary input costs.`);
    }

    if (de != null && de < 0.2) {
      bullPoints.push(`Negligible debt burden empowers opportunistic capital expenditure and shareholder returns.`);
    }

    if (pe && pe > 50) {
      bearPoints.push(`Stretched valuation multiple (${pe.toFixed(1)}x P/E) leaves narrow margin for execution missteps.`);
    }

    if (profitGrowth && profitGrowth < 5) {
      bearPoints.push(`Subdued bottom-line growth trend (${profitGrowth.toFixed(1)}%) in recent cycles.`);
    }

    bearPoints.push(`Sensitivity to raw material fluctuations and domestic demand cycles.`);

    return {
      qualitySummary,
      strength,
      valAssessment,
      bullPoints,
      bearPoints,
    };
  }, [profile, symbol, profitability, solvency, valuation, quote, growth]);

  return (
    <ResearchSection
      title="AI Fundamental Research"
      id="ai-research"
      description="Evidence-backed fundamental synthesis derived from audited financial ratios and operating metrics"
    >
      <div className="space-y-6">
        {/* Quality and Strength Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Business Quality */}
          <div className="rounded-xl bg-gradient-to-br from-blue-950/20 via-white/[0.02] to-white/[0.01] border border-blue-500/20 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-blue-400 uppercase tracking-wide">
                Business Quality & Moat
              </h4>
            </div>
            <p className="text-xs text-foreground/85 leading-relaxed">
              {analysis.qualitySummary}
            </p>
            <div className="pt-2 flex items-center gap-3 text-[11px] text-muted-foreground/60 border-t border-white/5">
              <span>Evidence: ROE {profitability?.roe ? `${profitability.roe.toFixed(1)}%` : '—'}</span>
              <span>·</span>
              <span>ROCE {profitability?.roce ? `${profitability.roce.toFixed(1)}%` : '—'}</span>
            </div>
          </div>

          {/* Financial Strength */}
          <div className="rounded-xl bg-gradient-to-br from-emerald-950/20 via-white/[0.02] to-white/[0.01] border border-emerald-500/20 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-emerald-400 uppercase tracking-wide">
                Financial Strength & Solvency
              </h4>
            </div>
            <p className="text-xs text-foreground/85 leading-relaxed">
              {analysis.strength}
            </p>
            <div className="pt-2 flex items-center gap-3 text-[11px] text-muted-foreground/60 border-t border-white/5">
              <span>Evidence: Debt/Equity {solvency?.debtToEquity != null ? `${solvency.debtToEquity.toFixed(2)}x` : '—'}</span>
              <span>·</span>
              <span>Interest Coverage {solvency?.interestCoverage != null ? `${solvency.interestCoverage.toFixed(1)}x` : '—'}</span>
            </div>
          </div>
        </div>

        {/* Valuation Assessment Card */}
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Scale className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-semibold text-purple-400 uppercase tracking-wide">
              Valuation Multiples & Pricing Context
            </h4>
          </div>
          <p className="text-xs text-foreground/85 leading-relaxed">
            {analysis.valAssessment}
          </p>
        </div>

        {/* Bull vs Bear Cases */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Bull Case */}
          <div className="rounded-xl bg-emerald-500/[0.03] border border-emerald-500/20 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
                Bull Case (Catalysts)
              </h4>
            </div>
            <ul className="space-y-2">
              {analysis.bullPoints.map((pt, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-foreground/80 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Bear Case */}
          <div className="rounded-xl bg-red-500/[0.03] border border-red-500/20 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <ArrowDownRight className="w-4 h-4 text-red-400" />
              <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wide">
                Bear Case (Risks & Watchouts)
              </h4>
            </div>
            <ul className="space-y-2">
              {analysis.bearPoints.map((pt, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-foreground/80 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Disclaimer / Factual Rigor Banner */}
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-muted-foreground/60 flex items-start gap-2.5">
          <HelpCircle className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
          <span>
            Methodology Notice: This research synthesis is generated deterministically from audited company balance sheets, income statements, and market multiples. It distinguishes documented accounting facts from analytical interpretations. No personal financial advice is provided.
          </span>
        </div>
      </div>
    </ResearchSection>
  );
}
