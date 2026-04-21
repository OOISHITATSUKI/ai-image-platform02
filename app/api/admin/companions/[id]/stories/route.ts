import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/companions/[id]/stories — list stories for a companion
 */
export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  try {
    const { data, error } = await supabaseAdmin
      .from('companion_stories')
      .select('*')
      .eq('companion_id', id)
      .order('sort_order', { ascending: true });

    if (error) {
      return NextResponse.json({ stories: [], error: error.message });
    }

    return NextResponse.json({ stories: data ?? [] });
  } catch {
    return NextResponse.json({ stories: [] }, { status: 500 });
  }
}

/**
 * POST /api/admin/companions/[id]/stories — add a story
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  try {
    const body = await req.json();
    const { media_url, media_type, duration_seconds, caption } = body;

    if (!media_url || !media_type) {
      return NextResponse.json({ error: 'Missing media_url or media_type' }, { status: 400 });
    }

    // Get next sort_order
    const { data: existing } = await supabaseAdmin
      .from('companion_stories')
      .select('sort_order')
      .eq('companion_id', id)
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

    const { data, error } = await supabaseAdmin
      .from('companion_stories')
      .insert({
        companion_id: id,
        media_url,
        media_type,
        duration_seconds: duration_seconds ?? 5,
        caption: caption || null,
        sort_order: nextOrder,
        is_published: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, story: data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
