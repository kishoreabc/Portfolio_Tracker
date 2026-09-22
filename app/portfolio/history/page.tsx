'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  Layers,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Wallet,
  Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Topbar } from '@/components/layout/Topbar';
import { PortfolioPerformanceChart } from '@/components/charts/PortfolioPerformanceChart';
import { AddOrderForm } from '@/components/orders/AddOrderForm';
import { useOrders } from '@/hooks/useOrders';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { usePrivacy, PRIVACY_MASK } from '@/lib/privacy-context';

function formatINR(v: number, isHidden: boolean = false) {
  if (isHidden) return PRIVACY_MASK;
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)} L`;
  return `${sign}₹${abs.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function OrderHistoryPage() {
  const { orders, isLoading, refetch } = useOrders('ALL');
  const { netWorth, equity, bonds } = usePortfolioData();
  const { isHidden } = usePrivacy();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;



  // Compute aggregate stats from stored orders and current holdings
  const stats = useMemo(() => {
    let buyTotal = 0;
    let sellTotal = 0;
    let buyCount = 0;
    let sellCount = 0;

    orders.forEach((o) => {
      if (o.orderType === 'BUY') {
        buyTotal += o.value;
        buyCount++;
      } else {
        sellTotal += o.value;
        sellCount++;
      }
    });

    const netCapital = buyTotal - sellTotal;
    const currentHoldingsValue = netWorth || 286624.59;
    const overallPnL = currentHoldingsValue - netCapital;
    const pnlPct = netCapital > 0 ? (overallPnL / netCapital) * 100 : 0;

    return {
      buyTotal,
      sellTotal,
      buyCount,
      sellCount,
      netCapital,
      currentHoldingsValue,
      overallPnL,
      pnlPct,
    };
  }, [orders, netWorth]);

  // Filter and sort orders
  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => {
        if (typeFilter !== 'ALL' && o.orderType !== typeFilter) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          return o.symbol.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime());
  }, [orders, typeFilter, search]);

  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage]);
  return (
    <>
      <Topbar pageTitle="Order History & Capital Deployed" />

      <div className="p-3 sm:p-4 md:p-6 space-y-6 animate-fade-in-up">
        {/* Capital Deployed Full-Width Chart */}
        <PortfolioPerformanceChart initialRange="ALL" showHistory={false} />

        {/* Summary Metric Cards — Reconciling Current Holdings & Order History */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <Card className="border-border/60">
            <CardContent className="p-4 space-y-1">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1 text-blue-400">
                <Wallet className="w-3.5 h-3.5" /> Current Holdings
              </span>
              <p className="text-xl font-bold text-blue-400 tabular-nums">
                {formatINR(stats.currentHoldingsValue, isHidden)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {equity.length + bonds.length} active holdings (live value)
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="p-4 space-y-1">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1 text-foreground">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Capital Deployed
              </span>
              <p className="text-xl font-bold text-foreground tabular-nums">
                {formatINR(stats.netCapital, isHidden)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Cumulative across {orders.length} orders
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="p-4 space-y-1">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-indigo-400" /> Net Return (P&amp;L)
              </span>
              <div className="flex items-baseline gap-1.5">
                <p className={`text-xl font-bold tabular-nums ${stats.overallPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatINR(stats.overallPnL, isHidden)}
                </p>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-semibold border-0 px-1 py-0 ${
                    stats.overallPnL >= 0
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-rose-500/15 text-rose-400'
                  }`}
                >
                  {stats.overallPnL >= 0 ? '+' : ''}{stats.pnlPct.toFixed(2)}%
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Holdings &minus; Capital Deployed
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="p-4 space-y-1">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1 text-emerald-400">
                <TrendingUp className="w-3.5 h-3.5" /> Buy / Sell Flows
              </span>
              <p className="text-sm font-bold text-foreground tabular-nums">
                <span className="text-emerald-400">+{formatINR(stats.buyTotal, isHidden)}</span>
                <span className="text-muted-foreground font-normal text-xs mx-1">/</span>
                <span className="text-rose-400">-{formatINR(stats.sellTotal, isHidden)}</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                {stats.buyCount} buys, {stats.sellCount} sells
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60 col-span-2 sm:col-span-1">
            <CardContent className="p-4 space-y-1">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-primary" /> Stored Records
              </span>
              <p className="text-xl font-bold text-foreground tabular-nums">
                {orders.length}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Composite trade key deduplicated
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Add Order Form */}
        <AddOrderForm onOrderAdded={refetch} />

        {/* Orders Table */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  Executed Orders
                </CardTitle>
                <CardDescription className="text-xs">
                  Showing {filteredOrders.length} of {orders.length} orders
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search */}
                <div className="relative w-48 sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search symbol..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-8 text-xs h-8"
                  />
                </div>

                {/* Filter */}
                <div className="flex items-center rounded-lg bg-muted/60 p-0.5 border border-border/40 text-xs">
                  {(['ALL', 'BUY', 'SELL'] as const).map((t) => {
                    const isSelected = typeFilter === t;
                    let activeClasses = 'bg-background text-foreground shadow-xs font-semibold';
                    let inactiveClasses = 'text-muted-foreground hover:text-foreground';

                    if (t === 'BUY') {
                      activeClasses = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-xs font-bold';
                      inactiveClasses = 'text-emerald-500/70 hover:text-emerald-400 hover:bg-emerald-500/10';
                    } else if (t === 'SELL') {
                      activeClasses = 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-xs font-bold';
                      inactiveClasses = 'text-rose-500/70 hover:text-rose-400 hover:bg-rose-500/10';
                    }

                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setTypeFilter(t);
                          setCurrentPage(1);
                        }}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                          isSelected ? activeClasses : inactiveClasses
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase">Date & Time</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase">Type</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase">Symbol</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase text-right">Quantity</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase text-right">Avg. Price</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase text-right">Total Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i} className="border-border/30">
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 bg-white/5" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : paginatedOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                        No orders match your search or filter criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedOrders.map((order) => {
                      const isBuy = order.orderType === 'BUY';
                      const avgPrice = order.quantity > 0 ? order.value / order.quantity : 0;
                      return (
                        <TableRow
                          key={order.id || `${order.symbol}-${order.executedAt}`}
                          className={`border-border/30 transition-colors ${
                            isBuy
                              ? 'hover:bg-emerald-500/[0.06]'
                              : 'hover:bg-rose-500/[0.06]'
                          }`}
                        >
                          <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                            {new Date(order.executedAt).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider ${
                                isBuy
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.15)]'
                              }`}
                            >
                              {order.orderType}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs font-bold font-mono text-foreground">
                            {order.symbol}
                          </TableCell>
                          <TableCell
                            className={`text-xs text-right font-mono font-semibold tabular-nums ${
                              isBuy ? 'text-emerald-400/90' : 'text-rose-400/90'
                            }`}
                          >
                            {isBuy ? '+' : '-'}{order.quantity}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono tabular-nums text-muted-foreground">
                            {formatINR(avgPrice, isHidden)}
                          </TableCell>
                          <TableCell
                            className={`text-xs text-right font-mono font-bold tabular-nums ${
                              isBuy ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isHidden ? (
                              <span className={isBuy ? 'text-emerald-400/70' : 'text-rose-400/70'}>
                                {PRIVACY_MASK}
                              </span>
                            ) : (
                              <span>
                                {isBuy ? '+' : '-'}{formatINR(order.value, false)}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-3 border-t border-border/40 text-xs text-muted-foreground">
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1 rounded hover:bg-muted disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1 rounded hover:bg-muted disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
