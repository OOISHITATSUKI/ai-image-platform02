// ============================================================
// Unified Credit Costs — single source of truth
// ============================================================

export const CREDIT_COSTS = {
  // Image generation
  txt2img: 1,
  img2img: 2,
  inpaint: 3,
  faceSwap: 5,
  videoGen: 10,

  // Companion chat
  chatSfw: 0,              // Free (daily limit still applies)
  chatNsfw: 1,             // 1 credit per NSFW message

  // Companion photos
  girlfriendPhotoSfw: 2,
  girlfriendPhotoNsfw: 3,

  // Companion relationship actions (replaces coins)
  gift: 5,                 // Relationship gift
  boost: 15,               // Relationship boost
  unlockContent: 30,       // Jump to next content tier
  skipLevel: 10,           // Base cost for level skip
  extraChat: 10,           // 50 extra messages
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

// Level skip costs (override base)
export const SKIP_LEVEL_CREDIT_COSTS: Record<number, number> = {
  2: 3, 3: 5, 4: 8, 5: 6, 6: 10, 7: 15, 8: 20, 9: 30,
};

// Credit packs available for purchase (one-time)
export const CREDIT_PACKS = {
  starter: { credits: 60, usd: 4.99 },
  plus: { credits: 150, usd: 9.99 },
  mega: { credits: 350, usd: 19.99 },
} as const;

export type CreditPackType = keyof typeof CREDIT_PACKS;

// Subscription plans
export const SUBSCRIPTION_PLANS = {
  lite: { credits: 80, usd: 7.99 },
  standard: { credits: 220, usd: 14.99 },
  premium: { credits: 600, usd: 24.99 },
} as const;

// Lite plan: monthly NSFW chat limit
export const LITE_NSFW_MONTHLY_LIMIT = 20;
