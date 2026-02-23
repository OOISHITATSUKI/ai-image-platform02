import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractToken, findUserById } from '@/lib/auth';
import { createTransaction, type PackType } from '@/lib/db/billing';

const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const PACK_PRICES: Record<PackType, { usd: number; credits: number }> = {
    starter: { usd: 4.99, credits: 500 },
    light: { usd: 9.99, credits: 1200 },
    standard: { usd: 24.99, credits: 4000 },
    premium: { usd: 49.99, credits: 10000 },
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

    const user = findUserById(decoded.userId);
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    try {
        const body = await req.json();
        const packType = body.packType as PackType;

        if (!packType || !PACK_PRICES[packType]) {
            return NextResponse.json({ error: 'Invalid pack type' }, { status: 400 });
        }

        const pack = PACK_PRICES[packType];

        // 1. Create a pending transaction in our local DB
        const transaction = createTransaction({
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
