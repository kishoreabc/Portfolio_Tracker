'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Topbar } from '@/components/layout/Topbar';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, FileText } from 'lucide-react';

function fmt(v: number) {
  return `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function pct(v: number) {
  return `${(v * 100).toFixed(2)}%`;
}

function exportCSV(rows: object[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((h) => {
        const val = (row as Record<string, unknown>)[h];
        const s = String(val ?? '');
        return s.includes(',') ? `"${s}"` : s;
      }).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { portfolio, equity, bonds, cashFlowStats, isLoading, lastFetched, apiErrors } = usePortfolioData();
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (type: string) => {
    setExporting(type);
    await new Promise((r) => setTimeout(r, 500));
    try {
      if (type === 'portfolio') {
        const rows = portfolio.map((r) => ({
          Type: r.type,
          'Ticker/ISIN': r.ticker,
          Name: r.name,
          Sector: r.sector,
          'Current Value (₹)': r.currentValue.toFixed(2),
          'Allocation %': pct(r.allocationPercent),
          'Change %': r.percentChange !== undefined ? pct(r.percentChange) : 'N/A',
          'Maturity Date': r.maturityDate ?? 'N/A',
          'Credit Rating': r.creditRating ?? 'N/A',
          'YTM': r.ytm !== undefined ? pct(r.ytm) : 'N/A',
        }));
        exportCSV(rows, `portfolio_${new Date().toISOString().slice(0, 10)}.csv`);
      } else if (type === 'equity') {
        const rows = equity.map((h) => ({
          Ticker: h.ticker,
          Exchange: h.exchange,
          Name: h.name,
          Sector: h.sector,
          'Current Price': h.currentPrice.toFixed(2),
          'Price Change': h.priceChange.toFixed(2),
          '% Change': pct(h.percentChange),
          Shares: h.shares,
          'Current Value': h.currentValue.toFixed(2),
          'Allocation %': pct(h.allocationPercent),
        }));
        exportCSV(rows, `equity_holdings_${new Date().toISOString().slice(0, 10)}.csv`);
      } else if (type === 'bonds') {
        const rows = bonds.map((b) => ({
          Broker: b.broker,
          Issuer: b.issuer,
          'Security Name': b.securityName,
          ISIN: b.isin,
          Sector: b.sector,
          'Credit Rating': b.creditRating,
          'Maturity Date': b.maturityDate ?? 'N/A',
          Duration: b.duration,
          'Coupon Rate': pct(b.couponRate),
          YTM: pct(b.ytm),
          'Face Value': b.faceValue.toFixed(2),
          'Buy Price': b.buyPrice.toFixed(2),
          'Units Held': b.unitsHeld,
          'Total Value': b.totalValue.toFixed(2),
          'Portfolio %': pct(b.portfolioPercent),
        }));
        exportCSV(rows, `bond_holdings_${new Date().toISOString().slice(0, 10)}.csv`);
      } else if (type === 'cashflow') {
        const rows = cashFlowStats.monthlySummaries.map((m) => ({
          Month: m.label,
          Investment: m.investment.toFixed(2),
          'Food & Entertainment': m.foodAndEntertainment.toFixed(2),
          Others: m.others.toFixed(2),
          'Total Expenses': m.totalExpenses.toFixed(2),
        }));
        exportCSV(rows, `cashflow_${new Date().toISOString().slice(0, 10)}.csv`);
      }
    } finally {
      setExporting(null);
    }
  };

  const reports = [
    {
      id: 'portfolio',
      title: 'Full Portfolio Report',
      description: 'All equity and bond holdings with allocation, change, maturity, and YTM',
      count: portfolio.length,
      unit: 'holdings',
    },
    {
      id: 'equity',
      title: 'Equity Holdings',
      description: 'All stock positions with current price, shares, and sector',
      count: equity.length,
      unit: 'stocks',
    },
    {
      id: 'bonds',
      title: 'Bond Holdings',
      description: 'All bond positions with ISIN, maturity, YTM, coupon, and broker',
      count: bonds.length,
      unit: 'bonds',
    },
    {
      id: 'cashflow',
      title: 'Monthly Cash Flow',
      description: 'Monthly breakdown of investments and expenses from Daily Transaction',
      count: cashFlowStats.monthlySummaries.length,
      unit: 'months',
    },
  ];

  return (
    <>
      <Topbar lastFetched={lastFetched} pageTitle="Reports" apiErrors={apiErrors} />
      <div className="p-3 sm:p-4 md:p-6 space-y-4 animate-fade-in-up">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reports.map((report, i) => (
            <motion.div key={report.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card className="border-border/50 hover:border-border transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold">{report.title}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">{report.description}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <FileText className="w-4 h-4 text-blue-400" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? <Skeleton className="h-8 bg-white/5" /> : (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {report.count} {report.unit}
                      </span>
                      <button
                        id={`export-${report.id}`}
                        onClick={() => handleExport(report.id)}
                        disabled={exporting === report.id || report.count === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {exporting === report.id ? (
                          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}>
                            <Download className="w-3.5 h-3.5" />
                          </motion.div>
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        Export CSV
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Card className="border-border/50 border-dashed opacity-60">
          <CardContent className="p-6 text-center">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium text-muted-foreground">PDF Export</p>
            <p className="text-xs text-muted-foreground mt-1">Coming in v2 — CSV export is available now</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
