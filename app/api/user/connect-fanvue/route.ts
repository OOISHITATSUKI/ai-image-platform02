import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, findUserById } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { recordCreditChange } from '@/lib/db/billing';
import { isValidFanvueHandle, calculateCredits } from '@/lib/fanvue';

/**
 * POST /api/user/connect-fanvue
 * Links a Fanvue handle to the authenticated user's account.
 * Also processes any pending subscriptions/tips for that handle.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = verifyToken(authHeader.slice(7));
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const user = await findUserById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { fanvue_handle } = await req.json();

    if (!fanvue_handle || typeof fanvue_handle !== 'string') {
      return NextResponse.json({ error: 'Invalid handle' }, { status: 400 });
    }

    if (!isValidFanvueHandle(fanvue_handle)) {
      return NextResponse.json({ error: 'Invalid handle format. Use letters, numbers, underscores, or hyphens (1-30 chars).' }, { status: 400 });
    }

    const handleLower = fanvue_handle.toLowerCase();

    // Check if handle is already linked to another user
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('fanvue_handle', handleLower)
      .neq('id', user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'This Fanvue handle is already linked to another account' }, { status: 409 });
    }

    // Save handle
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        fanvue_handle: handleLower,
        fanvue_connected_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[Connect Fanvue] DB error:', updateError);
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }

    // Process pending subscriptions/tips for this handle
    let pendingCredits = 0;
    let pendingCount = 0;

    const { data: pendingSubs } = await supabaseAdmin
      .from('fanvue_pending_subscriptions')
      .select('*')
      .eq('fanvue_handle', handleLower)
      .eq('processed', false);

    if (pendingSubs && pendingSubs.length > 0) {
      for (const sub of pendingSubs) {
        const type = (sub.type || 'subscription') as 'subscription' | 'tip' | 'purchase';
        const credits = calculateCredits(sub.amount_cents, type);
        pendingCredits += credits;
        pendingCount++;

        // Record transaction
        await supabaseAdmin.from('fanvue_transactions').insert({
          user_id: user.id,
          fanvue_uuid: sub.fanvue_uuid,
          fanvue_handle: handleLower,
          type,
          amount_cents: sub.amount_cents,
          credits_granted: credits,
        });
      }

      // Grant all pending credits at once
      if (pendingCredits > 0) {
        const newBalance = (user.credits || 0) + pendingCredits;
        await supabaseAdmin
          .from('users')
          .update({ credits: newBalance, plan: 'basic' })
          .eq('id', user.id);

        await recordCreditChange({
          userId: user.id,
          changeType: 'charge',
          delta: pendingCredits,
          balanceAfter: newBalance,
          relatedId: 'fanvue_pending_batch',
          note: `Fanvue pending: ${pendingCount} transactions`,
        });
      }

      // Mark as processed
      await supabaseAdmin
        .from('fanvue_pending_subscriptions')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .in('id', pendingSubs.map(s => s.id));
    }

    console.log(`[Connect Fanvue] User ${user.email} linked to @${handleLower}. Pending: ${pendingCount} items, ${pendingCredits} credits.`);

    return NextResponse.json({
      success: true,
      handle: handleLower,
      pendingCreditsGranted: pendingCredits,
      pendingTransactions: pendingCount,
    });
  } catch (error) {
    console.error('[Connect Fanvue] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * GET /api/user/connect-fanvue
 * Returns current Fanvue connection status.
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = verifyToken(authHeader.slice(7));
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { data } = await supabaseAdmin
      .from('users')
      .select('fanvue_handle, fanvue_uuid, fanvue_connected_at')
      .eq('id', payload.userId)
      .maybeSingle();

    return NextResponse.json({
      connected: !!data?.fanvue_handle,
      handle: data?.fanvue_handle || null,
      connectedAt: data?.fanvue_connected_at || null,
    });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * DELETE /api/user/connect-fanvue
 * Disconnects Fanvue account.
 */
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = verifyToken(authHeader.slice(7));
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await supabaseAdmin
      .from('users')
      .update({ fanvue_handle: null, fanvue_uuid: null, fanvue_connected_at: null })
      .eq('id', payload.userId);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
