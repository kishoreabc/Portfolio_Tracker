-- ============================================================
-- Migration 002: Create vector similarity search function
-- Run AFTER migration 001
-- ============================================================

-- match_news: pgvector cosine similarity search
-- Called by the SupabaseVectorStore / direct RPC from server
create or replace function public.match_news(
    query_embedding     extensions.vector(4096),
    match_threshold     float   default 0.5,
    match_count         int     default 10
)
returns table (
    id                  bigint,
    source_id           text,
    source_url          text,
    original_title      text,
    translated_title    text,
    translated_content  text,
    summary             text,
    sentiment           text,
    impact              text,
    original_language   text,
    category            text,
    categories          jsonb,
    author              text,
    published_at        timestamptz,
    companies           jsonb,
    portfolio_relevant  boolean,
    similarity          float
)
language sql stable
as $$
    select
        n.id,
        n.source_id,
        n.source_url,
        n.original_title,
        n.translated_title,
        n.translated_content,
        n.summary,
        n.sentiment,
        n.impact,
        n.original_language,
        n.category,
        n.categories,
        n.author,
        n.published_at,
        n.companies,
        n.portfolio_relevant,
        1 - (n.embedding <=> query_embedding) as similarity
    from public.news n
    where
        n.embedding is not null
        and 1 - (n.embedding <=> query_embedding) > match_threshold
    order by n.embedding <=> query_embedding
    limit match_count;
$$;

-- ── Optional: IVFFlat index for large datasets (uncomment when > 1000 rows) ──
-- create index if not exists news_embedding_idx
--     on public.news
--     using ivfflat (embedding extensions.vector_cosine_ops)
--     with (lists = 100);
