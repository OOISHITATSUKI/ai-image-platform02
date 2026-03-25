-- Guest Generations table for tracking guest (unauthenticated) image generations
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS guest_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id TEXT NOT NULL,                    -- IP address or fingerprint
    generation_type TEXT NOT NULL DEFAULT 'txt2img',  -- 'txt2img' | 'faceswap' | 'inpaint'
    prompt TEXT,                               -- The prompt used
    original_path TEXT,                        -- Path to original (watermark-free) image
    watermarked_path TEXT,                     -- Path to watermarked image
    unlocked BOOLEAN DEFAULT FALSE,            -- Whether this image has been unlocked by registration
    registered BOOLEAN DEFAULT FALSE,          -- Whether this guest later registered
    registered_at TIMESTAMPTZ,                 -- When they registered
    user_id UUID REFERENCES users(id),         -- Linked user ID after registration
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_guest_gen_guest_id ON guest_generations(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_gen_created_at ON guest_generations(created_at);
CREATE INDEX IF NOT EXISTS idx_guest_gen_unlocked ON guest_generations(unlocked) WHERE unlocked = FALSE;

-- Guest events table for tracking clicks and conversions
CREATE TABLE IF NOT EXISTS guest_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id TEXT NOT NULL,
    event_type TEXT NOT NULL,                  -- 'unlock_click' | 'banner_cta_click' | 'register_complete'
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guest_events_guest_id ON guest_events(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_events_type ON guest_events(event_type);
CREATE INDEX IF NOT EXISTS idx_guest_events_created_at ON guest_events(created_at);

-- Auto-cleanup: delete guest images older than 24 hours that weren't unlocked
-- (Run as a scheduled function or cron job)
-- DELETE FROM guest_generations
-- WHERE registered = FALSE AND unlocked = FALSE
-- AND created_at < NOW() - INTERVAL '24 hours';
