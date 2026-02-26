/**
 * Simple in-memory rate limiter for single-server Next.js apps.
 * Not suitable for multi-server deployments (would need Redis).
 */

interface RateLimitInfo {
    count: number;
    resetAt: number;
}

const store = new Map<string, RateLimitInfo>();

export interface RateLimitResult {
    allowed: boolean;
    count: number;
    remaining: number;
    resetAt: number;
}

export function rateLimit(key: string, maxRequests: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    let record = store.get(key);

    // If record doesn't exist or is expired, initialize a fresh one
    if (!record || now > record.resetAt) {
        record = {
            count: 0,
            resetAt: now + windowMs
        };
    }

    // Increment request count
    record.count++;
    store.set(key, record);

    const allowed = record.count <= maxRequests;
    const remaining = Math.max(0, maxRequests - record.count);

    return {
        allowed,
        count: record.count,
        remaining,
        resetAt: record.resetAt
    };
}

// Optional: cleanup expired keys to prevent memory leaks over months of uptime
export function cleanupRateLimits() {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
        if (now > record.resetAt) {
            store.delete(key);
        }
    }
}

// Periodically cleanup every hour
if (typeof setInterval !== 'undefined') {
    setInterval(cleanupRateLimits, 60 * 60 * 1000);
}
