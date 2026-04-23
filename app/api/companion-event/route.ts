import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { logCompanionEvent } from '@/lib/companion-analytics';

/**
 * POST /api/companion-event
 * Lightweight endpoint for client-side event logging.
 * Accepts both authenticated and guest requests (guest uses IP hash as userId).
 */
export async function POST(req: NextRequest) {
  try {
    const { eventType, characterId, sessionId, metadata } = await req.json();

    if (!eventType) {
      return NextResponse.json({ error: 'Missing eventType' }, { status: 400 });
    }

    // Resolve userId from auth token or fallback to IP hash
    let userId = 'guest';
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const payload = verifyToken(authHeader.slice(7));
      if (payload) userId = payload.userId;
    }
    if (userId === 'guest') {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
      userId = `guest_${ip}`;
    }

    // Fire-and-forget — don't await
    logCompanionEvent({
      userId,
      eventType,
      characterId: characterId ?? undefined,
      sessionId: sessionId ?? undefined,
      metadata: metadata ?? {},
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // Never fail
  }
}
