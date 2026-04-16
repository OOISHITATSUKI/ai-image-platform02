/**
 * Seed the `companions` table from the in-repo defaults (lib/companions.ts).
 * Run with: npx tsx scripts/seed-companions.ts
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Idempotent: uses upsert on id.
 */

import fs from 'fs';
import path from 'path';

// Load .env.local / .env
for (const file of ['.env.local', '.env']) {
  const full = path.join(process.cwd(), file);
  if (!fs.existsSync(full)) continue;
  const content = fs.readFileSync(full, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const k = trimmed.slice(0, eq).trim();
    const v = trimmed.slice(eq + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

import { createClient } from '@supabase/supabase-js';
import { COMPANIONS, nudeAssistant } from '../lib/companions';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const all = [...COMPANIONS, nudeAssistant];

async function run() {
  const rows = all.map((c, idx) => ({
    id: c.id,
    name: c.name,
    age: c.age,
    personality: c.personality,
    tagline: c.tagline,
    description: c.description,
    avatar_url: c.avatarUrl,
    gallery_urls: c.galleryUrls,
    system_prompt: c.systemPrompt,
    tags: c.tags,
    is_premium: c.isPremium,
    is_new: c.isNew,
    is_assistant: !!c.isAssistant,
    status: 'published',
    sort_order: idx,
    relationship: c.relationship ?? null,
    personality_description: c.personalityDescription ?? null,
    profile_hometown: c.profile?.hometown ?? null,
    profile_occupation: c.profile?.occupation ?? null,
    profile_favorite_food: c.profile?.favoriteFood ?? null,
    profile_hated_food: c.profile?.hatedFood ?? null,
    profile_music: c.profile?.music ?? null,
    profile_movies: c.profile?.movies ?? null,
    profile_hobbies: c.profile?.hobbies ?? null,
    profile_catchphrase: c.profile?.catchphrase ?? null,
    first_message: c.firstMessage ?? null,
  }));

  // Test connection by attempting to select
  const probe = await supabase.from('companions').select('id').limit(1);
  if (probe.error) {
    console.error('Cannot read companions table. Did you run the SQL migration?');
    console.error(probe.error.message);
    process.exit(1);
  }

  const { error } = await supabase.from('companions').upsert(rows, { onConflict: 'id' });
  if (error) {
    console.error('Upsert failed:', error);
    process.exit(1);
  }

  console.log(`Seeded ${rows.length} companions.`);
}

run();
