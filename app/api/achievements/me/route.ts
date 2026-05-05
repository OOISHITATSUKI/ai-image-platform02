import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { verifyToken } from '@/lib/auth';

// GET /api/achievements/me — user's achievement status
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  const userId = payload.userId;

  // Get all achievements
  const { data: achievements } = await supabaseAdmin
    .from('achievements')
    .select('*')
    .order('display_order');

  // Get user's unlocked achievements
  const { data: unlocked } = await supabaseAdmin
    .from('user_achievements')
    .select('*')
    .eq('user_id', userId);

  // Get user stats
  const { data: stats } = await supabaseAdmin
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single();

  const unlockedMap = new Map((unlocked ?? []).map(u => [u.achievement_id, u]));

  const result = (achievements ?? []).map(a => ({
    ...a,
    unlocked: unlockedMap.has(a.id),
    unlockedAt: unlockedMap.get(a.id)?.unlocked_at ?? null,
    rewardClaimed: unlockedMap.get(a.id)?.reward_claimed ?? false,
  }));

  return NextResponse.json({
    achievements: result,
    stats: stats ?? null,
    totalUnlocked: unlocked?.length ?? 0,
    totalAchievements: achievements?.length ?? 0,
  });
}
