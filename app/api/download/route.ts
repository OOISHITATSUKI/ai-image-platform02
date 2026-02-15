import { NextRequest } from 'next/server';
import sharp from 'sharp';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
        return new Response(JSON.stringify({ error: 'URL is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        let buffer: Buffer;

        if (imageUrl.startsWith('data:')) {
            const base64Data = imageUrl.split(',')[1];
            buffer = Buffer.from(base64Data, 'base64');
        } else {
            const response = await fetch(imageUrl);
            if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
            const arrayBuffer = await response.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
        }

        // Convert to PNG via sharp
        const pngBuffer = await sharp(buffer)
            .png()
            .toBuffer();

        const filename = `ai_image_${Date.now()}.png`;

        // Standard Response with simple headers for maximum compatibility
        return new Response(pngBuffer, {
            headers: {
                'Content-Type': 'image/png',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': pngBuffer.length.toString(),
            },
        });
    } catch (error) {
        console.error('Download Proxy Error:', error);
        return new Response(JSON.stringify({ error: 'Processing failed' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
