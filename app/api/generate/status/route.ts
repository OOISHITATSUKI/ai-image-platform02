import { NextRequest, NextResponse } from 'next/server';
import { taskMetadataStore, pollTaskResult, handleFaceSwapFinal } from '../route';

const NOVITA_API_KEY = process.env.NOVITA_API_KEY;
const NOVITA_BASE = 'https://api.novita.ai/v3/async';

// Server-side result cache: survives client disconnect (e.g. mobile screen off)
const resultCache = new Map<string, { images: { url: string; type: string }[]; createdAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function cleanExpiredCache() {
    const now = Date.now();
    for (const [key, val] of resultCache) {
        if (now - val.createdAt > CACHE_TTL_MS) {
            resultCache.delete(key);
        }
    }
}

export async function GET(request: NextRequest) {
    const taskId = request.nextUrl.searchParams.get('taskId');
    if (!taskId) {
        return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }

    if (!NOVITA_API_KEY) {
        return NextResponse.json({ error: 'NOVITA_API_KEY not configured' }, { status: 500 });
    }

    // Check cache first (client may have disconnected and is now recovering)
    cleanExpiredCache();
    const cached = resultCache.get(taskId);
    if (cached) {
        resultCache.delete(taskId);
        return NextResponse.json({ status: 'SUCCEED', taskId, images: cached.images });
    }

    try {
        // Single check against Novita API (no loop)
        const res = await fetch(
            `${NOVITA_BASE}/task-result?task_id=${taskId}`,
            { headers: { Authorization: `Bearer ${NOVITA_API_KEY}` } }
        );

        if (!res.ok) {
            return NextResponse.json({ status: 'PROCESSING', taskId });
        }

        const data = await res.json();
        const status = data?.task?.status;

        if (status === 'TASK_STATUS_SUCCEED') {
            const rawImages = data.images || [];

            // Fetch each image URL and convert to base64 with compression
            const sharp = (await import('sharp')).default;
            const images = await Promise.all(
                rawImages.map(async (img: { image_url: string; image_type: string }) => {
                    try {
                        const imgRes = await fetch(img.image_url);
                        if (!imgRes.ok) {
                            return { url: img.image_url, type: img.image_type };
                        }
                        const rawBuffer = await imgRes.arrayBuffer();
                        const buffer = Buffer.from(rawBuffer);
                        const compressedBuffer = await sharp(buffer)
                            .jpeg({ quality: 80, progressive: true })
                            .toBuffer();
                        const base64 = compressedBuffer.toString('base64');
                        return { url: `data:image/jpeg;base64,${base64}`, type: 'jpeg' };
                    } catch (err) {
                        console.error('Image fetch/convert error:', err);
                        return { url: img.image_url, type: img.image_type || 'jpeg' };
                    }
                })
            );

            // Apply saved face if metadata exists
            let finalImages = images;
            const metadata = taskMetadataStore.get(taskId);
            if (metadata?.selectedFaceImageUrl && images.length > 0) {
                console.log('Status endpoint: Applying saved face via merge-face...');
                const faceAppliedImages: typeof images = [];
                for (const img of images) {
                    try {
                        let targetBase64 = '';
                        if (img.url.startsWith('data:')) {
                            targetBase64 = img.url.replace(/^data:image\/\w+;base64,/, '');
                        } else {
                            const imgRes = await fetch(img.url);
                            const imgBuf = await imgRes.arrayBuffer();
                            targetBase64 = Buffer.from(imgBuf).toString('base64');
                        }

                        let faceBase64 = '';
                        if (metadata.selectedFaceImageUrl.startsWith('data:')) {
                            faceBase64 = metadata.selectedFaceImageUrl.replace(/^data:image\/\w+;base64,/, '');
                        } else {
                            const faceRes = await fetch(metadata.selectedFaceImageUrl);
                            const faceBuf = await faceRes.arrayBuffer();
                            faceBase64 = Buffer.from(faceBuf).toString('base64');
                        }

                        const mergedImages = await handleFaceSwapFinal(faceBase64, targetBase64);
                        faceAppliedImages.push(...mergedImages);
                    } catch (faceErr) {
                        console.error('Face application failed, using original:', faceErr);
                        faceAppliedImages.push(img);
                    }
                }
                finalImages = faceAppliedImages;
            }

            // Clean up metadata
            taskMetadataStore.delete(taskId);

            // Cache result so mobile users can recover after screen-off
            resultCache.set(taskId, { images: finalImages, createdAt: Date.now() });
            setTimeout(() => resultCache.delete(taskId), CACHE_TTL_MS);

            return NextResponse.json({
                status: 'SUCCEED',
                taskId,
                images: finalImages,
            });
        }

        if (status === 'TASK_STATUS_FAILED') {
            taskMetadataStore.delete(taskId);
            return NextResponse.json({
                status: 'FAILED',
                taskId,
                error: data?.task?.reason || 'Generation failed',
            });
        }

        // Still processing
        return NextResponse.json({
            status: 'PROCESSING',
            taskId,
        });
    } catch (err) {
        console.error('Status check error:', err);
        return NextResponse.json(
            { status: 'PROCESSING', taskId },
        );
    }
}
