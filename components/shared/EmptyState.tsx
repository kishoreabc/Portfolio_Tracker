'use client';

import { motion } from 'framer-motion';
import { AlertCircle, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  reason?: string;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon = AlertCircle,
  reason,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 rounded-xl border border-dashed border-white/10',
        className
      )}
    >
      <div className="p-3 rounded-full bg-white/5 mb-3">
        <Icon className="w-6 h-6 text-slate-500" />
      </div>
      <p className="text-sm font-medium text-slate-300 mb-1">{title}</p>
      <p className="text-xs text-muted-foreground max-w-xs">{description}</p>
      {reason && (
        <p className="text-[11px] text-amber-400/70 mt-2 italic border border-amber-500/20 rounded px-2 py-1 bg-amber-500/5">
          {reason}
        </p>
      )}
    </motion.div>
  );
}
