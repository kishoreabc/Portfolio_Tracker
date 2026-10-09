'use client';

import { useState, Fragment } from 'react';
import { cn } from '@/lib/utils';
import { ResearchSection, EmptyState, DataStatusBanner } from './ResearchSection';
import type { FinancialTable, GrowthMetrics } from '@/types/research';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, Layers, FileSpreadsheet, Percent, BarChart2 } from 'lucide-react';

interface FinancialsSectionProps {
  quarterly: FinancialTable | null | undefined;
  annual: FinancialTable | null | undefined;
  balanceSheet: FinancialTable | null | undefined;
  cashFlow: FinancialTable | null | undefined;
  growth: GrowthMetrics | null | undefined;
  isLoading?: boolean;
}

type FinancialTab = 'quarterly' | 'pnl' | 'balanceSheet' | 'cashFlow';

export function FinancialsSection({
  quarterly,
  annual,
  balanceSheet,
  cashFlow,
  growth,
  isLoading,
}: FinancialsSectionProps) {
  const [activeSubTab, setActiveSubTab] = useState<FinancialTab>('quarterly');

  const tables: Record<FinancialTab, { title: string; subtitle: string; table: FinancialTable | null | undefined }> = {
    quarterly: {
      title: 'Quarterly Results',
      subtitle: 'Consolidated figures in ₹ Crores',
      table: quarterly,
    },
    pnl: {
      title: 'Profit & Loss (Annual)',
      subtitle: 'Consolidated figures in ₹ Crores',
      table: annual,
    },
    balanceSheet: {
      title: 'Balance Sheet',
      subtitle: 'Consolidated financial position in ₹ Crores',
      table: balanceSheet,
    },
    cashFlow: {
      title: 'Cash Flows',
      subtitle: 'Cash generation and deployment in ₹ Crores',
      table: cashFlow,
    },
  };

  const current = tables[activeSubTab];

  const [expandedRows, setExpandedRows] = useState<Set<string>>(() => {
    return new Set([
      'quarterly::Sales',
      'quarterly::Expenses',
      'quarterly::Revenue',
      'pnl::Sales',
      'pnl::Expenses',
      'pnl::Revenue',
    ]);
  });

  const toggleRow = (metric: string) => {
    const key = `${activeSubTab}::${metric}`;
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const currentExpandableMetrics =
    current.table?.rows
      .filter((r) => r.isExpandable || (r.subRows && r.subRows.length > 0))
      .map((r) => r.metric) ?? [];

  const allCurrentExpanded =
    currentExpandableMetrics.length > 0 &&
    currentExpandableMetrics.every((m) => expandedRows.has(`${activeSubTab}::${m}`));

  const toggleAllCurrent = () => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (allCurrentExpanded) {
        currentExpandableMetrics.forEach((m) => next.delete(`${activeSubTab}::${m}`));
      } else {
        currentExpandableMetrics.forEach((m) => next.add(`${activeSubTab}::${m}`));
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Sub-navigation bar for financial statements ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-white/[0.03] border border-white/5 rounded-xl">
          {(
            [
              { id: 'quarterly', label: 'Quarterly Results' },
              { id: 'pnl', label: 'Profit & Loss' },
              { id: 'balanceSheet', label: 'Balance Sheet' },
              { id: 'cashFlow', label: 'Cash Flow' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={cn(
                'px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all',
                activeSubTab === tab.id
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {currentExpandableMetrics.length > 0 && (
            <button
              type="button"
              onClick={toggleAllCurrent}
              className="text-[11px] font-medium text-blue-400 hover:text-blue-300 transition-colors px-2.5 py-1 rounded-md bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20"
            >
              {allCurrentExpanded ? 'Collapse All −' : 'Expand All +'}
            </button>
          )}
          <div className="text-xs text-muted-foreground/60">
            Amounts in <span className="font-semibold text-foreground/80">₹ Crores</span>
          </div>
        </div>
      </div>

      {/* ── Active Statement Table ── */}
      <ResearchSection
        title={current.title}
        id={activeSubTab}
        description={current.subtitle}
        meta={current.table?.meta}
      >
        {!current.table || current.table.periods.length === 0 ? (
          <EmptyState
            title={`${current.title} unavailable`}
            description="Detailed financial statement periods for this company are not available in current providers. Missing datasets require an authorized Indian market source."
          />
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin">
              <Table className="w-full text-xs">
                <TableHeader>
                  <TableRow className="border-b border-white/10 bg-white/[0.03] hover:bg-transparent">
                    <TableHead className="sticky left-0 z-10 bg-[#0d1322] font-semibold text-foreground min-w-[180px] py-3 pl-4">
                      Report Period
                    </TableHead>
                    {current.table.periods.map((p, idx) => (
                      <TableHead
                        key={idx}
                        className="text-right font-mono font-semibold text-foreground/90 whitespace-nowrap px-4 py-3 min-w-[90px]"
                      >
                        {p.period}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {current.table.rows.map((row, rIdx) => {
                    const isHighlight =
                      row.metric.includes('Sales') ||
                      row.metric.includes('Revenue') ||
                      row.metric.includes('Operating Profit') ||
                      row.metric.includes('Net Profit') ||
                      row.metric.includes('Total Assets') ||
                      row.metric.includes('Total Liabilities') ||
                      row.metric.includes('Cash from Operating Activity');
                    const isPercentage =
                      row.metric.includes('%') ||
                      row.metric.includes('OPM') ||
                      row.metric.includes('Margin') ||
                      row.metric.toUpperCase().includes('CFO/OP') ||
                      row.metric.toUpperCase().includes('CFC/OP') ||
                      row.unit === '%';

                    const isExpandable = Boolean(row.isExpandable || (row.subRows && row.subRows.length > 0));
                    const rowKey = `${activeSubTab}::${row.metric}`;
                    const isExpanded = isExpandable && expandedRows.has(rowKey);

                    return (
                      <Fragment key={rIdx}>
                        <TableRow
                          className={cn(
                            'border-b border-white/5 hover:bg-white/[0.03] transition-colors',
                            isHighlight && 'bg-blue-500/[0.03] font-semibold'
                          )}
                        >
                          <TableCell
                            className={cn(
                              'sticky left-0 z-10 bg-[#0d1322] font-medium text-foreground py-2.5 pl-4 pr-3 whitespace-nowrap select-none',
                              isHighlight && 'text-blue-400 font-semibold',
                              isExpandable && 'cursor-pointer hover:bg-[#11192e]'
                            )}
                            onClick={() => {
                              if (isExpandable) toggleRow(row.metric);
                            }}
                          >
                            <div className="flex items-center gap-1.5 group">
                              <span className={cn('transition-colors', isExpandable && 'group-hover:text-blue-300')}>
                                {row.metric}
                              </span>
                              {isExpandable && (
                                <span
                                  className={cn(
                                    'inline-flex items-center justify-center min-w-4 h-4 px-1 text-[11px] font-mono font-bold rounded transition-colors',
                                    isExpanded
                                      ? 'text-indigo-400 bg-indigo-500/15 group-hover:bg-indigo-500/25'
                                      : 'text-blue-400 bg-blue-500/15 group-hover:bg-blue-500/25'
                                  )}
                                  title={isExpanded ? 'Collapse schedule' : 'Expand schedule breakdown'}
                                >
                                  {isExpanded ? '−' : '+'}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          {row.values.map((val, cIdx) => (
                            <TableCell
                              key={cIdx}
                              className={cn(
                                'text-right font-mono tabular-nums px-4 py-2.5 whitespace-nowrap',
                                val == null
                                  ? 'text-muted-foreground/30'
                                  : val < 0
                                  ? 'text-red-400'
                                  : isHighlight
                                  ? 'text-foreground font-semibold'
                                  : 'text-foreground/80'
                              )}
                            >
                              {val == null
                                ? '—'
                                : isPercentage
                                ? `${val % 1 === 0 ? val : val.toFixed(1)}%`
                                : val.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                            </TableCell>
                          ))}
                        </TableRow>

                        {/* Indented Schedule Sub-Rows (e.g. YOY Sales Growth %, Material Cost %, etc.) */}
                        {isExpanded &&
                          row.subRows?.map((subRow, sIdx) => {
                            const isSubPercentage =
                              subRow.metric.includes('%') ||
                              subRow.metric.includes('OPM') ||
                              subRow.metric.includes('Margin') ||
                              subRow.unit === '%';

                            return (
                              <TableRow
                                key={`${rIdx}-sub-${sIdx}`}
                                className="border-b border-white/[0.04] bg-white/[0.015] hover:bg-white/[0.035] transition-colors"
                              >
                                <TableCell className="sticky left-0 z-10 bg-[#0a0f1a] font-normal text-muted-foreground/80 py-2 pl-9 pr-3 whitespace-nowrap text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground/30 font-mono text-[10px] select-none">↳</span>
                                    <span className="text-foreground/75 font-normal">{subRow.metric}</span>
                                  </div>
                                </TableCell>
                                {subRow.values.map((sVal, cIdx) => (
                                  <TableCell
                                    key={cIdx}
                                    className={cn(
                                      'text-right font-mono tabular-nums px-4 py-2 whitespace-nowrap text-xs',
                                      sVal == null
                                        ? 'text-muted-foreground/30'
                                        : sVal < 0
                                        ? 'text-red-400 font-medium'
                                        : 'text-foreground/70'
                                    )}
                                  >
                                    {sVal == null
                                      ? '—'
                                      : isSubPercentage
                                      ? `${sVal % 1 === 0 ? sVal : sVal.toFixed(2)}%`
                                      : sVal.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                                  </TableCell>
                                ))}
                              </TableRow>
                            );
                          })}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </ResearchSection>

      {/* ── Compounded Growth Rates (Shown on P&L Tab like Screener) ── */}
      {activeSubTab === 'pnl' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* Compounded Sales Growth */}
          <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4 space-y-2.5">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
              Compounded Sales Growth
            </h4>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-muted-foreground">10 Years:</span>
                <span className="font-mono font-semibold text-foreground">
                  {growth?.revenue?.tenYear != null ? `${growth.revenue.tenYear.toFixed(1)}%` : '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-muted-foreground">5 Years:</span>
                <span className="font-mono font-semibold text-foreground">
                  {growth?.revenue?.fiveYear != null ? `${growth.revenue.fiveYear.toFixed(1)}%` : '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-muted-foreground">3 Years:</span>
                <span className="font-mono font-semibold text-foreground">
                  {growth?.revenue?.threeYear != null ? `${growth.revenue.threeYear.toFixed(1)}%` : '—'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">12 Months (TTM):</span>
                <span className="font-mono font-semibold text-foreground">
                  {growth?.revenue?.oneYear != null ? `${growth.revenue.oneYear.toFixed(1)}%` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Compounded Profit Growth */}
          <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4 space-y-2.5">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-emerald-400" />
              Compounded Profit Growth
            </h4>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-muted-foreground">10 Years:</span>
                <span className="font-mono font-semibold text-foreground">
                  {growth?.profit?.tenYear != null ? `${growth.profit.tenYear.toFixed(1)}%` : '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-muted-foreground">5 Years:</span>
                <span className="font-mono font-semibold text-foreground">
                  {growth?.profit?.fiveYear != null ? `${growth.profit.fiveYear.toFixed(1)}%` : '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-muted-foreground">3 Years:</span>
                <span className="font-mono font-semibold text-foreground">
                  {growth?.profit?.threeYear != null ? `${growth.profit.threeYear.toFixed(1)}%` : '—'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">12 Months (TTM):</span>
                <span className="font-mono font-semibold text-foreground">
                  {growth?.profit?.oneYear != null ? `${growth.profit.oneYear.toFixed(1)}%` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Stock Price CAGR */}
          <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4 space-y-2.5">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
              Stock Price CAGR
            </h4>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-muted-foreground">10 Years:</span>
                <span className="font-mono font-semibold text-foreground">
                  {growth?.priceCagr?.tenYear != null ? `${growth.priceCagr.tenYear}%` : '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-muted-foreground">5 Years:</span>
                <span className="font-mono font-semibold text-foreground">
                  {growth?.priceCagr?.fiveYear != null ? `${growth.priceCagr.fiveYear}%` : '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-muted-foreground">3 Years:</span>
                <span className="font-mono font-semibold text-foreground">
                  {growth?.priceCagr?.threeYear != null ? `${growth.priceCagr.threeYear}%` : '—'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">1 Year:</span>
                <span className="font-mono font-semibold text-foreground">
                  {growth?.priceCagr?.oneYear != null ? `${growth.priceCagr.oneYear}%` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Return on Equity */}
          <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4 space-y-2.5">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5 text-amber-400" />
              Return on Equity (ROE)
            </h4>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-muted-foreground">10 Years:</span>
                <span className="font-mono font-semibold text-foreground">
                  {growth?.roeCagr?.tenYear != null ? `${growth.roeCagr.tenYear}%` : '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-muted-foreground">5 Years:</span>
                <span className="font-mono font-semibold text-foreground">
                  {growth?.roeCagr?.fiveYear != null ? `${growth.roeCagr.fiveYear}%` : '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-muted-foreground">3 Years:</span>
                <span className="font-mono font-semibold text-foreground">
                  {growth?.roeCagr?.threeYear != null ? `${growth.roeCagr.threeYear}%` : '—'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Last Year:</span>
                <span className="font-mono font-semibold text-foreground">
                  {growth?.roeCagr?.oneYear != null ? `${growth.roeCagr.oneYear}%` : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
