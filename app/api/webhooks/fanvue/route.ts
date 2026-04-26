import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-server';
import { findUserById } from '@/lib/auth';
import { recordCreditChange } from '@/lib/db/billing';
import { calculateCredits } from '@/lib/fanvue';

export const runtime = 'nodejs';

const SIGNING_SECRET = process.env.FANVUE_WEBHOOK_SECRET || '';
const CREATOR_UUID = process.env.FANVUE_CREATOR_UUID || '';
const TOLERANCE_SECONDS = 300; // 5 minutes

// ── Signature Verification ──

function verifyWebhookSignature(payload: string, signatureHeader: string): boolean {
  if (!SIGNING_SECRET) {
    console.error('[Fanvue] FANVUE_WEBHOOK_SECRET not configured');
    return false;
  }

  const parts = signatureHeader.split(',');
  let timestamp: string | undefined;
  let signature: string | undefined;

  for (const part of parts) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).trim();
    const value = part.slice(eqIdx + 1).trim();
    if (key === 't') timestamp = value;
    if (key === 'v0') signature = value;
  }

  if (!timestamp || !signature) return false;

  // Replay attack prevention
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp, 10)) > TOLERANCE_SECONDS) {
    console.error('[Fanvue] Timestamp too old/new');
    return false;
  }

  // HMAC-SHA256 verification
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = crypto
    .createHmac('sha256', SIGNING_SECRET)
    .update(signedPayload)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

// ── Main Handler ──

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // Signature verification
    const signatureHeader = req.headers.get('x-fanvue-signature');
    if (!signatureHeader) {
      console.error('[Fanvue] Missing signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    if (!verifyWebhookSignature(rawBody, signatureHeader)) {
      console.error('[Fanvue] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const eventType = req.headers.get('x-fanvue-event') || 'unknown';

    // Log all events
    await supabaseAdmin.from('fanvue_webhook_logs').insert({
      event_type: eventType,
      payload: event,
      received_at: new Date().toISOString(),
    }).then(({ error }) => {
      if (error) console.error('[Fanvue] Log insert error:', error);
    });

    console.log(`[Fanvue] Received event: ${eventType}`);

    // Route to handler
    switch (eventType) {
      case 'subscription.new':
        await handleNewSubscription(event);
        break;
      case 'tip.new':
        await handleTipReceived(event);
        break;
      case 'purchase.new':
        await handlePurchaseReceived(event);
        break;
      case 'follow.new':
        console.log('[Fanvue] New follower:', event.sender?.handle);
        break;
      case 'message.received':
        console.log('[Fanvue] Message from:', event.sender?.handle);
        break;
      default:
        console.warn(`[Fanvue] Unknown event type: ${eventType}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[Fanvue] Webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// ── Helper: Find user by Fanvue handle ──

async function findUserByFanvueHandle(handle: string) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, credits, email')
    .eq('fanvue_handle', handle.toLowerCase())
    .maybeSingle();

  if (error) {
    console.error('[Fanvue] User lookup error:', error);
    return null;
  }
  return data;
}

// ── Helper: Grant credits to user ──

async function grantCredits(userId: string, currentCredits: number, credits: number, type: string, relatedId?: string) {
  const newBalance = currentCredits + credits;

  const { error } = await supabaseAdmin
    .from('users')
    .update({ credits: newBalance, plan: 'basic' }) // Auto-upgrade to basic on any Fanvue payment
    .eq('id', userId);

  if (error) {
    console.error('[Fanvue] Credit grant error:', error);
    return false;
  }

  // Log credit change
  await recordCreditChange({
    userId,
    changeType: 'charge',
    delta: credits,
    balanceAfter: newBalance,
    relatedId: relatedId || `fanvue_${type}`,
    note: `Fanvue ${type}`,
  });

  return true;
}

// ── Helper: Save to pending if user not linked ──

async function saveToPending(sender: { uuid: string; handle: string }, amountCents: number, type: string) {
  await supabaseAdmin.from('fanvue_pending_subscriptions').insert({
    fanvue_uuid: sender.uuid,
    fanvue_handle: sender.handle.toLowerCase(),
    amount_cents: amountCents,
    type,
    received_at: new Date().toISOString(),
  });
  console.log(`[Fanvue] Saved to pending: @${sender.handle} (${type}, ${amountCents / 100} USD)`);
}

// ── Event Handlers ──

async function handleNewSubscription(event: Record<string, unknown>) {
  const sender = event.sender as { uuid?: string; handle?: string } | undefined;
  const recipientUuid = event.recipientUuid as string | undefined;
  const price = event.price as number | undefined;

  if (!sender?.handle || !sender?.uuid) {
    console.error('[Fanvue] Subscription: missing sender info');
    return;
  }

  // Only process subscriptions to our creator
  if (CREATOR_UUID && recipientUuid !== CREATOR_UUID) {
    console.log('[Fanvue] Subscription not for our creator, ignoring');
    return;
  }

  const amountCents = price ?? 0;
  const credits = calculateCredits(amountCents, 'subscription');

  // Find linked user
  const user = await findUserByFanvueHandle(sender.handle);

  if (!user) {
    await saveToPending(sender as { uuid: string; handle: string }, amountCents, 'subscription');
    return;
  }

  // Grant credits
  const success = await grantCredits(user.id, user.credits, credits, 'subscription');
  if (!success) return;

  // Update fanvue_uuid if not set
  await supabaseAdmin
    .from('users')
    .update({ fanvue_uuid: sender.uuid })
    .eq('id', user.id)
    .is('fanvue_uuid', null);

  // Record subscription
  await supabaseAdmin.from('fanvue_subscriptions').insert({
    user_id: user.id,
    fanvue_uuid: sender.uuid,
    fanvue_handle: sender.handle,
    amount_cents: amountCents,
    credits_granted: credits,
    subscribed_at: new Date().toISOString(),
  });

  // Record transaction
  await supabaseAdmin.from('fanvue_transactions').insert({
    user_id: user.id,
    fanvue_uuid: sender.uuid,
    fanvue_handle: sender.handle,
    type: 'subscription',
    amount_cents: amountCents,
    credits_granted: credits,
  });

  console.log(`[Fanvue] Subscription: granted ${credits} credits to ${user.email} (@${sender.handle}, $${amountCents / 100})`);
}

async function handleTipReceived(event: Record<string, unknown>) {
  const sender = event.sender as { uuid?: string; handle?: string } | undefined;
  const recipientUuid = event.recipientUuid as string | undefined;
  const price = event.price as number | undefined;

  if (!sender?.handle) return;
  if (CREATOR_UUID && recipientUuid !== CREATOR_UUID) return;

  const amountCents = price ?? 0;
  const credits = calculateCredits(amountCents, 'tip');

  const user = await findUserByFanvueHandle(sender.handle);
  if (!user) {
    await saveToPending(sender as { uuid: string; handle: string }, amountCents, 'tip');
    return;
  }

  await grantCredits(user.id, user.credits, credits, 'tip');

  await supabaseAdmin.from('fanvue_transactions').insert({
    user_id: user.id,
    fanvue_uuid: sender.uuid || '',
    fanvue_handle: sender.handle,
    type: 'tip',
    amount_cents: amountCents,
    credits_granted: credits,
  });

  console.log(`[Fanvue] Tip: granted ${credits} credits to ${user.email}`);
}

async function handlePurchaseReceived(event: Record<string, unknown>) {
  const sender = event.sender as { uuid?: string; handle?: string } | undefined;
  const recipientUuid = event.recipientUuid as string | undefined;
  const price = event.price as number | undefined;

  if (!sender?.handle) return;
  if (CREATOR_UUID && recipientUuid !== CREATOR_UUID) return;

  const amountCents = price ?? 0;
  const credits = calculateCredits(amountCents, 'purchase');

  const user = await findUserByFanvueHandle(sender.handle);
  if (!user) {
    await saveToPending(sender as { uuid: string; handle: string }, amountCents, 'purchase');
    return;
  }

  await grantCredits(user.id, user.credits, credits, 'purchase');

  await supabaseAdmin.from('fanvue_transactions').insert({
    user_id: user.id,
    fanvue_uuid: sender.uuid || '',
    fanvue_handle: sender.handle,
    type: 'purchase',
    amount_cents: amountCents,
    credits_granted: credits,
  });

  console.log(`[Fanvue] Purchase: granted ${credits} credits to ${user.email}`);
}
