import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { deleteFromR2 } from '@/lib/storage/r2';

interface Ctx { params: Promise<{ id: string }> }

// DELETE — remove a video (emotion or liveaction) by id
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;

    // Try emotion_videos first
    const { data: emo } = await supabaseAdmin
      .from('character_emotion_videos')
      .select('id, video_url')
      .eq('id', id)
      .maybeSingle();

    if (emo) {
      try {
        const key = new URL(emo.video_url).pathname.slice(1);
        await deleteFromR2(key);
      } catch {}
      await supabaseAdmin.from('character_emotion_videos').delete().eq('id', id);
      return NextResponse.json({ ok: true });
    }

    // Try liveaction_videos
    const { data: la } = await supabaseAdmin
      .from('character_liveaction_videos')
      .select('id, video_url')
      .eq('id', id)
      .maybeSingle();

    if (la) {
      try {
        const key = new URL(la.video_url).pathname.slice(1);
        await deleteFromR2(key);
      } catch {}
      await supabaseAdmin.from('character_liveaction_videos').delete().eq('id', id);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('[video-delete] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
