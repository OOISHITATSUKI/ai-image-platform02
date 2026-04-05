import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { collectKpiData, writeToSheets } from '@/app/api/admin/export-to-sheets/route';

export async function GET(req: NextRequest) {
    // Authenticate via CRON_SECRET (support both Vercel cron header and Bearer token)
    const authHeader = req.headers.get('authorization');
    const bearerToken = authHeader?.replace('Bearer ', '');
    const vercelCronToken = req.headers.get('x-vercel-cron-auth');

    const token = vercelCronToken || bearerToken;

    if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const data = await collectKpiData();
        const row = await writeToSheets(data);

        console.log('[daily-sheets-export] Success:', row);
        return NextResponse.json({
            success: true,
            message: 'Daily KPI exported to Google Sheets',
            row,
        });
    } catch (err: unknown) {
        console.error('[daily-sheets-export] Error:', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
