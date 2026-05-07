import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

// GET /api/admin/user-features?userId=xxx — get user's feature flags
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const { data } = await supabaseAdmin
    .from('users')
    .select('settings')
    .eq('id', userId)
    .single();

  const settings = (data?.settings ?? {}) as Record<string, unknown>;
  return NextResponse.json({
    feature_image: settings.feature_image === true,
    feature_faceswap: settings.feature_faceswap === true,
    feature_undress: settings.feature_undress === true,
    feature_video: settings.feature_video === true,
    feature_library: settings.feature_library === true,
    feature_chathistory: settings.feature_chathistory === true,
  });
}

// POST /api/admin/user-features — set a user's feature flag
export async function POST(req: NextRequest) {
  const { userId, key, value } = await req.json();
  if (!userId || !key || typeof value !== 'boolean') {
    return NextResponse.json({ error: 'userId, key, and boolean value required' }, { status: 400 });
  }

  // Get current settings
  const { data } = await supabaseAdmin
    .from('users')
    .select('settings')
    .eq('id', userId)
    .single();

  const settings = (data?.settings ?? {}) as Record<string, unknown>;
  settings[key] = value;

  const { error } = await supabaseAdmin
    .from('users')
    .update({ settings })
    .eq('id', userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
