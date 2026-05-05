import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { verifyToken } from '@/lib/auth';

// GET /api/talk/streak — user's streak info
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  const { data: streak } = await supabaseAdmin
    .from('user_talk_streaks')
    .select('*')
    .eq('user_id', payload.userId)
    .single();

  return NextResponse.json({
    streak: streak ?? {
      current_streak: 0,
      longest_streak: 0,
      last_completed_date: null,
      total_completed_days: 0,
    },
  });
}
