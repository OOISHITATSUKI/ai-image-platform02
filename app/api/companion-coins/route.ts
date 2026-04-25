import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { verifyToken, findUserById } from '@/lib/auth';
import { getRelationshipLevel } from '@/lib/companions';

/**
 * POST /api/companion-coins — spend coins on companion features
 * Body: { companionId, action, amount? }
 * Actions:
 *   - 'gift'           → 20 coins → relationship +20
 *   - 'boost'          → 100 coins → relationship +100
 *   - 'unlock_content' → 200 coins → relationship instantly to next content tier
 *   - 'skip_level'     → variable → Live Action level skip
 *   - 'extra_chat'     → 80 coins → 50 extra messages (stored in localStorage)
 */

const COIN_COSTS: Record<string, number> = {
  gift: 20,
  boost: 100,
  unlock_content: 200,
  extra_chat: 80,
};

const SKIP_LEVEL_COSTS: Record<number, number> = {
  2: 10, 3: 20, 4: 35, 5: 25, 6: 50, 7: 80, 8: 120, 9: 200,
};

const RELATIONSHIP_BOOSTS: Record<string, number> = {
  gift: 20,
  boost: 100,
};

// Content tier target points
const CONTENT_TIER_POINTS: Record<string, number> = {
  stranger: 300,     // → friend (swimsuit)
  acquaintance: 300, // → friend
  friend: 600,       // → crush (lingerie)
  crush: 1000,       // → lover (nsfw)
  lover: 1500,       // → soulmate
};

export async function POST(req: NextRequest) {
  try {
    const { companionId, action, targetLevel } = await req.json();

    if (!companionId || !action) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }
    const payload = verifyToken(authHeader.slice(7));
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const user = await findUserById(payload.userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Determine cost
    let cost: number;
    if (action === 'skip_level' && targetLevel) {
      cost = SKIP_LEVEL_COSTS[targetLevel] ?? 150;
    } else {
      cost = COIN_COSTS[action];
      if (!cost) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Get coin balance from Supabase
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('coins')
      .eq('id', user.id)
      .single();
    const coinBalance = (userData?.coins as number) ?? 0;

    if (coinBalance < cost) {
      return NextResponse.json({
        error: 'insufficient_coins',
        required: cost,
        current: coinBalance,
      }, { status: 402 });
    }

    // Deduct coins
    const newBalance = coinBalance - cost;
    const { error: deductErr } = await supabaseAdmin
      .from('users')
      .update({ coins: newBalance })
      .eq('id', user.id);

    if (deductErr) {
      return NextResponse.json({ error: 'Failed to deduct coins' }, { status: 500 });
    }
    let result: Record<string, unknown> = { ok: true, coinsSpent: cost, balance: newBalance };

    // Apply action effect
    if (action === 'gift' || action === 'boost') {
      const pointsDelta = RELATIONSHIP_BOOSTS[action] ?? 20;

      const { data: existing } = await supabaseAdmin
        .from('companion_relationships')
        .select('points, affection, trust, tension')
        .eq('user_id', user.id)
        .eq('companion_id', companionId)
        .maybeSingle();

      const oldAff = existing?.affection ?? existing?.points ?? 0;
      const newAff = oldAff + pointsDelta;
      const newPoints = newAff; // keep points and affection in sync
      const level = getRelationshipLevel(newAff);

      await supabaseAdmin
        .from('companion_relationships')
        .upsert({
          user_id: user.id,
          companion_id: companionId,
          points: newPoints,
          affection: newAff,
          stage: level.id,
          level: level.id,
          trust: existing?.trust ?? 50,
          tension: existing?.tension ?? 30,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,companion_id' });

      await supabaseAdmin.from('relationship_transactions').insert({
        user_id: user.id,
        companion_id: companionId,
        points_delta: pointsDelta,
        reason: action,
      });

      result = { ...result, points: newPoints, affection: newAff, level };
    }

    if (action === 'unlock_content') {
      const { data: existing } = await supabaseAdmin
        .from('companion_relationships')
        .select('points, affection, trust, tension, level')
        .eq('user_id', user.id)
        .eq('companion_id', companionId)
        .maybeSingle();

      const currentLevel = existing?.level ?? 'stranger';
      const targetPoints = CONTENT_TIER_POINTS[currentLevel] ?? 300;
      const oldAff = existing?.affection ?? existing?.points ?? 0;
      const newAff = Math.max(oldAff, targetPoints);
      const newPoints = newAff;
      const level = getRelationshipLevel(newAff);

      await supabaseAdmin
        .from('companion_relationships')
        .upsert({
          user_id: user.id,
          companion_id: companionId,
          points: newPoints,
          affection: newAff,
          stage: level.id,
          level: level.id,
          trust: existing?.trust ?? 50,
          tension: existing?.tension ?? 30,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,companion_id' });

      await supabaseAdmin.from('relationship_transactions').insert({
        user_id: user.id,
        companion_id: companionId,
        points_delta: newAff - oldAff,
        reason: 'unlock_content',
      });

      result = { ...result, points: newPoints, affection: newAff, level };
    }

    if (action === 'skip_level') {
      result = { ...result, targetLevel };
    }

    if (action === 'extra_chat') {
      result = { ...result, extraMessages: 50 };
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
