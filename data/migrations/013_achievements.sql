-- Phase 1: Achievement system
-- Run this in Supabase SQL Editor

-- Achievement definitions master table
CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ja TEXT NOT NULL,
  description TEXT NOT NULL,
  description_ja TEXT NOT NULL,
  reward_credits INTEGER NOT NULL,
  threshold INTEGER NOT NULL,
  trigger_event TEXT NOT NULL,
  icon_url TEXT,
  hint TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User achievement unlocks
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES achievements(id),
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reward_claimed BOOLEAN NOT NULL DEFAULT FALSE,
  reward_claimed_at TIMESTAMPTZ,
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked_at ON user_achievements(unlocked_at DESC);

-- User stats counter table (for achievement progress tracking)
CREATE TABLE IF NOT EXISTS user_stats (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  generation_count INTEGER NOT NULL DEFAULT 0,
  styles_tried TEXT[] NOT NULL DEFAULT '{}',
  hair_colors_tried TEXT[] NOT NULL DEFAULT '{}',
  faces_saved INTEGER NOT NULL DEFAULT 0,
  referrals_count INTEGER NOT NULL DEFAULT 0,
  chat_messages_count INTEGER NOT NULL DEFAULT 0,
  purchases_count INTEGER NOT NULL DEFAULT 0,
  chat_streak INTEGER NOT NULL DEFAULT 0,
  longest_chat_streak INTEGER NOT NULL DEFAULT 0,
  last_chat_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed achievement definitions (20 badges)
INSERT INTO achievements (id, category, name, name_ja, description, description_ja, reward_credits, threshold, trigger_event, hint, display_order) VALUES
('first_generation', 'generation', 'First Generation', '最初の一枚', 'Generate your first image', '初めての画像を生成しよう', 3, 1, 'generation_count', 'Try generating an image', 1),
('gen_10', 'generation', '10 Generations', '生成10回', 'Generate 10 images', '10枚生成', 5, 10, 'generation_count', 'Keep generating!', 2),
('gen_100', 'generation', '100 Generations', '生成100回', 'Generate 100 images', '100枚生成', 20, 100, 'generation_count', '???', 3),
('gen_500', 'generation', '500 Generations', '生成500回', 'Generate 500 images', '500枚生成', 50, 500, 'generation_count', '???', 4),
('gen_1000', 'generation', '1000 Generations', '生成1000回', 'Generate 1000 images', '1000枚生成', 100, 1000, 'generation_count', '???', 5),
('style_explorer', 'exploration', 'Style Explorer', 'スタイル探検家', 'Try 5 different styles', '5種類のスタイルを試す', 5, 5, 'styles_tried', 'Try a new style', 6),
('style_master', 'exploration', 'Style Master', 'スタイルマスター', 'Try all 7 styles', '全7スタイル制覇', 15, 7, 'styles_tried', 'Master every style', 7),
('hair_collector', 'exploration', 'Hair Color Collector', 'ヘアカラーコレクター', 'Try all 7 hair colors', '全7ヘアカラー制覇', 10, 7, 'hair_colors_tried', 'Try every color', 8),
('first_face', 'collection', 'First Face', '最初の顔', 'Save your first face', '初めての顔を保存', 3, 1, 'faces_saved', 'Save a face', 9),
('faces_10', 'collection', '10 Faces', '顔10個', 'Save 10 faces', '10個の顔を保存', 15, 10, 'faces_saved', '???', 10),
('faces_50', 'collection', '50 Faces', '顔50個', 'Save 50 faces', '50個の顔を保存', 50, 50, 'faces_saved', '???', 11),
('first_referral', 'social', 'First Referral', '初めての招待', 'Refer your first friend', '初めての友達招待', 10, 1, 'referrals_count', 'Invite a friend', 12),
('referrals_5', 'social', '5 Referrals', '5人招待', 'Refer 5 friends', '5人を招待', 30, 5, 'referrals_count', '???', 13),
('first_chat', 'chat', 'First Chat', '初めての会話', 'Chat for the first time', '初めて会話する', 3, 1, 'chat_messages_count', 'Say hi to your AI companion', 14),
('streak_7', 'chat', '7-Day Streak', '7日連続', '7-day talk streak', '7日連続会話', 10, 7, 'chat_streak', 'Talk every day for a week', 15),
('streak_30', 'chat', '30-Day Streak', '30日連続', '30-day talk streak', '30日連続会話', 50, 30, 'chat_streak', '???', 16),
('messages_100', 'chat', '100 Messages', '100メッセージ', 'Send 100 chat messages', '100メッセージ送信', 20, 100, 'chat_messages_count', '???', 17),
('first_purchase', 'purchase', 'First Purchase', '初回購入', 'Make your first purchase', '初めての購入', 0, 1, 'purchases_count', 'Get more credits', 18),
('fanvue_connector', 'purchase', 'Fanvue Connector', 'Fanvueコネクト', 'First purchase via Fanvue', 'Fanvue経由で初購入', 10, 1, 'fanvue_purchases', 'Connect with Fanvue', 19),
('top_supporter', 'purchase', 'Top Supporter', 'トップサポーター', 'Make 10 purchases', '10回購入する', 100, 10, 'purchases_count', '???', 20)
ON CONFLICT (id) DO NOTHING;
