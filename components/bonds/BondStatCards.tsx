'use client';

import { motion } from 'framer-motion';
import { IndianRupee, Clock, Award, Percent } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePrivacy, PRIVACY_MASK } from '@/lib/privacy-context';
import type { BondSummaryMetrics } from '@/lib/calc/bondAnalytics';

interface BondStatCardsProps {
  metrics: BondSummaryMetrics;
  isLoading?: boolean;
}

function fmtCurrency(val: number, isHidden: boolean): string {
  if (isHidden) return PRIVACY_MASK;
  return `₹ ${val.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function BondStatCards({ metrics, isLoading = false }: BondStatCardsProps) {
  const { isHidden } = usePrivacy();

  const cards = [
    {
      title: 'Total Amount Invested',
      value: isLoading ? '—' : fmtCurrency(metrics.totalInvested, isHidden),
      icon: IndianRupee,
    },
    {
      title: 'Weighted Avg. Maturity',
      value: isLoading ? '—' : metrics.weightedAvgMaturityText,
      icon: Clock,
    },
    {
      title: 'Number of Securities',
      value: isLoading ? '—' : `${metrics.uniqueSecuritiesCount} Unique`,
      icon: Award,
    },
    {
      title: 'Weighted Avg. Yield (YTM/YTC)',
      value: isLoading ? '—' : metrics.weightedAvgYieldText,
      icon: Percent,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
          >
            <Card className="relative overflow-hidden rounded-2xl border-purple-800/40 bg-gradient-to-br from-[#401278] via-[#2f0c59] to-[#1c0638] text-white shadow-lg p-5 flex items-center gap-4 transition-all duration-300 hover:shadow-purple-900/30 hover:scale-[1.01]">
              {/* Decorative organic background watermark */}
              <div
                aria-hidden="true"
                className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-white/[0.04] pointer-events-none blur-sm"
              />
              <div
                aria-hidden="true"
                className="absolute right-10 top-0 w-16 h-16 rounded-full bg-purple-400/[0.05] pointer-events-none blur-md"
              />

              {/* Circular white icon badge */}
              <div className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center shrink-0 text-[#3b1262]">
                <Icon className="w-5 h-5 stroke-[2.5]" />
              </div>

              {/* Content */}
              <div className="flex flex-col min-w-0 z-10 flex-1">
                <div className="text-xs text-purple-200/90 font-medium truncate">
                  {card.title}
                </div>

                {isLoading ? (
                  <Skeleton className="h-7 w-32 bg-white/10 mt-1 rounded" />
                ) : (
                  <div className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1 tabular-nums truncate">
                    {card.value}
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
