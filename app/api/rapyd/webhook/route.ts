import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { updateTransactionStatus, recordCreditChange } from '@/lib/db/billing';
import { findUserById, saveUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';

const SECRET_KEY = process.env.RAPYD_SECRET_KEY || '';
const ACCESS_KEY = process.env.RAPYD_ACCESS_KEY || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function verifyWebhookSignature(
    url: string,
    salt: string,
    timestamp: string,
    body: string,
    receivedSignature: string
): boolean {
    const toSign = url + salt + timestamp + ACCESS_KEY + SECRET_KEY + body;
    const hmac = crypto.createHmac('sha256', SECRET_KEY);
    hmac.update(toSign);
    const expectedSignature = Buffer.from(hmac.digest('hex')).toString('base64');
    return expectedSignature === receivedSignature;
}

export async function POST(req: NextRequest) {
    if (!SECRET_KEY) {
        console.error('[rapyd-webhook] RAPYD_SECRET_KEY not configured');
        return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const body = await req.text();
    const signature = req.headers.get('signature') || '';
    const salt = req.headers.get('salt') || '';
    const timestamp = req.headers.get('timestamp') || '';
    const webhookUrl = `${APP_URL}/api/rapyd/webhook`;

    // Verify signature
    if (!verifyWebhookSignature(webhookUrl, salt, timestamp, body, signature)) {
        console.error('[rapyd-webhook] Invalid signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    let event: any;
    try {
        event = JSON.parse(body);
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    console.log('[rapyd-webhook] Event received:', event.type);

    const eventType = event.type;
    const payment = event.data;

    // Extract our transaction ID from merchant_reference_id or metadata
    const transactionId = payment?.merchant_reference_id
        || payment?.metadata?.transaction_id;

    if (!transactionId) {
        console.log('[rapyd-webhook] No transaction_id in event, ignoring');
        return NextResponse.json({ ok: true });
    }

    switch (eventType) {
        case 'PAYMENT_COMPLETED':
        case 'CHECKOUT_COMPLETED':
        case 'PAYMENT_CAPTURED': {
            // Find our transaction
            const { data: txRow, error: txErr } = await supabaseAdmin
                .from('transactions')
                .select('*')
                .eq('id', transactionId)
                .maybeSingle();

            if (txErr || !txRow) {
                console.error('[rapyd-webhook] Transaction not found:', transactionId);
                return NextResponse.json({ ok: true }); // 200 to prevent retries
            }

            // Idempotency: already completed
            if (txRow.status === 'completed') {
                console.log('[rapyd-webhook] Already completed:', transactionId);
                return NextResponse.json({ ok: true });
            }

            // Find user & grant credits (same pattern as NowPayments webhook)
            const user = await findUserById(txRow.user_id);
            if (!user) {
                console.error('[rapyd-webhook] User not found:', txRow.user_id);
                return NextResponse.json({ ok: true });
            }

            const newBalance = user.credits + txRow.credits_granted;
            if (user.plan === 'free') {
                user.plan = 'basic';
            }
            delete user.freeCreditsExpireAt;
            user.credits = newBalance;
            await saveUser(user);

            // Mark completed
            await updateTransactionStatus(transactionId, 'completed');

            // Update with rapyd payment id
            if (payment?.id) {
                await supabaseAdmin
                    .from('transactions')
                    .update({ nowpayments_id: `rapyd_${payment.id}` })
                    .eq('id', transactionId);
            }

            // Log credit change
            await recordCreditChange({
                userId: user.id,
                changeType: 'charge',
                delta: txRow.credits_granted,
                balanceAfter: newBalance,
                relatedId: transactionId,
                note: `Rapyd payment ${payment?.id || eventType}`,
            });

            console.log(`[rapyd-webhook] Credits granted: ${user.email} +${txRow.credits_granted} (balance: ${newBalance})`);
            break;
        }

        case 'PAYMENT_FAILED':
        case 'CHECKOUT_FAILED': {
            await updateTransactionStatus(transactionId, 'failed');
            console.log('[rapyd-webhook] Payment failed:', transactionId);
            break;
        }

        case 'PAYMENT_EXPIRED':
        case 'CHECKOUT_EXPIRED': {
            await updateTransactionStatus(transactionId, 'expired');
            console.log('[rapyd-webhook] Payment expired:', transactionId);
            break;
        }

        default:
            console.log('[rapyd-webhook] Unhandled event type:', eventType);
    }

    return NextResponse.json({ ok: true });
}
