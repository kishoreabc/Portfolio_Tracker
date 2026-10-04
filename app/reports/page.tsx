'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Topbar } from '@/components/layout/Topbar';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Download, FileText, FileSpreadsheet, BarChart3,
  TrendingUp, Shield, Sparkles, BookOpen, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { usePrivacy, PRIVACY_MASK } from '@/lib/privacy-context';

// ─── Formatters ─────────────────────────────────────────────────────────────

function fmt(v: number, isHidden: boolean = false) {
  if (isHidden) return PRIVACY_MASK;
  if (typeof v !== 'number' || isNaN(v)) return '₹0.00';
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  return '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pct(v: number) {
  if (typeof v !== 'number' || isNaN(v)) return '0.00%';
  if (Math.abs(v) <= 1 && v !== 0) {
    return `${(v * 100).toFixed(2)}%`;
  }
  return `${v.toFixed(2)}%`;
}

function calcWeightPct(value: number, total: number): string {
  if (typeof value !== 'number' || isNaN(value) || total <= 0) return '0.00%';
  return `${((value / total) * 100).toFixed(2)}%`;
}

function exportCSVText(csvContent: string, filename: string) {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCSV(rows: object[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.map((h) => (h.includes(',') ? `"${h}"` : h)).join(','),
    ...rows.map((row) =>
      headers.map((h) => {
        const val = (row as Record<string, unknown>)[h];
        const s = String(val ?? '');
        return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(',')
    ),
  ].join('\n');
  exportCSVText(csvContent, filename);
}

// ─── Types ───────────────────────────────────────────────────────────────────

type ExportState = { id: string; format: 'csv' | 'pdf' } | null;
type Notification = { id: string; type: 'success' | 'error'; message: string } | null;

// ─── Report Card ─────────────────────────────────────────────────────────────

interface ReportCardProps {
  id: string;
  icon: React.ElementType;
  iconColor: string;
  gradient: string;
  border: string;
  hoverBorder: string;
  glow: string;
  title: string;
  description: string;
  count: number;
  unit: string;
  delay?: number;
  exporting: ExportState;
  hasCsv?: boolean;
  hasPdf?: boolean;
  onExportCsv?: () => void;
  onExportPdf?: () => void;
  isLoading: boolean;
}

function ReportCard({
  id, icon: Icon, iconColor, gradient, border, hoverBorder, glow,
  title, description, count, unit, delay = 0, exporting,
  hasCsv = true, hasPdf = true, onExportCsv, onExportPdf, isLoading,
}: ReportCardProps) {
  const isExportingCsv = exporting?.id === id && exporting?.format === 'csv';
  const isExportingPdf = exporting?.id === id && exporting?.format === 'pdf';
  const isAnyExporting = isExportingCsv || isExportingPdf;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="h-full">
      <Card className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 hover:scale-[1.01] hover:shadow-xl text-white h-full flex flex-col justify-between shadow-md ${gradient} ${border} ${hoverBorder} ${glow}`}>
        {/* Decorative organic background watermarks */}
        <div aria-hidden="true" className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-white/[0.05] pointer-events-none blur-sm" />
        <div aria-hidden="true" className="absolute right-10 top-0 w-16 h-16 rounded-full bg-white/[0.04] pointer-events-none blur-md" />

        <div>
          <div className="flex items-start gap-4 mb-3 z-10 relative">
            {/* Circular white icon badge */}
            <div className={`w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center shrink-0 ${iconColor}`}>
              <Icon className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-extrabold text-white leading-tight drop-shadow-xs">{title}</CardTitle>
              <p className="text-xs text-white/80 mt-1.5 leading-relaxed font-normal">{description}</p>
            </div>
          </div>
        </div>

        <div className="pt-3 mt-3 border-t border-white/15 flex items-center justify-between gap-3 z-10 relative">
          <span className="text-xs text-white/90 font-medium">
            {isLoading ? (
              <Skeleton className="h-4 w-16 bg-white/20" />
            ) : count > 0 ? (
              <span>
                <span className="font-extrabold text-white text-sm">{count}</span> {unit}
              </span>
            ) : (
              'No data'
            )}
          </span>
          <div className="flex items-center gap-2">
            {hasCsv && (
              <button
                id={`export-csv-${id}`}
                onClick={onExportCsv}
                disabled={isAnyExporting || count === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/15 text-white border border-white/25 hover:bg-white/25 transition-all shadow-xs backdrop-blur-xs disabled:opacity-40 disabled:cursor-not-allowed"
                title="Export as CSV"
              >
                {isExportingCsv ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}>
                    <Download className="w-3.5 h-3.5" />
                  </motion.div>
                ) : (
                  <FileSpreadsheet className="w-3.5 h-3.5 stroke-[2.2]" />
                )}
                CSV
              </button>
            )}
            {hasPdf && (
              <button
                id={`export-pdf-${id}`}
                onClick={onExportPdf}
                disabled={isAnyExporting || count === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/20 text-white border border-white/30 hover:bg-white/30 transition-all shadow-xs backdrop-blur-xs disabled:opacity-40 disabled:cursor-not-allowed"
                title="Export as PDF"
              >
                {isExportingPdf ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}>
                    <Download className="w-3.5 h-3.5" />
                  </motion.div>
                ) : (
                  <FileText className="w-3.5 h-3.5 stroke-[2.2]" />
                )}
                PDF
              </button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { portfolio, equity, bonds, cashFlowStats, concentrationRisk, isLoading, lastFetched, apiErrors, netWorth, equityTotal, bondTotal } = usePortfolioData();
  const { isHidden } = usePrivacy();
  const [exporting, setExporting] = useState<ExportState>(null);
  const [notification, setNotification] = useState<Notification>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    const id = Date.now().toString();
    setNotification({ id, type, message });
    setTimeout(() => setNotification((n) => n?.id === id ? null : n), 4000);
  };

  const handleExportCsv = async (type: string) => {
    setExporting({ id: type, format: 'csv' });
    await new Promise((r) => setTimeout(r, 300));
    try {
      if (type === 'portfolio') {
        const totalShares = equity.reduce((s, h) => s + h.shares, 0);
        const totalBondUnits = bonds.reduce((s, b) => s + b.unitsHeld, 0);

        const stockHeaders = ['Ticker', 'Company Name', 'Sector', 'Shares', 'Price (INR)', 'Holding Value (INR)', 'Portfolio %', 'Day Return %'];
        const stockRows = equity.map((h) => [
          h.ticker,
          `"${h.name.replace(/"/g, '""')}"`,
          `"${h.sector}"`,
          String(h.shares),
          h.currentPrice.toFixed(2),
          h.currentValue.toFixed(2),
          calcWeightPct(h.currentValue, netWorth),
          `${h.percentChange >= 0 ? '+' : ''}${pct(h.percentChange)}`,
        ]);
        const stockTotalRow = ['TOTAL EQUITY', `"${equity.length} Stocks"`, '', String(totalShares), '', equityTotal.toFixed(2), calcWeightPct(equityTotal, netWorth), ''];

        const bondHeaders = ['ISIN', 'Security / Issuer Name', 'Rating', 'Sector', 'Coupon Rate %', 'YTM %', 'Duration', 'Units Held', 'Holding Value (INR)', 'Portfolio %'];
        const bondRows = bonds.map((b) => [
          b.isin,
          `"${b.securityName.replace(/"/g, '""')}"`,
          `"${b.creditRating || 'NR'}"`,
          `"${b.sector}"`,
          pct(b.couponRate),
          pct(b.ytm),
          `"${b.duration} Months"`,
          String(b.unitsHeld),
          b.totalValue.toFixed(2),
          calcWeightPct(b.totalValue, netWorth),
        ]);
        const bondTotalRow = ['TOTAL BONDS', `"${bonds.length} Bonds"`, '', '', '', '', '', String(totalBondUnits), bondTotal.toFixed(2), calcWeightPct(bondTotal, netWorth)];

        const lines = [
          `"FULL PORTFOLIO INTELLIGENCE REPORT"`,
          `"Generated: ${new Date().toLocaleDateString('en-IN')} | Total Net Worth: INR ${netWorth.toFixed(2)} | Equity: INR ${equityTotal.toFixed(2)} (${calcWeightPct(equityTotal, netWorth)}) | Bonds: INR ${bondTotal.toFixed(2)} (${calcWeightPct(bondTotal, netWorth)})"`,
          '',
          `"1. EQUITY HOLDINGS (${equity.length} Stocks - Total: INR ${equityTotal.toFixed(2)})"`,
          stockHeaders.join(','),
          ...stockRows.map((r) => r.join(',')),
          stockTotalRow.join(','),
          '',
          '',
          `"2. FIXED INCOME & BOND HOLDINGS (${bonds.length} Bonds - Total: INR ${bondTotal.toFixed(2)})"`,
          bondHeaders.join(','),
          ...bondRows.map((r) => r.join(',')),
          bondTotalRow.join(','),
        ];

        exportCSVText(lines.join('\n'), `portfolio_${new Date().toISOString().slice(0, 10)}.csv`);
      } else if (type === 'equity') {
        exportCSV(equity.map((h) => ({
          Ticker: h.ticker,
          Name: h.name,
          Sector: h.sector,
          'Current Price (INR)': h.currentPrice.toFixed(2),
          'Price Change (INR)': h.priceChange.toFixed(2),
          'Day Return %': `${h.percentChange >= 0 ? '+' : ''}${pct(h.percentChange)}`,
          Shares: h.shares,
          'Holding Value (INR)': h.currentValue.toFixed(2),
          'Portfolio Weight %': calcWeightPct(h.currentValue, equityTotal),
        })), `equity_${new Date().toISOString().slice(0, 10)}.csv`);
      } else if (type === 'bonds') {
        exportCSV(bonds.map((b) => ({
          Issuer: b.issuer,
          'Security Name': b.securityName,
          ISIN: b.isin,
          Sector: b.sector,
          'Credit Rating': b.creditRating || 'NR',
          'Maturity Date': b.maturityDate ?? 'N/A',
          Duration: `${b.duration} Months`,
          'Coupon Rate %': pct(b.couponRate),
          'YTM %': pct(b.ytm),
          'Units Held': b.unitsHeld,
          'Total Value (INR)': b.totalValue.toFixed(2),
          'Portfolio Weight %': calcWeightPct(b.totalValue, bondTotal),
        })), `bonds_${new Date().toISOString().slice(0, 10)}.csv`);
      } else if (type === 'cashflow') {
        exportCSV(cashFlowStats.monthlySummaries.map((m) => ({
          Month: m.label,
          'Investment (INR)': m.investment.toFixed(2),
          'Food & Entertainment (INR)': m.foodAndEntertainment.toFixed(2),
          'Others (INR)': m.others.toFixed(2),
          'Total Expenses (INR)': m.totalExpenses.toFixed(2),
          'Net Surplus (INR)': (m.investment - m.totalExpenses).toFixed(2),
        })), `cashflow_${new Date().toISOString().slice(0, 10)}.csv`);
      }
      showNotification('success', `${type} CSV exported successfully`);
    } catch {
      showNotification('error', 'CSV export failed');
    } finally {
      setExporting(null);
    }
  };

  const handleExportPdf = async (type: string) => {
    setExporting({ id: type, format: 'pdf' });
    try {
      const payload: any = { reportType: type };

      if (type === 'ai') {
        let aiInsights = null;
        try {
          const saved = localStorage.getItem('portfolio_ai_insights_data');
          if (saved) aiInsights = JSON.parse(saved);
        } catch {}

        if (!aiInsights) {
          const res = await fetch('/api/insights');
          const data = await res.json();
          if (data?.insights) aiInsights = data.insights;
        }

        if (!aiInsights) {
          showNotification('error', 'Please generate an AI Insights report on the AI Insights page first.');
          return;
        }

        payload.insights = aiInsights;
      }

      const res = await fetch('/api/reports/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'PDF generation failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `${type === 'ai' ? 'ai-intelligence' : type}-report-${dateStr}.pdf`;
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);
      showNotification('success', `${type === 'ai' ? 'AI Intelligence' : type} PDF downloaded`);
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'PDF export failed');
    } finally {
      setExporting(null);
    }
  };

  const statsItems = [
    {
      label: 'Net Worth',
      value: fmt(netWorth, isHidden),
      gradient: 'bg-gradient-to-br from-[#312e81] via-[#1e1b4b] to-[#0f172a]',
      border: 'border-indigo-600/60 hover:border-indigo-400 hover:shadow-indigo-900/40',
      labelColor: 'text-indigo-200',
    },
    {
      label: 'Equity',
      value: fmt(equityTotal, isHidden),
      gradient: 'bg-gradient-to-br from-[#1e3a8a] via-[#172554] to-[#0c1322]',
      border: 'border-blue-600/60 hover:border-blue-400 hover:shadow-blue-900/40',
      labelColor: 'text-blue-200',
    },
    {
      label: 'Bonds',
      value: fmt(bondTotal, isHidden),
      gradient: 'bg-gradient-to-br from-[#581c87] via-[#3b0764] to-[#1c0638]',
      border: 'border-purple-600/60 hover:border-purple-400 hover:shadow-purple-900/40',
      labelColor: 'text-purple-200',
    },
    {
      label: 'Holdings',
      value: String(portfolio.length),
      gradient: 'bg-gradient-to-br from-[#0e7490] via-[#155e75] to-[#083344]',
      border: 'border-cyan-600/60 hover:border-cyan-400 hover:shadow-cyan-900/40',
      labelColor: 'text-cyan-200',
    },
    {
      label: 'Diversification',
      value: `${concentrationRisk.diversificationScore}/100`,
      gradient: 'bg-gradient-to-br from-[#0f766e] via-[#115e59] to-[#042f2e]',
      border: 'border-teal-600/60 hover:border-teal-400 hover:shadow-teal-900/40',
      labelColor: 'text-teal-200',
    },
    {
      label: 'Top-5 Conc.',
      value: pct(concentrationRisk.top5Percent),
      gradient: 'bg-gradient-to-br from-[#78350f] via-[#592607] to-[#291002]',
      border: 'border-amber-600/60 hover:border-amber-400 hover:shadow-amber-900/40',
      labelColor: 'text-amber-200',
    },
  ];

  const reports = [
    {
      id: 'portfolio',
      icon: BookOpen,
      iconColor: 'text-[#312e81]',
      gradient: 'bg-gradient-to-br from-[#1e1b4b] via-[#1e293b] to-[#0f172a]',
      border: 'border-indigo-600/60',
      hoverBorder: 'hover:border-indigo-400',
      glow: 'hover:shadow-indigo-900/50',
      title: 'Full Portfolio Report',
      description: 'All equity and bond holdings with allocation, YTM, credit rating, and sector breakdown.',
      count: portfolio.length,
      unit: 'holdings',
      hasCsv: true,
      hasPdf: true,
    },
    {
      id: 'equity',
      icon: TrendingUp,
      iconColor: 'text-[#1e3a8a]',
      gradient: 'bg-gradient-to-br from-[#1e3a8a] via-[#172554] to-[#0c1322]',
      border: 'border-blue-600/60',
      hoverBorder: 'hover:border-blue-400',
      glow: 'hover:shadow-blue-900/50',
      title: 'Equity Holdings',
      description: 'All stock positions with current price, day change, shares, value, and sector.',
      count: equity.length,
      unit: 'stocks',
      hasCsv: true,
      hasPdf: true,
    },
    {
      id: 'bonds',
      icon: BarChart3,
      iconColor: 'text-[#581c87]',
      gradient: 'bg-gradient-to-br from-[#581c87] via-[#3b0764] to-[#1c0638]',
      border: 'border-purple-600/60',
      hoverBorder: 'hover:border-purple-400',
      glow: 'hover:shadow-purple-900/50',
      title: 'Bond Holdings',
      description: 'All bond positions with ISIN, maturity, YTM, coupon rate, credit rating, and broker.',
      count: bonds.length,
      unit: 'bonds',
      hasCsv: true,
      hasPdf: true,
    },
    {
      id: 'cashflow',
      icon: FileSpreadsheet,
      iconColor: 'text-[#0f766e]',
      gradient: 'bg-gradient-to-br from-[#0f766e] via-[#115e59] to-[#042f2e]',
      border: 'border-teal-600/60',
      hoverBorder: 'hover:border-teal-400',
      glow: 'hover:shadow-teal-900/50',
      title: 'Monthly Cash Flow',
      description: 'Month-by-month breakdown of investments and expenses from your transactions.',
      count: cashFlowStats.monthlySummaries.length,
      unit: 'months',
      hasCsv: true,
      hasPdf: true,
    },
    {
      id: 'risk',
      icon: Shield,
      iconColor: 'text-[#78350f]',
      gradient: 'bg-gradient-to-br from-[#78350f] via-[#592607] to-[#291002]',
      border: 'border-amber-600/60',
      hoverBorder: 'hover:border-amber-400',
      glow: 'hover:shadow-amber-900/50',
      title: 'Risk & Diversification',
      description: 'Concentration analysis, sector distribution, HHI index, and top 10 holdings by weight.',
      count: portfolio.length,
      unit: 'holdings',
      hasCsv: false,
      hasPdf: true,
    },
    {
      id: 'ai',
      icon: Sparkles,
      iconColor: 'text-[#881337]',
      gradient: 'bg-gradient-to-br from-[#881337] via-[#5c0d24] to-[#2e040f]',
      border: 'border-rose-600/60',
      hoverBorder: 'hover:border-rose-400',
      glow: 'hover:shadow-rose-900/50',
      title: 'AI Intelligence Report',
      description: 'Complete SEBI-grade AI report with health scores, macro scenarios, opportunities, and roadmaps.',
      count: 1,
      unit: 'report',
      hasCsv: false,
      hasPdf: true,
    },
  ];

  return (
    <>
      <Topbar lastFetched={lastFetched} pageTitle="Reports" apiErrors={apiErrors} />
      <div className="p-3 sm:p-4 md:p-6 space-y-6 animate-fade-in-up">

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {statsItems.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className={`relative overflow-hidden rounded-2xl border p-4 text-white shadow-md transition-all duration-300 hover:scale-[1.02] ${stat.gradient} ${stat.border}`}>
                <div aria-hidden="true" className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full bg-white/[0.04] pointer-events-none blur-sm" />
                <p className={`text-[11px] font-bold uppercase tracking-wider ${stat.labelColor}`}>{stat.label}</p>
                {isLoading ? (
                  <Skeleton className="h-6 mt-1.5 bg-white/20 rounded" />
                ) : (
                  <p className="text-xl sm:text-2xl font-extrabold tabular-nums tracking-tight text-white mt-1 drop-shadow-xs">{stat.value}</p>
                )}
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Report cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report, i) => (
            <ReportCard
              key={report.id}
              {...report}
              delay={i * 0.07}
              exporting={exporting}
              isLoading={isLoading}
              onExportCsv={() => handleExportCsv(report.id)}
              onExportPdf={() => handleExportPdf(report.id)}
            />
          ))}
        </div>

        {/* Notification toast */}
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium ${
              notification.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300'
                : 'bg-red-950/90 border-red-500/30 text-red-300'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            {notification.message}
          </motion.div>
        )}

      </div>
    </>
  );
}
