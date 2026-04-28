import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractToken, findUserById } from '@/lib/auth';
import { findPendingTokensForUser } from '@/lib/db/claimTokens';
import { supabaseAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
}

// GET /api/claim/pending — Find pending tokens for current user
export async function GET(req: NextRequest) {
  const authToken = extractToken(req.headers.get('authorization'));
  if (!authToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const decoded = verifyToken(authToken);
  if (!decoded) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const user = await findUserById(decoded.userId);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Get user's fanvue_handle if linked
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('fanvue_handle')
    .eq('id', user.id)
    .maybeSingle();

  const ip = getClientIp(req);

  const pending = await findPendingTokensForUser({
    userId: user.id,
    ip: ip !== 'unknown' ? ip : undefined,
    fanvueHandle: userData?.fanvue_handle || undefined,
  });

  return NextResponse.json({
    tokens: pending.map(t => ({
      token: t.token,
      credits: t.credits,
      purchaseType: t.purchaseType,
      amountCents: t.amountCents,
      expiresAt: t.expiresAt,
    })),
  });
}
