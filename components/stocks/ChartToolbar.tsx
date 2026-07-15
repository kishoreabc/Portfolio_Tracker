'use client';

import { memo } from 'react';
import type { TimeRange } from '@/hooks/useStockDetails';

type ChartType = 'area' | 'candlestick' | 'line';

const TIME_RANGES: { label: string; value: TimeRange }[] = [
  { label: '1D', value: '1d' },
  { label: '1W', value: '5d' },
  { label: '1M', value: '1mo' },
  { label: '3M', value: '3mo' },
  { label: '6M', value: '6mo' },
  { label: '1Y', value: '1y' },
  { label: '3Y', value: '3y' },
  { label: '5Y', value: '5y' },
  { label: 'MAX', value: 'max' },
];

const CHART_TYPES: { label: string; value: ChartType }[] = [
  { label: '≈ Area', value: 'area' },
  { label: '⊟ Candle', value: 'candlestick' },
  { label: '— Line', value: 'line' },
];

interface ChartToolbarProps {
  chartType: ChartType;
  timeRange: TimeRange;
  onChartTypeChange: (t: ChartType) => void;
  onTimeRangeChange: (r: TimeRange) => void;
  isLoading: boolean;
}

export { type ChartType };

export const ChartToolbar = memo(function ChartToolbar({
  chartType, timeRange, onChartTypeChange, onTimeRangeChange, isLoading,
}: ChartToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      {/* Time range */}
      <div className="flex w-full items-center gap-0.5 bg-white/[0.04] rounded-lg p-0.5 border border-border/30">
        {TIME_RANGES.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => onTimeRangeChange(value)}
            disabled={isLoading}
            className={`flex-1 min-w-0 px-1.5 sm:px-2.5 py-1 text-[10px] sm:text-xs font-medium rounded-md transition-all ${
  timeRange === value
    ? 'bg-white/10 text-foreground shadow-sm'
    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
} disabled:opacity-50`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Chart type */}
      <div className="flex items-center gap-0.5 bg-white/[0.04] rounded-lg p-0.5 border border-border/30">
        {CHART_TYPES.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => onChartTypeChange(value)}
            disabled={isLoading}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              chartType === value
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            } disabled:opacity-50`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
});
