-- Greeting sequence: LINE-style multi-message greeting
-- JSON array of { type: 'text'|'image'|'video', content: string }
ALTER TABLE companions ADD COLUMN IF NOT EXISTS greeting_sequence JSONB;
