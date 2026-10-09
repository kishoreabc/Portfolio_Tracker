'use client';

import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: string | null | undefined;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
  isLoading?: boolean;
}

export function MetricCard({ label, value, subValue, trend, className, isLoading }: MetricCardProps) {
  return (
    <div className={cn(
      'flex flex-col gap-1 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors',
      className
    )}>
      <span className="text-xs text-muted-foreground font-medium truncate">{label}</span>
      {isLoading ? (
        <div className="h-5 w-16 bg-white/5 rounded animate-pulse" />
      ) : (
        <span className={cn(
          'text-sm font-semibold truncate',
          value == null || value === 'N/A' ? 'text-muted-foreground' : 'text-foreground',
          trend === 'up' && 'text-gain',
          trend === 'down' && 'text-loss',
        )}>
          {value ?? 'N/A'}
        </span>
      )}
      {subValue && !isLoading && (
        <span className="text-[11px] text-muted-foreground/60 truncate">{subValue}</span>
      )}
    </div>
  );
}

interface MetricGridProps {
  children: React.ReactNode;
  cols?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

export function MetricGrid({ children, cols = 4, className }: MetricGridProps) {
  const gridCols: Record<number, string> = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  };

  return (
    <div className={cn('grid gap-2', gridCols[cols], className)}>
      {children}
    </div>
  );
}
