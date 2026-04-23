import { NextResponse } from 'next/server';
import { checkAdmin } from '@/app/api/admin/stats/route';
import { supabaseAdmin } from '@/lib/supabase-server';

/**
 * GET /api/admin/companion-kpi?days=7
 * Returns companion KPI data for the admin dashboard.
 */
export async function GET(req: Request) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get('days') ?? '7');

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startStr = startDate.toISOString().split('T')[0];

  const { data, error } = await supabaseAdmin
    .from('companion_kpi_daily')
    .select('*')
    .gte('date', startStr)
    .order('date', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Group by date for easy consumption
  const grouped: Record<string, Record<string, { value: number; segment: string; metadata?: unknown }>> = {};
  for (const row of data ?? []) {
    const d = row.date as string;
    if (!grouped[d]) grouped[d] = {};
    const key = row.segment === 'all' ? row.metric_name : `${row.metric_name}__${row.segment}`;
    grouped[d][key] = { value: row.value, segment: row.segment, metadata: row.metadata };
  }

  // Also get today's live counts directly from companion_events
  const todayStr = new Date().toISOString().split('T')[0];
  const todayStart = `${todayStr}T00:00:00Z`;

  const [
    { count: todaySessions },
    { count: todayMessages },
    { count: todayPaywallShown },
    { count: todayPaywallClicked },
    { count: todayPhotos },
    { count: todayLevelUps },
  ] = await Promise.all([
    supabaseAdmin.from('companion_events').select('*', { count: 'exact', head: true }).eq('event_type', 'companion_session_start').gte('created_at', todayStart),
    supabaseAdmin.from('companion_events').select('*', { count: 'exact', head: true }).eq('event_type', 'companion_message_sent').gte('created_at', todayStart),
    supabaseAdmin.from('companion_events').select('*', { count: 'exact', head: true }).eq('event_type', 'paywall_shown').gte('created_at', todayStart),
    supabaseAdmin.from('companion_events').select('*', { count: 'exact', head: true }).eq('event_type', 'paywall_clicked').gte('created_at', todayStart),
    supabaseAdmin.from('companion_events').select('*', { count: 'exact', head: true }).eq('event_type', 'companion_photo_requested').gte('created_at', todayStart),
    supabaseAdmin.from('companion_events').select('*', { count: 'exact', head: true }).eq('event_type', 'level_up').gte('created_at', todayStart),
  ]);

  // Today's DAU
  const { data: todayUsers } = await supabaseAdmin
    .from('companion_events')
    .select('user_id')
    .gte('created_at', todayStart);
  const todayDau = new Set(todayUsers?.map(r => r.user_id)).size;

  const today = {
    sessions: todaySessions ?? 0,
    messages: todayMessages ?? 0,
    paywallShown: todayPaywallShown ?? 0,
    paywallClicked: todayPaywallClicked ?? 0,
    photos: todayPhotos ?? 0,
    levelUps: todayLevelUps ?? 0,
    dau: todayDau,
    paywallCvr: (todayPaywallShown ?? 0) > 0
      ? Math.round(((todayPaywallClicked ?? 0) / (todayPaywallShown ?? 1)) * 10000) / 100
      : 0,
  };

  return NextResponse.json({ today, history: grouped });
}
