import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { verifyToken } from '@/lib/auth';

interface RouteContext { params: Promise<{ storyId: string }>; }

/** POST — add comment */
export async function POST(req: NextRequest, ctx: RouteContext) {
  const { storyId } = await ctx.params;
  try {
    const { content, sessionId } = await req.json();
    if (!content?.trim()) {
      return NextResponse.json({ error: 'Empty comment' }, { status: 400 });
    }

    let userId: string | null = null;
    const auth = req.headers.get('authorization');
    if (auth?.startsWith('Bearer ')) {
      const p = verifyToken(auth.slice(7));
      if (p) userId = p.userId;
    }

    const { error } = await supabaseAdmin.from('story_comments').insert({
      story_id: storyId,
      user_id: userId,
      session_id: sessionId || null,
      content: content.trim(),
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
