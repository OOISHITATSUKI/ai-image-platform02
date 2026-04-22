import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
    try {
        const { filename } = await params;

        // Prevent path traversal
        const safe = path.basename(filename);
        const filePath = path.join(process.cwd(), 'data', 'companion-photos', safe);

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const buffer = fs.readFileSync(filePath);

        let contentType = 'image/webp';
        if (safe.endsWith('.jpg') || safe.endsWith('.jpeg')) contentType = 'image/jpeg';
        else if (safe.endsWith('.png')) contentType = 'image/png';

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=3600',
            },
        });
    } catch (e) {
        console.error('companion-photos serve error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
