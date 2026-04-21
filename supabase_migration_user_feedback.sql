-- User Feedback / Requests / Complaints from Nude Assistant
-- Run this migration to create the user_feedback table

CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('companion_request', 'complaint', 'feature_request', 'other')),
  summary TEXT NOT NULL,
  user_message TEXT NOT NULL,
  assistant_reply TEXT,
  user_id TEXT,
  user_email TEXT,
  locale TEXT DEFAULT 'en',
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'resolved', 'dismissed')),
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for admin queries
CREATE INDEX IF NOT EXISTS idx_user_feedback_type ON user_feedback(type);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created ON user_feedback(created_at DESC);

-- Disable RLS for admin access
ALTER TABLE user_feedback DISABLE ROW LEVEL SECURITY;
