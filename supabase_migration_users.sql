-- ============================================================
-- Supabase Migration: User Data (JSON → PostgreSQL)
-- Run in Supabase SQL Editor
-- ============================================================

-- Drop existing minimal users table and dependent tables
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS chats CASCADE;
DROP TABLE IF EXISTS saved_faces CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================
-- users — Full user accounts
-- ============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL DEFAULT '',
    username TEXT,
    status TEXT NOT NULL DEFAULT 'pending_otp'
        CHECK (status IN ('pending_otp','pending_password','pending_agreements','pending_profile','active','age_restricted','banned')),
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    date_of_birth TEXT,
    country TEXT,
    plan TEXT NOT NULL DEFAULT 'free',
    credits INTEGER NOT NULL DEFAULT 20,
    locale TEXT NOT NULL DEFAULT 'en',
    theme TEXT NOT NULL DEFAULT 'dark',

    -- OTP fields
    otp_code TEXT,
    otp_expires_at BIGINT,
    otp_attempts INTEGER DEFAULT 0,
    otp_locked_until BIGINT,
    otp_last_sent_at BIGINT,

    -- Agreements (JSONB)
    agreements JSONB,

    -- First generation flag
    first_generation_confirmed BOOLEAN NOT NULL DEFAULT FALSE,

    -- Anti-abuse
    fingerprint_hash TEXT,
    free_credits_expire_at BIGINT,
    registration_ip TEXT,

    -- Timestamps (BIGINT Unix ms)
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    last_login_at BIGINT,

    -- Terms
    terms_agreed_at BIGINT,
    terms_version TEXT,

    -- Settings (JSONB)
    settings JSONB,

    -- Device MFA OTP
    device_otp_code TEXT,
    device_otp_expires_at BIGINT,
    device_otp_attempts INTEGER DEFAULT 0,
    device_otp_locked_until BIGINT,
    last_known_country TEXT,
    login_fail_count INTEGER DEFAULT 0,
    login_fail_reset_at BIGINT,

    -- Password reset
    password_reset_otp TEXT,
    password_reset_expires_at BIGINT,
    password_reset_attempts INTEGER DEFAULT 0,
    password_reset_locked_until BIGINT
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- Recreate chats & messages (dependent on users)
-- ============================================================
CREATE TABLE chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE chats DISABLE ROW LEVEL SECURITY;

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT,
    image_url TEXT,
    video_url TEXT,
    thumbnail_url TEXT,
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- saved_faces — My Faces (paid users only persisted)
-- ============================================================
CREATE TABLE saved_faces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(50),
    image_url TEXT,
    thumbnail_url TEXT,
    is_active BOOLEAN DEFAULT FALSE,
    created_at BIGINT NOT NULL
);

CREATE INDEX idx_saved_faces_user ON saved_faces(user_id);
ALTER TABLE saved_faces DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- credit_log — Credit usage / charge history
-- ============================================================
CREATE TABLE credit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    change_type TEXT NOT NULL CHECK (change_type IN ('charge','use','refund','admin')),
    delta INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    related_id TEXT,
    note TEXT,
    created_at BIGINT NOT NULL
);

CREATE INDEX idx_credit_log_user ON credit_log(user_id, created_at DESC);
ALTER TABLE credit_log DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- transactions — Payment transactions (NowPayments)
-- ============================================================
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nowpayments_id TEXT,
    pack_type TEXT NOT NULL CHECK (pack_type IN ('standard','premium')),
    credits_granted INTEGER NOT NULL,
    amount_usd NUMERIC(10,2) NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','confirming','completed','failed','expired')),
    created_at BIGINT NOT NULL,
    completed_at BIGINT
);

CREATE INDEX idx_transactions_user ON transactions(user_id, created_at DESC);
CREATE INDEX idx_transactions_nowpayments ON transactions(nowpayments_id);
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- login_log — Login attempt history
-- ============================================================
CREATE TABLE login_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    email TEXT,
    ip_address TEXT,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    fail_reason TEXT,
    created_at BIGINT NOT NULL
);

CREATE INDEX idx_login_log_user ON login_log(user_id, created_at DESC);
ALTER TABLE login_log DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- trusted_devices — MFA device trust records
-- ============================================================
CREATE TABLE trusted_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_token TEXT NOT NULL,
    device_name TEXT,
    ip_address TEXT,
    country_code TEXT,
    last_used_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL,
    created_at BIGINT NOT NULL
);

CREATE INDEX idx_trusted_devices_token ON trusted_devices(device_token);
CREATE INDEX idx_trusted_devices_user ON trusted_devices(user_id);
ALTER TABLE trusted_devices DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- registration_attempts — Rate limiting
-- ============================================================
CREATE TABLE registration_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address TEXT NOT NULL,
    email TEXT NOT NULL,
    success BOOLEAN NOT NULL,
    created_at BIGINT NOT NULL
);

CREATE INDEX idx_reg_attempts_ip ON registration_attempts(ip_address, created_at DESC);
ALTER TABLE registration_attempts DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- ip_bans — IP-based bans
-- ============================================================
CREATE TABLE ip_bans (
    ip TEXT PRIMARY KEY,
    strikes INTEGER NOT NULL DEFAULT 0,
    permanent BOOLEAN NOT NULL DEFAULT FALSE,
    banned_until BIGINT,
    email TEXT,
    note TEXT,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

ALTER TABLE ip_bans DISABLE ROW LEVEL SECURITY;
