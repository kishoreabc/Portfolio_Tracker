-- ============================================================
-- Migration 004: Drop orders table and related indexes
-- Run this in your Supabase SQL Editor to drop the orders table
-- ============================================================

DROP TABLE IF EXISTS public.orders CASCADE;
