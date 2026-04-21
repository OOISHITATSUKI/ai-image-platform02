-- Stories Interactions: likes, comments, caption enhancements

-- Add base_likes and base_comments to companion_stories
ALTER TABLE companion_stories
  ADD COLUMN IF NOT EXISTS base_likes INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS base_comments INT DEFAULT 0;

-- Story likes
CREATE TABLE IF NOT EXISTS story_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES companion_stories(id) ON DELETE CASCADE,
  user_id TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, user_id),
  UNIQUE(story_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_story_likes_story ON story_likes(story_id);
ALTER TABLE story_likes DISABLE ROW LEVEL SECURITY;

-- Story comments
CREATE TABLE IF NOT EXISTS story_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES companion_stories(id) ON DELETE CASCADE,
  user_id TEXT,
  session_id TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_story_comments_story ON story_comments(story_id);
ALTER TABLE story_comments DISABLE ROW LEVEL SECURITY;
