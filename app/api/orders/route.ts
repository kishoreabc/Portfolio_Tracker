import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';
import { buildPerformanceHistory } from '@/lib/calc/performance';
import { methodNotAllowed, privateNoStoreHeaders, safeErrorResponse, unauthorizedResponse } from '@/lib/server/apiHelpers';
import type { Order, PerformanceRange } from '@/types/orders';

/**
 * GET /api/orders?range=1Y
 * Returns orders from Supabase and the computed PerformanceHistory.
 * Requires authentication.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorizedResponse();

  const range = (request.nextUrl.searchParams.get('range') ?? 'ALL') as PerformanceRange;

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id, symbol, order_type, quantity, value, executed_at, created_at')
      .order('executed_at', { ascending: true });

    if (error) throw new Error(error.message);

    // Map DB rows to Order type
    const orders: Order[] = (data ?? []).map((row) => ({
      id: row.id,
      symbol: row.symbol,
      orderType: row.order_type as 'BUY' | 'SELL',
      quantity: Number(row.quantity),
      value: Number(row.value),
      executedAt: row.executed_at,
      createdAt: row.created_at,
    }));

    const performanceHistory = buildPerformanceHistory(orders, range);

    return NextResponse.json(
      { orders, performanceHistory },
      { headers: privateNoStoreHeaders }
    );
  } catch (err) {
    return safeErrorResponse('api/orders', err, 'Failed to load order history');
  }
}

/**
 * POST /api/orders
 * Manually add a single order. Duplicate protection via composite index.
 * Requires authentication.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { symbol, orderType, quantity, value, executedAt } = body;

    // Basic validation — only the 5 essential fields are required
    if (!symbol || !orderType || !quantity || !value || !executedAt) {
      return NextResponse.json(
        { error: 'Missing required fields: symbol, orderType, quantity, value, executedAt' },
        { status: 400 }
      );
    }

    const normalizedType = orderType.toUpperCase().trim();
    if (!['BUY', 'SELL'].includes(normalizedType)) {
      return NextResponse.json({ error: 'orderType must be BUY or SELL' }, { status: 400 });
    }

    const cleanSymbol = symbol.toUpperCase().trim();
    const cleanQty = Number(quantity);
    const cleanVal = Number(value);
    const isoExecutedAt = new Date(executedAt).toISOString();

    const { data, error } = await supabase
      .from('orders')
      .insert([{
        symbol: cleanSymbol,
        order_type: normalizedType,
        quantity: cleanQty,
        value: cleanVal,
        executed_at: isoExecutedAt,
      }])
      .select()
      .single();

    if (error) {
      // Duplicate key violation on composite index (symbol, order_type, quantity, value, executed_at)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'An identical order already exists on this execution date and time. Duplicate not added.' },
          { status: 409 }
        );
      }
      throw new Error(error.message);
    }

    const createdOrder: Order = {
      id: data.id,
      symbol: data.symbol,
      orderType: data.order_type as 'BUY' | 'SELL',
      quantity: Number(data.quantity),
      value: Number(data.value),
      executedAt: data.executed_at,
      createdAt: data.created_at,
    };

    return NextResponse.json({ order: createdOrder }, { status: 201 });
  } catch (err) {
    return safeErrorResponse('api/orders POST', err, 'Failed to add order');
  }
}

export async function PUT() { return methodNotAllowed(['GET', 'POST']); }
export async function DELETE() { return methodNotAllowed(['GET', 'POST']); }
export async function PATCH() { return methodNotAllowed(['GET', 'POST']); }
