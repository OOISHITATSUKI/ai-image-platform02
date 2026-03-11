// ============================================================
// Core Types for the NSFW AI Generation Platform
// ============================================================

export type GenerationType = 'txt2img' | 'img2img' | 'img_edit' | 'txt2vid' | 'img2vid' | 'ref2vid' | 'vid2vid';

export type PlanTier = 'free' | 'basic' | 'pro' | 'ultimate';

export type ThemeMode = 'dark' | 'light';

export type Locale = 'en' | 'ja' | 'es' | 'zh' | 'ko' | 'pt';

export type AspectRatio = '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | '21:9';

export type Resolution = '512' | '1024' | '2K' | '4K';

export type MediaFilter = 'all' | 'images' | 'videos' | 'favorites';

// ----- Chat & Messages -----

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  generationType?: GenerationType;
  isFavorite: boolean;
  timestamp: number;
  translatedPrompt?: string;
  model?: string;
  settings?: GenerationSettings;
}

export interface Chat {
  id: string;
  name: string;
  category?: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

// ----- Generation Settings -----

export type QualityPreset = 'quick' | 'standard' | 'hd' | 'ultra';

export interface GenerationSettings {
  generationType: GenerationType;
  model: string;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  count: number;
  duration: number; // seconds (for video)
  cameraFixed: boolean;
  qualityPreset: QualityPreset;
  referenceImageUrl?: string;
  faceSwapImageUrl?: string;
  img2imgStrength?: number;
  promptTemplate?: string;
  tagSettings?: TagSettings;
  nudeMode?: boolean;
}

// ----- Tag-based Parameter Types -----

export type AgeTag = '20s_early' | '20s_late' | '30s' | '40s';
export type StylePresetTag = 'film' | 'dreamy' | 'natural' | 'glamour' | 'night' | 'raw' | 'anime';
export type HairColorTag = 'black_hair' | 'brown_hair' | 'blonde_hair' | 'red_hair' | 'pink_hair' | 'silver_hair' | 'blue_hair';
export type HairStyleTag = 'long_straight' | 'long_wavy' | 'short_bob' | 'ponytail' | 'twin_tails' | 'messy_bun' | 'pixie_cut';
export type PeopleCountTag = '1' | '2' | 'multiple';
export type EthnicityTag = 'asian' | 'european' | 'american' | 'southeast_asian' | 'latina' | 'african';
export type PhotorealismTag = 'photorealistic' | 'realistic';
export type CompositionTag = 'full_body' | 'waist_up' | 'bust' | 'face_closeup';
export type BreastPositionTag = 'cleavage' | 'asymmetric' | 'natural' | 'pushed_together';
export type FetishTag = 'fellatio' | 'cowgirl' | 'insertion' | 'kiss' | 'missionary' | 'doggy' | 'standing' | 'handjob' | 'paizuri';

export interface TagSettings {
  stylePreset?: StylePresetTag;
  hairColor?: HairColorTag;
  hairStyle?: HairStyleTag;
  age?: AgeTag;
  peopleCount?: PeopleCountTag;
  ethnicity?: EthnicityTag;
  breastSize: number; // 0-100 slider
  breastPosition?: BreastPositionTag;
  photorealism?: PhotorealismTag;
  composition?: CompositionTag;
  fetish: FetishTag[];
}

// ----- Saved Faces -----

export interface SavedFace {
  id: string;
  user_id: string;
  name: string;
  image_url: string;
  thumbnail_url: string;
  is_active: boolean;
  created_at: string;
}

export const MAX_FACES = {
  free: 1,
  paid: 10,
} as const;

// ----- User -----

export type UserStatus = 'pending_otp' | 'pending_password' | 'pending_agreements' | 'pending_profile' | 'active' | 'age_restricted' | 'banned';

export interface User {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  plan: PlanTier;
  credits: number;
  locale: Locale;
  theme: ThemeMode;
  status?: UserStatus;
  dateOfBirth?: string;
  country?: string;
  firstGenerationConfirmed?: boolean;
  termsAgreedAt?: number;
}

// ----- Plan Limits -----

export interface PlanLimits {
  imagesPerDay: number | 'unlimited';
  videosPerDay: number | false;
  maxResolution: Resolution;
  maxVideoDuration: number | false; // seconds
  faceSwapPerDay: number | 'unlimited' | false;
  chatHistoryDays: number | 'unlimited';
  hasAds: boolean;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    imagesPerDay: 5,
    videosPerDay: false,
    maxResolution: '512',
    maxVideoDuration: false,
    faceSwapPerDay: false,
    chatHistoryDays: 1,
    hasAds: true,
  },
  basic: {
    imagesPerDay: 100,
    videosPerDay: 5,
    maxResolution: '1024',
    maxVideoDuration: 3,
    faceSwapPerDay: 10,
    chatHistoryDays: 30,
    hasAds: false,
  },
  pro: {
    imagesPerDay: 500,
    videosPerDay: 30,
    maxResolution: '2K',
    maxVideoDuration: 8,
    faceSwapPerDay: 50,
    chatHistoryDays: 'unlimited',
    hasAds: false,
  },
  ultimate: {
    imagesPerDay: 'unlimited',
    videosPerDay: 100,
    maxResolution: '4K',
    maxVideoDuration: 20,
    faceSwapPerDay: 'unlimited',
    chatHistoryDays: 'unlimited',
    hasAds: false,
  },
};

// ----- Models -----

export type ModelApiType = 'sd' | 'seedream';
export type ModelCategory = 'sfw' | 'nsfw-realistic';

export interface AIModel {
  id: string;
  name: string;
  type: 'image' | 'video';
  provider: 'novita' | 'venice' | 'wan';
  description: string;
  novitaModelName?: string;
  /** API type: 'sd' for standard Stable Diffusion pipeline, 'seedream' for Novita Seedream endpoint */
  apiType?: ModelApiType;
  /** Seedream-specific endpoint path, e.g. 'seedream-3-0-t2i' */
  seedreamEndpoint?: string;
  /** If true, this model is designed for / allows NSFW content */
  nsfw?: boolean;
  /** Category for UI grouping */
  category?: ModelCategory;
}

export const AVAILABLE_MODELS: AIModel[] = [
  // ── SDXL Photoreal Models ──
  { id: 'novita-realvis-xl', name: '✨ RealVisXL V5.0', type: 'image', provider: 'novita', description: 'High-end SDXL photorealism (V5.0)', novitaModelName: 'realvisxlV50_v50LightningBakedvae_718065.safetensors', apiType: 'sd', nsfw: true, category: 'nsfw-realistic' },
  { id: 'novita-juggernaut-xl', name: '✨ Juggernaut XL (V11)', type: 'image', provider: 'novita', description: 'Powerful SDXL versatile (V11)', novitaModelName: 'juggernautXL_juggXIByRundiffusion_695423.safetensors', apiType: 'sd', nsfw: true, category: 'nsfw-realistic' },
  { id: 'novita-helloworld-xl', name: '✨ HelloWorld XL V7.0', type: 'image', provider: 'novita', description: 'Natural SDXL realism (V7.0)', novitaModelName: 'leosamsHelloworldXL_helloworldXL70_485879.safetensors', apiType: 'sd', nsfw: true, category: 'nsfw-realistic' },

  // ── Video Models ──
  { id: 'wan-2.1', name: 'WAN 2.1', type: 'video', provider: 'wan', description: 'Fast video generation' },
  { id: 'wan-2.6', name: 'WAN 2.6 Pro', type: 'video', provider: 'wan', description: 'High quality video' },
  { id: 'venice-ltx', name: 'LTX Video', type: 'video', provider: 'venice', description: 'Cinematic video generation' },
];
