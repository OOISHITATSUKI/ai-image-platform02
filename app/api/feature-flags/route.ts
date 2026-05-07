import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

// Default: all features hidden
const DEFAULTS: Record<string, boolean> = {
  feature_image: false,
  feature_faceswap: false,
  feature_undress: false,
  feature_video: false,
  feature_library: false,
};

// GET /api/feature-flags — public, returns which features are enabled
export async function GET() {
  const { data } = await supabaseAdmin
    .from('app_settings')
    .select('key, value')
    .like('key', 'feature_%');

  const flags = { ...DEFAULTS };
  for (const row of data ?? []) {
    if (row.key in flags) {
      flags[row.key] = row.value === true || row.value === 'true';
    }
  }

  return NextResponse.json(flags);
}
