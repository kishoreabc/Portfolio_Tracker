-- ==============================================================================
-- Migration: 005_create_portfolio_snapshots.sql
-- Description: Canonical historical portfolio snapshots for temporal analytics
-- ==============================================================================

CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL DEFAULT 'default_user',
  as_of TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  portfolio_hash VARCHAR(64),
  net_worth NUMERIC(15, 2) NOT NULL,
  equity_total NUMERIC(15, 2) NOT NULL DEFAULT 0,
  bond_total NUMERIC(15, 2) NOT NULL DEFAULT 0,
  equity_count INTEGER NOT NULL DEFAULT 0,
  bond_count INTEGER NOT NULL DEFAULT 0,
  top5_percent NUMERIC(6, 2) NOT NULL DEFAULT 0,
  herfindahl_index INTEGER NOT NULL DEFAULT 0,
  diversification_score INTEGER NOT NULL DEFAULT 50,
  weighted_pe NUMERIC(8, 2),
  breadth_pct NUMERIC(6, 2),
  macro_metrics JSONB DEFAULT '{}'::jsonb,
  asset_allocations JSONB DEFAULT '[]'::jsonb,
  sector_allocations JSONB DEFAULT '[]'::jsonb,
  holding_prices JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast user history lookup
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_user_as_of
  ON portfolio_snapshots (user_id, as_of DESC);

CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_as_of
  ON portfolio_snapshots (as_of DESC);
