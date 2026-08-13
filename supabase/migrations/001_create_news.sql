-- ============================================================
-- Migration 001: Create news table with pgvector support
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable pgvector extension
create extension if not exists vector with schema extensions;

-- ── News table ────────────────────────────────────────────────────────────────
create table if not exists public.news (
    id                  bigint generated always as identity primary key,

    source              text        not null default 'Money Pechu',

    -- RSS GUID used for deduplication
    source_id           text        not null unique,

    source_url          text        not null,

    original_title      text        not null,
    translated_title    text,

    original_content    text,
    translated_content  text,

    -- 'ta' = Tamil, 'en' = English
    original_language   text        not null default 'en',

    category            text,
    categories          jsonb       not null default '[]'::jsonb,

    author              text,

    published_at        timestamptz,

    -- AI-generated English summary (2–4 sentences)
    summary             text,

    -- 'positive' | 'negative' | 'neutral' | 'mixed'
    sentiment           text,

    -- 'low' | 'medium' | 'high'
    impact              text,

    -- JSON array of { name, symbol, confidence }
    companies           jsonb       not null default '[]'::jsonb,

    portfolio_relevant  boolean     not null default false,

    -- 'pending' | 'completed' | 'failed' | 'not_required'
    translation_status  text        not null default 'pending',

    -- 'pending' | 'completed' | 'failed'
    embedding_status    text        not null default 'pending',

    -- NVIDIA nv-embed-v1 outputs 4096 dimensions
    embedding           extensions.vector(4096),

    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists news_published_at_idx
    on public.news (published_at desc);

create index if not exists news_category_idx
    on public.news (category);

create index if not exists news_original_language_idx
    on public.news (original_language);

create index if not exists news_portfolio_relevant_idx
    on public.news (portfolio_relevant)
    where portfolio_relevant = true;

create index if not exists news_sentiment_idx
    on public.news (sentiment);

create index if not exists news_impact_idx
    on public.news (impact);

create index if not exists news_translation_status_idx
    on public.news (translation_status)
    where translation_status in ('pending', 'failed');

create index if not exists news_embedding_status_idx
    on public.news (embedding_status)
    where embedding_status in ('pending', 'failed');

-- ── updated_at trigger ────────────────────────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists news_updated_at on public.news;
create trigger news_updated_at
    before update on public.news
    for each row execute function public.handle_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table public.news enable row level security;

-- Allow service-role key full access (server-side only)
create policy "Service role has full access to news"
    on public.news
    for all
    to service_role
    using (true)
    with check (true);

-- Allow authenticated users to read news (via Next.js API, not direct DB access)
create policy "Authenticated users can read news"
    on public.news
    for select
    to authenticated
    using (true);
