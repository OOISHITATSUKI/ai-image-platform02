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

        // Fetch all sequences
        const { data: sequences, error } = await supabaseAdmin
            .from('step_email_sequences')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[Admin] step-emails GET error:', error);
            return NextResponse.json({ error: 'Failed to fetch sequences' }, { status: 500 });
        }

        // Get pending counts per sequence
        const sequenceIds = (sequences || []).map((s: { id: string }) => s.id);
        let pendingCounts: Record<string, number> = {};

        if (sequenceIds.length > 0) {
            const { data: queueData, error: queueError } = await supabaseAdmin
                .from('step_email_queue')
                .select('sequence_id')
                .eq('status', 'pending')
                .in('sequence_id', sequenceIds);

            if (!queueError && queueData) {
                for (const entry of queueData) {
                    pendingCounts[entry.sequence_id] = (pendingCounts[entry.sequence_id] || 0) + 1;
                }
            }
        }

        const result = (sequences || []).map((s: { id: string }) => ({
            ...s,
            pendingCount: pendingCounts[s.id] || 0,
        }));

        return NextResponse.json({ sequences: result });
    } catch (err) {
        console.error('[Admin] step-emails GET error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = adminCheck(req);
        if (auth.error) return auth.error;

        const { name, trigger, steps } = await req.json();

        if (!name || !trigger || !steps || !Array.isArray(steps) || steps.length === 0) {
            return NextResponse.json({ error: 'name, trigger, and steps (non-empty array) are required' }, { status: 400 });
        }

        // Validate steps format
        for (const step of steps) {
            if (typeof step.delayHours !== 'number' || !step.subject || !step.body) {
                return NextResponse.json({ error: 'Each step must have delayHours (number), subject, and body' }, { status: 400 });
            }
        }

        const now = Date.now();
        const { data, error } = await supabaseAdmin
            .from('step_email_sequences')
            .insert({
                name,
                trigger,
                steps,
                is_active: true,
                created_at: now,
                updated_at: now,
            })
            .select()
            .single();

        if (error) {
            console.error('[Admin] step-emails POST error:', error);
            return NextResponse.json({ error: 'Failed to create sequence' }, { status: 500 });
        }

        return NextResponse.json({ success: true, sequence: data });
    } catch (err) {
        console.error('[Admin] step-emails POST error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const auth = adminCheck(req);
        if (auth.error) return auth.error;

        const { id, name, trigger, steps, isActive } = await req.json();

        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 });
        }

        const updates: Record<string, unknown> = { updated_at: Date.now() };
        if (name !== undefined) updates.name = name;
        if (trigger !== undefined) updates.trigger = trigger;
        if (steps !== undefined) {
            if (!Array.isArray(steps) || steps.length === 0) {
                return NextResponse.json({ error: 'steps must be a non-empty array' }, { status: 400 });
            }
            for (const step of steps) {
                if (typeof step.delayHours !== 'number' || !step.subject || !step.body) {
                    return NextResponse.json({ error: 'Each step must have delayHours (number), subject, and body' }, { status: 400 });
                }
            }
            updates.steps = steps;
        }
        if (isActive !== undefined) updates.is_active = isActive;

        const { data, error } = await supabaseAdmin
            .from('step_email_sequences')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[Admin] step-emails PUT error:', error);
            return NextResponse.json({ error: 'Failed to update sequence' }, { status: 500 });
        }

        return NextResponse.json({ success: true, sequence: data });
    } catch (err) {
        console.error('[Admin] step-emails PUT error:', err);
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

        // Cancel pending queue entries for this sequence
        const { error: queueError } = await supabaseAdmin
            .from('step_email_queue')
            .update({ status: 'cancelled', updated_at: Date.now() })
            .eq('sequence_id', id)
            .eq('status', 'pending');

        if (queueError) {
            console.error('[Admin] step-emails DELETE queue cancel error:', queueError);
        }

        // Delete the sequence
        const { error } = await supabaseAdmin
            .from('step_email_sequences')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('[Admin] step-emails DELETE error:', error);
            return NextResponse.json({ error: 'Failed to delete sequence' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[Admin] step-emails DELETE error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
