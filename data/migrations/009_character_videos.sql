-- Character Video System: hover videos, emotion videos, live action videos
-- All videos are pre-compressed MP4 stored on Cloudflare R2

-- 1. Add hover_video_url to companions table
ALTER TABLE companions ADD COLUMN IF NOT EXISTS hover_video_url TEXT;

-- 2. Emotion videos (10 emotions × 3 variations = up to 30 per character)
CREATE TABLE IF NOT EXISTS character_emotion_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id TEXT NOT NULL,
  emotion VARCHAR(32) NOT NULL,
  variation_index INTEGER DEFAULT 0,  -- 0, 1, 2
  video_url TEXT NOT NULL,
  file_size_bytes INTEGER,
  unlock_level INTEGER DEFAULT 0,
  weight INTEGER DEFAULT 1,           -- selection weight for random pick
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emotion_videos_char_emotion
  ON character_emotion_videos(character_id, emotion);

-- 3. Live action videos (replaces file-based /public/companions/videos/)
CREATE TABLE IF NOT EXISTS character_liveaction_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id TEXT NOT NULL,
  action_id VARCHAR(64) NOT NULL,     -- e.g. 'greeting', 'sexy_tease', 'blowjob'
  variant VARCHAR(32) NOT NULL,       -- e.g. 'dressed', 'undressed'
  video_url TEXT NOT NULL,
  file_size_bytes INTEGER,
  unlock_level INTEGER DEFAULT 0,
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_liveaction_videos_char
  ON character_liveaction_videos(character_id, action_id);

-- Unique constraint: one video per character + action + variant
CREATE UNIQUE INDEX IF NOT EXISTS idx_liveaction_unique
  ON character_liveaction_videos(character_id, action_id, variant);

-- Unique constraint: one video per character + emotion + variation
CREATE UNIQUE INDEX IF NOT EXISTS idx_emotion_unique
  ON character_emotion_videos(character_id, emotion, variation_index);
