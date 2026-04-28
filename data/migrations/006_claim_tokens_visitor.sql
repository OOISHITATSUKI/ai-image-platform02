-- Add visitor tracking to claim_tokens
ALTER TABLE claim_tokens
  ADD COLUMN IF NOT EXISTS assigned_to UUID,        -- user who visited the page (before claiming)
  ADD COLUMN IF NOT EXISTS visitor_ip TEXT;          -- IP of first visitor (for matching on login)

CREATE INDEX IF NOT EXISTS idx_claim_tokens_assigned_to ON claim_tokens(assigned_to);
CREATE INDEX IF NOT EXISTS idx_claim_tokens_visitor_ip ON claim_tokens(visitor_ip);
