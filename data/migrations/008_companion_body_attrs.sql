-- Add body attribute columns to companions table
-- These were previously hardcoded in lib/companions.ts

ALTER TABLE companions ADD COLUMN IF NOT EXISTS profile_body_type TEXT;
ALTER TABLE companions ADD COLUMN IF NOT EXISTS profile_breast_size TEXT;
ALTER TABLE companions ADD COLUMN IF NOT EXISTS profile_hair_color TEXT;
ALTER TABLE companions ADD COLUMN IF NOT EXISTS profile_hair_style TEXT;
ALTER TABLE companions ADD COLUMN IF NOT EXISTS profile_skin_tone TEXT;
ALTER TABLE companions ADD COLUMN IF NOT EXISTS profile_height TEXT;
ALTER TABLE companions ADD COLUMN IF NOT EXISTS profile_special_features TEXT;

-- Seed existing companions with their current hardcoded values
UPDATE companions SET
  profile_body_type = 'slim',
  profile_breast_size = 'medium',
  profile_hair_color = 'dark brown',
  profile_hair_style = 'short-medium straight',
  profile_skin_tone = 'fair',
  profile_height = '162cm'
WHERE id = 'aria';

UPDATE companions SET
  profile_body_type = 'curvy',
  profile_breast_size = 'extra large',
  profile_hair_color = 'dark brown',
  profile_hair_style = 'long wavy',
  profile_skin_tone = 'fair',
  profile_height = '170cm'
WHERE id = 'isabella';

UPDATE companions SET
  profile_body_type = 'petite',
  profile_breast_size = 'small',
  profile_hair_color = 'brown',
  profile_hair_style = 'short bob',
  profile_skin_tone = 'fair',
  profile_height = '155cm'
WHERE id = 'chloe';

UPDATE companions SET
  profile_body_type = 'athletic',
  profile_breast_size = 'large',
  profile_hair_color = 'blonde',
  profile_hair_style = 'long straight',
  profile_skin_tone = 'tan',
  profile_height = '168cm'
WHERE id = 'elena';

UPDATE companions SET
  profile_body_type = 'slim',
  profile_breast_size = 'medium',
  profile_hair_color = 'black',
  profile_hair_style = 'long straight',
  profile_skin_tone = 'fair',
  profile_height = '160cm'
WHERE id = 'luna';
