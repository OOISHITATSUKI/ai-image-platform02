import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { verifyToken } from '@/lib/auth';

// GET /api/talk/character — list available characters
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('talk_characters')
    .select('id, name, description, avatar_url, is_premium, display_order')
    .order('display_order');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ characters: data });
}

// POST /api/talk/character — select a character
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  const { characterId } = await req.json();
  if (!characterId) return NextResponse.json({ error: 'characterId required' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('user_talk_preferences')
    .upsert({
      user_id: payload.userId,
      selected_character_id: characterId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
