-- Add greeting media fields to companions table
-- Admin can set a video or image to be sent with the first greeting message
ALTER TABLE companions ADD COLUMN IF NOT EXISTS greeting_video_url TEXT;
ALTER TABLE companions ADD COLUMN IF NOT EXISTS greeting_image_url TEXT;
