import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { verifyToken } from '@/lib/auth';

// GET /api/talk/history — past sessions (for calendar view)
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  const days = parseInt(req.nextUrl.searchParams.get('days') || '30');

  const { data: sessions } = await supabaseAdmin
    .from('daily_talk_sessions')
    .select('session_date, completed, message_count, streak_day, base_reward, bonus_reward')
    .eq('user_id', payload.userId)
    .order('session_date', { ascending: false })
    .limit(days);

  return NextResponse.json({ sessions: sessions ?? [] });
}
