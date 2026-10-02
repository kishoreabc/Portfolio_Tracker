-- ==============================================================================
-- Migration: 006_create_user_logins.sql
-- Description: Audit table for user login activity, metadata, and IP tracking
-- ==============================================================================

CREATE TABLE IF NOT EXISTS user_logins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT,
  image TEXT,
  ip_address TEXT,
  user_agent TEXT,
  provider TEXT NOT NULL DEFAULT 'google',
  is_allowed_email BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by user email
CREATE INDEX IF NOT EXISTS idx_user_logins_email
  ON user_logins (email);

-- Index for chronological auditing and monitoring
CREATE INDEX IF NOT EXISTS idx_user_logins_created_at
  ON user_logins (created_at DESC);

-- Index for IP address investigations
CREATE INDEX IF NOT EXISTS idx_user_logins_ip
  ON user_logins (ip_address);

-- Enable Row Level Security
ALTER TABLE user_logins ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (Next.js server backend uses SUPABASE_SERVICE_ROLE_KEY)
CREATE POLICY "Service role can manage user_logins"
  ON user_logins
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
