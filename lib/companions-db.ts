import { supabaseAdmin } from './supabase-server';
// re-used local alias for readability
const db = supabaseAdmin;
import {
  COMPANIONS,
  nudeAssistant,
  type Companion,
  type CompanionProfile,
} from './companions';

/**
 * Supabase row <-> Companion mapping.
 */
export interface CompanionRow {
  id: string;
  name: string;
  age: number;
  personality: string;
  tagline: string;
  description: string;
  avatar_url: string;
  gallery_urls: string[];
  system_prompt: string;
  tags: string[];
  is_premium: boolean;
  is_new: boolean;
  is_assistant: boolean;
  live_action_enabled: boolean;
  status: 'draft' | 'published' | 'hidden' | 'archived';
  sort_order: number;
  relationship: string | null;
  personality_description: string | null;
  profile_hometown: string | null;
  profile_occupation: string | null;
  profile_favorite_food: string | null;
  profile_hated_food: string | null;
  profile_music: string | null;
  profile_movies: string | null;
  profile_hobbies: string | null;
  profile_catchphrase: string | null;
  first_message: string | null;
  story_thumbnail_url: string | null;
  hover_video_url: string | null;
  profile_body_type: string | null;
  profile_breast_size: string | null;
  profile_hair_color: string | null;
  profile_hair_style: string | null;
  profile_skin_tone: string | null;
  profile_height: string | null;
  profile_special_features: string | null;
  created_at?: string;
  updated_at?: string;
}

export function rowToCompanion(row: CompanionRow): Companion {
  const hasProfile =
    row.profile_hometown ||
    row.profile_occupation ||
    row.profile_favorite_food ||
    row.profile_music ||
    row.profile_hobbies;

  // Body attributes — prefer DB columns, fallback to hardcoded legacy data
  const legacy = COMPANIONS.find((c) => c.id === row.id) ?? (row.is_assistant ? nudeAssistant : undefined);
  const legacyProfile = legacy?.profile;

  const profile: CompanionProfile | undefined = hasProfile
    ? {
        hometown: row.profile_hometown ?? '',
        occupation: row.profile_occupation ?? '',
        favoriteFood: row.profile_favorite_food ?? '',
        hatedFood: row.profile_hated_food ?? '',
        music: row.profile_music ?? '',
        movies: row.profile_movies ?? '',
        hobbies: row.profile_hobbies ?? '',
        catchphrase: row.profile_catchphrase ?? '',
        bodyType: row.profile_body_type ?? legacyProfile?.bodyType,
        breastSize: row.profile_breast_size ?? legacyProfile?.breastSize,
        hairColor: row.profile_hair_color ?? legacyProfile?.hairColor,
        hairStyle: row.profile_hair_style ?? legacyProfile?.hairStyle,
        skinTone: row.profile_skin_tone ?? legacyProfile?.skinTone,
        height: row.profile_height ?? legacyProfile?.height,
        specialFeatures: row.profile_special_features ?? legacyProfile?.specialFeatures,
      }
    : undefined;

  // Re-hydrate with current defaultLiveActions for this id (keeps clip mapping fresh)
  const liveActions = legacy?.liveActions ?? [];

  return {
    id: row.id,
    name: row.name,
    age: row.age,
    personality: row.personality as Companion['personality'],
    tagline: row.tagline,
    description: row.description,
    avatarUrl: row.avatar_url,
    galleryUrls: row.gallery_urls ?? [],
    systemPrompt: row.system_prompt,
    tags: row.tags ?? [],
    isPremium: row.is_premium,
    isNew: row.is_new,
    liveActions,
    isAssistant: row.is_assistant || undefined,
    liveActionEnabled: row.live_action_enabled,
    relationship: row.relationship ?? undefined,
    personalityDescription: row.personality_description ?? undefined,
    profile,
    firstMessage: row.first_message ?? undefined,
    storyThumbnailUrl: row.story_thumbnail_url ?? undefined,
    hoverVideoUrl: row.hover_video_url ?? undefined,
  };
}

export function companionToRow(
  c: Companion,
  options?: { sortOrder?: number; status?: CompanionRow['status'] },
): Omit<CompanionRow, 'created_at' | 'updated_at'> {
  return {
    id: c.id,
    name: c.name,
    age: c.age,
    personality: c.personality,
    tagline: c.tagline,
    description: c.description,
    avatar_url: c.avatarUrl,
    gallery_urls: c.galleryUrls ?? [],
    system_prompt: c.systemPrompt,
    tags: c.tags ?? [],
    is_premium: c.isPremium,
    is_new: c.isNew,
    is_assistant: !!c.isAssistant,
    live_action_enabled: c.liveActionEnabled !== false,
    status: options?.status ?? 'published',
    sort_order: options?.sortOrder ?? 0,
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
    story_thumbnail_url: c.storyThumbnailUrl ?? null,
    hover_video_url: c.hoverVideoUrl ?? null,
    profile_body_type: c.profile?.bodyType ?? null,
    profile_breast_size: c.profile?.breastSize ?? null,
    profile_hair_color: c.profile?.hairColor ?? null,
    profile_hair_style: c.profile?.hairStyle ?? null,
    profile_skin_tone: c.profile?.skinTone ?? null,
    profile_height: c.profile?.height ?? null,
    profile_special_features: c.profile?.specialFeatures ?? null,
  };
}

/**
 * Fetch all published (non-assistant) companions for the public home page.
 * Falls back to the defaults array if the DB table does not exist / is empty.
 */
export async function fetchPublicCompanions(): Promise<Companion[]> {
  try {
    const { data, error } = await db
      .from('companions')
      .select('*')
      .eq('status', 'published')
      .eq('is_assistant', false)
      .order('sort_order', { ascending: true });

    if (error) return COMPANIONS;
    if (!data || data.length === 0) return COMPANIONS;

    return (data as CompanionRow[]).map(rowToCompanion);
  } catch {
    return COMPANIONS;
  }
}

/**
 * Fetch a single companion (any status) by id. Returns defaults if DB row missing.
 */
export async function fetchCompanionById(id: string): Promise<Companion | null> {
  try {
    const { data, error } = await db
      .from('companions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      // fallback to defaults
      if (id === 'assistant') return nudeAssistant;
      return COMPANIONS.find((c) => c.id === id) ?? null;
    }
    return rowToCompanion(data as CompanionRow);
  } catch {
    if (id === 'assistant') return nudeAssistant;
    return COMPANIONS.find((c) => c.id === id) ?? null;
  }
}

/**
 * Admin: fetch all companions (any status).
 */
export async function fetchAllCompanionsAdmin(): Promise<Companion[]> {
  const { data, error } = await db
    .from('companions')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return (data as CompanionRow[]).map(rowToCompanion);
}
