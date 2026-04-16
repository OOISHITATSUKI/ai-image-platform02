import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { companionToRow, rowToCompanion, type CompanionRow } from '@/lib/companions-db';
import { COMPANIONS, nudeAssistant, type Companion } from '@/lib/companions';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function defaultById(id: string): Companion | undefined {
  if (id === 'assistant') return nudeAssistant;
  return COMPANIONS.find((c) => c.id === id);
}

function defaultSortOrder(id: string): number {
  const idx = COMPANIONS.findIndex((c) => c.id === id);
  return idx >= 0 ? idx : 999;
}

/**
 * GET — returns the companion. Falls back to lib/companions.ts defaults
 * when the row hasn't been persisted yet (so the editor can load it).
 */
export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;

    const { data, error } = await supabaseAdmin
      .from('companions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      // Table missing etc. — fall back to defaults
      const def = defaultById(id);
      if (!def) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({
        companion: def,
        status: 'published',
        sort_order: defaultSortOrder(id),
        inDb: false,
      });
    }

    if (!data) {
      const def = defaultById(id);
      if (!def) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({
        companion: def,
        status: 'published',
        sort_order: defaultSortOrder(id),
        inDb: false,
      });
    }

    const row = data as CompanionRow;
    return NextResponse.json({
      companion: rowToCompanion(row),
      status: row.status,
      sort_order: row.sort_order,
      inDb: true,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * PUT — upsert (creates row on first save of a default).
 */
export async function PUT(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const body = (await req.json()) as {
      companion: Companion;
      status?: CompanionRow['status'];
      sortOrder?: number;
    };

    if (!body?.companion) {
      return NextResponse.json({ error: 'Missing companion' }, { status: 400 });
    }

    // Ensure id in payload matches URL (don't allow changing primary key here)
    const toSave: Companion = { ...body.companion, id };
    const row = companionToRow(toSave, {
      status: body.status ?? 'published',
      sortOrder: body.sortOrder ?? defaultSortOrder(id),
    });

    const { error } = await supabaseAdmin
      .from('companions')
      .upsert(row, { onConflict: 'id' });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const { error } = await supabaseAdmin
      .from('companions')
      .delete()
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * PATCH — partial update: status, sort_order, duplicate.
 * Automatically creates the row from defaults if it doesn't exist yet.
 */
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const action = body?.action as string;

    // Ensure row exists (lazy-seed from defaults on first touch)
    const ensured = await ensureRow(id);
    if (!ensured.ok) return NextResponse.json({ error: ensured.error }, { status: 404 });

    if (action === 'status') {
      const status = body.value as CompanionRow['status'];
      if (!['draft', 'published', 'hidden', 'archived'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      const { error } = await supabaseAdmin
        .from('companions')
        .update({ status })
        .eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (action === 'sort_order') {
      const sort_order = Number(body.value);
      const { error } = await supabaseAdmin
        .from('companions')
        .update({ sort_order })
        .eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (action === 'duplicate') {
      const { data: existing, error: readErr } = await supabaseAdmin
        .from('companions')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (readErr || !existing) {
        return NextResponse.json({ error: 'Source not found' }, { status: 404 });
      }
      const src = existing as CompanionRow;
      const newId = `${id}-copy-${Date.now().toString(36)}`;
      const copy = {
        ...src,
        id: newId,
        name: `${src.name} (Copy)`,
        status: 'draft' as const,
        sort_order: 999,
      };
      const { created_at: __c, updated_at: __u, ...insertRow } = copy;
      void __c; void __u;
      const { error: insErr } = await supabaseAdmin.from('companions').insert(insertRow);
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
      return NextResponse.json({ ok: true, id: newId });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── helpers ──────────────────────────────────────────────

async function ensureRow(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await supabaseAdmin
    .from('companions')
    .select('id')
    .eq('id', id)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (data) return { ok: true };

  const def = defaultById(id);
  if (!def) return { ok: false, error: 'Not found (no default to seed from)' };

  const row = companionToRow(def, {
    status: 'published',
    sortOrder: defaultSortOrder(id),
  });
  const { error: insErr } = await supabaseAdmin.from('companions').insert(row);
  if (insErr) return { ok: false, error: insErr.message };
  return { ok: true };
}
