-- Phase 0: Fix chats table STATEMENT TIMEOUT by adding indexes
-- Run this in Supabase SQL Editor

CREATE INDEX IF NOT EXISTS idx_chats_user_id_created_at
ON chats(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chats_user_id
ON chats(user_id);

-- Analyze table to update query planner statistics
ANALYZE chats;
