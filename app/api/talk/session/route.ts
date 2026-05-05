import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { verifyToken } from '@/lib/auth';

// GET /api/talk/session — get today's session
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  const userId = payload.userId;

  // Get user's timezone from query or default to UTC
  const tz = req.nextUrl.searchParams.get('tz') || 'UTC';
  const today = getLocalDate(tz);

  // Get user's selected character
  const { data: pref } = await supabaseAdmin
    .from('user_talk_preferences')
    .select('selected_character_id')
    .eq('user_id', userId)
    .single();

  const characterId = pref?.selected_character_id || 'aria';

  // Get or create today's session
  let { data: session } = await supabaseAdmin
    .from('daily_talk_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('session_date', today)
    .single();

  if (!session) {
    // Get streak info
    const { data: streak } = await supabaseAdmin
      .from('user_talk_streaks')
      .select('*')
      .eq('user_id', userId)
      .single();

    const currentStreak = streak?.current_streak ?? 0;
    const streakDay = currentStreak + 1;
    const bonus = getStreakBonus(streakDay);

    const { data: newSession, error } = await supabaseAdmin
      .from('daily_talk_sessions')
      .insert({
        user_id: userId,
        character_id: characterId,
        session_date: today,
        streak_day: streakDay,
        base_reward: 2,
        bonus_reward: bonus,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    session = newSession;
  }

  // Get messages for this session
  const { data: messages } = await supabaseAdmin
    .from('daily_talk_messages')
    .select('role, content, created_at')
    .eq('session_id', session.id)
    .order('created_at');

  // Get character info
  const { data: character } = await supabaseAdmin
    .from('talk_characters')
    .select('id, name, description, avatar_url')
    .eq('id', session.character_id)
    .single();

  // Get streak
  const { data: streak } = await supabaseAdmin
    .from('user_talk_streaks')
    .select('*')
    .eq('user_id', userId)
    .single();

  return NextResponse.json({
    session,
    messages: messages ?? [],
    character,
    streak: streak ?? { current_streak: 0, longest_streak: 0, total_completed_days: 0 },
  });
}

function getStreakBonus(streakDay: number): number {
  if (streakDay >= 30) return 10;
  if (streakDay >= 14) return 5;
  if (streakDay >= 7) return 3;
  if (streakDay >= 3) return 1;
  return 0;
}

function getLocalDate(tz: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
    return formatter.format(now); // Returns YYYY-MM-DD
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}
