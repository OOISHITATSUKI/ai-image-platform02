'use client';

// ============================================================
// Safe localStorage wrapper — prevents quota exceeded crashes
// ============================================================

const CHAT_KEY_PREFIXES = [
  'chat_history_',
  'recent_messages_',
  'companion-chat-',
];

const QUOTA_THRESHOLD = 4 * 1024 * 1024; // 4MB (80% of 5MB limit)
const MAX_CHAT_MESSAGES = 20; // Max messages to cache per companion

/**
 * Clean up old/large companion chat entries from localStorage.
 */
function cleanupChatStorage(): number {
  let cleaned = 0;
  const keysToDelete: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (CHAT_KEY_PREFIXES.some(p => key.startsWith(p))) {
      keysToDelete.push(key);
    }
  }

  // Sort by size (largest first) and delete until under threshold
  const sized = keysToDelete.map(key => ({
    key,
    size: (localStorage.getItem(key) || '').length,
  })).sort((a, b) => b.size - a.size);

  for (const { key } of sized) {
    localStorage.removeItem(key);
    cleaned++;
    // Check if we're under threshold now
    try {
      const used = new Blob(Object.values(localStorage)).size;
      if (used < QUOTA_THRESHOLD * 0.6) break;
    } catch {
      break;
    }
  }

  return cleaned;
}

export const safeStorage = {
  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  setItem(key: string, value: string): boolean {
    if (typeof window === 'undefined') return false;
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      // Quota exceeded — clean up and retry
      if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
        console.warn(`[safeStorage] Quota exceeded for: ${key}, cleaning up...`);
        const cleaned = cleanupChatStorage();
        console.log(`[safeStorage] Cleaned ${cleaned} entries, retrying...`);
        try {
          localStorage.setItem(key, value);
          return true;
        } catch {
          console.error(`[safeStorage] Still failed after cleanup, skipping: ${key}`);
          return false;
        }
      }
      console.error(`[safeStorage] Write failed for ${key}:`, e);
      return false;
    }
  },

  removeItem(key: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};

/**
 * Emergency cleanup — run on app startup.
 * Clears companion chat data if localStorage is near quota.
 */
export function emergencyCleanup(): void {
  if (typeof window === 'undefined') return;
  try {
    const used = new Blob(Object.values(localStorage)).size;
    if (used > QUOTA_THRESHOLD) {
      console.warn(`[emergencyCleanup] ${(used / 1024 / 1024).toFixed(2)}MB used — cleaning`);
      const cleaned = cleanupChatStorage();
      const after = new Blob(Object.values(localStorage)).size;
      console.log(`[emergencyCleanup] Cleaned ${cleaned} keys. Now: ${(after / 1024 / 1024).toFixed(2)}MB`);
    }
  } catch {
    // Last resort: full clear
    try { localStorage.clear(); } catch {}
  }
}

/**
 * Sanitize a message for localStorage — strip base64/blob URLs.
 */
export function sanitizeForStorage<T extends { imageUrl?: string; videoUrl?: string }>(obj: T): T {
  return {
    ...obj,
    imageUrl: obj.imageUrl?.startsWith('http') ? obj.imageUrl : undefined,
    videoUrl: obj.videoUrl?.startsWith('http') ? obj.videoUrl : undefined,
  };
}

export { MAX_CHAT_MESSAGES };
