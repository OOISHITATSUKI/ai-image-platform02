-- Companion Stories (Instagram-like)
CREATE TABLE IF NOT EXISTS companion_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  companion_id TEXT NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  duration_seconds INT DEFAULT 5,
  caption TEXT,
  is_published BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companion_stories_companion ON companion_stories(companion_id);
CREATE INDEX IF NOT EXISTS idx_companion_stories_published ON companion_stories(is_published);

ALTER TABLE companion_stories DISABLE ROW LEVEL SECURITY;

-- Story views tracking (for viewed/unviewed ring state)
CREATE TABLE IF NOT EXISTS story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  story_id UUID NOT NULL REFERENCES companion_stories(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, story_id)
);

ALTER TABLE story_views DISABLE ROW LEVEL SECURITY;
