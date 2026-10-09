'use client';

import { cn } from '@/lib/utils';
import { ResearchSection, EmptyState } from './ResearchSection';
import type { CorporateActionsData } from '@/types/research';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, DollarSign, Split, Gift, Award, ExternalLink } from 'lucide-react';

interface CorporateActionsSectionProps {
  corporateActions: CorporateActionsData | null | undefined;
  isLoading?: boolean;
}

export function CorporateActionsSection({ corporateActions, isLoading }: CorporateActionsSectionProps) {
  const actions = corporateActions?.actions ?? [];

  if (!corporateActions || actions.length === 0) {
    return (
      <ResearchSection
        title="Corporate Actions"
        id="corporate-actions"
        description="Dividends, stock splits, bonus shares, and major corporate events"
        meta={corporateActions?.meta}
      >
        <EmptyState
          title="No corporate actions recorded"
          description="Historical corporate actions records (dividends, splits, bonuses) are not available for this company."
        />
      </ResearchSection>
    );
  }

  const getBadge = (type: string) => {
    switch (type) {
      case 'dividend':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
            <DollarSign className="w-3 h-3" /> Dividend
          </span>
        );
      case 'bonus':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/20">
            <Gift className="w-3 h-3" /> Bonus
          </span>
        );
      case 'split':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/20">
            <Split className="w-3 h-3" /> Stock Split
          </span>
        );
      case 'buyback':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20">
            <Award className="w-3 h-3" /> Buyback
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-white/10 text-muted-foreground border border-white/10">
            {type.toUpperCase()}
          </span>
        );
    }
  };

  return (
    <ResearchSection
      title="Corporate Actions"
      id="corporate-actions"
      description="Historical record of dividends, bonuses, splits, and restructuring events"
      meta={corporateActions.meta}
    >
      <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <Table className="w-full text-xs">
          <TableHeader>
            <TableRow className="border-b border-white/10 bg-white/[0.03] hover:bg-transparent">
              <TableHead className="font-semibold text-foreground py-3 pl-4">Event Type</TableHead>
              <TableHead className="font-semibold text-foreground py-3">Description</TableHead>
              <TableHead className="font-semibold text-foreground py-3">Effective / Ex-Date</TableHead>
              <TableHead className="font-semibold text-foreground py-3">Record Date</TableHead>
              <TableHead className="text-right font-semibold text-foreground py-3 pr-4">Amount / Ratio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {actions.map((item, idx) => (
              <TableRow key={idx} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                <TableCell className="py-3 pl-4 whitespace-nowrap">{getBadge(item.type)}</TableCell>
                <TableCell className="py-3 font-medium text-foreground max-w-sm truncate" title={item.description}>
                  {item.description}
                </TableCell>
                <TableCell className="py-3 font-mono text-muted-foreground whitespace-nowrap">
                  {item.exDate || item.date}
                </TableCell>
                <TableCell className="py-3 font-mono text-muted-foreground whitespace-nowrap">
                  {item.recordDate || '—'}
                </TableCell>
                <TableCell className="text-right py-3 pr-4 font-mono font-semibold tabular-nums text-foreground whitespace-nowrap">
                  {item.amount != null ? `₹${item.amount.toFixed(2)}` : item.ratio ? item.ratio : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </ResearchSection>
  );
}
