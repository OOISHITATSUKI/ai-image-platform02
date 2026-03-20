import { NextRequest, NextResponse } from 'next/server';
import { findUserById, verifyToken } from '@/lib/auth';
import { sendCustomEmail } from '@/lib/email';
import { supabaseAdmin } from '@/lib/supabase-server';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());

export async function POST(req: NextRequest) {
    try {
        // Auth check
        const token = req.cookies.get('auth_token')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const decoded = verifyToken(token);
        if (!decoded || !ADMIN_EMAILS.includes(decoded.email.toLowerCase())) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { userId, filter, subject, body } = await req.json();

        if (!subject || !body) {
            return NextResponse.json({ error: 'subject and body are required' }, { status: 400 });
        }

        // Bulk send mode
        if (filter) {
            if (!['all', 'free', 'paid'].includes(filter)) {
                return NextResponse.json({ error: 'filter must be "all", "free", or "paid"' }, { status: 400 });
            }

            let query = supabaseAdmin.from('users').select('id, email, plan, status');

            if (filter === 'all') {
                query = query.eq('status', 'active');
            } else if (filter === 'free') {
                query = query.eq('plan', 'free').eq('status', 'active');
            } else if (filter === 'paid') {
                query = query.neq('plan', 'free').eq('status', 'active');
            }

            const { data: users, error } = await query;
            if (error) {
                console.error('[Admin] bulk send query error:', error);
                return NextResponse.json({ error: 'Failed to query users' }, { status: 500 });
            }

            let sentCount = 0;
            for (const user of users || []) {
                try {
                    const success = await sendCustomEmail(user.email, subject, body);
                    if (success) sentCount++;
                } catch (err) {
                    console.error(`[Admin] bulk send failed for ${user.email}:`, err);
                }
            }

            return NextResponse.json({ success: true, sentCount });
        }

        // Single user send mode
        if (!userId) {
            return NextResponse.json({ error: 'userId or filter is required' }, { status: 400 });
        }

        const user = await findUserById(userId);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const success = await sendCustomEmail(user.email, subject, body);
        if (!success) {
            return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
        }

        return NextResponse.json({ success: true, sentTo: user.email });
    } catch (err) {
        console.error('[Admin] send-email error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
