-- Add per-companion Live Action on/off toggle.
-- Run this in Supabase SQL Editor on production.
-- Idempotent: safe to re-run.

alter table companions
  add column if not exists live_action_enabled boolean not null default true;

-- Existing rows default to enabled; switch off in the admin UI individually.
