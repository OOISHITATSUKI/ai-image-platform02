import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

// GET /api/admin/reward-media?companionId=xxx
export async function GET(req: NextRequest) {
  const companionId = req.nextUrl.searchParams.get('companionId');
  if (!companionId) return NextResponse.json({ error: 'companionId required' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('companion_reward_media')
    .select('*')
    .eq('companion_id', companionId)
    .order('action_type')
    .order('sort_order');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ media: data });
}

// POST /api/admin/reward-media — add new media
export async function POST(req: NextRequest) {
  const { companionId, actionType, mediaType, mediaUrl } = await req.json();

  if (!companionId || !actionType || !mediaType || !mediaUrl) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  // Check limit (max 3 per action type per companion)
  const { count } = await supabaseAdmin
    .from('companion_reward_media')
    .select('id', { count: 'exact', head: true })
    .eq('companion_id', companionId)
    .eq('action_type', actionType);

  if ((count ?? 0) >= 3) {
    return NextResponse.json({ error: 'Maximum 3 media per action type' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('companion_reward_media')
    .insert({
      companion_id: companionId,
      action_type: actionType,
      media_type: mediaType,
      media_url: mediaUrl,
      sort_order: (count ?? 0),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ media: data });
}

// DELETE /api/admin/reward-media?id=xxx
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('companion_reward_media')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
