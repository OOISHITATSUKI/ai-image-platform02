import crypto from 'crypto';
import { supabaseAdmin } from '../supabase-server';

// ============================================================
// Claim Tokens — generate & redeem Fanvue purchase tokens
// ============================================================

const TOKEN_EXPIRY_DAYS = 30;

export interface ClaimToken {
  id: string;
  token: string;
  fanvueHandle: string | null;
  fanvueUuid: string | null;
  purchaseType: string;
  amountCents: number;
  credits: number;
  status: 'pending' | 'claimed' | 'expired';
  claimedBy: string | null;
  claimedAt: string | null;
  assignedTo: string | null;
  visitorIp: string | null;
  expiresAt: string;
  createdAt: string;
}

function rowToClaimToken(row: any): ClaimToken {
  return {
    id: row.id,
    token: row.token,
    fanvueHandle: row.fanvue_handle,
    fanvueUuid: row.fanvue_uuid,
    purchaseType: row.purchase_type,
    amountCents: row.amount_cents,
    credits: row.credits,
    status: row.status,
    claimedBy: row.claimed_by,
    claimedAt: row.claimed_at,
    assignedTo: row.assigned_to,
    visitorIp: row.visitor_ip,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

/**
 * Generate a new claim token for a Fanvue purchase.
 */
export async function createClaimToken(params: {
  fanvueHandle: string | null;
  fanvueUuid: string | null;
  purchaseType: string;
  amountCents: number;
  credits: number;
}): Promise<ClaimToken> {
  const token = crypto.randomBytes(16).toString('hex'); // 32 chars
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from('claim_tokens')
    .insert({
      token,
      fanvue_handle: params.fanvueHandle,
      fanvue_uuid: params.fanvueUuid,
      purchase_type: params.purchaseType,
      amount_cents: params.amountCents,
      credits: params.credits,
      status: 'pending',
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) {
    console.error('[claimTokens] create error:', error);
    throw error;
  }

  return rowToClaimToken(data);
}

/**
 * Look up a claim token by its string value.
 * Returns null if not found.
 */
export async function getClaimToken(token: string): Promise<ClaimToken | null> {
  const { data, error } = await supabaseAdmin
    .from('claim_tokens')
    .select('*')
    .eq('token', token)
    .maybeSingle();

  if (error) {
    console.error('[claimTokens] lookup error:', error);
    return null;
  }

  return data ? rowToClaimToken(data) : null;
}

/**
 * Redeem a claim token — mark as claimed and assign to user.
 * Returns the updated token, or null if redemption failed.
 *
 * Fails if: token not found, already claimed, or expired.
 */
export async function redeemClaimToken(token: string, userId: string): Promise<ClaimToken | null> {
  const existing = await getClaimToken(token);
  if (!existing) return null;
  if (existing.status !== 'pending') return null;
  if (new Date(existing.expiresAt) < new Date()) {
    // Mark as expired
    await supabaseAdmin
      .from('claim_tokens')
      .update({ status: 'expired' })
      .eq('id', existing.id);
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from('claim_tokens')
    .update({
      status: 'claimed',
      claimed_by: userId,
      claimed_at: new Date().toISOString(),
    })
    .eq('id', existing.id)
    .eq('status', 'pending') // Optimistic lock — prevents double claim
    .select()
    .maybeSingle();

  if (error || !data) {
    console.error('[claimTokens] redeem error:', error);
    return null;
  }

  return rowToClaimToken(data);
}

/**
 * Get all pending (unclaimed) tokens, optionally filtered.
 * Useful for admin dashboard.
 */
export async function getPendingTokens(options?: {
  limit?: number;
  includeExpired?: boolean;
}): Promise<ClaimToken[]> {
  const { limit = 100, includeExpired = false } = options ?? {};

  let query = supabaseAdmin
    .from('claim_tokens')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!includeExpired) {
    query = query.eq('status', 'pending');
  } else {
    query = query.in('status', ['pending', 'expired']);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[claimTokens] getPending error:', error);
    return [];
  }

  return (data ?? []).map(rowToClaimToken);
}

/**
 * Record visitor info on a claim token (IP + optional userId).
 * Called when someone visits the claim page.
 */
export async function assignClaimTokenVisitor(token: string, params: {
  userId?: string;
  ip?: string;
}): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (params.userId) updates.assigned_to = params.userId;
  if (params.ip) updates.visitor_ip = params.ip;

  if (Object.keys(updates).length === 0) return;

  await supabaseAdmin
    .from('claim_tokens')
    .update(updates)
    .eq('token', token)
    .eq('status', 'pending');
}

/**
 * Find pending claim tokens for a user by:
 * 1. assigned_to (user visited the claim page while logged in)
 * 2. visitor_ip (user visited the claim page before logging in, same IP)
 * 3. fanvue_handle (user has linked their Fanvue account)
 */
export async function findPendingTokensForUser(params: {
  userId: string;
  ip?: string;
  fanvueHandle?: string;
}): Promise<ClaimToken[]> {
  // Build OR conditions
  const conditions: string[] = [`assigned_to.eq.${params.userId}`];
  if (params.ip) conditions.push(`visitor_ip.eq.${params.ip}`);
  if (params.fanvueHandle) conditions.push(`fanvue_handle.eq.${params.fanvueHandle}`);

  const { data, error } = await supabaseAdmin
    .from('claim_tokens')
    .select('*')
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .or(conditions.join(','));

  if (error) {
    console.error('[claimTokens] findPending error:', error);
    return [];
  }

  return (data ?? []).map(rowToClaimToken);
}
