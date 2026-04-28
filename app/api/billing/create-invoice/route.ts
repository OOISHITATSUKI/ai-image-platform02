import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractToken, findUserById } from '@/lib/auth';
import { createTransaction, type PackType } from '@/lib/db/billing';

const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const PACK_PRICES: Record<PackType, { usd: number; credits: number }> = {
    lite: { usd: 7.99, credits: 80 },
    standard: { usd: 14.99, credits: 220 },
    premium: { usd: 24.99, credits: 600 },
    starter: { usd: 4.99, credits: 60 },
    plus: { usd: 9.99, credits: 150 },
    mega: { usd: 19.99, credits: 350 },
};

export async function POST(req: NextRequest) {
    if (!NOWPAYMENTS_API_KEY) {
        return NextResponse.json({ error: 'Payment gateway not configured' }, { status: 500 });
    }

    const token = extractToken(req.headers.get('Authorization'));
    const decoded = token ? verifyToken(token) : null;
    if (!decoded) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await findUserById(decoded.userId);
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check email verification before allowing purchase
    if (!user.emailVerified) {
        return NextResponse.json(
            { error: 'Email verification required', requiresVerification: true },
            { status: 403 }
        );
    }

    try {
        const body = await req.json();
        const packType = body.packType as PackType;

        if (!packType || !PACK_PRICES[packType]) {
            return NextResponse.json({ error: 'Invalid pack type' }, { status: 400 });
        }

        const pack = PACK_PRICES[packType];

        // 1. Create a pending transaction in our local DB
        const transaction = await createTransaction({
            userId: user.id,
            packType,
            creditsGranted: pack.credits,
            amountUsd: pack.usd,
            currency: 'USD',
            status: 'pending',
        });

        // 2. Call NowPayments API to create an invoice
        const nowpaymentsPayload = {
            price_amount: pack.usd,
            price_currency: 'USD',
            order_id: transaction.id,
            order_description: `${packType.toUpperCase()} Credit Pack - ${pack.credits} Credits`,
            ipn_callback_url: `${APP_URL}/api/webhooks/nowpayments`,
            success_url: `${APP_URL}/pricing/success`,
            cancel_url: `${APP_URL}/pricing`,
        };

        const npRes = await fetch('https://api.nowpayments.io/v1/invoice', {
            method: 'POST',
            headers: {
                'x-api-key': NOWPAYMENTS_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(nowpaymentsPayload),
        });

        const npData = await npRes.json();

        if (!npRes.ok || !npData.invoice_url) {
            console.error('NowPayments API Error:', npData);
            return NextResponse.json({ error: 'Failed to create payment invoice' }, { status: 500 });
        }

        // Return the hosted checkout URL
        return NextResponse.json({ invoice_url: npData.invoice_url });

    } catch (e) {
        console.error('Create Invoice Error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
