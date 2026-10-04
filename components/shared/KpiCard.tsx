'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePrivacy } from '@/lib/privacy-context';
import { PrivacyToggle } from './PrivacyToggle';

export type KpiAccentColor = 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'cyan' | 'teal' | 'rose';

interface KpiCardProps {
  title: string;
  value: string;
  subValue?: string;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  accentColor?: KpiAccentColor;
  isLoading?: boolean;
  note?: string;
  id?: string;
  href?: string;
  valueClassName?: string;
  isPrivate?: boolean;
  showPrivacyToggle?: boolean;
  className?: string;
}

interface AccentTheme {
  gradient: string;
  border: string;
  hoverBorder: string;
  glow: string;
  titleColor: string;
  subValueColor: string;
  iconBg: string;
  iconColor: string;
  watermarkColor: string;
}

const ACCENT_THEMES: Record<KpiAccentColor, AccentTheme> = {
  blue: {
    // Net Worth: Royal Blue to Deep Indigo
    gradient: 'bg-gradient-to-br from-[#1e3a8a] via-[#172554] to-[#0c1322]',
    border: 'border-blue-700/50',
    hoverBorder: 'hover:border-blue-400/80',
    glow: 'hover:shadow-blue-900/40',
    titleColor: 'text-blue-200',
    subValueColor: 'text-blue-100/90',
    iconBg: 'bg-white',
    iconColor: 'text-[#1e3a8a]',
    watermarkColor: 'bg-blue-400/[0.08]',
  },
  green: {
    // Equity Value / Gains: Lush Emerald to Forest
    gradient: 'bg-gradient-to-br from-[#065f46] via-[#064e3b] to-[#022c22]',
    border: 'border-emerald-700/50',
    hoverBorder: 'hover:border-emerald-400/80',
    glow: 'hover:shadow-emerald-900/40',
    titleColor: 'text-emerald-200',
    subValueColor: 'text-emerald-100/90',
    iconBg: 'bg-white',
    iconColor: 'text-[#065f46]',
    watermarkColor: 'bg-emerald-400/[0.08]',
  },
  purple: {
    // Bond Value: Regal Purple to Deep Violet (matches bonds section)
    gradient: 'bg-gradient-to-br from-[#581c87] via-[#3b0764] to-[#1c0638]',
    border: 'border-purple-700/50',
    hoverBorder: 'hover:border-purple-400/80',
    glow: 'hover:shadow-purple-900/40',
    titleColor: 'text-purple-200',
    subValueColor: 'text-purple-100/90',
    iconBg: 'bg-white',
    iconColor: 'text-[#581c87]',
    watermarkColor: 'bg-purple-400/[0.08]',
  },
  red: {
    // Today's Change (Down): Rich Ruby / Crimson
    gradient: 'bg-gradient-to-br from-[#881337] via-[#5c0d24] to-[#2e040f]',
    border: 'border-rose-700/50',
    hoverBorder: 'hover:border-rose-400/80',
    glow: 'hover:shadow-rose-900/40',
    titleColor: 'text-rose-200',
    subValueColor: 'text-rose-100/90',
    iconBg: 'bg-white',
    iconColor: 'text-[#881337]',
    watermarkColor: 'bg-rose-400/[0.08]',
  },
  rose: {
    // Month Expenses: Deep Rose Wine
    gradient: 'bg-gradient-to-br from-[#881337] via-[#660e29] to-[#330413]',
    border: 'border-rose-700/50',
    hoverBorder: 'hover:border-rose-400/80',
    glow: 'hover:shadow-rose-900/40',
    titleColor: 'text-rose-200',
    subValueColor: 'text-rose-100/90',
    iconBg: 'bg-white',
    iconColor: 'text-[#881337]',
    watermarkColor: 'bg-rose-400/[0.08]',
  },
  amber: {
    // Month Investment: Golden Bronze / Sunset Amber
    gradient: 'bg-gradient-to-br from-[#78350f] via-[#592607] to-[#291002]',
    border: 'border-amber-700/50',
    hoverBorder: 'hover:border-amber-400/80',
    glow: 'hover:shadow-amber-900/40',
    titleColor: 'text-amber-200',
    subValueColor: 'text-amber-100/90',
    iconBg: 'bg-white',
    iconColor: 'text-[#78350f]',
    watermarkColor: 'bg-amber-400/[0.08]',
  },
  cyan: {
    // Today's Target: Electric Cyan / Bright Cerulean
    gradient: 'bg-gradient-to-br from-[#0e7490] via-[#155e75] to-[#083344]',
    border: 'border-cyan-700/50',
    hoverBorder: 'hover:border-cyan-400/80',
    glow: 'hover:shadow-cyan-900/40',
    titleColor: 'text-cyan-200',
    subValueColor: 'text-cyan-100/90',
    iconBg: 'bg-white',
    iconColor: 'text-[#0e7490]',
    watermarkColor: 'bg-cyan-400/[0.08]',
  },
  teal: {
    // Month Target: Deep Sea Lagoon Teal
    gradient: 'bg-gradient-to-br from-[#0f766e] via-[#115e59] to-[#042f2e]',
    border: 'border-teal-700/50',
    hoverBorder: 'hover:border-teal-400/80',
    glow: 'hover:shadow-teal-900/40',
    titleColor: 'text-teal-200',
    subValueColor: 'text-teal-100/90',
    iconBg: 'bg-white',
    iconColor: 'text-[#0f766e]',
    watermarkColor: 'bg-teal-400/[0.08]',
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
  valueClassName,
  isPrivate = false,
  showPrivacyToggle = false,
  className,
}: KpiCardProps) {
  const { isHidden } = usePrivacy();
  const theme = ACCENT_THEMES[accentColor] || ACCENT_THEMES.blue;

  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  const displayValue = isPrivate && isHidden ? '••••••' : value;
  const displaySubValue = isPrivate && isHidden && subValue
    ? subValue.replace(/₹[\d,.]+(\s*(?:Cr|L))?/g, '••••••')
    : subValue;

  if (isLoading) {
    return (
      <Card className={cn("relative overflow-hidden rounded-2xl p-5 space-y-3 bg-card border-border/50 shadow-sm", className)}>
        <Skeleton className="h-4 w-24 bg-white/5" />
        <Skeleton className="h-8 w-32 bg-white/5" />
        <Skeleton className="h-3 w-20 bg-white/5" />
      </Card>
    );
  }

  const content = (
    <Card
      className={cn(
        'relative overflow-hidden rounded-2xl border p-4 sm:p-5 h-full flex flex-col justify-between transition-all duration-300 text-white shadow-md',
        theme.gradient,
        theme.border,
        theme.hoverBorder,
        theme.glow,
        href ? 'cursor-pointer hover:scale-[1.015] hover:shadow-xl' : 'cursor-default',
        className
      )}
    >
      {/* Decorative organic background watermarks */}
      <div
        aria-hidden="true"
        className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-white/[0.04] pointer-events-none blur-sm"
      />
      <div
        aria-hidden="true"
        className={cn('absolute right-8 top-0 w-20 h-20 rounded-full pointer-events-none blur-md', theme.watermarkColor)}
      />

      {/* Header: Title and Icon Badge */}
      <div className="flex items-start justify-between gap-2 mb-2 z-10">
        <p className={cn('text-xs font-bold uppercase tracking-wider truncate', theme.titleColor)}>
          {title}
        </p>
        <div className="flex items-center gap-1.5 shrink-0">
          {showPrivacyToggle && <PrivacyToggle variant="card" />}
          {Icon && (
            <div
              className={cn(
                'w-9 h-9 sm:w-10 sm:h-10 rounded-full shadow-md flex items-center justify-center shrink-0 transition-transform group-hover:scale-105',
                theme.iconBg,
                theme.iconColor
              )}
            >
              <Icon className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            </div>
          )}
        </div>
      </div>

      {/* Value and Subtitle / Change */}
      <div className="space-y-1.5 z-10 mt-auto">
        <motion.p
          className={cn(
            'text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight text-white drop-shadow-xs',
            valueClassName
          )}
          key={displayValue}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {displayValue}
        </motion.p>

        {displaySubValue && (
          <p className={cn('text-xs font-semibold truncate', theme.subValueColor)}>
            {displaySubValue}
          </p>
        )}

        {change !== undefined && (
          <div className="pt-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/30 border border-white/20 text-xs font-bold backdrop-blur-xs shadow-xs">
              {isPositive && <TrendingUp className="w-3.5 h-3.5 text-emerald-300 stroke-[2.5]" />}
              {isNegative && <TrendingDown className="w-3.5 h-3.5 text-rose-300 stroke-[2.5]" />}
              {!isPositive && !isNegative && <Minus className="w-3.5 h-3.5 text-white/70" />}
              <span
                className={cn(
                  isPositive && 'text-emerald-200',
                  isNegative && 'text-rose-200',
                  !isPositive && !isNegative && 'text-white'
                )}
              >
                {isPositive && '+'}
                {(change * 100).toFixed(2)}%
              </span>
              {changeLabel && (
                <span className="text-white/80 font-normal text-[11px] ml-0.5">
                  {changeLabel}
                </span>
              )}
            </div>
          </div>
        )}

        {note && (
          <p className="text-[11px] text-white/60 mt-1 italic">{note}</p>
        )}
      </div>
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
        <Link
          href={href}
          className="block h-full outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
        >
          {content}
        </Link>
      ) : (
        content
      )}
    </motion.div>
  );
}