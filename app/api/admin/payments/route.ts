import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { checkAdmin } from '../stats/route';

const TRANSACTIONS_FILE = path.join(process.cwd(), 'data', 'transactions.json');

// GET /api/admin/payments
export async function GET(req: NextRequest) {
    const admin = await checkAdmin();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let payments: object[] = [];
    if (fs.existsSync(TRANSACTIONS_FILE)) {
        payments = Object.values(JSON.parse(fs.readFileSync(TRANSACTIONS_FILE, 'utf8')));
    }

    // Sort newest first
    payments.sort((a: any, b: any) => b.createdAt - a.createdAt);

    // Calculate this month's totals
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let currentMonthTotal = 0;
    let currentMonthCount = 0;

    payments.forEach((p: any) => {
        if (p.createdAt >= startOfMonth && p.status === 'completed') {
            currentMonthTotal += (p.amountUsd || 0);
            currentMonthCount++;
        }
    });

    // Augment payments with user info
    const { findUserById, saveUser } = require('@/lib/auth');
    const { recordCreditChange } = require('@/lib/db/billing');

    const augmentedPayments = payments.map((p: any) => {
        const user = findUserById(p.userId);
        return {
            ...p,
            userEmail: user?.email ?? 'Unknown',
            username: user?.username ?? 'Unknown',
        };
    });

    return NextResponse.json({
        payments: augmentedPayments,
        summary: {
            currentMonthTotal,
            currentMonthCount,
            totalAllTime: payments.reduce((sum, p: any) => sum + (p.status === 'completed' ? (p.amountUsd || 0) : 0), 0)
        }
    });
}

// POST /api/admin/payments — manual credit grant
export async function POST(req: NextRequest) {
    const admin = await checkAdmin();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { findUserById, saveUser } = require('@/lib/auth');
    const { recordCreditChange } = require('@/lib/db/billing');

    const { userId, credits, note } = await req.json();
    if (!userId || !credits || credits <= 0) {
        return NextResponse.json({ error: 'Invalid userId or credits' }, { status: 400 });
    }

    const user = findUserById(userId);
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const newBalance = user.credits + credits;
    user.credits = newBalance;
    if (user.plan === 'free') user.plan = 'basic';
    saveUser(user);

    recordCreditChange({
        userId,
        changeType: 'admin',
        delta: credits,
        balanceAfter: newBalance,
        note: note || `Admin manual grant by ${admin.email}`,
    });

    return NextResponse.json({
        success: true,
        userEmail: user.email,
        newBalance,
    });
}
