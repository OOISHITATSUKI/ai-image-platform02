import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

// GET — fetch emotion videos for a companion, grouped by emotion
export async function GET(req: NextRequest) {
  const companionId = req.nextUrl.searchParams.get('companionId');
  if (!companionId) {
    return NextResponse.json({ error: 'Missing companionId' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('character_emotion_videos')
    .select('emotion, variation_index, video_url, unlock_level, weight')
    .eq('character_id', companionId)
    .order('emotion')
    .order('variation_index');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Group by emotion
  const emotions: Record<string, { video_url: string; variation_index: number; unlock_level: number; weight: number }[]> = {};
  for (const row of data ?? []) {
    if (!emotions[row.emotion]) emotions[row.emotion] = [];
    emotions[row.emotion].push({
      video_url: row.video_url,
      variation_index: row.variation_index,
      unlock_level: row.unlock_level ?? 0,
      weight: row.weight ?? 1,
    });
  }

  return NextResponse.json({ emotions });
}
