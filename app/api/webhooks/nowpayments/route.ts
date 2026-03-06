import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getTransactionById, updateTransactionStatus, recordCreditChange } from '@/lib/db/billing';
import { findUserById, saveUser } from '@/lib/auth';

const IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET || '';

export async function POST(req: NextRequest) {
    if (!IPN_SECRET) {
        console.error('[NowPayments] NOWPAYMENTS_IPN_SECRET is not configured');
        return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const sig = req.headers.get('x-nowpayments-sig');
    if (!sig) {
        console.error('[NowPayments] Missing x-nowpayments-sig header');
        return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const rawBody = await req.text();

    let body: Record<string, unknown>;
    try {
        body = JSON.parse(rawBody);
    } catch {
        console.error('[NowPayments] Invalid JSON body');
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // ソートあり
    const sortedJson = JSON.stringify(body, Object.keys(body).sort());
    const hmac1 = crypto.createHmac('sha512', IPN_SECRET);
    hmac1.update(sortedJson);
    const calcSorted = hmac1.digest('hex');

    // ソートなし（rawBodyそのまま）
    const hmac2 = crypto.createHmac('sha512', IPN_SECRET);
    hmac2.update(rawBody);
    const calcRaw = hmac2.digest('hex');

    console.log('[NowPayments] Signature debug:', {
        received: sig,
        calcSorted,
        calcRaw,
        matchSorted: calcSorted === sig,
        matchRaw: calcRaw === sig,
        secretLength: IPN_SECRET.length,
    });

    const isValid = calcSorted === sig || calcRaw === sig;

    if (!isValid) {
        console.error('[NowPayments] Invalid signature — both methods failed');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const { payment_status, order_id, payment_id, actually_paid, pay_currency } = body as {
        payment_status: string;
        order_id: string;
        payment_id: string;
        actually_paid?: number;
        pay_currency?: string;
    };

    console.log(`[NowPayments] IPN received: status=${payment_status}, order_id=${order_id}`);

    const transaction = getTransactionById(order_id);
    if (!transaction) {
        console.error('[NowPayments] Transaction not found:', order_id);
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (transaction.status === 'completed') {
        console.log('[NowPayments] Already processed:', order_id);
        return NextResponse.json({ message: 'Already processed' });
    }

    if (payment_status === 'finished' || payment_status === 'confirmed') {
        const user = findUserById(transaction.userId);
        if (!user) {
            console.error('[NowPayments] User not found:', transaction.userId);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const newBalance = user.credits + transaction.creditsGranted;
        user.credits = newBalance;
        if (user.plan === 'free') user.plan = 'paid';
        saveUser(user);

        updateTransactionStatus(order_id, 'completed');
        recordCreditChange({
            userId: transaction.userId,
            changeType: 'charge',
            delta: transaction.creditsGranted,
            balanceAfter: newBalance,
            relatedId: order_id,
            note: `NowPayments payment_id=${payment_id}, paid=${actually_paid} ${pay_currency ?? ''}`.trim(),
        });

        console.log(`[NowPayments] ✅ Credits granted: +${transaction.creditsGranted} → user ${transaction.userId}, new balance: ${newBalance}`);
        return NextResponse.json({ message: 'Credits granted' });
    }

    if (payment_status === 'confirming' || payment_status === 'sending') {
        updateTransactionStatus(order_id, 'confirming');
        return NextResponse.json({ message: 'Confirming' });
    }

    if (payment_status === 'failed' || payment_status === 'refunded' || payment_status === 'expired') {
        updateTransactionStatus(order_id, payment_status === 'expired' ? 'expired' : 'failed');
        return NextResponse.json({ message: `Marked as ${payment_status}` });
    }

    return NextResponse.json({ message: 'Status noted' });
}
