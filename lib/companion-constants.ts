// ============================================================
// Companion Analytics Constants
// ============================================================

/** Paywall trigger types — used for event logging and KPI segmentation */
export const PAYWALL_TRIGGERS = {
  LEVEL_GATE: 'level_gate',
  MESSAGE_LIMIT: 'message_limit',
  LIVE_ACTION_GATE: 'live_action_gate',
  NSFW_GATE: 'nsfw_gate',
  PHOTO_LIMIT: 'photo_limit',
  GUEST_LIMIT: 'guest_limit',
} as const;

export type PaywallTrigger = typeof PAYWALL_TRIGGERS[keyof typeof PAYWALL_TRIGGERS];

/** Event types logged to companion_events table */
export const COMPANION_EVENTS = {
  SESSION_START: 'companion_session_start',
  MESSAGE_SENT: 'companion_message_sent',
  AI_REPLIED: 'companion_ai_replied',
  SESSION_END: 'companion_session_end',
  CHARACTER_SWITCHED: 'character_switched',
  LIVE_ACTION_TRIGGERED: 'live_action_triggered',
  XP_GAINED: 'xp_gained',
  LEVEL_UP: 'level_up',
  PAYWALL_SHOWN: 'paywall_shown',
  PAYWALL_CLICKED: 'paywall_clicked',
  PAYMENT_COMPLETED: 'payment_completed',
  PHOTO_REQUESTED: 'companion_photo_requested',
} as const;

export type CompanionEventType = typeof COMPANION_EVENTS[keyof typeof COMPANION_EVENTS];

/** Entry points for session tracking */
export const ENTRY_POINTS = {
  HOME_CARD: 'home_card',
  DIRECT_URL: 'direct_url',
  ASSISTANT: 'assistant',
} as const;
