-- ============================================================
-- Email Feature Tables
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);
ALTER TABLE email_templates DISABLE ROW LEVEL SECURITY;

CREATE TABLE step_email_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    trigger TEXT NOT NULL DEFAULT 'manual' CHECK (trigger IN ('on_register','manual')),
    steps JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at BIGINT NOT NULL
);
ALTER TABLE step_email_sequences DISABLE ROW LEVEL SECURITY;

CREATE TABLE step_email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sequence_id UUID NOT NULL REFERENCES step_email_sequences(id) ON DELETE CASCADE,
    current_step INTEGER NOT NULL DEFAULT 0,
    next_send_at BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','cancelled')),
    created_at BIGINT NOT NULL
);
CREATE INDEX idx_step_queue_next ON step_email_queue(next_send_at) WHERE status = 'pending';
CREATE INDEX idx_step_queue_user ON step_email_queue(user_id);
ALTER TABLE step_email_queue DISABLE ROW LEVEL SECURITY;
