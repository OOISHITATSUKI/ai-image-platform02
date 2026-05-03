import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

// GET — list videos for a character
export async function GET(req: NextRequest) {
  const characterId = req.nextUrl.searchParams.get('characterId');
  if (!characterId) {
    return NextResponse.json({ error: 'Missing characterId' }, { status: 400 });
  }

  const type = req.nextUrl.searchParams.get('type'); // 'emotion' | 'liveaction' | null (all)

  const result: Record<string, unknown> = {};

  if (!type || type === 'emotion') {
    const { data } = await supabaseAdmin
      .from('character_emotion_videos')
      .select('*')
      .eq('character_id', characterId)
      .order('emotion')
      .order('variation_index');
    result.emotionVideos = data ?? [];
  }

  if (!type || type === 'liveaction') {
    const { data } = await supabaseAdmin
      .from('character_liveaction_videos')
      .select('*')
      .eq('character_id', characterId)
      .order('action_id')
      .order('variant');
    result.liveactionVideos = data ?? [];
  }

  // Hover video from companions table
  if (!type || type === 'hover') {
    const { data } = await supabaseAdmin
      .from('companions')
      .select('hover_video_url')
      .eq('id', characterId)
      .maybeSingle();
    result.hoverVideoUrl = data?.hover_video_url ?? null;
  }

  return NextResponse.json(result);
}
