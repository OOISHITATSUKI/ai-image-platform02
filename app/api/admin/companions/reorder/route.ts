import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

/**
 * POST /api/admin/companions/reorder
 * Body: { orders: [{ id: string, sort_order: number }, ...] }
 *
 * Bulk-updates sort_order for all companions in a single request.
 */
export async function POST(req: NextRequest) {
  try {
    const { orders } = await req.json();

    if (!Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json({ error: 'Missing orders array' }, { status: 400 });
    }

    // Update each companion's sort_order
    const promises = orders.map(({ id, sort_order }: { id: string; sort_order: number }) =>
      supabaseAdmin
        .from('companions')
        .update({ sort_order })
        .eq('id', id)
    );

    const results = await Promise.all(promises);
    const firstError = results.find((r) => r.error);
    if (firstError?.error) {
      return NextResponse.json({ error: firstError.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error('Reorder error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
