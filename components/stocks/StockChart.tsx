'use client';

import { memo, useEffect, useRef, useCallback, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Check } from 'lucide-react';
import type { Candle } from '@/hooks/useStockDetails';
import type { ChartType } from './ChartToolbar';

interface StockChartProps {
  candles: Candle[];
  chartType: ChartType;
  timeRange: string;
  isLoading: boolean;
  isPositive?: boolean;
}

export const StockChart = memo(function StockChart({
  candles,
  chartType,
  timeRange,
  isLoading,
  isPositive = true,
}: StockChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRef = useRef<any>(null);

  const upColor = '#10b981';
  const downColor = '#f43f5e';
  const lineColor = isPositive ? upColor : downColor;

  const [measure, setMeasure] = useState<{ startLogical: number, endLogical: number, startX: number, endX: number } | null>(null);
  const [hoverData, setHoverData] = useState<{ x: number; y: number; time: number; candle: Candle } | null>(null);
  const [showVolume, setShowVolume] = useState(true);
  const isDragging = useRef(false);
  const isHoveringLegend = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const volumeSeriesRef = useRef<any>(null);

  const destroyChart = useCallback(() => {
    if (chartRef.current) {
      try { chartRef.current.remove(); } catch { /* already removed */ }
      chartRef.current = null;
      seriesRef.current = null;
      volumeSeriesRef.current = null;
    }
  }, []);

  const buildChart = useCallback(async () => {
    if (!containerRef.current || candles.length === 0) return;

    destroyChart();

    const { createChart, ColorType, CrosshairMode, CandlestickSeries, AreaSeries, LineSeries } = await import('lightweight-charts');

    // Sort candles by time
    let sorted = [...candles].sort((a, b) => a.time - b.time);

    let topMargin = 0.1;
    if (chartType === 'candlestick' && sorted.length > 0) {
      let maxHigh = -Infinity;
      let minLow = Infinity;
      sorted.forEach(c => {
        if (c.high !== undefined) {
          if (c.high > maxHigh) maxHigh = c.high;
          if (c.low !== undefined && c.low < minLow) minLow = c.low;
        }
      });
      let maxRightHigh = -Infinity;
      const rightIndex = Math.floor(sorted.length * 0.65);
      for (let i = rightIndex; i < sorted.length; i++) {
        if (sorted[i].high !== undefined && sorted[i].high > maxRightHigh) {
          maxRightHigh = sorted[i].high;
        }
      }
      if (maxHigh > -Infinity && minLow < Infinity && maxHigh > minLow) {
        const rightHighRatio = (maxHigh - maxRightHigh) / (maxHigh - minLow);
        if (rightHighRatio < 0.3) {
          topMargin = 0.3;
        }
      }
    }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 300,
      localization: {
        timeFormatter: (time: number) => {
          const d = new Date(time * 1000);
          return d.toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: '2-digit',
            hour: '2-digit', minute: '2-digit'
          });
        }
      },
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#94a3b8',
        fontSize: 11,
        fontFamily: "'Inter', sans-serif",
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(255,255,255,0.2)', width: 1, style: 3, labelVisible: false },
        horzLine: { color: 'rgba(255,255,255,0.2)', width: 1, style: 3, labelVisible: true },
      },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)', scaleMargins: { top: topMargin, bottom: 0.1 } },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.1)',
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time: number, tickMarkType: number) => {
          const d = new Date(time * 1000);
          if (tickMarkType === 0) return d.getFullYear().toString();
          if (tickMarkType === 1) return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
          if (tickMarkType === 2) return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
          if (tickMarkType === 3 || tickMarkType === 4) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
          return d.toLocaleDateString('en-IN');
        }
      },
      handleScroll: false,
      handleScale: false,
    });

    chartRef.current = chart;

    if (timeRange === '1d' && sorted.length > 0) {
      const firstCandleTime = sorted[0].time;
      const d = new Date(firstCandleTime * 1000);
      const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'numeric', day: 'numeric' });
      const parts = formatter.formatToParts(d);
      const year = parts.find(p => p.type === 'year')!.value;
      const month = parts.find(p => p.type === 'month')!.value;
      const day = parts.find(p => p.type === 'day')!.value;

      const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T03:45:00Z`;
      const marketOpenTime = Math.floor(new Date(dateStr).getTime() / 1000);
      const endTime = marketOpenTime + 74 * 300; // 15:25 IST

      const lastTime = sorted[sorted.length - 1].time;
      if (lastTime < endTime) {
         let nextTime = lastTime + 300;
         nextTime = Math.ceil(nextTime / 300) * 300;
         while (nextTime <= endTime) {
           sorted.push({ time: nextTime } as any);
           nextTime += 300;
         }
      }
    }

    let series;
    if (chartType === 'candlestick') {
      series = chart.addSeries(CandlestickSeries, {
        upColor,
        downColor,
        borderUpColor: upColor,
        borderDownColor: downColor,
        wickUpColor: upColor,
        wickDownColor: downColor,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      series.setData(sorted.map((c) => {
        if (c.close === undefined) return { time: c.time as unknown as string };
        return {
          time: c.time as unknown as string,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        };
      }));

      const { HistogramSeries } = await import('lightweight-charts');
      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: '#26a69a',
        priceFormat: { type: 'volume' },
        priceScaleId: '', 
        visible: showVolume,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      chart.priceScale('').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });
      volumeSeries.setData(sorted.map(c => {
        if (c.close === undefined) return { time: c.time as unknown as string };
        const isUp = c.close >= c.open;
        return {
          time: c.time as unknown as string,
          value: c.volume || 0,
          color: isUp ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'
        };
      }));
      volumeSeriesRef.current = volumeSeries;
    } else if (chartType === 'area') {
      series = chart.addSeries(AreaSeries, {
        lineColor,
        topColor: `${lineColor}40`,
        bottomColor: `${lineColor}04`,
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBackgroundColor: lineColor,
      });
      series.setData(sorted.map((c) => {
        if (c.close === undefined) return { time: c.time as unknown as string };
        return { time: c.time as unknown as string, value: c.close };
      }));
    } else {
      series = chart.addSeries(LineSeries, {
        color: lineColor,
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBackgroundColor: lineColor,
      });
      series.setData(sorted.map((c) => {
        if (c.close === undefined) return { time: c.time as unknown as string };
        return { time: c.time as unknown as string, value: c.close };
      }));
    }

    seriesRef.current = series;
    chart.timeScale().fitContent();

    const handleCrosshairMove = (param: any) => {
      if (
        param.point === undefined ||
        !param.time ||
        param.point.x < 0 ||
        param.point.x > containerRef.current!.clientWidth ||
        param.point.y < 0 ||
        param.point.y > containerRef.current!.clientHeight
      ) {
        if (!isHoveringLegend.current) {
          setHoverData(null);
        }
      } else {
        const data = param.seriesData.get(series);
        if (data && (data.value !== undefined || data.close !== undefined)) {
          const candle = sorted.find((c) => c.time === param.time);
          if (candle && candle.close !== undefined) {
            setHoverData({
              x: param.point.x,
              y: param.point.y,
              time: param.time,
              candle,
            });
          } else {
            setHoverData(null);
          }
        } else {
          setHoverData(null);
        }
      }
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);

    // Resize observer
    const ro = new ResizeObserver((entries) => {
      if (entries[0] && chartRef.current) {
        chartRef.current.applyOptions({ width: entries[0].contentRect.width });
      }
    });
    ro.observe(containerRef.current);

    return () => ro.disconnect();
  }, [candles, chartType, lineColor, destroyChart]); // intentionally omitting showVolume to avoid full rebuild

  useEffect(() => {
    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.applyOptions({ visible: showVolume });
    }
  }, [showVolume]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    buildChart().then((fn) => { if (fn) cleanup = fn; });
    return () => {
      cleanup?.();
      destroyChart();
    };
  }, [buildChart, destroyChart]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const chart = chartRef.current;
      if (!chart) return;
      
      const logical = chart.timeScale().coordinateToLogical(x);
      if (logical === null) return;

      isDragging.current = true;
      setMeasure({ startLogical: logical, endLogical: logical, startX: x, endX: x });
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const rect = container.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const chart = chartRef.current;
      if (!chart) return;
      
      const logical = chart.timeScale().coordinateToLogical(x);
      if (logical === null) return;
      
      setMeasure(prev => prev ? { ...prev, endX: x, endLogical: logical } : null);
    };

    const handleMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      setMeasure(prev => {
        if (prev && Math.abs(prev.startX - prev.endX) < 5) return null;
        return prev;
      });
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const rect = container.getBoundingClientRect();
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      const chart = chartRef.current;
      if (!chart) return;
      
      const logical = chart.timeScale().coordinateToLogical(x);
      if (logical === null) return;

      isDragging.current = true;
      setMeasure({ startLogical: logical, endLogical: logical, startX: x, endX: x });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      const rect = container.getBoundingClientRect();
      const touch = e.touches[0];
      const x = Math.max(0, Math.min(touch.clientX - rect.left, rect.width));
      const chart = chartRef.current;
      if (!chart) return;
      
      const logical = chart.timeScale().coordinateToLogical(x);
      if (logical === null) return;
      
      setMeasure(prev => prev ? { ...prev, endX: x, endLogical: logical } : null);
    };

    const handleTouchEnd = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      setMeasure(prev => {
        if (prev && Math.abs(prev.startX - prev.endX) < 5) return null;
        return prev;
      });
    };

    container.addEventListener('mousedown', handleMouseDown, { capture: true });
    window.addEventListener('mousemove', handleMouseMove, { capture: true });
    window.addEventListener('mouseup', handleMouseUp, { capture: true });
    
    return () => {
      container.removeEventListener('mousedown', handleMouseDown, { capture: true });
      window.removeEventListener('mousemove', handleMouseMove, { capture: true });
      window.removeEventListener('mouseup', handleMouseUp, { capture: true });
    };
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-[300px] w-full bg-white/[0.03] rounded-xl" />
      </div>
    );
  }

  const renderMeasure = () => {
    if (!measure || !candles.length) return null;
    const { startLogical, endLogical, startX, endX } = measure;
    if (Math.abs(startX - endX) < 5) return null;

    const minX = Math.min(startX, endX);
    const width = Math.abs(startX - endX);

    const sIndex = Math.max(0, Math.min(candles.length - 1, Math.round(startLogical)));
    const eIndex = Math.max(0, Math.min(candles.length - 1, Math.round(endLogical)));
    
    const startC = candles[Math.min(sIndex, eIndex)];
    const endC = candles[Math.max(sIndex, eIndex)];
    if (!startC || !endC) return null;
    
    const change = endC.close - startC.close;
    const changePct = (change / startC.close) * 100;
    const isPos = change >= 0;

    const fmtTime = (t: number) => {
       const d = new Date(t * 1000);
       return d.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    return (
      <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: minX, width, zIndex: 10 }}>
        <div className="absolute inset-0 bg-blue-500/10 border-x border-blue-500/50 border-dashed" />
        <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-[#1e2329] border border-white/10 rounded px-3 py-1.5 shadow-xl whitespace-nowrap flex items-center gap-2 text-xs">
           <span className={`font-semibold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
             {isPos ? '+' : ''}{change.toFixed(2)} ({isPos ? '+' : ''}{changePct.toFixed(2)}%)
           </span>
           <span className="text-muted-foreground">
             {fmtTime(startC.time)} - {fmtTime(endC.time)}
           </span>
        </div>
      </div>
    );
  };

  const renderHoverInfo = () => {
    if (measure && Math.abs(measure.startX - measure.endX) >= 5) return null;

    let activeCandle = hoverData?.candle;
    if (!activeCandle) {
       for (let i = candles.length - 1; i >= 0; i--) {
         if (candles[i].close !== undefined) {
           activeCandle = candles[i];
           break;
         }
       }
    }
    if (!activeCandle) return null;

    const isUp = activeCandle.close >= activeCandle.open;
    const colorClass = isUp ? 'text-emerald-400' : 'text-rose-400';
    const cw = containerRef.current?.clientWidth || 500;

    let timeBadgeNode = null;
    if (hoverData) {
      const { x, candle } = hoverData;
      const d = new Date(candle.time * 1000);
      let topLabel = '';
      if (chartType === 'candlestick') {
         topLabel = d.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      } else {
         if (timeRange === '1d') {
            topLabel = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' • ₹' + candle.close.toFixed(2);
         } else {
            topLabel = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ' • ₹' + candle.close.toFixed(2);
         }
      }

      const leftPos = Math.max(40, Math.min(x, cw - 40));
      const isNearRight = x > cw - 300;

      let timeBadgeTop: number | undefined = undefined;
      if (chartType === 'candlestick') {
        const series = seriesRef.current;
        if (series) {
          const highY = series.priceToCoordinate(candle.high);
          const lowY = series.priceToCoordinate(candle.low);
          if (highY !== null && lowY !== null) {
            const defaultTop = highY - 42;
            if (isNearRight && defaultTop < 100) {
              // Collides with top-right legend, place below the candlestick
              timeBadgeTop = lowY + 10;
            } else {
              // Place above the candlestick
              timeBadgeTop = Math.max(10, defaultTop);
            }
          }
        }
        if (timeBadgeTop === undefined) {
           timeBadgeTop = Math.max(10, hoverData.y - 40);
        }
      }

      const timeBadgeClass = chartType === 'candlestick'
        ? "absolute -translate-x-1/2 bg-[#1e2329] border border-white/10 rounded px-2 py-1 shadow text-[10px] text-muted-foreground whitespace-nowrap z-20 pointer-events-none"
        : "absolute top-2 -translate-x-1/2 bg-[#1e2329] border border-white/10 rounded px-2 py-1 shadow text-[10px] text-muted-foreground whitespace-nowrap z-20 pointer-events-none";

      timeBadgeNode = (
        <>
          <div 
            className="absolute top-0 bottom-0 border-l border-white/20 border-dashed pointer-events-none z-10"
            style={{ left: x }}
          />
          <div 
            className={timeBadgeClass}
            style={{ left: leftPos, top: timeBadgeTop }}
          >
            {topLabel}
          </div>
        </>
      );
    }

    return (
      <>
        {timeBadgeNode}
        {chartType === 'candlestick' && (
          <div 
            className="absolute top-2 right-14 md:right-20 flex flex-col items-end gap-1.5 text-[11px] z-30 pointer-events-auto"
            onMouseEnter={() => { isHoveringLegend.current = true; }}
            onMouseLeave={() => { isHoveringLegend.current = false; }}
          >
             <div className="flex flex-wrap justify-end gap-x-2 md:gap-x-3 gap-y-1 bg-[#1e2329]/80 backdrop-blur border border-white/5 rounded px-2 md:px-2.5 py-1 text-muted-foreground shadow-sm max-w-[220px] md:max-w-none">
               <span>Price</span>
               <span className="whitespace-nowrap">O <span className={colorClass}>{activeCandle.open.toFixed(2)}</span></span>
               <span className="whitespace-nowrap">H <span className={colorClass}>{activeCandle.high.toFixed(2)}</span></span>
               <span className="whitespace-nowrap">L <span className={colorClass}>{activeCandle.low.toFixed(2)}</span></span>
               <span className="whitespace-nowrap">C <span className={colorClass}>{activeCandle.close.toFixed(2)}</span></span>
             </div>
             {activeCandle.volume > 0 && (
               <div 
                 className="flex items-center gap-2 bg-[#1e2329]/80 backdrop-blur border border-white/5 rounded px-2.5 py-1 text-muted-foreground shadow-sm cursor-pointer hover:bg-white/5 transition-colors"
                 onClick={() => setShowVolume(!showVolume)}
               >
                 <div className={`w-3.5 h-3.5 rounded flex items-center justify-center transition-colors ${showVolume ? 'bg-emerald-500 text-white' : 'border border-white/20'}`}>
                   {showVolume && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                 </div>
                 <span>Volume</span>
                 <span className="text-foreground font-medium">{activeCandle.volume.toLocaleString('en-IN')}</span>
               </div>
             )}
          </div>
        )}
      </>
    );
  };

  return (
    <div className="relative rounded-xl overflow-hidden border border-border/20 select-none">
      <div ref={containerRef} className="w-full" style={{ height: 300 }} />
      {renderMeasure()}
      {renderHoverInfo()}
    </div>
  );
});
