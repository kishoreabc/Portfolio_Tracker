-- ============================================================
-- Migration 004: Create orders table for order history tracking
-- Run this in your Supabase SQL Editor
-- ============================================================

create table if not exists public.orders (
  id                bigint generated always as identity primary key,

  -- Security details (only symbol is strictly required from tradebook)
  symbol            text        not null,

  -- Order details (required)
  order_type        text        not null check (order_type in ('BUY', 'SELL')),
  quantity          numeric     not null,
  value             numeric     not null,  -- total order value (qty × price)

  -- Timestamps
  executed_at       timestamptz not null,

  created_at        timestamptz not null default now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists orders_executed_at_idx
  on public.orders (executed_at desc);

create index if not exists orders_symbol_idx
  on public.orders (symbol);

create index if not exists orders_type_idx
  on public.orders (order_type);

-- Composite unique constraint to prevent duplicate imports for 5-column datasets
create unique index if not exists orders_composite_dedup_idx
  on public.orders (symbol, order_type, quantity, value, executed_at);

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table public.orders enable row level security;

-- Allow service-role key full access (server-side only, never browser)
create policy "Service role has full access to orders"
  on public.orders
  for all
  to service_role
  using (true)
  with check (true);
