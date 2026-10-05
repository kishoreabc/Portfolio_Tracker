import type { NsdlCashFlowResponse } from '@/types/bonds';

const CLIENT_CACHE_PREFIX = 'bond_cashflow_';
const CLIENT_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function getClientCachedBondCashflow(isin: string): NsdlCashFlowResponse | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${CLIENT_CACHE_PREFIX}${isin.toUpperCase()}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.data && Date.now() - (parsed.timestamp || 0) < CLIENT_CACHE_TTL_MS) {
      return parsed.data;
    }
  } catch {
    // Ignore JSON/localStorage errors
  }
  return null;
}

export function setClientCachedBondCashflow(isin: string, data: NsdlCashFlowResponse): void {
  if (typeof window === 'undefined' || !isin) return;
  try {
    localStorage.setItem(
      `${CLIENT_CACHE_PREFIX}${isin.toUpperCase()}`,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {
    // Ignore quota errors
  }
}
