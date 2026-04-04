import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get('auth_token')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const decoded = verifyToken(token);
        if (!decoded || !ADMIN_EMAILS.includes(decoded.email.toLowerCase())) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const emailType = searchParams.get('type') || '';
        const status = searchParams.get('status') || '';
        const search = searchParams.get('search') || '';
        const dateFrom = searchParams.get('dateFrom') || '';
        const dateTo = searchParams.get('dateTo') || '';

        let query = supabaseAdmin
            .from('email_logs')
            .select('*, users:user_id(email, name)', { count: 'exact' })
            .order('sent_at', { ascending: false });

        if (emailType) {
            query = query.eq('email_type', emailType);
        }
        if (status) {
            query = query.eq('status', status);
        }
        if (search) {
            query = query.ilike('email_to', `%${search}%`);
        }
        if (dateFrom) {
            query = query.gte('sent_at', dateFrom);
        }
        if (dateTo) {
            query = query.lte('sent_at', `${dateTo}T23:59:59.999Z`);
        }

        const from = (page - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;

        if (error) {
            console.error('[Admin] email-logs query error:', error);
            return NextResponse.json({ error: 'Failed to query email logs' }, { status: 500 });
        }

        return NextResponse.json({
            logs: data || [],
            total: count || 0,
            page,
            pageSize: PAGE_SIZE,
            totalPages: Math.ceil((count || 0) / PAGE_SIZE),
        });
    } catch (err) {
        console.error('[Admin] email-logs error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
