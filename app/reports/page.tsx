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

// ─── Formatters ─────────────────────────────────────────────────────────────

function fmt(v: number) {
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
  iconBg: string;
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
  id, icon: Icon, iconColor, iconBg, title, description,
  count, unit, delay = 0, exporting, hasCsv = true, hasPdf = true,
  onExportCsv, onExportPdf, isLoading,
}: ReportCardProps) {
  const isExportingCsv = exporting?.id === id && exporting?.format === 'csv';
  const isExportingPdf = exporting?.id === id && exporting?.format === 'pdf';
  const isAnyExporting = isExportingCsv || isExportingPdf;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Card className="border-border/50 hover:border-border transition-all hover:shadow-lg hover:shadow-black/10 h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl ${iconBg}`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">{title}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-9 bg-white/5" />
          ) : (
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                {count > 0 ? (
                  <span>
                    <span className="font-semibold text-foreground">{count}</span> {unit}
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
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-600/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Export as CSV"
                  >
                    {isExportingCsv ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}>
                        <Download className="w-3.5 h-3.5" />
                      </motion.div>
                    ) : (
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                    )}
                    CSV
                  </button>
                )}
                {hasPdf && (
                  <button
                    id={`export-pdf-${id}`}
                    onClick={onExportPdf}
                    disabled={isAnyExporting || count === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600/15 text-blue-400 border border-blue-500/25 hover:bg-blue-600/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Export as PDF"
                  >
                    {isExportingPdf ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}>
                        <Download className="w-3.5 h-3.5" />
                      </motion.div>
                    ) : (
                      <FileText className="w-3.5 h-3.5" />
                    )}
                    PDF
                  </button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { portfolio, equity, bonds, cashFlowStats, concentrationRisk, isLoading, lastFetched, apiErrors, netWorth, equityTotal, bondTotal } = usePortfolioData();
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
      let payload: any = { reportType: type };

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
    { label: 'Net Worth', value: fmt(netWorth), color: 'text-foreground' },
    { label: 'Equity', value: fmt(equityTotal), color: 'text-blue-400' },
    { label: 'Bonds', value: fmt(bondTotal), color: 'text-purple-400' },
    { label: 'Holdings', value: String(portfolio.length), color: 'text-foreground' },
    { label: 'Diversification', value: `${concentrationRisk.diversificationScore}/100`, color: 'text-emerald-400' },
    { label: 'Top-5 Conc.', value: pct(concentrationRisk.top5Percent), color: concentrationRisk.top5Percent > 0.5 ? 'text-red-400' : 'text-amber-400' },
  ];

  const reports = [
    {
      id: 'portfolio', icon: BookOpen, iconColor: 'text-indigo-400', iconBg: 'bg-indigo-500/10',
      title: 'Full Portfolio Report', description: 'All equity and bond holdings with allocation, YTM, credit rating, and sector breakdown.',
      count: portfolio.length, unit: 'holdings', hasCsv: true, hasPdf: true,
    },
    {
      id: 'equity', icon: TrendingUp, iconColor: 'text-blue-400', iconBg: 'bg-blue-500/10',
      title: 'Equity Holdings', description: 'All stock positions with current price, day change, shares, value, and sector.',
      count: equity.length, unit: 'stocks', hasCsv: true, hasPdf: true,
    },
    {
      id: 'bonds', icon: BarChart3, iconColor: 'text-purple-400', iconBg: 'bg-purple-500/10',
      title: 'Bond Holdings', description: 'All bond positions with ISIN, maturity, YTM, coupon rate, credit rating, and broker.',
      count: bonds.length, unit: 'bonds', hasCsv: true, hasPdf: true,
    },
    {
      id: 'cashflow', icon: FileSpreadsheet, iconColor: 'text-emerald-400', iconBg: 'bg-emerald-500/10',
      title: 'Monthly Cash Flow', description: 'Month-by-month breakdown of investments and expenses from your transactions.',
      count: cashFlowStats.monthlySummaries.length, unit: 'months', hasCsv: true, hasPdf: true,
    },
    {
      id: 'risk', icon: Shield, iconColor: 'text-amber-400', iconBg: 'bg-amber-500/10',
      title: 'Risk & Diversification', description: 'Concentration analysis, sector distribution, HHI index, and top 10 holdings by weight.',
      count: portfolio.length, unit: 'holdings', hasCsv: false, hasPdf: true,
    },
    {
      id: 'ai', icon: Sparkles, iconColor: 'text-rose-400', iconBg: 'bg-rose-500/10',
      title: 'AI Intelligence Report', description: 'Complete SEBI-grade AI report with health scores, macro scenarios, opportunities, and roadmaps.',
      count: 1, unit: 'report', hasCsv: false, hasPdf: true,
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
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                  {isLoading ? (
                    <Skeleton className="h-6 mt-1 bg-white/5" />
                  ) : (
                    <p className={`text-lg font-bold tabular-nums mt-0.5 ${stat.color}`}>{stat.value}</p>
                  )}
                </CardContent>
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
