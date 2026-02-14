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
            // Handle base64 data URI
            const base64Data = imageUrl.split(',')[1];
            buffer = Buffer.from(base64Data, 'base64');
        } else {
            // Handle remote URL
            const response = await fetch(imageUrl);
            if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
            const arrayBuffer = await response.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
        }

        // Convert to PNG using sharp for maximum quality and compatibility
        const pngBuffer = await sharp(buffer)
            .png({ compressionLevel: 9, quality: 100 })
            .toBuffer();

        const filename = `generated_${Date.now()}.png`;

        return new NextResponse(pngBuffer, {
            headers: {
                'Content-Type': 'image/png',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-cache',
            },
        });
    } catch (error) {
        console.error('Download proxy error:', error);
        return NextResponse.json({ error: 'Failed to process image download' }, { status: 500 });
    }
}
