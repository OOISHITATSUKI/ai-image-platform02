// ============================================================
// Companion Analytics — fire-and-forget event logging
// ============================================================

import { supabaseAdmin } from '@/lib/supabase-server';
import type { CompanionEventType } from './companion-constants';

/**
 * Log a companion event to the companion_events table.
 * Fire-and-forget: never blocks the caller, never throws.
 */
export async function logCompanionEvent(params: {
  userId: string;
  eventType: CompanionEventType | string;
  characterId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await supabaseAdmin.from('companion_events').insert({
      user_id: params.userId,
      event_type: params.eventType,
      character_id: params.characterId ?? null,
      session_id: params.sessionId ?? null,
      metadata: params.metadata ?? {},
    });
  } catch (err) {
    console.error('[companion-analytics] Failed to log event:', err);
  }
}

// Client-side logger is in companion-analytics-client.ts
// (separated to avoid bundling supabaseAdmin in client components)
