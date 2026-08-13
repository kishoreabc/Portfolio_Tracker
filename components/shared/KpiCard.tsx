'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface KpiCardProps {
  title: string;
  value: string;
  subValue?: string;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  accentColor?: 'blue' | 'green' | 'red' | 'amber' | 'purple';
  isLoading?: boolean;
  note?: string;
  id?: string;
  href?: string;
}

const ACCENT_STYLES = {
  blue: {
    icon: 'bg-blue-500/15 text-blue-400',
    glow: 'hover:shadow-blue-500/10',
    border: 'hover:border-blue-500/30',
  },
  green: {
    icon: 'bg-emerald-500/15 text-emerald-400',
    glow: 'hover:shadow-emerald-500/10',
    border: 'hover:border-emerald-500/30',
  },
  red: {
    icon: 'bg-red-500/15 text-red-400',
    glow: 'hover:shadow-red-500/10',
    border: 'hover:border-red-500/30',
  },
  amber: {
    icon: 'bg-amber-500/15 text-amber-400',
    glow: 'hover:shadow-amber-500/10',
    border: 'hover:border-amber-500/30',
  },
  purple: {
    icon: 'bg-purple-500/15 text-purple-400',
    glow: 'hover:shadow-purple-500/10',
    border: 'hover:border-purple-500/30',
  },
};

export function KpiCard({
  title,
  value,
  subValue,
  change,
  changeLabel,
  icon: Icon,
  accentColor = 'blue',
  isLoading = false,
  note,
  id,
  href,
}: KpiCardProps) {
  const accent = ACCENT_STYLES[accentColor];

  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  if (isLoading) {
    return (
      <Card className="p-5 space-y-3 bg-card border-border/50">
        <Skeleton className="h-4 w-24 bg-white/5" />
        <Skeleton className="h-8 w-32 bg-white/5" />
        <Skeleton className="h-3 w-20 bg-white/5" />
      </Card>
    );
  }

  const content = (
      <Card className={cn(
        'p-5 border-border/50 hover:border-border transition-all duration-200',
        'hover:shadow-lg h-full flex flex-col justify-between',
        accent.glow,
        accent.border,
        href ? 'cursor-pointer hover:bg-white/[0.02]' : 'group cursor-default'
      )}>
        <div>
          <div className="flex items-start justify-between mb-3">
            <p className="text-body font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
            {Icon && (
              <div className={cn('p-2 rounded-lg', accent.icon)}>
                <Icon className="w-4 h-4" />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <motion.p
              className="text-h1 font-bold text-foreground tabular-nums"
              key={value}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              {value}
            </motion.p>

            {subValue && (
              <p className="text-small text-muted-foreground">{subValue}</p>
            )}
          </div>
        </div>

        {change !== undefined && (
          <div className="flex items-center gap-1 mt-3">
            {isPositive && <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />}
            {isNegative && <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
            {!isPositive && !isNegative && <Minus className="w-3.5 h-3.5 text-slate-500" />}
            <span className={cn(
              'text-small font-semibold',
              isPositive && 'text-emerald-400',
              isNegative && 'text-red-400',
              !isPositive && !isNegative && 'text-slate-500'
            )}>
              {isPositive && '+'}
              {(change * 100).toFixed(2)}%
            </span>
            {changeLabel && <span className="text-small text-muted-foreground">{changeLabel}</span>}
          </div>
        )}

        {note && (
          <p className="text-caption text-muted-foreground/70 mt-2 italic">{note}</p>
        )}
      </Card>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      id={id}
      className="h-full"
    >
      {href ? (
        <Link href={href} className="block h-full outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
          {content}
        </Link>
      ) : (
        content
      )}
    </motion.div>
  );
}
