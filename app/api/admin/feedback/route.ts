import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

/**
 * GET /api/admin/feedback — list all user feedback
 */
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ feedback: data ?? [] });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/feedback — delete feedback(s)
 * Body: { id: string } or { ids: string[] }
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const ids: string[] = body.ids ?? (body.id ? [body.id] : []);

    if (ids.length === 0) {
      return NextResponse.json({ error: 'Missing id(s)' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('user_feedback')
      .delete()
      .in('id', ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, deleted: ids.length });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/feedback — update status or admin_note
 */
export async function PATCH(req: NextRequest) {
  try {
    const { id, status, admin_note } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (status) updates.status = status;
    if (admin_note !== undefined) updates.admin_note = admin_note;

    const { error } = await supabaseAdmin
      .from('user_feedback')
      .update(updates)
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
