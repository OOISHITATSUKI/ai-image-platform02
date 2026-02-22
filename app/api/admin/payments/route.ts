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

    return NextResponse.json({
        payments,
        summary: {
            currentMonthTotal,
            currentMonthCount,
            totalAllTime: payments.reduce((sum, p: any) => sum + (p.status === 'completed' ? (p.amountUsd || 0) : 0), 0)
        }
    });
}
