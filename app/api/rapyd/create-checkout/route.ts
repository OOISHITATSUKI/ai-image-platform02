import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractToken, findUserById } from '@/lib/auth';
import { createTransaction, type PackType } from '@/lib/db/billing';
import { rapydRequest } from '@/lib/rapyd/client';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Same packs as NowPayments — keep in sync
const PACK_PRICES: Record<string, { usd: number; credits: number }> = {
    starter: { usd: 4.99, credits: 60 },
    plus:    { usd: 9.99, credits: 150 },
    mega:    { usd: 19.99, credits: 350 },
    lite:    { usd: 7.99, credits: 80 },
    standard:{ usd: 14.99, credits: 220 },
    premium: { usd: 24.99, credits: 600 },
};

export async function POST(req: NextRequest) {
    // Auth — same pattern as create-invoice
    const token = extractToken(req.headers.get('Authorization'));
    const decoded = token ? verifyToken(token) : null;
    if (!decoded) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await findUserById(decoded.userId);
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.emailVerified) {
        return NextResponse.json(
            { error: 'Email verification required', requiresVerification: true },
            { status: 403 }
        );
    }

    try {
        const body = await req.json();
        const packType = body.packType as string;

        if (!packType || !PACK_PRICES[packType]) {
            return NextResponse.json({ error: 'Invalid pack type' }, { status: 400 });
        }

        const pack = PACK_PRICES[packType];

        // 1. Create pending transaction (same table as NowPayments)
        const transaction = await createTransaction({
            userId: user.id,
            packType: packType as PackType,
            creditsGranted: pack.credits,
            amountUsd: pack.usd,
            currency: 'USD',
            status: 'pending',
        });

        // 2. Create Rapyd Hosted Checkout
        const checkout = await rapydRequest<any>('POST', '/v1/checkout', {
            amount: pack.usd,
            currency: 'USD',
            country: 'US',
            complete_checkout_url: `${APP_URL}/pricing/success?provider=rapyd`,
            cancel_checkout_url: `${APP_URL}/pricing`,
            merchant_reference_id: transaction.id,
            metadata: {
                transaction_id: transaction.id,
                user_id: user.id,
                pack_type: packType,
                credits: pack.credits,
            },
        });

        // 3. Store rapyd checkout id in the transaction's nowpayments_id field
        //    (reusing existing column to avoid schema changes)
        const { supabaseAdmin } = await import('@/lib/supabase-server');
        await supabaseAdmin
            .from('transactions')
            .update({ nowpayments_id: `rapyd_${checkout.id}` })
            .eq('id', transaction.id);

        return NextResponse.json({
            checkout_url: checkout.redirect_url,
            checkout_id: checkout.id,
        });

    } catch (e) {
        console.error('[rapyd] Create Checkout Error:', e);
        return NextResponse.json(
            { error: e instanceof Error ? e.message : 'Failed to create checkout' },
            { status: 500 }
        );
    }
}
