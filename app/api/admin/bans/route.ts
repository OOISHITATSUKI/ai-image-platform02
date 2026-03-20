import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

// GET: Return all bans
export async function GET() {
    const { data, error } = await supabaseAdmin
        .from('ip_bans')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Failed to read ip_bans:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const ipList = (data ?? []).map((row) => ({
        id: row.ip,
        type: 'ip',
        strikes: row.strikes ?? 0,
        permanent: row.permanent ?? false,
        bannedUntil: row.banned_until ?? null,
        email: row.email ?? '',
        note: row.note ?? '',
    }));

    return NextResponse.json({ bans: ipList });
}

// POST: Ban or Unban an IP, and optionally store email/note
export async function POST(req: NextRequest) {
    const { ip, action, email, note } = await req.json();
    if (!ip || !action) return NextResponse.json({ error: 'Missing ip or action' }, { status: 400 });

    if (action === 'unban') {
        const { error } = await supabaseAdmin
            .from('ip_bans')
            .delete()
            .eq('ip', ip);
        if (error) {
            console.error('Failed to unban IP:', error);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }
        return NextResponse.json({ success: true });
    }

    // For ban, temp_ban, update_info — upsert the row
    const upsertData: Record<string, unknown> = { ip };

    if (action === 'ban') {
        upsertData.permanent = true;
        upsertData.banned_until = null;
    } else if (action === 'temp_ban') {
        upsertData.permanent = false;
        upsertData.banned_until = Date.now() + (24 * 60 * 60 * 1000);
    }

    if (email !== undefined) upsertData.email = email;
    if (note !== undefined) upsertData.note = note;

    // First check if exists
    const { data: existing } = await supabaseAdmin
        .from('ip_bans')
        .select('ip')
        .eq('ip', ip)
        .single();

    if (existing) {
        // Update existing
        const updateData = { ...upsertData };
        delete updateData.ip;
        const { error } = await supabaseAdmin
            .from('ip_bans')
            .update(updateData)
            .eq('ip', ip);
        if (error) {
            console.error('Failed to update ip_bans:', error);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }
    } else {
        // Insert new
        if (!upsertData.strikes) upsertData.strikes = 0;
        if (!upsertData.created_at) upsertData.created_at = Date.now();
        const { error } = await supabaseAdmin
            .from('ip_bans')
            .insert(upsertData);
        if (error) {
            console.error('Failed to insert ip_bans:', error);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }
    }

    return NextResponse.json({ success: true });
}
