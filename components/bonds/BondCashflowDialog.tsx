'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

import { Calendar, CheckCircle2, Clock, AlertCircle, RefreshCw, Landmark, ArrowUpRight } from 'lucide-react';
import type { NsdlCashFlowResponse, NsdlCashFlowItem } from '@/types/bonds';
import { format, parseISO, isValid, isBefore, isAfter, startOfDay } from 'date-fns';

interface BondCashflowDialogProps {
  isin: string;
  securityName: string;
  unitsHeld?: number;
  faceValue?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr || dateStr === '-' || dateStr === 'NA') return null;
  // Try ISO format YYYY-MM-DD
  let parsed = parseISO(dateStr);
  if (isValid(parsed)) return parsed;

  // Try DD-MM-YYYY or DD/MM/YYYY
  const parts = dateStr.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      parsed = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    } else {
      parsed = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    if (isValid(parsed)) return parsed;
  }
  return null;
}

function formatDate(dateStr: string | undefined): string {
  const d = parseDate(dateStr);
  if (!d) return dateStr || '—';
  return format(d, 'dd MMM yyyy');
}

function fmtVal(v: number) {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function BondCashflowDialog({
  isin,
  securityName,
  unitsHeld = 0,
  faceValue = 0,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  trigger,
}: BondCashflowDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) setInternalOpen(newOpen);
    setControlledOpen?.(newOpen);
  };

  const [data, setData] = useState<NsdlCashFlowResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('upcoming');
  const cacheRef = useRef<Record<string, NsdlCashFlowResponse>>({});

  const fetchCashflow = async (force = false) => {
    if (!isin) return;

    if (!force && cacheRef.current[isin]) {
      setData(cacheRef.current[isin]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bonds/cashflow?isin=${encodeURIComponent(isin)}&force=${force}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const json: NsdlCashFlowResponse = await res.json();
      
      if (json.status === 200 || json.cashFlowSchedule.length > 0) {
        cacheRef.current[isin] = json;
      }
      
      setData(json);
      if (json.status !== 200 && json.cashFlowSchedule.length === 0) {
        setError(json.message || 'No cashflow data returned from NSDL');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load cashflow data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && isin) {
      fetchCashflow();
    }
  }, [isOpen, isin]);

  const schedule = useMemo(() => {
    if (!data?.cashFlowSchedule) return [];
    const today = startOfDay(new Date());

    return data.cashFlowSchedule.map((item) => {
      const pDate = parseDate(item.dueDate || item.paymentDate);
      const isPast = pDate ? isBefore(pDate, today) : false;
      const amtPerUnit = typeof item.amountPayable === 'number'
        ? item.amountPayable
        : parseFloat(String(item.amountPayable || '0').replace(/,/g, '')) || 0;
      const totalAmt = unitsHeld > 0 ? amtPerUnit * unitsHeld : amtPerUnit;

      return {
        ...item,
        parsedDueDate: pDate,
        isPast,
        amtPerUnit,
        totalAmt,
      };
    });
  }, [data, unitsHeld]);

  const filteredSchedule = useMemo(() => {
    if (filter === 'upcoming') return schedule.filter((s) => !s.isPast);
    if (filter === 'completed') return schedule.filter((s) => s.isPast);
    return schedule;
  }, [schedule, filter]);

  const upcomingCount = useMemo(() => schedule.filter((s) => !s.isPast).length, [schedule]);
  const completedCount = useMemo(() => schedule.filter((s) => s.isPast).length, [schedule]);

  const totalUpcomingPayout = useMemo(() => {
    return schedule
      .filter((s) => !s.isPast)
      .reduce((sum, item) => sum + item.totalAmt, 0);
  }, [schedule]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-[90vw] lg:max-w-5xl max-h-[90vh] flex flex-col bg-[#0f172a] border-border/60 shadow-2xl p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border/40 bg-muted/20">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-emerald-400" />
                <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                  {securityName}
                </DialogTitle>
                <Badge variant="outline" className="text-[11px] font-mono border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                  {isin}
                </Badge>
              </div>
            </div>
            {data && (
              <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 whitespace-nowrap">
                Official NSDL BDS Data
              </Badge>
            )}
          </div>

          {/* Quick Metrics Bar */}
          {data && schedule.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-border/30">
              <div className="bg-card/60 p-2.5 rounded-lg border border-border/40">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">Total Payouts</p>
                <p className="text-sm font-bold text-foreground mt-0.5">{schedule.length} Events</p>
              </div>
              <div className="bg-card/60 p-2.5 rounded-lg border border-border/40">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">Upcoming</p>
                <p className="text-sm font-bold text-amber-400 mt-0.5">{upcomingCount} Events</p>
              </div>
              <div className="bg-card/60 p-2.5 rounded-lg border border-border/40">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                  {unitsHeld > 0 ? 'Upcoming Cashflow' : 'Payout / Unit'}
                </p>
                <p className="text-sm font-bold text-emerald-400 mt-0.5">
                  {fmtVal(totalUpcomingPayout)}
                </p>
              </div>
            </div>
          )}
        </DialogHeader>

        {/* Filter Toolbar */}
        {data && schedule.length > 0 && (
          <div className="px-6 py-2.5 bg-muted/10 border-b border-border/30 flex items-center justify-between">
            <div className="flex items-center gap-1.5 bg-card/80 p-1 rounded-lg border border-border/40">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  filter === 'all'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All ({schedule.length})
              </button>
              <button
                onClick={() => setFilter('upcoming')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  filter === 'upcoming'
                    ? 'bg-amber-500 text-black shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Upcoming ({upcomingCount})
              </button>
              <button
                onClick={() => setFilter('completed')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  filter === 'completed'
                    ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Past ({completedCount})
              </button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchCashflow(true)}
              disabled={isLoading}
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden p-6 pt-3">
          {isLoading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-8 w-full bg-white/5" />
              <Skeleton className="h-12 w-full bg-white/5" />
              <Skeleton className="h-12 w-full bg-white/5" />
              <Skeleton className="h-12 w-full bg-white/5" />
              <Skeleton className="h-12 w-full bg-white/5" />
            </div>
          ) : error && schedule.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
              <p className="text-sm font-medium text-foreground">{error}</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Official BDS coupon details could not be retrieved from NSDL for ISIN <span className="font-mono text-foreground">{isin}</span>.
              </p>
              <Button variant="outline" size="sm" onClick={() => fetchCashflow(true)} className="mt-2">
                <RefreshCw className="w-3.5 h-3.5 mr-2" /> Try Again
              </Button>
            </div>
          ) : filteredSchedule.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-xs">
              No cashflow events found for filter "{filter}".
            </div>
          ) : (
            <Table wrapperClassName="h-[380px] overflow-y-auto pr-2 custom-scrollbar">
              <TableHeader className="sticky top-0 bg-[#0f172a] z-20">
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-xs font-semibold text-muted-foreground">Event Type</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">Record Date</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">Due / Payout Date</TableHead>
                    {unitsHeld > 0 ? (
                      <TableHead className="text-xs font-semibold text-muted-foreground text-right">Total Amount (₹)</TableHead>
                    ) : (
                      <TableHead className="text-xs font-semibold text-muted-foreground text-right">Per Unit (₹)</TableHead>
                    )}
                    <TableHead className="text-xs font-semibold text-muted-foreground text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSchedule.map((item, idx) => {
                    const isRedemption = item.cashFlowsEvent?.toLowerCase().includes('redemption');
                    const isInterest = item.cashFlowsEvent?.toLowerCase().includes('interest');

                    return (
                      <TableRow key={idx} className="border-border/30 hover:bg-white/[0.02]">
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              isRedemption ? 'bg-purple-400' : isInterest ? 'bg-emerald-400' : 'bg-blue-400'
                            }`} />
                            <span className="text-xs font-semibold text-foreground">
                              {item.cashFlowsEvent || 'Coupon Payment'}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-xs tabular-nums text-muted-foreground">
                          {formatDate(item.recordDate || item.actualRecordDate)}
                        </TableCell>

                        <TableCell className="text-xs tabular-nums font-medium text-foreground">
                          {formatDate(item.dueDate || item.paymentDate)}
                        </TableCell>

                        {unitsHeld > 0 ? (
                          <TableCell className={`text-xs tabular-nums text-right font-bold font-mono ${
                            item.isPast ? 'text-muted-foreground' : 'text-emerald-400'
                          }`}>
                            {fmtVal(item.totalAmt)}
                          </TableCell>
                        ) : (
                          <TableCell className="text-xs tabular-nums text-right font-mono font-medium text-foreground">
                            ₹{item.amtPerUnit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </TableCell>
                        )}

                        <TableCell className="text-center">
                          {item.isPast ? (
                            <Badge variant="outline" className="text-[10px] border-emerald-500/20 text-emerald-400 bg-emerald-500/5">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Paid
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400 bg-amber-500/10">
                              <Clock className="w-3 h-3 mr-1" /> Upcoming
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-border/40 bg-muted/20 flex items-center justify-end text-xs text-muted-foreground">
          {data?.fetchedAt && (
            <span className="text-[11px] text-muted-foreground/60">
              Fetched: {format(parseISO(data.fetchedAt), 'HH:mm:ss')}
            </span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
