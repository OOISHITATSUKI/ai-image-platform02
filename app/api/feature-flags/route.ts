import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { verifyToken } from '@/lib/auth';

// Default: all features hidden
const DEFAULTS: Record<string, boolean> = {
  feature_image: false,
  feature_faceswap: false,
  feature_undress: false,
  feature_video: false,
  feature_library: false,
  feature_chathistory: false,
};

// GET /api/feature-flags — returns which features are enabled for this user
export async function GET(req: NextRequest) {
  // 1. Get global flags from app_settings
  const { data: globalData } = await supabaseAdmin
    .from('app_settings')
    .select('key, value')
    .like('key', 'feature_%');

  const flags = { ...DEFAULTS };
  for (const row of globalData ?? []) {
    if (row.key in flags) {
      flags[row.key] = row.value === true || row.value === 'true';
    }
  }

  // 2. Check user-specific overrides
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('settings')
        .eq('id', payload.userId)
        .single();

      const userSettings = userData?.settings as Record<string, unknown> | null;
      if (userSettings) {
        for (const key of Object.keys(DEFAULTS)) {
          if (userSettings[key] === true) {
            flags[key] = true;
          }
        }
      }
    }
  }

  return NextResponse.json(flags);
}
