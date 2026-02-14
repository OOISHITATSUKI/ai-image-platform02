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
            // Fetch with a timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(imageUrl, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
            const arrayBuffer = await response.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
        }

        // Convert to PNG using sharp
        const pngBuffer = await sharp(buffer)
            .png()
            .toBuffer();

        const filename = `ai_image_${Date.now()}.png`;

        // We use application/octet-stream to force the browser to treat it as a file download
        // and ensure the filename is set correctly in the headers
        return new NextResponse(pngBuffer as any, {
            headers: {
                'Content-Type': 'image/png',
                'Content-Disposition': `attachment; filename="${filename}"; filename*='UTF-8''${filename}`,
                'Content-Length': pngBuffer.length.toString(),
                'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
        });
    } catch (error) {
        console.error('Download proxy error:', error);
        return NextResponse.json({ error: 'Failed to process image download' }, { status: 500 });
    }
}
