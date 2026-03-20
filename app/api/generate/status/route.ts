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

            // Skip face merge in status endpoint — it blocks the poll response for 30+ seconds.
            // Face merge is already handled in the main generate route for face_swap mode.
            let finalImages = images;
            const metadata = taskMetadataStore.get(taskId);
            if (metadata?.selectedFaceImageUrl) {
                console.log('Status endpoint: Skipping face merge (handled by generate route). Returning original images.');
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
