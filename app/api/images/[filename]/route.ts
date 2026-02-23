import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
    try {
        const resolvedParams = await params;
        const filePath = path.join(process.cwd(), 'data', 'images', resolvedParams.filename);

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const buffer = fs.readFileSync(filePath);

        // Determine Content-Type
        let contentType = 'image/png';
        if (resolvedParams.filename.endsWith('.webp')) contentType = 'image/webp';
        else if (resolvedParams.filename.endsWith('.jpg') || resolvedParams.filename.endsWith('.jpeg')) contentType = 'image/jpeg';

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400'
            },
        });
    } catch (e) {
        console.error('Image proxy error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
