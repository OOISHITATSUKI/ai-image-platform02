import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getTransactionById, updateTransactionStatus, recordCreditChange } from '@/lib/db/billing';
import { findUserById, saveUser } from '@/lib/auth';

const IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET || '';

export async function POST(req: NextRequest) {
    if (!IPN_SECRET) {
        console.error('NOWPAYMENTS_IPN_SECRET is not configured');
        return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const sig = req.headers.get('x-nowpayments-sig');
    if (!sig) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    try {
        const body = await req.json();

        // NowPayments requires sorting keys alphabetically for HMAC validation
        const hmac = crypto.createHmac('sha512', IPN_SECRET);
        hmac.update(JSON.stringify(body, Object.keys(body).sort()));
        const signature = hmac.digest('hex');

        if (signature !== sig) {
            console.error('Invalid NowPayments IPN signature', { received: sig, calculated: signature });
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        const { payment_status, order_id, payment_id } = body;

        // Find our local transaction record
        const transaction = getTransactionById(order_id);
        if (!transaction) {
            console.error('NowPayments IPN: Transaction not found', order_id);
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
        }

        // If the transaction was already completed, ignore
        if (transaction.status === 'completed') {
            return NextResponse.json({ message: 'Already processed' });
        }

        // Handle various payment statuses
        if (payment_status === 'finished' || payment_status === 'confirmed') {
            const user = findUserById(transaction.userId);
            if (!user) {
                console.error('NowPayments IPN: User not found for transaction', transaction.userId);
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            // Grant Credits
            const newBalance = user.credits + transaction.creditsGranted;
            // Also reset their 'plan' flag to 'paid' if they were free
            if (user.plan === 'free') {
                user.plan = 'paid';
            }
            user.credits = newBalance;
            saveUser(user);

            // Mark transaction as completed
            updateTransactionStatus(transaction.id, 'completed');

            // Log the credit change
            recordCreditChange({
                userId: user.id,
                changeType: 'charge',
                delta: transaction.creditsGranted,
                balanceAfter: newBalance,
                relatedId: transaction.id,
                note: `NowPayments payment ${payment_id}`
            });

            console.log(`Credit granted to ${user.email} -> +${transaction.creditsGranted}`);

        } else if (payment_status === 'failed' || payment_status === 'expired') {
            updateTransactionStatus(transaction.id, payment_status);
        } else if (payment_status === 'confirming' || payment_status === 'sending') {
            // Can optionally update status to confirming
            updateTransactionStatus(transaction.id, 'confirming');
        }

        return NextResponse.json({ status: 'OK' });

    } catch (e) {
        console.error('Webhook processing error', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
