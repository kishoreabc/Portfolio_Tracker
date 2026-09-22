'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PlusCircle, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface AddOrderFormProps {
  onOrderAdded?: () => void;
  className?: string;
}

export function AddOrderForm({ onOrderAdded, className = '' }: AddOrderFormProps) {
  const queryClient = useQueryClient();

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [symbol, setSymbol] = useState('');
  const [orderType, setOrderType] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auto-compute total order value
  const numQty = parseFloat(quantity) || 0;
  const numPrice = parseFloat(price) || 0;
  const totalValue = numQty * numPrice;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!symbol.trim()) {
      setErrorMsg('Please enter a stock symbol.');
      return;
    }
    if (numQty <= 0) {
      setErrorMsg('Quantity must be greater than 0.');
      return;
    }
    if (totalValue <= 0) {
      setErrorMsg('Total order value must be greater than 0. Enter a valid price.');
      return;
    }

    setIsSubmitting(true);

    try {
      const executedAt = new Date(`${date}T${time || '10:00'}:00.000Z`).toISOString();
      const payload = {
        symbol: symbol.toUpperCase().trim(),
        orderType,
        quantity: numQty,
        value: totalValue,
        executedAt,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || data.error || 'Failed to save order.');
      }

      setSuccessMsg(`Order for ${payload.quantity} ${payload.symbol} saved successfully!`);
      queryClient.invalidateQueries({ queryKey: ['orders'] });

      // Reset form
      setSymbol('');
      setQuantity('');
      setPrice('');

      onOrderAdded?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className={`border border-border/60 shadow-sm ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <PlusCircle className="w-4 h-4 text-primary" />
          Add Executed Order
        </CardTitle>
        <CardDescription className="text-xs">
          Record an order matching your tradebook columns: Symbol, Type, Quantity, Value, and Date.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {/* Symbol */}
            <div>
              <label className="block font-medium text-muted-foreground mb-1">Symbol *</label>
              <Input
                type="text"
                placeholder="e.g. ITC, NATCOPHARM"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                required
                className="text-xs h-9 uppercase font-mono"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block font-medium text-muted-foreground mb-1">Order Type *</label>
              <div className="flex rounded-md border border-input p-0.5 bg-muted/40 h-9">
                <button
                  type="button"
                  onClick={() => setOrderType('BUY')}
                  className={`flex-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                    orderType === 'BUY'
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  BUY
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('SELL')}
                  className={`flex-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                    orderType === 'SELL'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  SELL
                </button>
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="block font-medium text-muted-foreground mb-1">Quantity *</label>
              <Input
                type="number"
                step="any"
                min="0.001"
                placeholder="e.g. 1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                className="text-xs h-9 font-mono"
              />
            </div>

            {/* Price */}
            <div>
              <label className="block font-medium text-muted-foreground mb-1">Price per Share (₹) *</label>
              <Input
                type="number"
                step="any"
                min="0.01"
                placeholder="e.g. 970.80"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className="text-xs h-9 font-mono"
              />
            </div>

            {/* Total Value (Calculated) */}
            <div>
              <label className="block font-medium text-muted-foreground mb-1">Total Value</label>
              <div className="h-9 px-3 flex items-center rounded-md border border-input bg-muted/20 text-xs font-mono font-semibold text-foreground">
                {totalValue > 0
                  ? `₹${totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : '₹0.00'}
              </div>
            </div>

            {/* Execution Date */}
            <div>
              <label className="block font-medium text-muted-foreground mb-1">Execution Date *</label>
              <div className="flex gap-1.5">
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="text-xs h-9 flex-1"
                />
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="text-xs h-9 w-24 font-mono"
                />
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving Order...
                </>
              ) : (
                <>
                  <PlusCircle className="w-3.5 h-3.5" />
                  Save Order
                </>
              )}
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
