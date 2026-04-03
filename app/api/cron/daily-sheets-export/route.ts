import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { collectKpiData, writeToSheets } from '@/app/api/admin/export-to-sheets/route';

export async function GET(req: NextRequest) {
    // Authenticate via CRON_SECRET
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

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
