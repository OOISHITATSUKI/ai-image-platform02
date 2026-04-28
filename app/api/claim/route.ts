import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractToken, findUserById } from '@/lib/auth';
import { getClaimToken, redeemClaimToken, assignClaimTokenVisitor } from '@/lib/db/claimTokens';
import { recordCreditChange } from '@/lib/db/billing';
import { supabaseAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
}

// GET /api/claim?token=xxx — Get token info + record visitor
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const claim = await getClaimToken(token);
  if (!claim) {
    return NextResponse.json({ error: 'Token not found' }, { status: 404 });
  }

  if (claim.status === 'claimed') {
    return NextResponse.json({ error: 'Already claimed', status: 'claimed' }, { status: 410 });
  }

  if (claim.status === 'expired' || new Date(claim.expiresAt) < new Date()) {
    return NextResponse.json({ error: 'Token expired', status: 'expired' }, { status: 410 });
  }

  // Record visitor IP + userId (if logged in)
  const ip = getClientIp(req);
  const authToken = extractToken(req.headers.get('authorization'));
  let userId: string | undefined;
  if (authToken) {
    const decoded = verifyToken(authToken);
    if (decoded) userId = decoded.userId;
  }

  await assignClaimTokenVisitor(token, { userId, ip });

  return NextResponse.json({
    credits: claim.credits,
    purchaseType: claim.purchaseType,
    amountCents: claim.amountCents,
    expiresAt: claim.expiresAt,
    status: claim.status,
  });
}

// POST /api/claim — Redeem token (auth required)
export async function POST(req: NextRequest) {
  // Auth check
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

  // Get claim token from body
  const body = await req.json();
  const claimToken = body.token;
  if (!claimToken || typeof claimToken !== 'string') {
    return NextResponse.json({ error: 'Missing claim token' }, { status: 400 });
  }

  // Redeem — atomic (optimistic lock prevents double claim)
  const redeemed = await redeemClaimToken(claimToken, user.id);
  if (!redeemed) {
    return NextResponse.json({ error: 'Token invalid, already claimed, or expired' }, { status: 409 });
  }

  // Grant credits
  const newBalance = user.credits + redeemed.credits;
  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({ credits: newBalance, plan: 'basic' })
    .eq('id', user.id);

  if (updateError) {
    console.error('[claim] Credit update error:', updateError);
    return NextResponse.json({ error: 'Credit grant failed' }, { status: 500 });
  }

  // Log credit change
  await recordCreditChange({
    userId: user.id,
    changeType: 'charge',
    delta: redeemed.credits,
    balanceAfter: newBalance,
    relatedId: `claim_${redeemed.id}`,
    note: `Fanvue ${redeemed.purchaseType} claim`,
  });

  console.log(`[claim] Granted ${redeemed.credits} credits to ${user.email} (token: ${redeemed.token.slice(0, 8)}...)`);

  return NextResponse.json({
    success: true,
    credits: redeemed.credits,
    newBalance,
  });
}
