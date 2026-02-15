import { NextRequest, NextResponse } from 'next/server';
import { AVAILABLE_MODELS } from '@/lib/types';
import type { AspectRatio, QualityPreset } from '@/lib/types';
import sharp from 'sharp';

const NOVITA_API_KEY = process.env.NOVITA_API_KEY;
const NOVITA_BASE = 'https://api.novita.ai/v3/async';
const NOVITA_BASE_SYNC = 'https://api.novita.ai/v3';

// ── Default Negative Prompt (auto-appended to all generations) ──
const DEFAULT_NEGATIVE_PROMPT =
    '(worst quality:1.4), (low quality:1.4), (normal quality:1.4), lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, jpeg artifacts, signature, watermark, username, blurry, deformed, distorted, disfigured, poorly drawn face, mutation, mutated, ugly, (deformed genitalia:1.5), (bad genitalia:1.5), (extra genitalia:1.3), (deformed vagina:1.5), (deformed penis:1.5), (fused body parts:1.3), (extra limbs:1.3), (missing limbs:1.3), (extra arms:1.3), (extra legs:1.3), (bad proportions:1.3), (gross proportions:1.3), (child:1.5), (childlike:1.5), (loli:1.5), (underage:1.5), (baby face:1.3), (doll face:1.3), (doll-like:1.3), (unnatural eyes:1.3), (huge eyes:1.3), (3d render:1.2), (plastic skin:1.3), (uncanny valley:1.3), (long neck:1.3), (cloned face:1.3), (malformed hands:1.4), (poorly drawn feet:1.4), (extra fingers:1.3)';

// ── Simple Translation Mock/Helper ──
// Stable Diffusion models only understand English well.
// We will detect Japanese characters and wrap the logic.
async function translatePromptIfNeeded(prompt: string): Promise<string> {
    const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(prompt);
    if (!hasJapanese) return prompt;

    console.log(`Translating prompt: ${prompt}`);
    // In a production app, we would use a real translation API.
    // Since we want to be proactive without adding extra paid keys now,
    // we use a simple free-tier translation fetch.
    try {
        const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(prompt)}`);
        const data = await res.json();
        const translated = data?.[0]?.[0]?.[0] || prompt;
        console.log(`Translated to: ${translated}`);
        return translated;
    } catch (err) {
        console.error('Translation failed, using original prompt:', err);
        return prompt;
    }
}

// Quality preset configurations
const QUALITY_CONFIGS: Record<QualityPreset, {
    steps: number;
    sampler: string;
    guidance: number;
    negativePrompt: string;
    qualityPrefix: string;
    hiresFixEnabled: boolean;
    hiresFixStrength: number;
    hiresFixUpscaler: string;
}> = {
    quick: {
        steps: 20,
        sampler: 'DPM++ 2M Karras',
        guidance: 7,
        negativePrompt: DEFAULT_NEGATIVE_PROMPT,
        qualityPrefix: 'best quality, ',
        hiresFixEnabled: false,
        hiresFixStrength: 0,
        hiresFixUpscaler: '',
    },
    standard: {
        steps: 30,
        sampler: 'DPM++ 2M Karras',
        guidance: 7,
        negativePrompt: DEFAULT_NEGATIVE_PROMPT,
        qualityPrefix: 'best quality, highly detailed, ',
        hiresFixEnabled: false,
        hiresFixStrength: 0,
        hiresFixUpscaler: '',
    },
    hd: {
        steps: 30,
        sampler: 'DPM++ 2M Karras',
        guidance: 7,
        negativePrompt: DEFAULT_NEGATIVE_PROMPT,
        qualityPrefix: 'masterpiece, best quality, highly detailed, sharp focus, professional, ',
        hiresFixEnabled: true,
        hiresFixStrength: 0.5,
        hiresFixUpscaler: 'Latent',
    },
    ultra: {
        steps: 35,
        sampler: 'DPM++ 2M SDE Karras',
        guidance: 7,
        negativePrompt: DEFAULT_NEGATIVE_PROMPT,
        qualityPrefix: 'masterpiece, best quality, ultra detailed, sharp focus, professional photography, cinematic lighting, 8k, ',
        hiresFixEnabled: true,
        hiresFixStrength: 0.5,
        hiresFixUpscaler: 'Latent',
    },
};

// Map aspect ratios to pixel dimensions
function getResolutionFromAspectRatio(
    aspectRatio: AspectRatio,
    resolution: string
): { width: number; height: number } {
    const baseSize = resolution === '1024' ? 1024 : resolution === '2K' ? 1536 : 512;

    const map: Record<AspectRatio, { width: number; height: number }> = {
        '1:1': { width: baseSize, height: baseSize },
        '4:3': { width: baseSize, height: Math.round(baseSize * 3 / 4) },
        '3:4': { width: Math.round(baseSize * 3 / 4), height: baseSize },
        '16:9': { width: baseSize, height: Math.round(baseSize * 9 / 16) },
        '9:16': { width: Math.round(baseSize * 9 / 16), height: baseSize },
        '21:9': { width: baseSize, height: Math.round(baseSize * 9 / 21) },
    };

    return map[aspectRatio] || { width: 512, height: 512 };
}

// Map aspect ratio to Seedream size string
function getSeedreamSize(aspectRatio: AspectRatio): string {
    const sizeMap: Record<AspectRatio, string> = {
        '1:1': '1024x1024',
        '4:3': '1152x864',
        '3:4': '864x1152',
        '16:9': '1280x720',
        '9:16': '720x1280',
        '21:9': '1512x648',
    };
    return sizeMap[aspectRatio] || '1024x1024';
}

// Poll task result until complete
async function pollTaskResult(taskId: string): Promise<{
    success: boolean;
    images?: { url: string; type: string }[];
    error?: string;
}> {
    const maxAttempts = 60; // 2s * 60 = 120s max wait
    const pollInterval = 2000;

    for (let i = 0; i < maxAttempts; i++) {
        await new Promise((r) => setTimeout(r, pollInterval));

        const res = await fetch(
            `${NOVITA_BASE}/task-result?task_id=${taskId}`,
            {
                headers: {
                    Authorization: `Bearer ${NOVITA_API_KEY}`,
                },
            }
        );

        if (!res.ok) {
            continue; // retry on transient errors
        }

        const data = await res.json();
        const status = data?.task?.status;

        if (status === 'TASK_STATUS_SUCCEED') {
            const images = (data.images || []).map((img: { image_url: string; image_type: string }) => ({
                url: img.image_url,
                type: img.image_type,
            }));
            return { success: true, images };
        }

        if (status === 'TASK_STATUS_FAILED') {
            return {
                success: false,
                error: data?.task?.reason || 'Generation failed',
            };
        }

        // Still processing — continue polling
    }

    return { success: false, error: 'Generation timed out (120s)' };
}

// ── Seedream generation handler ──
async function handleSeedreamGeneration(
    model: typeof AVAILABLE_MODELS[number],
    prompt: string,
    aspectRatio: AspectRatio,
    resolution: string,
) {
    const endpointPath = model.seedreamEndpoint!;
    const isSeedream4 = endpointPath.includes('4-0');

    const url = `${NOVITA_BASE_SYNC}/${endpointPath}`;

    // Build Seedream request body
    const seedreamBody: Record<string, unknown> = {
        prompt,
        watermark: false,
    };

    if (isSeedream4) {
        // Seedream 4.0: use resolution string (1K/2K/4K) or WxH
        const resMap: Record<string, string> = { '512': '1K', '1024': '1K', '2K': '2K', '4K': '4K' };
        seedreamBody.size = resMap[resolution] || '1K';
    } else {
        // Seedream 3.0: model name + WxH size string
        seedreamBody.model = model.novitaModelName || 'seedream-3-0-t2i-250415';
        seedreamBody.size = getSeedreamSize(aspectRatio);
        seedreamBody.guidance_scale = 2.5;
        seedreamBody.seed = -1;
        seedreamBody.response_format = 'url';
    }

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${NOVITA_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(seedreamBody),
    });

    if (!res.ok) {
        const errText = await res.text();
        console.error('Seedream API error:', res.status, errText);
        throw new Error(`Seedream API error: ${res.status} — ${errText.slice(0, 200)}`);
    }

    const data = await res.json();

    // Parse image URLs from response
    const imageUrls: string[] = [];

    if (data.image_file) {
        const imageType = data.image_type || 'png';
        const dataUri = `data:image/${imageType};base64,${data.image_file}`;
        imageUrls.push(dataUri);
    }

    if (data.image?.url) {
        imageUrls.push(data.image.url);
    }

    if (data.images) {
        for (const img of data.images) {
            if (img.url) imageUrls.push(img.url);
            else if (img.image_url) imageUrls.push(img.image_url);
        }
    }

    if (data.image_url) {
        imageUrls.push(data.image_url);
    }

    if (imageUrls.length === 0) {
        throw new Error('No images returned from Seedream API');
    }

    return imageUrls.map((url) => ({ url, type: 'jpeg' }));
}

// ── Resize a base64 image so neither dimension exceeds maxDim ──
const MAX_FACE_SWAP_DIM = 2048;

async function resizeBase64IfNeeded(base64: string, maxDim = MAX_FACE_SWAP_DIM): Promise<string> {
    // Strip data-URI prefix if present
    const raw = base64.replace(/^data:image\/\w+;base64,/, '');
    const buf = Buffer.from(raw, 'base64');

    const image = sharp(buf);
    const meta = await image.metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;

    if (w <= maxDim && h <= maxDim) {
        // already within limits – return the raw base64 (no data-URI)
        return raw;
    }

    // Resize keeping aspect ratio, fitting inside maxDim × maxDim
    const resized = await image
        .resize({ width: maxDim, height: maxDim, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 90 })
        .toBuffer();

    console.log(`Resized image from ${w}×${h} → fits within ${maxDim}px`);
    return resized.toString('base64');
}

// ── Restore Face: sharpen and restore face details via img2img pass ──
async function restoreFaceViaImg2Img(base64Image: string): Promise<string> {
    // We use a quick img2img pass with restore_faces=true to fix face quality
    const endpoint = `${NOVITA_BASE}/img2img`;

    const body = {
        extra: {
            response_image_type: 'png', // Ensuring PNG internally for quality
            enable_nsfw_detection: false,
            nsfw_detection_level: 0,
        },
        request: {
            model_name: 'realistic-vision-v60-b1_245598.safetensors',
            prompt: 'best quality, highly detailed, sharp focus, clear face, detailed eyes, detailed skin',
            negative_prompt: DEFAULT_NEGATIVE_PROMPT,
            image_base64: base64Image,
            width: -1,  // auto from source
            height: -1,
            image_num: 1,
            steps: 15,
            seed: -1,
            clip_skip: 2,
            sampler_name: 'DPM++ 2M Karras',
            guidance_scale: 5,
            strength: 0.25, // very low strength to preserve original, just fix faces
            restore_faces: true,
        },
    };

    const submitRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${NOVITA_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!submitRes.ok) {
        console.error('Restore face img2img submit failed:', submitRes.status);
        // Return original if restoration fails
        return base64Image;
    }

    const submitData = await submitRes.json();
    const taskId = submitData?.task_id;
    if (!taskId) {
        console.error('No task_id for face restore');
        return base64Image;
    }

    const result = await pollTaskResult(taskId);
    if (result.success && result.images && result.images.length > 0) {
        console.log('Face restoration succeeded');
        return result.images[0].url; // this is a URL, not base64
    }

    console.error('Face restoration failed, returning original');
    return `data:image/jpeg;base64,${base64Image}`;
}

// ── Face Swap (Merge Face) handler ──
async function handleMergeFace(
    faceImageBase64: string,
    targetImageBase64: string,
) {
    // Resize both images to stay within Novita's 2048px limit
    const [faceResized, targetResized] = await Promise.all([
        resizeBase64IfNeeded(faceImageBase64),
        resizeBase64IfNeeded(targetImageBase64),
    ]);

    const url = `${NOVITA_BASE_SYNC}/merge-face`;

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${NOVITA_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            face_image_file: faceResized,
            image_file: targetResized,
            response_image_type: 'png',
        }),
    });

    if (!res.ok) {
        const errText = await res.text();
        console.error('Merge Face API error:', res.status, errText);
        throw new Error(`Face Swap API error: ${res.status} — ${errText.slice(0, 200)}`);
    }

    const data = await res.json();

    if (!data.image_file) {
        throw new Error('No image returned from Face Swap API');
    }

    // ── Post-process: restore face quality via img2img ──
    try {
        const restoredUrl = await restoreFaceViaImg2Img(data.image_file);
        // If restoredUrl is a full URL (from task result), return it directly
        if (restoredUrl.startsWith('http')) {
            return [{ url: restoredUrl, type: 'jpeg' }];
        }
        // Otherwise it's a base64 data URI
        return [{ url: restoredUrl, type: 'jpeg' }];
    } catch (restoreErr) {
        console.error('Face restoration error, using raw face swap result:', restoreErr);
        // Fallback: return raw face swap result
        const imageType = data.image_type || 'jpeg';
        const dataUri = `data:image/${imageType};base64,${data.image_file}`;
        return [{ url: dataUri, type: imageType }];
    }
}

export async function POST(request: NextRequest) {
    if (!NOVITA_API_KEY) {
        return NextResponse.json(
            { error: 'NOVITA_API_KEY not configured' },
            { status: 500 }
        );
    }

    try {
        const body = await request.json();
        const {
            prompt,
            modelId,
            generationType,
            aspectRatio = '1:1',
            resolution = '1024',
            imageBase64,
            additionalImages,
            faceSwapMode = false,
            count = 1,
            qualityPreset = 'hd',
        } = body;

        if (!prompt && generationType === 'txt2img') {
            return NextResponse.json(
                { error: 'A prompt is required for text-to-image generation' },
                { status: 400 }
            );
        }

        // ── Translation Step ──
        const translatedPrompt = await translatePromptIfNeeded(prompt || '');

        // Look up model
        const model = AVAILABLE_MODELS.find((m) => m.id === modelId);

        // ── Seedream branch ──
        if (model?.apiType === 'seedream') {
            try {
                const images = await handleSeedreamGeneration(
                    model,
                    translatedPrompt || 'a beautiful image',
                    aspectRatio as AspectRatio,
                    resolution,
                );
                return NextResponse.json({ images });
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Seedream generation failed';
                return NextResponse.json({ error: errorMsg }, { status: 502 });
            }
        }

        // ── Face Swap branch (explicit faceSwapMode toggle) ──
        if (faceSwapMode && imageBase64 && additionalImages?.length > 0) {
            try {
                // image1 = face source, image2 = target body
                const images = await handleMergeFace(imageBase64, additionalImages[0]);
                return NextResponse.json({ images });
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Face swap failed';
                return NextResponse.json({ error: errorMsg }, { status: 502 });
            }
        }

        // ── Standard SD branch ──
        // Get quality config
        const quality = QUALITY_CONFIGS[qualityPreset as QualityPreset] || QUALITY_CONFIGS.hd;

        const novitaModelName = model?.novitaModelName || 'sd_xl_base_1.0.safetensors';

        const { width, height } = getResolutionFromAspectRatio(
            aspectRatio as AspectRatio,
            resolution
        );

        // Decide endpoint
        const isImg2Img = generationType === 'img2img' && imageBase64;
        const endpoint = isImg2Img ? `${NOVITA_BASE}/img2img` : `${NOVITA_BASE}/txt2img`;

        // Auto-enhance prompt with quality prefix
        const enhancedPrompt = quality.qualityPrefix + (translatedPrompt || 'a beautiful image');

        // Build request body
        const novitaRequest: Record<string, unknown> = {
            model_name: novitaModelName,
            prompt: enhancedPrompt,
            negative_prompt: quality.negativePrompt,
            width,
            height,
            image_num: Math.min(count, 4), // cap at 4
            steps: quality.steps,
            seed: -1,
            clip_skip: 2,
            sampler_name: quality.sampler,
            guidance_scale: quality.guidance,
            // Automatically add NSFW trigger tags if model is NSFW
            ...(model?.nsfw ? {
                prompt: `(nsfw:1.2), explicit, naked, ${enhancedPrompt}`,
            } : {}),
            // ONLY add LoRAs if the model is compatible (mostly SD1.5 for this specific LoRA)
            // If the model ID contains 'xl' or is a known XL model, we skip SD1.5 LoRAs
            loras: novitaModelName.toLowerCase().includes('xl') ? [] : [
                {
                    model_name: 'add_detail_44319',
                    strength: 0.7,
                },
            ],
        };

        // Enable HiRes Fix for hd/ultra presets (txt2img only)
        if (quality.hiresFixEnabled && !isImg2Img) {
            novitaRequest.hires_fix = {
                target_width: Math.min(Math.round(width * 1.5), 1536),
                target_height: Math.min(Math.round(height * 1.5), 1536),
                strength: quality.hiresFixStrength,
                upscaler: quality.hiresFixUpscaler,
            };
        }

        if (isImg2Img) {
            novitaRequest.image_base64 = imageBase64;
            novitaRequest.strength = 0.7;
        }

        const novitaBody = {
            extra: {
                response_image_type: 'jpeg',
                enable_nsfw_detection: false,
            },
            request: novitaRequest,
        };

        // Submit task
        const submitRes = await fetch(endpoint, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${NOVITA_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(novitaBody),
        });

        if (!submitRes.ok) {
            const errText = await submitRes.text();
            console.error('Novita submit error:', submitRes.status, errText);
            return NextResponse.json(
                { error: `Novita API error: ${submitRes.status} — ${errText.slice(0, 200)}` },
                { status: 502 }
            );
        }

        const submitData = await submitRes.json();
        const taskId = submitData?.task_id;

        if (!taskId) {
            return NextResponse.json(
                { error: 'No task_id returned from Novita' },
                { status: 502 }
            );
        }

        // Poll for the result
        const result = await pollTaskResult(taskId);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Generation failed' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            images: result.images,
            taskId,
        });
    } catch (err) {
        console.error('Generate API error:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
