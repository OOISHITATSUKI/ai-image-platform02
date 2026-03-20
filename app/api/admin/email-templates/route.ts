import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());

function adminCheck(req: NextRequest) {
    const token = req.cookies.get('auth_token')?.value;
    if (!token) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    const decoded = verifyToken(token);
    if (!decoded || !ADMIN_EMAILS.includes(decoded.email.toLowerCase())) {
        return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
    }
    return { decoded };
}

export async function GET(req: NextRequest) {
    try {
        const auth = adminCheck(req);
        if (auth.error) return auth.error;

        const { data, error } = await supabaseAdmin
            .from('email_templates')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[Admin] email-templates GET error:', error);
            return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
        }

        return NextResponse.json({ templates: data || [] });
    } catch (err) {
        console.error('[Admin] email-templates GET error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = adminCheck(req);
        if (auth.error) return auth.error;

        const { name, subject, body } = await req.json();

        if (!name || !subject || !body) {
            return NextResponse.json({ error: 'name, subject, and body are required' }, { status: 400 });
        }

        // Check max 5 templates
        const { count, error: countError } = await supabaseAdmin
            .from('email_templates')
            .select('*', { count: 'exact', head: true });

        if (countError) {
            console.error('[Admin] email-templates count error:', countError);
            return NextResponse.json({ error: 'Failed to check template count' }, { status: 500 });
        }

        if ((count || 0) >= 5) {
            return NextResponse.json({ error: 'Maximum of 5 templates allowed' }, { status: 400 });
        }

        const now = Date.now();
        const { data, error } = await supabaseAdmin
            .from('email_templates')
            .insert({ name, subject, body, created_at: now, updated_at: now })
            .select()
            .single();

        if (error) {
            console.error('[Admin] email-templates POST error:', error);
            return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
        }

        return NextResponse.json({ success: true, template: data });
    } catch (err) {
        console.error('[Admin] email-templates POST error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const auth = adminCheck(req);
        if (auth.error) return auth.error;

        const { id, name, subject, body } = await req.json();

        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 });
        }

        const updates: Record<string, unknown> = { updated_at: Date.now() };
        if (name !== undefined) updates.name = name;
        if (subject !== undefined) updates.subject = subject;
        if (body !== undefined) updates.body = body;

        const { data, error } = await supabaseAdmin
            .from('email_templates')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[Admin] email-templates PUT error:', error);
            return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
        }

        return NextResponse.json({ success: true, template: data });
    } catch (err) {
        console.error('[Admin] email-templates PUT error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const auth = adminCheck(req);
        if (auth.error) return auth.error;

        const { id } = await req.json();

        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('email_templates')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('[Admin] email-templates DELETE error:', error);
            return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[Admin] email-templates DELETE error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
