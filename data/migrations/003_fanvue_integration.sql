-- ============================================================
-- Fanvue Integration Schema
-- ============================================================

-- 1. Add Fanvue linking columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS fanvue_uuid TEXT,
  ADD COLUMN IF NOT EXISTS fanvue_handle TEXT,
  ADD COLUMN IF NOT EXISTS fanvue_connected_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_fanvue_uuid ON users(fanvue_uuid);
CREATE INDEX IF NOT EXISTS idx_users_fanvue_handle ON users(fanvue_handle);

-- 2. Webhook event log (all incoming webhooks for debugging)
CREATE TABLE IF NOT EXISTS fanvue_webhook_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  error TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_fanvue_webhook_logs_event_type ON fanvue_webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_fanvue_webhook_logs_received_at ON fanvue_webhook_logs(received_at DESC);

-- 3. Subscription history
CREATE TABLE IF NOT EXISTS fanvue_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  fanvue_uuid TEXT NOT NULL,
  fanvue_handle TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'active',
  credits_granted INTEGER DEFAULT 0,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_fanvue_subscriptions_user_id ON fanvue_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_fanvue_subscriptions_fanvue_uuid ON fanvue_subscriptions(fanvue_uuid);

-- 4. Transaction log (tips, purchases)
CREATE TABLE IF NOT EXISTS fanvue_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  fanvue_uuid TEXT NOT NULL,
  fanvue_handle TEXT,
  type TEXT NOT NULL, -- 'subscription', 'tip', 'purchase'
  amount_cents INTEGER NOT NULL,
  credits_granted INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fanvue_transactions_user_id ON fanvue_transactions(user_id);

-- 5. Pending subscriptions (for users who subscribe before linking)
CREATE TABLE IF NOT EXISTS fanvue_pending_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fanvue_uuid TEXT NOT NULL,
  fanvue_handle TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  type TEXT DEFAULT 'subscription',
  received_at TIMESTAMPTZ DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_fanvue_pending_handle ON fanvue_pending_subscriptions(fanvue_handle);
