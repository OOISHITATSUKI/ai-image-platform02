-- Add nickname column to companion_relationships
-- Stores what the user wants the companion to call them
ALTER TABLE companion_relationships ADD COLUMN IF NOT EXISTS nickname TEXT DEFAULT NULL;
