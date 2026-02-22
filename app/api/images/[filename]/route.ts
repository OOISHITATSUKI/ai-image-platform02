import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest, { params }: { params: { filename: string } }) {
    try {
        const filePath = path.join(process.cwd(), 'data', 'images', params.filename);

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const buffer = fs.readFileSync(filePath);

        // Determine Content-Type
        let contentType = 'image/png';
        if (params.filename.endsWith('.webp')) contentType = 'image/webp';
        else if (params.filename.endsWith('.jpg') || params.filename.endsWith('.jpeg')) contentType = 'image/jpeg';

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
