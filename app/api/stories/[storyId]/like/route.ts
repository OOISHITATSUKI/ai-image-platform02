import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { verifyToken } from '@/lib/auth';

interface RouteContext { params: Promise<{ storyId: string }>; }

/** POST — add like */
export async function POST(req: NextRequest, ctx: RouteContext) {
  const { storyId } = await ctx.params;
  try {
    const { sessionId } = await req.json().catch(() => ({ sessionId: null }));
    let userId: string | null = null;
    const auth = req.headers.get('authorization');
    if (auth?.startsWith('Bearer ')) {
      const p = verifyToken(auth.slice(7));
      if (p) userId = p.userId;
    }

    if (!userId && !sessionId) {
      return NextResponse.json({ error: 'No identity' }, { status: 400 });
    }

    const row: Record<string, unknown> = { story_id: storyId };
    if (userId) row.user_id = userId;
    else row.session_id = sessionId;

    const { error } = await supabaseAdmin.from('story_likes').upsert(row, {
      onConflict: userId ? 'story_id,user_id' : 'story_id,session_id',
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/** DELETE — remove like */
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const { storyId } = await ctx.params;
  try {
    const { sessionId } = await req.json().catch(() => ({ sessionId: null }));
    let userId: string | null = null;
    const auth = req.headers.get('authorization');
    if (auth?.startsWith('Bearer ')) {
      const p = verifyToken(auth.slice(7));
      if (p) userId = p.userId;
    }

    let query = supabaseAdmin.from('story_likes').delete().eq('story_id', storyId);
    if (userId) query = query.eq('user_id', userId);
    else if (sessionId) query = query.eq('session_id', sessionId);
    else return NextResponse.json({ error: 'No identity' }, { status: 400 });

    await query;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
