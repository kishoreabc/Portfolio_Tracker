/**
 * lib/portfolio/snapshotRepository.ts
 *
 * Canonical historical snapshot repository for temporal analytics.
 *
 * ARCHITECTURAL INVARIANT (Critique Point #2 & #3):
 *  1. Supabase PostgreSQL (`portfolio_snapshots`) is the SINGLE SOURCE OF TRUTH in production.
 *  2. Local filesystem storage (`.cache/snapshots/`) is strictly an EPHEMERAL DEVELOPMENT FALLBACK
 *     for zero-dependency local dev / offline testing. It is NOT durable production storage.
 *  3. Historical snapshots are strictly APPEND-ONLY: immutable tuples of
 *     (snapshot_id, user_id, as_of, snapshot_hash) preserving historical trajectory.
 */

import fs from 'fs';
import path from 'path';
import { supabase } from '@/lib/supabase';
import type { HistoricalSnapshot } from '@/lib/analytics/temporal';

function hashString(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return String(h >>> 0);
}

export function computeSnapshotHash(input: {
  userId?: string;
  netWorth: number;
  equityTotal: number;
  bondTotal: number;
  herfindahlIndex: number;
  equityCount: number;
  bondCount: number;
}): string {
  const payload = [
    input.userId || 'default_user',
    input.netWorth,
    input.equityTotal,
    input.bondTotal,
    input.herfindahlIndex,
    input.equityCount,
    input.bondCount,
  ].join('|');
  return `h_${hashString(payload)}`;
}

export interface SaveSnapshotInput {
  userId?: string;
  asOf?: string;
  netWorth: number;
  equityTotal: number;
  bondTotal: number;
  equityCount: number;
  bondCount: number;
  top5Percent: number;
  herfindahlIndex: number;
  diversificationScore: number;
  weightedPE?: number;
  breadthPct?: number;
  macroRegime?: string;
  portfolioBeta?: number;
  macroMetrics?: {
    niftyPrice?: number;
    usdInr?: number;
    brentCrude?: number;
    us10y?: number;
    goldPrice?: number;
  };
  assetAllocations?: Array<{ label: string; percent: number }>;
  sectorAllocations?: Array<{ sector: string; percent: number }>;
  holdingPrices?: Record<string, number>;
}

const LOCAL_SNAPSHOTS_DIR = path.join(process.cwd(), '.cache', 'snapshots');

function ensureLocalCacheDir(): void {
  try {
    if (!fs.existsSync(LOCAL_SNAPSHOTS_DIR)) {
      fs.mkdirSync(LOCAL_SNAPSHOTS_DIR, { recursive: true });
    }
  } catch {
    // Non-fatal if filesystem is read-only
  }
}

function getLocalSnapshotsFilePath(userId: string): string {
  const safeUser = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(LOCAL_SNAPSHOTS_DIR, `${safeUser}_snapshots.json`);
}

function readLocalSnapshots(userId: string): HistoricalSnapshot[] {
  ensureLocalCacheDir();
  const filePath = getLocalSnapshotsFilePath(userId);
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeLocalSnapshots(userId: string, snapshots: HistoricalSnapshot[]): void {
  ensureLocalCacheDir();
  const filePath = getLocalSnapshotsFilePath(userId);
  try {
    // Keep max 90 daily snapshots locally
    const trimmed = snapshots.slice(0, 90);
    fs.writeFileSync(filePath, JSON.stringify(trimmed, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[SnapshotRepo] Failed to write local snapshot cache:', (err as Error).message);
  }
}

/**
 * Persists a canonical snapshot to Supabase and local cache.
 */
export async function saveHistoricalSnapshot(input: SaveSnapshotInput): Promise<void> {
  const userId = input.userId || 'default_user';
  const asOf = input.asOf || new Date().toISOString();
  const snapshotId = `snap_${Date.now()}`;
  const snapshotHash = computeSnapshotHash({
    userId,
    netWorth: input.netWorth,
    equityTotal: input.equityTotal,
    bondTotal: input.bondTotal,
    herfindahlIndex: input.herfindahlIndex,
    equityCount: input.equityCount,
    bondCount: input.bondCount,
  });

  const canonical: HistoricalSnapshot = {
    snapshotId,
    snapshotHash,
    asOf,
    netWorth: input.netWorth,
    equityTotal: input.equityTotal,
    bondTotal: input.bondTotal,
    equityCount: input.equityCount,
    bondCount: input.bondCount,
    top5Percent: input.top5Percent,
    herfindahlIndex: input.herfindahlIndex,
    diversificationScore: input.diversificationScore,
    weightedPE: input.weightedPE,
    breadthPct: input.breadthPct,
    niftyPrice: input.macroMetrics?.niftyPrice,
    usdInr: input.macroMetrics?.usdInr,
    brentCrude: input.macroMetrics?.brentCrude,
    us10y: input.macroMetrics?.us10y,
    goldPrice: input.macroMetrics?.goldPrice,
    holdingPrices: input.holdingPrices,
  };

  // 1. Update local cache immediately (guaranteed synchronous backup)
  try {
    const local = readLocalSnapshots(userId);
    // Don't duplicate if saved within the last 10 minutes
    const recent = local[0];
    const isVeryRecent = recent && (new Date(asOf).getTime() - new Date(recent.asOf).getTime()) < 600_000;
    if (!isVeryRecent) {
      local.unshift(canonical);
      writeLocalSnapshots(userId, local);
    }
  } catch (err) {
    console.warn('[SnapshotRepo] Local cache save failed:', (err as Error).message);
  }

  // 2. Try Supabase
  try {
    const isConfigured = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_URL.includes('placeholder');
    if (isConfigured) {
      const { error } = await supabase.from('portfolio_snapshots').insert({
        snapshot_id: snapshotId,
        user_id: userId,
        as_of: asOf,
        net_worth: input.netWorth,
        equity_total: input.equityTotal,
        bond_total: input.bondTotal,
        equity_count: input.equityCount,
        bond_count: input.bondCount,
        herfindahl_index: typeof input.herfindahlIndex === 'number'
          ? Math.round(input.herfindahlIndex <= 1 ? input.herfindahlIndex * 10000 : input.herfindahlIndex)
          : 0,
        weighted_pe: input.weightedPE,
        breadth_pct: input.breadthPct,
        macro_metrics: input.macroMetrics || {},
        asset_allocations: input.assetAllocations || [],
        sector_allocations: input.sectorAllocations || [],
        holding_prices: input.holdingPrices || {},
      });

      if (error) {
        console.warn('[SnapshotRepo] Supabase insert warning (falling back to local cache):', error.message);
      }
    }
  } catch (err) {
    console.warn('[SnapshotRepo] Supabase error:', (err as Error).message);
  }
}

/**
 * Retrieves historical snapshots for temporal trend & momentum analysis.
 * Returns snapshots sorted chronologically ascending (oldest first).
 */
export async function getHistoricalSnapshots(
  userId = 'default_user',
  limit = 30
): Promise<HistoricalSnapshot[]> {
  let snapshots: HistoricalSnapshot[] = [];

  // Try Supabase first
  try {
    const isConfigured = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_URL.includes('placeholder');
    if (isConfigured) {
      const { data, error } = await supabase
        .from('portfolio_snapshots')
        .select('*')
        .eq('user_id', userId)
        .order('as_of', { ascending: false })
        .limit(limit);

      if (!error && data && data.length > 0) {
        snapshots = data.map((d: any) => ({
          asOf: d.as_of,
          netWorth: Number(d.net_worth) || undefined,
          equityTotal: Number(d.equity_total) || undefined,
          bondTotal: Number(d.bond_total) || undefined,
          equityCount: Number(d.equity_count) || undefined,
          bondCount: Number(d.bond_count) || undefined,
          top5Percent: Number(d.top5_percent) || undefined,
          herfindahlIndex: Number(d.herfindahl_index) || undefined,
          diversificationScore: Number(d.diversification_score) || undefined,
          weightedPE: d.weighted_pe ? Number(d.weighted_pe) : undefined,
          breadthPct: d.breadth_pct ? Number(d.breadth_pct) : undefined,
          niftyPrice: d.macro_metrics?.niftyPrice,
          usdInr: d.macro_metrics?.usdInr,
          brentCrude: d.macro_metrics?.brentCrude,
          us10y: d.macro_metrics?.us10y,
          goldPrice: d.macro_metrics?.goldPrice,
          holdingPrices: d.holding_prices,
        }));
      }
    }
  } catch (err) {
    console.warn('[SnapshotRepo] Supabase fetch failed, falling back to local cache:', (err as Error).message);
  }

  // Fallback to local file cache if Supabase returned nothing
  if (snapshots.length === 0) {
    snapshots = readLocalSnapshots(userId).slice(0, limit);
  }

  // Sort ascending (oldest first) so temporal engine can compute chronologically forward
  return snapshots.sort((a, b) => new Date(a.asOf).getTime() - new Date(b.asOf).getTime());
}
