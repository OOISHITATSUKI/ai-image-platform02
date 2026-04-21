import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

interface RouteContext {
  params: Promise<{ storyId: string }>;
}

/**
 * DELETE /api/admin/stories/[storyId] — delete a story
 */
export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { storyId } = await ctx.params;
  try {
    const { error } = await supabaseAdmin
      .from('companion_stories')
      .delete()
      .eq('id', storyId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/stories/[storyId] — update a story
 */
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { storyId } = await ctx.params;
  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {};
    if (body.caption !== undefined) updates.caption = body.caption;
    if (body.duration_seconds !== undefined) updates.duration_seconds = body.duration_seconds;
    if (body.is_published !== undefined) updates.is_published = body.is_published;
    if (body.sort_order !== undefined) updates.sort_order = body.sort_order;
    if (body.base_likes !== undefined) updates.base_likes = body.base_likes;
    if (body.base_comments !== undefined) updates.base_comments = body.base_comments;

    const { error } = await supabaseAdmin
      .from('companion_stories')
      .update(updates)
      .eq('id', storyId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
