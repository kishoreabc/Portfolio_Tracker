'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ShieldAlert,
  Database,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { DataQualityReport, DataIssue, IssueSeverity } from '@/types/dataQuality';

interface DataQualityCardProps {
  report: DataQualityReport;
  className?: string;
}

export function DataQualityCard({ report, className = '' }: DataQualityCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | IssueSeverity>('all');

  const { issues, completenessPercent, equityOk, bondsOk, transactionsOk } = report;

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const infos = issues.filter((i) => i.severity === 'info');

  const hasIssues = issues.length > 0;
  const filteredIssues =
    selectedFilter === 'all' ? issues : issues.filter((i) => i.severity === selectedFilter);

  const getSeverityBadge = (sev: IssueSeverity) => {
    switch (sev) {
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
            <XCircle className="w-3 h-3" /> Error
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" /> Warning
          </span>
        );
      case 'info':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-500 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
            <Info className="w-3 h-3" /> Info
          </span>
        );
    }
  };

  const getCategoryColor = (category: DataIssue['category']) => {
    switch (category) {
      case 'missing':
        return 'text-amber-400 bg-amber-500/10';
      case 'invalid':
        return 'text-rose-400 bg-rose-500/10';
      case 'duplicate':
        return 'text-purple-400 bg-purple-500/10';
      case 'future-dated':
        return 'text-blue-400 bg-blue-500/10';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  return (
    <Card className={`overflow-hidden border border-border/60 shadow-sm transition-all ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg ${
                errors.length > 0
                  ? 'bg-rose-500/10 text-rose-500'
                  : warnings.length > 0
                  ? 'bg-amber-500/10 text-amber-500'
                  : 'bg-emerald-500/10 text-emerald-500'
              }`}
            >
              {errors.length > 0 ? (
                <ShieldAlert className="w-5 h-5" />
              ) : (
                <ShieldCheck className="w-5 h-5" />
              )}
            </div>
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                Data Quality & Health
                {hasIssues ? (
                  <Badge variant={errors.length > 0 ? 'destructive' : 'secondary'} className="text-xs">
                    {issues.length} {issues.length === 1 ? 'Notice' : 'Notices'}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    Optimal
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time validation of holdings, bonds, and transactions
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sheet components health indicators */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground mr-2">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
                  equityOk
                    ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5'
                    : 'border-amber-500/30 text-amber-400 bg-amber-500/5'
                }`}
              >
                {equityOk ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />} Equity
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
                  bondsOk
                    ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5'
                    : 'border-amber-500/30 text-amber-400 bg-amber-500/5'
                }`}
              >
                {bondsOk ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />} Bonds
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
                  transactionsOk
                    ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5'
                    : 'border-amber-500/30 text-amber-400 bg-amber-500/5'
                }`}
              >
                {transactionsOk ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />} Transactions
              </span>
            </div>

            {hasIssues && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground px-2.5 py-1 rounded-md bg-muted/60 hover:bg-muted transition-colors cursor-pointer"
                aria-expanded={isExpanded}
              >
                {isExpanded ? (
                  <>
                    <span>Hide Details</span>
                    <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <span>View Issues ({issues.length})</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Completeness bar & metrics */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-primary" /> Data Completeness
            </span>
            <span className="tabular-nums font-semibold text-foreground">
              {completenessPercent}%
            </span>
          </div>

          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                completenessPercent >= 95
                  ? 'bg-emerald-500'
                  : completenessPercent >= 80
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${completenessPercent}%` }}
            />
          </div>

          <div className="flex items-center gap-4 text-xs pt-1">
            <span className="text-muted-foreground">
              Issues found:
            </span>
            <span className="inline-flex items-center gap-1 text-rose-500">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> {errors.length} Critical
            </span>
            <span className="inline-flex items-center gap-1 text-amber-500">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> {warnings.length} Warnings
            </span>
            <span className="inline-flex items-center gap-1 text-sky-500">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" /> {infos.length} Info
            </span>
          </div>
        </div>

        {/* Expandable Issues Table / List */}
        {isExpanded && hasIssues && (
          <div className="mt-4 pt-4 border-t border-border/60 space-y-3">
            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setSelectedFilter('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  selectedFilter === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/70 text-muted-foreground hover:bg-muted'
                }`}
              >
                All ({issues.length})
              </button>
              {errors.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedFilter('error')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    selectedFilter === 'error'
                      ? 'bg-rose-500 text-white'
                      : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                  }`}
                >
                  Errors ({errors.length})
                </button>
              )}
              {warnings.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedFilter('warning')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    selectedFilter === 'warning'
                      ? 'bg-amber-500 text-white'
                      : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                  }`}
                >
                  Warnings ({warnings.length})
                </button>
              )}
              {infos.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedFilter('info')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    selectedFilter === 'info'
                      ? 'bg-sky-500 text-white'
                      : 'bg-sky-500/10 text-sky-400 hover:bg-sky-500/20'
                  }`}
                >
                  Info ({infos.length})
                </button>
              )}
            </div>

            {/* List */}
            <div className="divide-y divide-border/40 max-h-72 overflow-y-auto pr-1">
              {filteredIssues.map((issue) => (
                <div key={issue.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getSeverityBadge(issue.severity)}
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase ${getCategoryColor(issue.category)}`}>
                        {issue.category}
                      </span>
                      {issue.affectedRecord && (
                        <span className="font-semibold text-foreground">
                          {issue.affectedRecord}
                        </span>
                      )}
                      <span className="text-muted-foreground font-mono text-[11px]">
                        [{issue.field}]
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs pl-0.5">
                      {issue.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
