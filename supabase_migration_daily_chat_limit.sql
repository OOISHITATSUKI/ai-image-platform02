-- ============================================================
-- Migration: Add daily_chat_limit and coins columns to users
-- Run in Supabase SQL Editor
-- ============================================================

-- daily_chat_limit: NULL = use plan default, 0 = unlimited, N = custom limit
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_chat_limit INTEGER DEFAULT NULL;

-- coins: virtual currency for gifts/boosts
ALTER TABLE users ADD COLUMN IF NOT EXISTS coins INTEGER NOT NULL DEFAULT 0;
