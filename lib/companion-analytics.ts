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

/**
 * Client-side event logger — calls a lightweight API endpoint.
 * Used from frontend components where supabaseAdmin is not available.
 */
export async function logCompanionEventClient(params: {
  eventType: string;
  characterId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    await fetch('/api/companion-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(params),
    });
  } catch {
    // fire-and-forget
  }
}
