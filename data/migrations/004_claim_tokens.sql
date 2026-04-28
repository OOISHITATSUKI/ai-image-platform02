-- ============================================================
-- Claim Tokens — Fanvue purchase → credit redemption
-- ============================================================

CREATE TABLE IF NOT EXISTS claim_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  fanvue_handle TEXT,
  fanvue_uuid TEXT,
  purchase_type TEXT NOT NULL,          -- 'subscription', 'tip', 'purchase'
  amount_cents INTEGER NOT NULL,
  credits INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'claimed', 'expired'
  claimed_by UUID,                       -- FK → users.id (set on claim)
  claimed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_claim_tokens_token ON claim_tokens(token);
CREATE INDEX IF NOT EXISTS idx_claim_tokens_status ON claim_tokens(status);
CREATE INDEX IF NOT EXISTS idx_claim_tokens_expires_at ON claim_tokens(expires_at);
