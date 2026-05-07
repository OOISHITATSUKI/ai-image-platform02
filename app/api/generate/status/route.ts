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

            // Use original URLs directly (not base64) so they survive localStorage persistence.
            // base64 data URIs are stripped by the client store's partialize to avoid exceeding
            // the ~5 MB localStorage quota, which causes images to disappear on mobile reload.
            const images = rawImages.map((img: { image_url: string; image_type: string }) => ({
                url: img.image_url,
                type: img.image_type || 'jpeg',
            }));

            // Apply face merge for txt2img + MyFace (selectedFaceImageUrl)
            // Face swap mode is already handled in the main generate route, but txt2img
            // with MyFace needs post-processing here after the image is generated.
            // Skip for anime style — IP-Adapter handles face consistency during generation.
            let finalImages = images;
            const metadata = taskMetadataStore.get(taskId);
            if (metadata?.selectedFaceImageUrl && !metadata?.isAnimeStyle) {
                try {
                    console.log('Status endpoint: Applying MyFace merge to generated images...');
                    let faceBase64 = '';
                    const faceUrl = metadata.selectedFaceImageUrl;
                    if (faceUrl.startsWith('data:')) {
                        faceBase64 = faceUrl.replace(/^data:image\/\w+;base64,/, '');
                    } else {
                        const faceRes = await fetch(faceUrl);
                        const faceBuf = await faceRes.arrayBuffer();
                        faceBase64 = Buffer.from(faceBuf).toString('base64');
                    }

                    const mergedResults = await Promise.all(
                        images.map(async (img: { url: string; type: string }) => {
                            // Try face swap with up to 2 retries for multi-face images
                            for (let attempt = 1; attempt <= 2; attempt++) {
                                try {
                                    const bodyRes = await fetch(img.url);
                                    const bodyBuf = await bodyRes.arrayBuffer();
                                    const bodyBase64 = Buffer.from(bodyBuf).toString('base64');
                                    const swapped = await handleFaceSwapFinal(faceBase64, bodyBase64);
                                    console.log(`MyFace merge succeeded (attempt ${attempt})`);
                                    return swapped[0]; // { url, type }
                                } catch (e) {
                                    const errMsg = e instanceof Error ? e.message : String(e);
                                    console.error(`MyFace merge attempt ${attempt} failed:`, errMsg);
                                    if (attempt >= 2) {
                                        console.warn('MyFace merge: returning original after retries (may be multi-face image)');
                                        return img;
                                    }
                                    // Brief pause before retry
                                    await new Promise(r => setTimeout(r, 500));
                                }
                            }
                            return img;
                        })
                    );
                    finalImages = mergedResults;
                    console.log('Status endpoint: MyFace merge complete.');
                } catch (e) {
                    console.error('Status endpoint: MyFace merge failed, returning originals:', e);
                }
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
