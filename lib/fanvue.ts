// ============================================================
// Fanvue Integration — credit calculation & helpers
// ============================================================

/**
 * Credit conversion rates
 * Base: $1 = 30 credits
 */
const BASE_RATE = 30; // credits per dollar

const SUBSCRIPTION_BONUS: [number, number][] = [
  [3000, 500],  // $30+ → +500 bonus
  [2000, 200],  // $20-29.99 → +200
  [1500, 100],  // $15-19.99 → +100
  [1000, 50],   // $10-14.99 → +50
  [0, 0],       // below $10 → no bonus
];

/**
 * Calculate credits to grant based on payment amount and type.
 */
export function calculateCredits(
  amountCents: number,
  type: 'subscription' | 'tip' | 'purchase'
): number {
  const dollars = amountCents / 100;
  const baseCredits = Math.floor(dollars * BASE_RATE);

  if (type === 'subscription') {
    const bonus = SUBSCRIPTION_BONUS.find(([threshold]) => amountCents >= threshold);
    return baseCredits + (bonus?.[1] ?? 0);
  }

  return baseCredits;
}

/**
 * Validate Fanvue handle format.
 * Allows alphanumeric, underscores, hyphens, 1-30 chars.
 */
export function isValidFanvueHandle(handle: string): boolean {
  return /^[a-zA-Z0-9_-]{1,30}$/.test(handle);
}
