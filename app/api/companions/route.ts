import { NextResponse } from 'next/server';
import { fetchPublicCompanions } from '@/lib/companions-db';

export async function GET() {
  try {
    const companions = await fetchPublicCompanions();
    return NextResponse.json({ companions });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
