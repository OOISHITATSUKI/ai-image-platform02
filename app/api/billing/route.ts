import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractToken, findUserById, saveUser } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import {
    createTransaction,
    recordCreditChange,
    getTransactionsByUser,
    getCreditLogByUser,
    updateTransactionStatus,
    type TransactionRecord,
} from '@/lib/db/billing';

// GET /api/billing — return transaction history + credit log for authenticated user
export async function GET(req: NextRequest) {
    const token = extractToken(req.headers.get('Authorization'));
    const decoded = token ? verifyToken(token) : null;
    if (!decoded) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') ?? 'all'; // 'transactions' | 'credits' | 'all'

    const result: Record<string, unknown> = {};

    if (type === 'all' || type === 'transactions') {
        result.transactions = getTransactionsByUser(decoded.userId);
    }
    if (type === 'all' || type === 'credits') {
        result.creditLog = getCreditLogByUser(decoded.userId);
    }

    return NextResponse.json(result);
}

// POST /api/billing — record a credit change or create a new transaction
export async function POST(req: NextRequest) {
    const token = extractToken(req.headers.get('Authorization'));
    const decoded = token ? verifyToken(token) : null;
    if (!decoded) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = findUserById(decoded.userId);
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // ── Bypass for Test Account ──
    const isTestAccount = user?.email === 'ooisidegesu@gmail.com';

    // Rate Limit: 5 actions per user per hour (skip for test account)
    if (!isTestAccount) {
        const rl = rateLimit(`${decoded.userId}:billing`, 5, 60 * 60 * 1000);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: 'Too many billing requests. Please wait before trying again.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': rl.resetAt.toString() } }
            );
        }
    }

    const body = await req.json();
    const { action } = body;

    // Action: 'deduct' — deduct credits after generation
    if (action === 'deduct') {
        const { amount, generationId } = body;
        if (!amount || amount <= 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }

        // テストアカウントはクレジット差し引きをスキップ
        if (isTestAccount) {
            return NextResponse.json({ balance: user.credits, log: null });
        }

        if (user.credits < amount) {
            return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 });
        }

        const newBalance = user.credits - amount;
        user.credits = newBalance;
        saveUser(user);

        const log = recordCreditChange({
            userId: decoded.userId,
            changeType: 'use',
            delta: -amount,
            balanceAfter: newBalance,
            relatedId: generationId,
        });

        return NextResponse.json({ balance: newBalance, log });
    }

    // Action: 'refund' — restore credits after generation failure
    if (action === 'refund') {
        const { amount, generationId, reason } = body;
        if (!amount || amount <= 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }

        if (isTestAccount) {
            return NextResponse.json({ balance: user.credits, log: null });
        }

        const newBalance = user.credits + amount;
        user.credits = newBalance;
        saveUser(user);

        const log = recordCreditChange({
            userId: decoded.userId,
            changeType: 'refund',
            delta: amount,
            balanceAfter: newBalance,
            relatedId: generationId,
            note: reason || 'Generation failure refund',
        });

        return NextResponse.json({ balance: newBalance, log });
    }

    // Action: 'create_transaction' — initiate a new payment
    if (action === 'create_transaction') {
        const { packType, creditsGranted, amountUsd, currency, nowpaymentsId } = body;
        if (!packType || !creditsGranted || !amountUsd || !currency) {
            return NextResponse.json({ error: 'Missing required transaction fields' }, { status: 400 });
        }

        const transaction = createTransaction({
            userId: decoded.userId,
            nowpaymentsId,
            packType,
            creditsGranted,
            amountUsd,
            currency,
            status: 'pending',
        });

        return NextResponse.json({ transaction }, { status: 201 });
    }

    // Action: 'complete_transaction' — mark payment as completed and grant credits
    if (action === 'complete_transaction') {
        const { transactionId } = body;
        if (!transactionId) {
            return NextResponse.json({ error: 'Missing transactionId' }, { status: 400 });
        }

        const updated = updateTransactionStatus(transactionId, 'completed');
        if (!updated || updated.userId !== decoded.userId) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
        }

        const newBalance = user.credits + updated.creditsGranted;
        user.credits = newBalance;
        saveUser(user);

        const log = recordCreditChange({
            userId: decoded.userId,
            changeType: 'charge',
            delta: +updated.creditsGranted,
            balanceAfter: newBalance,
            relatedId: transactionId,
        });

        return NextResponse.json({ balance: newBalance, transaction: updated, log });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
