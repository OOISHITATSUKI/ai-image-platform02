import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

/**
 * GET /api/cron/companion-kpi
 * Daily aggregation of companion KPI metrics.
 * Triggered by Vercel cron or manually with CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.replace('Bearer ', '');
  const vercelCronToken = req.headers.get('x-vercel-cron-auth');
  const token = vercelCronToken || bearerToken;

  if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Aggregate yesterday's data (JST = UTC+9)
    const now = new Date();
    const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const yesterday = new Date(jstNow);
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    const metrics = await aggregateCompanionKPIs(dateStr);

    return NextResponse.json({
      success: true,
      message: `Companion KPI aggregated for ${dateStr}`,
      metricsCount: metrics,
    });
  } catch (err: unknown) {
    console.error('[companion-kpi] Error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function aggregateCompanionKPIs(dateStr: string): Promise<number> {
  const dayStart = `${dateStr}T00:00:00Z`;
  const dayEnd = `${dateStr}T23:59:59Z`;

  console.log(`[companion-kpi] Aggregating for ${dateStr}`);

  const metrics: {
    date: string;
    metric_name: string;
    segment: string;
    value: number;
    metadata?: Record<string, unknown>;
  }[] = [];

  // Helper: count events
  async function countEvents(eventType: string, extra?: Record<string, string>): Promise<number> {
    let query = supabaseAdmin
      .from('companion_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', eventType)
      .gte('created_at', dayStart)
      .lte('created_at', dayEnd);

    if (extra) {
      for (const [key, val] of Object.entries(extra)) {
        query = query.eq(key, val);
      }
    }

    const { count } = await query;
    return count ?? 0;
  }

  // Helper: count unique users
  async function countUniqueUsers(eventType?: string): Promise<number> {
    let query = supabaseAdmin
      .from('companion_events')
      .select('user_id')
      .gte('created_at', dayStart)
      .lte('created_at', dayEnd);

    if (eventType) query = query.eq('event_type', eventType);

    const { data } = await query;
    return new Set(data?.map(r => r.user_id)).size;
  }

  // === A. Revenue Funnel ===

  // Paywall shown
  const paywallShown = await countEvents('paywall_shown');
  metrics.push({ date: dateStr, metric_name: 'companion_paywall_shown', segment: 'all', value: paywallShown });

  // Paywall clicked
  const paywallClicked = await countEvents('paywall_clicked');
  metrics.push({ date: dateStr, metric_name: 'companion_paywall_clicked', segment: 'all', value: paywallClicked });

  // Paywall CVR
  const cvr = paywallShown > 0 ? (paywallClicked / paywallShown) * 100 : 0;
  metrics.push({ date: dateStr, metric_name: 'companion_paywall_cvr', segment: 'all', value: Math.round(cvr * 100) / 100 });

  // Trigger-level breakdown
  const triggers = ['level_gate', 'message_limit', 'live_action_gate', 'nsfw_gate', 'photo_limit', 'guest_limit'];
  for (const trigger of triggers) {
    const { data: shownCount } = await supabaseAdmin.rpc('count_events_by_trigger', {
      p_event_type: 'paywall_shown',
      p_trigger: trigger,
      p_date: dateStr,
    });
    const { data: clickedCount } = await supabaseAdmin.rpc('count_events_by_trigger', {
      p_event_type: 'paywall_clicked',
      p_trigger: trigger,
      p_date: dateStr,
    });
    const shown = shownCount ?? 0;
    const clicked = clickedCount ?? 0;

    metrics.push({ date: dateStr, metric_name: 'companion_paywall_shown_by_trigger', segment: trigger, value: shown });
    metrics.push({
      date: dateStr,
      metric_name: 'companion_paywall_cvr_by_trigger',
      segment: trigger,
      value: shown > 0 ? Math.round((clicked / shown) * 10000) / 100 : 0,
    });
  }

  // === B. Engagement ===

  // DAU
  const dau = await countUniqueUsers();
  metrics.push({ date: dateStr, metric_name: 'companion_dau', segment: 'all', value: dau });

  // Messages sent
  const messagesSent = await countEvents('companion_message_sent');
  metrics.push({ date: dateStr, metric_name: 'companion_messages_sent', segment: 'all', value: messagesSent });

  // Avg messages per user
  const avgMsgPerUser = dau > 0 ? Math.round((messagesSent / dau) * 100) / 100 : 0;
  metrics.push({ date: dateStr, metric_name: 'companion_avg_messages_per_user', segment: 'all', value: avgMsgPerUser });

  // Sessions
  const sessions = await countEvents('companion_session_start');
  metrics.push({ date: dateStr, metric_name: 'companion_sessions', segment: 'all', value: sessions });

  // Photos requested
  const photos = await countEvents('companion_photo_requested');
  metrics.push({ date: dateStr, metric_name: 'companion_photos_requested', segment: 'all', value: photos });

  // Level-ups
  const levelUps = await countEvents('level_up');
  metrics.push({ date: dateStr, metric_name: 'companion_level_ups', segment: 'all', value: levelUps });

  // XP gained total
  const { data: xpData } = await supabaseAdmin
    .from('companion_events')
    .select('metadata')
    .eq('event_type', 'xp_gained')
    .gte('created_at', dayStart)
    .lte('created_at', dayEnd);
  const totalXp = xpData?.reduce((sum, r) => sum + ((r.metadata as Record<string, number>)?.amount ?? 0), 0) ?? 0;
  metrics.push({ date: dateStr, metric_name: 'companion_total_xp', segment: 'all', value: totalXp });

  // AI reply fail rate
  const totalReplies = await countEvents('companion_ai_replied');
  // Count failed replies from metadata
  const { data: failedData } = await supabaseAdmin
    .from('companion_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'companion_ai_replied')
    .gte('created_at', dayStart)
    .lte('created_at', dayEnd)
    .eq('metadata->>failed', 'true');
  const failedReplies = failedData ?? 0;
  const failRate = totalReplies > 0 ? Math.round(((failedReplies as number) / totalReplies) * 10000) / 100 : 0;
  metrics.push({ date: dateStr, metric_name: 'companion_ai_fail_rate', segment: 'all', value: failRate });

  // === C. Character stats ===

  // Unique characters used
  const { data: charData } = await supabaseAdmin
    .from('companion_events')
    .select('character_id')
    .gte('created_at', dayStart)
    .lte('created_at', dayEnd)
    .not('character_id', 'is', null);
  const uniqueChars = new Set(charData?.map(r => r.character_id)).size;
  metrics.push({ date: dateStr, metric_name: 'companion_unique_characters_used', segment: 'all', value: uniqueChars });

  // Character distribution (top characters by message count)
  const { data: charMsgData } = await supabaseAdmin
    .from('companion_events')
    .select('character_id')
    .eq('event_type', 'companion_message_sent')
    .gte('created_at', dayStart)
    .lte('created_at', dayEnd)
    .not('character_id', 'is', null);
  if (charMsgData && charMsgData.length > 0) {
    const charCounts: Record<string, number> = {};
    for (const r of charMsgData) {
      const cid = r.character_id as string;
      charCounts[cid] = (charCounts[cid] ?? 0) + 1;
    }
    const sorted = Object.entries(charCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    metrics.push({
      date: dateStr,
      metric_name: 'companion_character_ranking',
      segment: 'all',
      value: sorted.length,
      metadata: Object.fromEntries(sorted),
    });
  }

  // === Write to DB ===
  const { error } = await supabaseAdmin
    .from('companion_kpi_daily')
    .upsert(metrics, { onConflict: 'date,metric_name,segment' });

  if (error) {
    console.error('[companion-kpi] Upsert failed:', error);
    throw error;
  }

  console.log(`[companion-kpi] Inserted ${metrics.length} metrics for ${dateStr}`);
  return metrics.length;
}
