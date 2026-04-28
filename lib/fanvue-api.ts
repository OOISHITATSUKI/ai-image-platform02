// ============================================================
// Fanvue API Client — OAuth token management + DM sending
// ============================================================

import { supabaseAdmin } from './supabase-server';

const FANVUE_API_BASE = 'https://api.fanvue.com/v1';

// ── Token storage in DB (survives restarts) ──

interface FanvueTokenRecord {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix ms
}

/**
 * Get the stored OAuth tokens from DB.
 * We store a single row with key = 'fanvue_oauth'.
 */
async function getStoredTokens(): Promise<FanvueTokenRecord | null> {
  const { data, error } = await supabaseAdmin
    .from('app_settings')
    .select('value')
    .eq('key', 'fanvue_oauth')
    .maybeSingle();

  if (error || !data) return null;
  return data.value as FanvueTokenRecord;
}

/**
 * Save/update OAuth tokens in DB.
 */
async function saveTokens(tokens: FanvueTokenRecord): Promise<void> {
  const { error } = await supabaseAdmin
    .from('app_settings')
    .upsert({
      key: 'fanvue_oauth',
      value: tokens,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' });

  if (error) {
    console.error('[Fanvue API] Failed to save tokens:', error);
  }
}

// ── Token refresh ──

/**
 * Refresh the access token using the refresh token.
 */
async function refreshAccessToken(refreshToken: string): Promise<FanvueTokenRecord | null> {
  const clientId = process.env.FANVUE_CLIENT_ID;
  const clientSecret = process.env.FANVUE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('[Fanvue API] FANVUE_CLIENT_ID or FANVUE_CLIENT_SECRET not set');
    return null;
  }

  try {
    const res = await fetch(`${FANVUE_API_BASE}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[Fanvue API] Token refresh failed:', res.status, err);
      return null;
    }

    const data = await res.json();
    const tokens: FanvueTokenRecord = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken, // some OAuth servers don't rotate refresh tokens
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    };

    await saveTokens(tokens);
    console.log('[Fanvue API] Token refreshed successfully');
    return tokens;
  } catch (err) {
    console.error('[Fanvue API] Token refresh error:', err);
    return null;
  }
}

/**
 * Get a valid access token, refreshing if needed.
 * Falls back to env var for initial setup.
 */
async function getAccessToken(): Promise<string | null> {
  // Try DB first
  let tokens = await getStoredTokens();

  if (tokens) {
    // Refresh if expiring within 5 minutes
    if (tokens.expiresAt < Date.now() + 5 * 60 * 1000) {
      const refreshed = await refreshAccessToken(tokens.refreshToken);
      if (refreshed) return refreshed.accessToken;
      // If refresh failed but token hasn't expired yet, use it
      if (tokens.expiresAt > Date.now()) return tokens.accessToken;
      return null;
    }
    return tokens.accessToken;
  }

  // Fallback: use env var (for initial setup before DB storage)
  const envToken = process.env.FANVUE_ACCESS_TOKEN;
  if (envToken) {
    // Store it in DB for future use
    const envRefresh = process.env.FANVUE_REFRESH_TOKEN;
    if (envRefresh) {
      await saveTokens({
        accessToken: envToken,
        refreshToken: envRefresh,
        expiresAt: Date.now() + 3600 * 1000, // assume 1 hour
      });
    }
    return envToken;
  }

  console.error('[Fanvue API] No access token available');
  return null;
}

// ── DM Sending ──

/**
 * Send a DM to a Fanvue user by their UUID.
 */
export async function sendFanvueDM(recipientUuid: string, message: string): Promise<boolean> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    console.error('[Fanvue API] Cannot send DM: no access token');
    return false;
  }

  try {
    const res = await fetch(`${FANVUE_API_BASE}/chat-messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipientUuid,
        message,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[Fanvue API] DM send failed:', res.status, err);
      return false;
    }

    console.log(`[Fanvue API] DM sent to ${recipientUuid}`);
    return true;
  } catch (err) {
    console.error('[Fanvue API] DM send error:', err);
    return false;
  }
}

/**
 * Send a claim link DM to a Fanvue user.
 */
export async function sendClaimDM(params: {
  recipientUuid: string;
  fanvueHandle: string;
  claimToken: string;
  credits: number;
}): Promise<boolean> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://imagenude.com';
  const claimUrl = `${baseUrl}/claim/${params.claimToken}`;

  const message = [
    `🎁 Thank you for your purchase!`,
    ``,
    `You've earned ${params.credits} credits on ImageNude.`,
    `Click the link below to claim them:`,
    ``,
    claimUrl,
    ``,
    `This link expires in 30 days. One-time use only.`,
  ].join('\n');

  return sendFanvueDM(params.recipientUuid, message);
}
