import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { verifyToken } from '@/lib/auth';
import { getRelationshipLevel, SENTIMENT_DELTAS, type SentimentCategory, type RelationshipState } from '@/lib/companions';

const DEFAULT_STATE: RelationshipState = { affection: 0, trust: 50, tension: 30, stage: 'stranger' };

// GET — fetch 3-axis relationship state
export async function GET(req: NextRequest) {
  const companionId = req.nextUrl.searchParams.get('companionId');
  if (!companionId) return NextResponse.json({ error: 'Missing companionId' }, { status: 400 });

  const authHeader = req.headers.get('authorization');
  let userId: string | null = null;
  if (authHeader?.startsWith('Bearer ')) {
    const payload = verifyToken(authHeader.slice(7));
    if (payload) userId = payload.userId;
  }

  if (!userId) {
    const level = getRelationshipLevel(0);
    return NextResponse.json({ ...DEFAULT_STATE, level, points: 0 });
  }

  const { data } = await supabaseAdmin
    .from('companion_relationships')
    .select('affection, trust, tension, stage, points')
    .eq('user_id', userId)
    .eq('companion_id', companionId)
    .maybeSingle();

  const affection = data?.affection ?? 0;
  const trust = data?.trust ?? 50;
  const tension = data?.tension ?? 30;
  const level = getRelationshipLevel(affection);

  return NextResponse.json({
    affection, trust, tension,
    stage: level.id,
    level,
    points: affection, // backward compat
  });
}

// POST — update relationship with 3-axis deltas
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companionId, reason } = body;

    // Support both old format (pointsDelta) and new format (sentiment/deltas)
    // Always prefer explicit delta values from the caller (AI-computed) over hardcoded SENTIMENT_DELTAS
    const sentiment: SentimentCategory | undefined = body.sentiment;
    const rawDeltas = (body.affectionDelta != null || body.pointsDelta != null)
      ? { affection: body.pointsDelta ?? body.affectionDelta ?? 2, trust: body.trustDelta ?? 0, tension: body.tensionDelta ?? 0 }
      : (sentiment ? (SENTIMENT_DELTAS[sentiment] ?? SENTIMENT_DELTAS.neutral) : SENTIMENT_DELTAS.neutral);

    // Clamp negative affection to prevent catastrophic drops (max -10 per message)
    const deltas = {
      affection: Math.max(-10, rawDeltas.affection),
      trust: Math.max(-5, rawDeltas.trust),
      tension: rawDeltas.tension,
    };

    if (!companionId) {
      return NextResponse.json({ error: 'Missing companionId' }, { status: 400 });
    }

    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;
    if (authHeader?.startsWith('Bearer ')) {
      const payload = verifyToken(authHeader.slice(7));
      if (payload) userId = payload.userId;
    }

    if (!userId) {
      const level = getRelationshipLevel(0);
      return NextResponse.json({ ...DEFAULT_STATE, level, points: 0 });
    }

    const { data: existing } = await supabaseAdmin
      .from('companion_relationships')
      .select('affection, trust, tension')
      .eq('user_id', userId)
      .eq('companion_id', companionId)
      .maybeSingle();

    const oldAff = existing?.affection ?? 0;
    const oldTrust = existing?.trust ?? 50;
    const oldTension = existing?.tension ?? 30;

    // Apply deltas with clamping
    const newAff = Math.max(0, Math.min(1000, oldAff + deltas.affection));
    const newTrust = Math.max(0, Math.min(100, oldTrust + deltas.trust));
    // Tension also decays by 1 per message (natural cooldown)
    const newTension = Math.max(0, Math.min(100, oldTension + deltas.tension - 1));

    const oldLevel = getRelationshipLevel(oldAff);
    const newLevel = getRelationshipLevel(newAff);
    const stageChanged = oldLevel.id !== newLevel.id;
    const stageUp = stageChanged && newAff > oldAff;

    await supabaseAdmin
      .from('companion_relationships')
      .upsert({
        user_id: userId,
        companion_id: companionId,
        affection: newAff,
        trust: newTrust,
        tension: newTension,
        points: newAff, // backward compat
        stage: newLevel.id,
        level: newLevel.id,
        last_chat_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,companion_id' });

    // Log transaction
    await supabaseAdmin.from('relationship_transactions').insert({
      user_id: userId,
      companion_id: companionId,
      points_delta: deltas.affection,
      reason: reason || sentiment || 'chat',
    });

    return NextResponse.json({
      affection: newAff,
      trust: newTrust,
      tension: newTension,
      stage: newLevel.id,
      level: newLevel,
      points: newAff, // backward compat
      stageChanged,
      stageUp,
      oldStage: oldLevel.id,
      newStage: newLevel.id,
      sentiment,
    });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
