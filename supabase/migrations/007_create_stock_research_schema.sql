-- ==============================================================================
-- Migration: 007_create_stock_research_schema.sql
-- Description: Screener-style stock research tables and cache storage
-- ==============================================================================

-- 1. Company Identity & Symbol Registry
CREATE TABLE IF NOT EXISTS research_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(32) NOT NULL UNIQUE,       -- NSE symbol (e.g. TITAN)
  bse_code VARCHAR(32),                     -- BSE security code (e.g. 500114)
  isin VARCHAR(32),                         -- ISIN (e.g. INE280A01028)
  company_name VARCHAR(255) NOT NULL,
  short_name VARCHAR(128),
  sector VARCHAR(128),
  industry VARCHAR(128),
  exchange VARCHAR(32) DEFAULT 'NSE',
  currency VARCHAR(16) DEFAULT 'INR',
  website VARCHAR(512),
  description TEXT,
  reporting_mode VARCHAR(32) DEFAULT 'consolidated',
  last_refreshed_at TIMESTAMPTZ,
  data_status VARCHAR(32) DEFAULT 'fresh',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_companies_symbol ON research_companies (symbol);
CREATE INDEX IF NOT EXISTS idx_research_companies_isin ON research_companies (isin);
CREATE INDEX IF NOT EXISTS idx_research_companies_bse ON research_companies (bse_code);

-- 2. Financial Statements (Quarterly & Annual P&L, Balance Sheet, Cash Flow)
CREATE TABLE IF NOT EXISTS research_financial_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(32) NOT NULL,
  statement_type VARCHAR(32) NOT NULL,      -- 'quarterly', 'pnl', 'balance_sheet', 'cash_flow'
  period VARCHAR(32) NOT NULL,              -- e.g. 'Mar 2024', 'Q2 FY25'
  period_type VARCHAR(16) NOT NULL,         -- 'quarterly', 'annual', 'ttm'
  reporting_mode VARCHAR(16) NOT NULL DEFAULT 'consolidated', -- 'consolidated', 'standalone'
  currency VARCHAR(8) DEFAULT 'INR',
  unit VARCHAR(16) DEFAULT 'Cr',
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb, -- Key-value map of line items
  source VARCHAR(64) DEFAULT 'Screener.in',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_statement_period UNIQUE (symbol, statement_type, period, period_type, reporting_mode)
);

CREATE INDEX IF NOT EXISTS idx_research_statements_lookup 
  ON research_financial_statements (symbol, statement_type, period);

-- 3. Financial Ratios Snapshot
CREATE TABLE IF NOT EXISTS research_ratios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(32) NOT NULL,
  period VARCHAR(32) NOT NULL DEFAULT 'TTM',
  pe NUMERIC(10, 2),
  forward_pe NUMERIC(10, 2),
  pb NUMERIC(10, 2),
  ev_ebitda NUMERIC(10, 2),
  roe NUMERIC(6, 2),
  roce NUMERIC(6, 2),
  roa NUMERIC(6, 2),
  debt_to_equity NUMERIC(8, 2),
  interest_coverage NUMERIC(8, 2),
  operating_margin NUMERIC(6, 2),
  net_margin NUMERIC(6, 2),
  dividend_yield NUMERIC(6, 2),
  cagr_metrics JSONB DEFAULT '{}'::jsonb,
  source VARCHAR(64) DEFAULT 'Yahoo Finance',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_research_ratios UNIQUE (symbol, period)
);

CREATE INDEX IF NOT EXISTS idx_research_ratios_symbol ON research_ratios (symbol);

-- 4. Shareholding Snapshots
CREATE TABLE IF NOT EXISTS research_shareholding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(32) NOT NULL,
  quarter VARCHAR(32) NOT NULL,             -- e.g. 'Sep 2024'
  promoters NUMERIC(6, 2),
  fii NUMERIC(6, 2),
  dii NUMERIC(6, 2),
  mutual_funds NUMERIC(6, 2),
  public NUMERIC(6, 2),
  others NUMERIC(6, 2) DEFAULT 0,
  total NUMERIC(6, 2) DEFAULT 100,
  source VARCHAR(64) DEFAULT 'BSE/NSE Filing',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_research_shareholding UNIQUE (symbol, quarter)
);

CREATE INDEX IF NOT EXISTS idx_research_shareholding_symbol 
  ON research_shareholding (symbol, quarter DESC);

-- 5. Corporate Actions (Dividends, Splits, Bonuses, Buybacks)
CREATE TABLE IF NOT EXISTS research_corporate_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(32) NOT NULL,
  event_type VARCHAR(32) NOT NULL,          -- 'dividend', 'split', 'bonus', 'rights', 'buyback'
  announcement_date DATE,
  ex_date DATE,
  record_date DATE,
  description TEXT NOT NULL,
  amount NUMERIC(10, 2),
  ratio VARCHAR(32),
  source VARCHAR(64) DEFAULT 'Exchange Notice',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_corp_actions 
  ON research_corporate_actions (symbol, ex_date DESC);

-- 6. Document Metadata (Filings, Annual Reports, Investor Presentations)
CREATE TABLE IF NOT EXISTS research_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(32) NOT NULL,
  doc_type VARCHAR(32) NOT NULL,            -- 'annual_report', 'quarterly_result', 'investor_presentation'
  title VARCHAR(255) NOT NULL,
  period VARCHAR(32),
  published_at DATE,
  external_url TEXT NOT NULL,
  source VARCHAR(64) DEFAULT 'BSE/NSE Filing',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_documents 
  ON research_documents (symbol, published_at DESC);

-- ==============================================================================
-- Row-Level Security Policies (Read: Authenticated Users; Write: Service Role)
-- ==============================================================================

ALTER TABLE research_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_financial_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_ratios ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_shareholding ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_corporate_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read on research_companies"
  ON research_companies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated read on research_financial_statements"
  ON research_financial_statements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated read on research_ratios"
  ON research_ratios FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated read on research_shareholding"
  ON research_shareholding FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated read on research_corporate_actions"
  ON research_corporate_actions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated read on research_documents"
  ON research_documents FOR SELECT
  TO authenticated
  USING (true);
