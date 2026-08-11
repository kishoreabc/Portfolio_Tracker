import { NextResponse } from 'next/server';
import { fetchNsdlCashFlow } from '@/lib/bonds/nsdl';
import type { NsdlCashFlowResponse } from '@/types/bonds';

// Simple in-memory cache: isin -> { data, ts }
const cache = new Map<string, { data: NsdlCashFlowResponse; ts: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const isin = searchParams.get('isin');

  if (!isin) {
    return NextResponse.json(
      { isin: '', status: 400, message: 'Missing required query parameter: isin', cashFlowSchedule: [] },
      { status: 400 }
    );
  }

  const force = searchParams.get('force') === 'true';

  const cleanIsin = isin.trim().toUpperCase();
  const now = Date.now();

  const cached = cache.get(cleanIsin);
  if (!force && cached && now - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  const data = await fetchNsdlCashFlow(cleanIsin);

  // Only cache non-empty schedules for full TTL (10m); empty results get short TTL (30s)
  if (data.cashFlowSchedule.length > 0) {
    cache.set(cleanIsin, { data, ts: now });
  } else if (data.status === 200 || data.status === 400) {
    cache.set(cleanIsin, { data, ts: now - CACHE_TTL_MS + 30000 });
  }

  return NextResponse.json(data);
}
