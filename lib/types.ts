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
  promptTemplate?: string;
  tagSettings?: TagSettings;
}

// ----- Tag-based Parameter Types -----

export type AgeTag = '20s' | '30s';
export type PeopleCountTag = '1' | '2' | 'multiple';
export type EthnicityTag = 'asian' | 'european' | 'american' | 'southeast_asian' | 'latina' | 'african';
export type PhotorealismTag = 'photorealistic' | 'realistic';
export type CompositionTag = 'full_body' | 'waist_up' | 'bust' | 'face_closeup';
export type BreastPositionTag = 'cleavage' | 'asymmetric' | 'natural' | 'pushed_together';
export type FetishTag = 'fellatio' | 'cowgirl' | 'insertion' | 'kiss' | 'missionary' | 'doggy' | 'standing' | 'handjob' | 'paizuri';

export interface TagSettings {
  age?: AgeTag;
  peopleCount?: PeopleCountTag;
  ethnicity?: EthnicityTag;
  breastSize: number; // 0-100 slider
  breastPosition?: BreastPositionTag;
  photorealism?: PhotorealismTag;
  composition?: CompositionTag;
  fetish: FetishTag[];
}

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
  // ── NSFW Realistic Models ──
  { id: 'novita-realistic-vision-6', name: '🔞 Realistic Vision V6.0', type: 'image', provider: 'novita', description: 'Best photorealistic NSFW', novitaModelName: 'realisticVisionV60B1_v60B1VAE_190174.safetensors', apiType: 'sd', nsfw: true, category: 'nsfw-realistic' },
  { id: 'novita-epicrealism', name: '🔞 epiCRealism', type: 'image', provider: 'novita', description: 'Natural skin excellence', novitaModelName: 'epicrealism_naturalSinRC1VAE_106430.safetensors', apiType: 'sd', nsfw: true, category: 'nsfw-realistic' },
  { id: 'novita-bra', name: '🔞 Beautiful Realistic Asians', type: 'image', provider: 'novita', description: 'Specialized for Asian beauty', novitaModelName: 'beautifulRealistic_brav3_31664.safetensors', apiType: 'sd', nsfw: true, category: 'nsfw-realistic' },
  { id: 'novita-majicmix', name: '🔞 majicMIX Realistic', type: 'image', provider: 'novita', description: 'Classic realistic model', novitaModelName: 'majicmixRealistic_v7_134792.safetensors', apiType: 'sd', nsfw: true, category: 'nsfw-realistic' },
  { id: 'novita-cyberrealistic', name: '🔞 CyberRealistic', type: 'image', provider: 'novita', description: 'Modern photorealism', novitaModelName: 'cyberrealistic_v40_151857.safetensors', apiType: 'sd', nsfw: true, category: 'nsfw-realistic' },
  { id: 'novita-dreamshaper', name: '🔞 DreamShaper', type: 'image', provider: 'novita', description: 'Fantasy versatile', novitaModelName: 'dreamshaper_8_93211.safetensors', apiType: 'sd', nsfw: true, category: 'nsfw-realistic' },

  // ── SDXL Photoreal Models (txt2img only) ──
  { id: 'novita-realvis-xl', name: '✨ RealVisXL V4.0', type: 'image', provider: 'novita', description: 'High-end SDXL photorealism', novitaModelName: 'realvisxlV40_v40Bakedvae_615025.safetensors', apiType: 'sd', nsfw: true, category: 'nsfw-realistic' },
  { id: 'novita-juggernaut-xl', name: '✨ JuggernautXL V9', type: 'image', provider: 'novita', description: 'Powerful SDXL versatile', novitaModelName: 'juggernautXL_v9_142750.safetensors', apiType: 'sd', nsfw: true, category: 'nsfw-realistic' },
  { id: 'novita-helloworld-xl', name: '✨ HelloWorld XL', type: 'image', provider: 'novita', description: 'Natural SDXL realism', novitaModelName: 'helloworld_v10_88849.safetensors', apiType: 'sd', nsfw: true, category: 'nsfw-realistic' },

  // ── Video Models ──
  { id: 'wan-2.1', name: 'WAN 2.1', type: 'video', provider: 'wan', description: 'Fast video generation' },
  { id: 'wan-2.6', name: 'WAN 2.6 Pro', type: 'video', provider: 'wan', description: 'High quality video' },
  { id: 'venice-ltx', name: 'LTX Video', type: 'video', provider: 'venice', description: 'Cinematic video generation' },
];
