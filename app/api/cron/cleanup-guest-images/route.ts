import { NextRequest, NextResponse } from 'next/server';
import { purgeExpiredGuestImages } from '@/lib/db/guest_images';

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: NextRequest) {
    const headerSecret = req.headers.get('x-vercel-cron-auth') || req.headers.get('x-cron-secret') || req.headers.get('authorization')?.replace('Bearer ', '');
    if (!CRON_SECRET || headerSecret !== CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const purged = purgeExpiredGuestImages();
    return NextResponse.json({ success: true, purged });
}

// Also support GET for simple curl calls
export async function GET(req: NextRequest) {
    return POST(req);
}
