-- 1. ユーザーテーブルの作成（存在しない場合）
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT,
  username TEXT,
  preferred_language VARCHAR(5) DEFAULT 'ja',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 言語設定カラムの確認と追加（既存テーブルがある場合）
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) DEFAULT 'ja';

-- 2. チャットテーブルの作成
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. メッセージテーブルの作成
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RLSの無効化（既存の独自認証を利用するため、anonキーでの読み書きを許可）
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- 5. 自動削除ロジック（24時間）
CREATE OR REPLACE FUNCTION delete_old_chats()
RETURNS void AS $$
BEGIN
  DELETE FROM chats WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- 自動実行のためのトリガー
CREATE OR REPLACE FUNCTION trigger_delete_old_chats()
RETURNS trigger AS $$
BEGIN
  DELETE FROM chats WHERE created_at < NOW() - INTERVAL '24 hours';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS clean_old_chats_trigger ON chats;
CREATE TRIGGER clean_old_chats_trigger
AFTER INSERT ON chats
FOR EACH STATEMENT EXECUTE FUNCTION trigger_delete_old_chats();
