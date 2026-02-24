-- 1. Users table update (if you already have one in Supabase)
-- If you don't have a users table yet, you might need to create it or link it to Auth.
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) DEFAULT 'ja';

-- 2. Chats table
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- Link to your user ID (manual UUID or REFERENCES users(id))
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Auto-deletion logic (24 hours)
-- This function deletes chats and their cascade messages that are older than 24 hours.
CREATE OR REPLACE FUNCTION delete_old_chats()
RETURNS void AS $$
BEGIN
  DELETE FROM chats WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- To automate this, you can use Supabase Edge Functions or pg_cron.
-- If pg_cron is enabled:
-- SELECT cron.schedule('delete-old-chats-every-hour', '0 * * * *', 'SELECT delete_old_chats();');

-- OR: simple trigger on insert to keep it "self-cleaning" (less efficient but works without cron)
-- CREATE OR REPLACE FUNCTION trigger_delete_old_chats()
-- RETURNS trigger AS $$
-- BEGIN
--   DELETE FROM chats WHERE created_at < NOW() - INTERVAL '24 hours';
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
-- CREATE TRIGGER clean_old_chats_trigger
-- AFTER INSERT ON chats
-- FOR EACH STATEMENT EXECUTE FUNCTION trigger_delete_old_chats();
