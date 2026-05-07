-- Add art_style column to companions table
-- 'realistic' (default) or 'anime'

ALTER TABLE companions ADD COLUMN IF NOT EXISTS art_style TEXT DEFAULT 'realistic';
