import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

// POST /api/admin/feature-flags — update a feature flag
export async function POST(req: NextRequest) {
  const { key, value } = await req.json();

  if (!key || typeof value !== 'boolean') {
    return NextResponse.json({ error: 'key and boolean value required' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('app_settings')
    .upsert({
      key,
      value,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, key, value });
}
