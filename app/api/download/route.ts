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

        // 1. Fetch source image
        if (imageUrl.startsWith('data:')) {
            const base64Data = imageUrl.split(',')[1];
            buffer = Buffer.from(base64Data, 'base64');
        } else {
            const response = await fetch(imageUrl);
            if (!response.ok) throw new Error(`Source image fetch failed: ${response.status}`);
            const arrayBuffer = await response.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
        }

        // 2. Convert to PNG using sharp (ensures a valid PNG binary)
        const pngBuffer = await sharp(buffer)
            .png()
            .toBuffer();

        // 3. Set filename as requested (ai_image_...)
        const filename = `ai_image_${Date.now()}.png`;

        // 4. Return as attachment with explicit filename headers
        return new NextResponse(pngBuffer as any, {
            headers: {
                'Content-Type': 'image/png',
                // Important: Using double quotes and UTF-8 encoding for broad browser support
                'Content-Disposition': `attachment; filename="${filename}"; filename*='UTF-8''${filename}`,
                'Content-Length': pngBuffer.length.toString(),
                'X-Content-Type-Options': 'nosniff',
                'Cache-Control': 'no-cache',
            },
        });
    } catch (error) {
        console.error('Download Proxy Error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Unknown processing error'
        }, { status: 500 });
    }
}
