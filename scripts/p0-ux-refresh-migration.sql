-- ============================================================
-- P0 UX Refresh Migration
-- Run this BEFORE deploying P0 changes
-- ============================================================

-- 1. Add suggestion tracking columns to generations table
-- (If generations table doesn't exist in Supabase yet, these will be
--  added when it's created. For existing tables:)

-- Check if generations table exists first
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'generations') THEN
        ALTER TABLE generations
        ADD COLUMN IF NOT EXISTS suggestion_source text
            CHECK (suggestion_source IN ('guest_rule', 'user_rule', 'claude_api')),
        ADD COLUMN IF NOT EXISTS used_suggestion boolean DEFAULT false,
        ADD COLUMN IF NOT EXISTS suggestion_type text
            CHECK (suggestion_type IN ('A', 'B', 'C')),
        ADD COLUMN IF NOT EXISTS regeneration_count integer DEFAULT 0;
    END IF;
END $$;

-- 2. Add nsfw_default to users table settings JSONB
-- (The users table uses a JSONB `settings` column, so we update defaults)
-- For existing users, ensure the settings column can hold nsfw_default
-- This is handled at application level since settings is JSONB

-- 3. Add nsfw_default as a standalone column on users table (for easy querying)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS nsfw_default boolean DEFAULT true;

-- 4. Create messages suggestion tracking columns
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'messages') THEN
        ALTER TABLE messages
        ADD COLUMN IF NOT EXISTS suggestion_source text,
        ADD COLUMN IF NOT EXISTS used_suggestion boolean DEFAULT false,
        ADD COLUMN IF NOT EXISTS suggestion_type text;
    END IF;
END $$;

-- ============================================================
-- Verification queries (run manually to confirm)
-- ============================================================
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'nsfw_default';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'generations' AND column_name = 'suggestion_source';
