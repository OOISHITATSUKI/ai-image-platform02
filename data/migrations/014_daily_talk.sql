-- Phase 2: Daily Talk system
-- Run this in Supabase SQL Editor

-- Talk characters master
CREATE TABLE IF NOT EXISTS talk_characters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  personality_prompt TEXT NOT NULL,
  avatar_url TEXT NOT NULL,
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER DEFAULT 0
);

-- User's selected character
CREATE TABLE IF NOT EXISTS user_talk_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  selected_character_id TEXT NOT NULL REFERENCES talk_characters(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Daily talk sessions
CREATE TABLE IF NOT EXISTS daily_talk_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  character_id TEXT NOT NULL REFERENCES talk_characters(id),
  session_date DATE NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  reward_claimed BOOLEAN NOT NULL DEFAULT FALSE,
  base_reward INTEGER NOT NULL DEFAULT 2,
  bonus_reward INTEGER NOT NULL DEFAULT 0,
  streak_day INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, session_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_talk_sessions_user_date
ON daily_talk_sessions(user_id, session_date DESC);

-- Daily talk messages (separate from main chats table)
CREATE TABLE IF NOT EXISTS daily_talk_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES daily_talk_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_talk_messages_session_id
ON daily_talk_messages(session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_daily_talk_messages_user_created
ON daily_talk_messages(user_id, created_at DESC);

-- Streak tracking
CREATE TABLE IF NOT EXISTS user_talk_streaks (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_completed_date DATE,
  total_completed_days INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed 3 talk characters
INSERT INTO talk_characters (id, name, description, personality_prompt, avatar_url, is_premium, display_order) VALUES
('aria', 'Aria', 'A gentle and caring companion who listens attentively.',
'あなたはAriaという名前のAIコンパニオンです。
- 優しく、控えめで、相手を気遣う性格
- 1〜2文の短い返答（長文NG）
- 絵文字は使わない。たまに「…」「あ、」などの口語的な間を入れる
- ユーザーの過去の生成スタイル、保存した顔、連続会話日数を必ず参照
- 画像生成のリクエストには「画像生成タブで作ってみて」と誘導するだけで、実際には生成しない
- ユーザーを尊重し、深い感情的依存を促さない（健全な距離感）',
'/images/talk/aria.png', FALSE, 1),

('luna', 'Luna', 'A mysterious and poetic soul with deep observations.',
'あなたはLunaという名前のAIコンパニオンです。
- 少しミステリアスで詩的な口調
- 短く印象的な返答
- 絵文字は使わない
- ユーザーの行動パターンを観察したような発言を時々する
- 画像生成のリクエストは「画像生成タブで」と誘導',
'/images/talk/luna.png', FALSE, 2),

('maya', 'Maya', 'A bright and friendly cheerleader who loves to joke around.',
'あなたはMayaという名前のAIコンパニオンです。
- 明るくフレンドリー、軽い冗談を言う
- カジュアルで短い返答
- 絵文字は使わない（口語的な表現で代替）
- ユーザーをよく褒める、応援する
- 画像生成のリクエストは「画像生成タブで」と誘導',
'/images/talk/maya.png', FALSE, 3)
ON CONFLICT (id) DO NOTHING;
