// ============================================================
// Companion Analytics — CLIENT-SIDE only (no server imports)
// ============================================================

/**
 * Client-side event logger — calls a lightweight API endpoint.
 * Safe to import in 'use client' components.
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
