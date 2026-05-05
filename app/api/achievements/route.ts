import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

// GET /api/achievements — all achievement definitions
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('achievements')
    .select('*')
    .order('display_order');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ achievements: data });
}
