-- Gift/Boost special media (images/videos shown when user sends a gift or boost)
-- Each companion can have up to 3 media per action type, shown randomly

CREATE TABLE IF NOT EXISTS companion_reward_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  companion_id TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('gift', 'boost')),
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  media_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companion_reward_media_lookup
ON companion_reward_media(companion_id, action_type);
