import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    try {
        let buffer: Buffer;

        if (imageUrl.startsWith('data:')) {
            const base64Data = imageUrl.split(',')[1];
            buffer = Buffer.from(base64Data, 'base64');
        } else {
            const response = await fetch(imageUrl);
            if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
            const arrayBuffer = await response.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
        }

        // Convert to PNG using sharp with explicit settings
        const pngBuffer = await sharp(buffer)
            .png({ compressionLevel: 9 })
            .toBuffer();

        // Use a simple, compatible filename to avoid OS issues
        const filename = `img_${Date.now()}.png`;

        // Create response with very explicit headers to force download behavior
        return new NextResponse(pngBuffer as any, {
            headers: {
                // 'application/octet-stream' is the safest way to force a file save dialog
                'Content-Type': 'image/png',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': pngBuffer.length.toString(),
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            },
        });
    } catch (error) {
        console.error('Download proxy error:', error);
        return NextResponse.json({ error: 'Download failed' }, { status: 500 });
    }
}
