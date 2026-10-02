'use client';

import { useMemo } from 'react';
import type { BondHolding } from '@/types/bonds';
import { calculateBondSummaryMetrics } from '@/lib/calc/bondAnalytics';
import { BondStatCards } from './BondStatCards';
import { CashflowToMaturityCard } from './CashflowToMaturityCard';
import { BondInvestmentWeightCard } from './BondInvestmentWeightCard';
import { BondRatingCard } from './BondRatingCard';
import { BondInvestmentTypeCard } from './BondInvestmentTypeCard';

interface BondAnalyticsOverviewProps {
  bonds: BondHolding[];
  isLoading?: boolean;
}

export function BondAnalyticsOverview({
  bonds,
  isLoading = false,
}: BondAnalyticsOverviewProps) {
  const metrics = useMemo(() => {
    return calculateBondSummaryMetrics(bonds);
  }, [bonds]);

  return (
    <div className="space-y-4">
      {/* 4 Top KPI Cards (Purple / Violet Gradient) */}
      <BondStatCards metrics={metrics} isLoading={isLoading} />

      {/* 4 Analytical Chart Cards in 2x2 Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top-Left: Cashflow to Maturity/Call */}
        <CashflowToMaturityCard bonds={bonds} isLoading={isLoading} />

        {/* Top-Right: Investment Weight (%) */}
        <BondInvestmentWeightCard bonds={bonds} isLoading={isLoading} />

        {/* Bottom-Left: Investment by Rating */}
        <BondRatingCard bonds={bonds} isLoading={isLoading} />

        {/* Bottom-Right: Investment Type */}
        <BondInvestmentTypeCard bonds={bonds} isLoading={isLoading} />
      </div>
    </div>
  );
}
