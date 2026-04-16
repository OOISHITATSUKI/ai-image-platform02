import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { companionToRow, rowToCompanion, type CompanionRow } from '@/lib/companions-db';
import { COMPANIONS, nudeAssistant, type Companion } from '@/lib/companions';

/**
 * GET — merged admin listing.
 *
 * Returns every companion the user can see:
 *   • rows already in the `companions` table (editable, persisted)
 *   • defaults from lib/companions.ts that haven't been seeded yet (editable;
 *     saving will insert a new row on PUT/PATCH)
 *
 * This lets the admin edit the shipped defaults directly even if the
 * seed script hasn't been run.
 */
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('companions')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      // Table missing / migration not run → return only defaults
      const fallback = buildFromDefaultsOnly();
      return NextResponse.json({ companions: fallback, dbAvailable: false });
    }

    const dbRows = (data ?? []) as CompanionRow[];
    const dbById = new Map<string, CompanionRow>(dbRows.map((r) => [r.id, r]));

    const allIds: string[] = [];
    const seen = new Set<string>();
    COMPANIONS.forEach((c) => { if (!seen.has(c.id)) { allIds.push(c.id); seen.add(c.id); } });
    if (!seen.has('assistant')) { allIds.push('assistant'); seen.add('assistant'); }
    dbRows.forEach((r) => { if (!seen.has(r.id)) { allIds.push(r.id); seen.add(r.id); } });

    const merged = allIds
      .map((id) => {
        const dbRow = dbById.get(id);
        if (dbRow) {
          return {
            ...rowToCompanion(dbRow),
            _status: dbRow.status,
            _sort_order: dbRow.sort_order,
            _updated_at: dbRow.updated_at,
            _inDb: true,
          };
        }
        const def = defaultById(id);
        if (!def) return null;
        return {
          ...def,
          _status: 'published' as const,
          _sort_order: COMPANIONS.findIndex((c) => c.id === id),
          _updated_at: null,
          _inDb: false,
        };
      })
      .filter(Boolean);

    // Stable sort by _sort_order
    merged.sort((a, b) => ((a?._sort_order ?? 0) - (b?._sort_order ?? 0)));

    return NextResponse.json({ companions: merged, dbAvailable: true });
  } catch (err: unknown) {
    console.error('Admin companions GET error:', err);
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      companion: Companion;
      status?: 'draft' | 'published' | 'hidden' | 'archived';
      sortOrder?: number;
    };

    if (!body?.companion?.id || !body.companion.name) {
      return NextResponse.json({ error: 'Missing id or name' }, { status: 400 });
    }

    const row = companionToRow(body.companion, {
      status: body.status ?? 'draft',
      sortOrder: body.sortOrder ?? 999,
    });

    // Use upsert so "POST" also covers "first edit of a default" gracefully.
    const { error } = await supabaseAdmin
      .from('companions')
      .upsert(row, { onConflict: 'id' });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: row.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── helpers ──────────────────────────────────────────────

function defaultById(id: string): Companion | undefined {
  if (id === 'assistant') return nudeAssistant;
  return COMPANIONS.find((c) => c.id === id);
}

function buildFromDefaultsOnly() {
  const all: Companion[] = [...COMPANIONS, nudeAssistant];
  return all.map((c, idx) => ({
    ...c,
    _status: 'published' as const,
    _sort_order: idx,
    _updated_at: null,
    _inDb: false,
  }));
}
