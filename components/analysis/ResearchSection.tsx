'use client';

import { AlertCircle, RefreshCw, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataStatusBannerProps {
  source: string;
  status: 'fresh' | 'stale' | 'unavailable' | 'error';
  fetchedAt?: string | null;
  message?: string;
  className?: string;
}

export function DataStatusBanner({ source, status, fetchedAt, message, className }: DataStatusBannerProps) {
  if (status === 'fresh') return null;

  const config = {
    stale: {
      icon: RefreshCw,
      className: 'bg-warn/5 border-warn/20 text-warn',
      label: 'Stale data',
    },
    unavailable: {
      icon: Info,
      className: 'bg-white/[0.03] border-white/10 text-muted-foreground',
      label: 'Data unavailable',
    },
    error: {
      icon: AlertCircle,
      className: 'bg-loss/5 border-loss/20 text-loss',
      label: 'Error loading data',
    },
  }[status];

  const Icon = config.icon;
  const fetchedStr = fetchedAt ? new Date(fetchedAt).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }) : null;

  return (
    <div className={cn(
      'flex items-start gap-2 rounded-lg px-3 py-2 text-xs border',
      config.className,
      className
    )}>
      <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
      <div className="space-y-0.5">
        <p className="font-medium">{config.label} · {source}</p>
        {message && <p className="opacity-80">{message}</p>}
        {fetchedStr && <p className="opacity-60">Last updated: {fetchedStr}</p>}
      </div>
    </div>
  );
}

/**
 * Section wrapper for research page sections.
 */
interface ResearchSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  id?: string;
  meta?: DataStatusBannerProps;
  className?: string;
  headerAction?: React.ReactNode;
}

export function ResearchSection({ title, description, children, id, meta, className, headerAction }: ResearchSectionProps) {
  return (
    <section id={id} className={cn('space-y-3 scroll-mt-20', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="space-y-0.5">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {headerAction}
      </div>
      {meta && meta.status !== 'fresh' && (
        <DataStatusBanner {...meta} />
      )}
      {children}
    </section>
  );
}

/**
 * Empty state for unavailable data sections.
 */
interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function EmptyState({ title, description, icon: Icon = Info }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 rounded-xl border border-dashed border-white/10 text-center">
      <Icon className="w-8 h-8 text-muted-foreground/30" />
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground/60 max-w-sm">{description}</p>
      )}
    </div>
  );
}

/**
 * Error state for failed sections.
 */
export function ResearchErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 rounded-xl bg-loss/5 border border-loss/20 text-center">
      <AlertCircle className="w-8 h-8 text-loss/50" />
      <p className="text-sm font-medium text-loss/80">Unable to load research data</p>
      <p className="text-xs text-loss/60 max-w-sm">{message}</p>
    </div>
  );
}
