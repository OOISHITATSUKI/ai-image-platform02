-- Migration: Unify coins into credits
-- Phase 1: Convert existing coins to credits (2 coins = 1 credit, user-favorable rate)
-- Phase 3 (later): DROP coins column after validation period

BEGIN;

-- Step 1: Convert existing coins to credits (2:1 ratio)
UPDATE users
SET credits = COALESCE(credits, 0) + FLOOR(COALESCE(coins, 0) / 2)
WHERE coins IS NOT NULL AND coins > 0;

-- Step 2: Log the migration in credit_log
INSERT INTO credit_log (user_id, change_type, delta, balance_after, related_id, note, created_at)
SELECT
  id,
  'charge',
  FLOOR(COALESCE(coins, 0) / 2),
  credits,
  'migration_unify_credits',
  'Migrated from coins: original ' || COALESCE(coins, 0) || ' coins → ' || FLOOR(COALESCE(coins, 0) / 2) || ' credits (2:1 rate)',
  EXTRACT(EPOCH FROM NOW()) * 1000
FROM users
WHERE coins IS NOT NULL AND coins > 0;

-- Step 3: Zero out coins (keep column for now as rollback safety)
UPDATE users SET coins = 0 WHERE coins IS NOT NULL AND coins > 0;

COMMIT;

-- Phase 3 (run after 2 weeks of validation):
-- ALTER TABLE users DROP COLUMN IF EXISTS coins;
