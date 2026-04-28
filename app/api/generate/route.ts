import { NextRequest, NextResponse } from 'next/server';
import { AVAILABLE_MODELS } from '@/lib/types';
import type { AspectRatio, QualityPreset, TagSettings } from '@/lib/types';
import { buildTagPromptResult } from '@/lib/tagPromptBuilder';
import { validatePrompt } from '@/lib/security';
import { processViolation, checkBanStatus } from '@/lib/auditLogger';
import { rateLimit } from '@/lib/rateLimit';
import { findUserById, verifyToken } from '@/lib/auth';
import { getGenerationsByUser } from '@/lib/db/generations';
import { getLLMProvider } from '@/lib/llm';
import sharp from 'sharp';

const NOVITA_API_KEY = process.env.NOVITA_API_KEY;
const NOVITA_BASE = 'https://api.novita.ai/v3/async';
const NOVITA_BASE_SYNC = 'https://api.novita.ai/v3';
import fs from 'fs';
import path from 'path';

// ── Task Metadata Store (for async polling) ──
export const taskMetadataStore = new Map<string, {
    selectedFaceImageUrl?: string;
    createdAt: number;
}>();

function cleanupTaskMetadata() {
    const now = Date.now();
    for (const [key, val] of taskMetadataStore) {
        if (now - val.createdAt > 300_000) { // 5 min
            taskMetadataStore.delete(key);
        }
    }
}

// ── Image Deletion Policy ──
const DELETION_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'outputs');

async function cleanupOldFiles() {
    if (!fs.existsSync(OUTPUT_DIR)) return;
    const now = Date.now();
    try {
        const files = fs.readdirSync(OUTPUT_DIR);
        for (const file of files) {
            const filePath = path.join(OUTPUT_DIR, file);
            const stats = fs.statSync(filePath);
            if (now - stats.mtimeMs > DELETION_THRESHOLD_MS) {
                if (stats.isDirectory()) {
                    fs.rmSync(filePath, { recursive: true, force: true });
                } else {
                    fs.unlinkSync(filePath);
                }
                console.log(`Deleted expired: ${file}`);
            }
        }
    } catch (err) {
        console.error('Cleanup failed:', err);
    }
}


// ── Rate Limit Constants ──
const FREE_RATE_LIMIT = 6; // Increased from 5
const PAID_RATE_LIMIT = 20; // Increased from 15
const WINDOW_MS = 60 * 1000; // 1 minute

// ... (rest of the file until the POST handler) ...


// ── Default Negative Prompt (auto-appended to all generations) ──
const DEFAULT_NEGATIVE_PROMPT =
    '(worst quality:1.4), (low quality:1.4), (illustration, 3d, 2d, painting, cartoons, sketch:1.5), (plastic skin:1.4), (airbrushed:1.4), (synthetic:1.4), lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, jpeg artifacts, signature, watermark, blurry, deformed, disfigured, ugly, (deformed genitalia:1.5), (extra genitalia:1.3), (fused body parts:1.3), (extra limbs:1.3), (missing limbs:1.3), (bad proportions:1.3), (child:1.5), (loli:1.5), (underage:1.5), (baby face:1.3), (doll face:1.3), (uncanny valley:1.3), (cloned face:1.3), (malformed hands:1.4), (extra fingers:1.3), (multiple faces:1.5), (multiple bodies:1.5), (extra breasts:1.5), (three breasts:1.5), (anime:1.5), (cartoon:1.5), (oversaturated:1.3)';

// ── Inpaint (Nude Mode) specific prompts ──
const INPAINT_NEGATIVE_PROMPT =
    '(worst quality:1.4), (low quality:1.4), deformed, blurry, bad anatomy, bad hands, extra fingers, missing fingers, (clothing:1.5), (straps:1.5), (shoulder straps:1.5), (bra straps:1.5), (string:1.4), (ribbon:1.4), (fabric:1.4), (deformed nipples:1.5), (misshapen nipples:1.5), (extra nipples:1.5), (asymmetric nipples:1.4), (distorted breasts:1.4), (unnatural skin texture:1.3), (seam:1.3), (visible edge:1.3), (clothing remnants:1.5), (partial clothing:1.5), (torn fabric:1.4), (lingerie:1.4), (underwear:1.5), (bra:1.5)';

const INPAINT_POSITIVE_MODIFIERS =
    '(natural skin:1.3), (realistic skin texture:1.3), (anatomically correct:1.4), (smooth natural skin:1.3)';

// ── SDXL specific negative prompt ──
const SDXL_NEGATIVE_PROMPT =
    'illustration, 3d render, cartoon, anime, manga, sketch, painting, drawing, ' +
    'comic, cel shading, vector art, digital art, pop art, CGI, ' +
    'male, man, boy, masculine, ' +
    'ugly face, asymmetrical face, deformed face, disfigured, ' +
    'crooked nose, crooked mouth, bad teeth, ' +
    '(plastic skin:1.4), (airbrushed:1.4), (smooth skin:1.3), (waxy skin:1.3), ' +
    '(porcelain skin:1.3), (doll-like:1.3), (overprocessed:1.3), (over-saturated:1.3), ' +
    '(artificial lighting:1.2), (uncanny valley:1.3), (symmetrical face:1.1), ' +
    'lowres, bad anatomy, bad hands, text, watermark, blurry, deformed, ugly, ' +
    'child, underage, extra fingers, missing fingers, ' +
    'extra limbs, multiple faces, multiple bodies, ' +
    'cowboy hat, western, ranch, horse, lasso';

// ── SDXL quality prefix (photorealism boosters) ──
const SDXL_QUALITY_PREFIX =
    '(masterpiece:1.2), (best quality:1.2), (RAW photo:1.3), (photorealistic:1.3), ' +
    'DSLR, 8k uhd, sharp focus, natural lighting, ' +
    '(realistic skin texture:1.3), (skin pores:1.2), (natural skin imperfections:1.2), ' +
    '(subtle skin blemishes:1.1), (fine body hair:1.1), ' +
    '(natural hair strands:1.2), (catchlight in eyes:1.2), ' +
    'film grain, lens distortion, depth of field, chromatic aberration';

// ── LLM Prompt Optimization ──
// Use LLM (Together AI / Claude) to turn natural language or Japanese into high-quality Stable Diffusion tags.
async function optimizePromptWithLLM(prompt: string, generationType: string, isNsfw: boolean, isXL: boolean): Promise<string> {
    console.log("Optimizing prompt with LLM: " + prompt);

    let systemPrompt: string;

    if (generationType === "img_edit" || prompt.includes("[inpaint]")) {
        systemPrompt = isNsfw
            ? `You are a Stable Diffusion inpainting prompt expert.
Convert the input into 10-20 comma-separated English tags for the masked area only.
Always output in English, regardless of input language.
NSFW is allowed: bare skin, nude, nipples, vagina etc.
Do NOT add quality, lighting, or camera tags.
Output ONLY comma-separated tags, nothing else.

Example:
Input: "胸を大きく"
Output: large breasts, bare breasts, cleavage, soft skin, natural breast shape`
            : `You are a Stable Diffusion inpainting prompt expert.
Convert the input into 10-20 comma-separated English tags for the masked area only.
Always output in English, regardless of input language.
This is SFW: do NOT include nudity, bare skin, or sexual tags. Keep content clothed and tasteful.
Do NOT add quality, lighting, or camera tags.
Output ONLY comma-separated tags, nothing else.

Example:
Input: "赤いドレスに変えて"
Output: red dress, elegant fabric, satin material, form fitting, fashionable`;
    } else if (generationType === "img2img") {
        systemPrompt = isNsfw
            ? `You are a Stable Diffusion img2img prompt expert.
Convert input into 15-25 comma-separated English tags.
Always output in English, regardless of input language.
Focus on style, mood, lighting changes. NSFW is allowed, use direct explicit tags.
Do NOT re-describe character appearance.
Output ONLY comma-separated tags, nothing else.

Example:
Input: "夜の雰囲気に変えて"
Output: night scene, moonlight, dim lighting, shadows, atmospheric, moody, dark background`
            : `You are a Stable Diffusion img2img prompt expert.
Convert input into 15-25 comma-separated English tags.
Always output in English, regardless of input language.
Focus on style, mood, lighting changes. This is SFW: do NOT include nudity or sexual tags.
Do NOT re-describe character appearance.
Output ONLY comma-separated tags, nothing else.

Example:
Input: "夕焼けの雰囲気に"
Output: sunset lighting, golden hour, warm tones, orange sky, dramatic light, soft shadows`;
    } else if (isNsfw) {
        systemPrompt = `You are a Stable Diffusion photorealistic prompt expert for an adult NSFW platform.
Your goal is to produce images that look like REAL PHOTOGRAPHS, not AI-generated images.
Convert user input into 15-30 comma-separated English tags.
Always output in English, regardless of input language.

CRITICAL RULES:
1. Translate any non-English input to English first.
2. NSFW is fully allowed and encouraged. Use explicit, direct tags: nude, naked, topless, bare breasts, exposed genitalia, penis, vagina, sex, penetration.
3. ACTION/POSE is the HIGHEST PRIORITY. If the user describes ANY sexual action, position, or pose:
   - Output 8-12 highly specific action/pose tags at the VERY START
   - Include: exact body position, limb placement, camera angle, facial expression, body contact points
   - Use strong weights like (tag:1.5) for the main action
   - Examples:
     * "cowgirl/riding" → (girl on top:1.7), (straddling:1.6), (riding position:1.6), (sitting on penis:1.5), legs apart straddling hips, hips grinding down, (vaginal penetration:1.5), bouncing, face to face, front view, sweat. NEVER add cowboy hat or western/ranch themes.
     * "blowjob" → (fellatio:1.7), (oral sex:1.6), (blowjob:1.5), (penis in mouth:1.5), kneeling between legs, mouth wide open, tongue out, looking up at viewer, head between legs, (from above angle:1.3), saliva
     * "doggy" → (doggy style sex:1.7), (from behind:1.7), (rear entry:1.6), (bent over:1.6), (on all fours:1.5), (ass up face down:1.5), hands gripping hips, back arched deeply, (rear view:1.4), knees on bed
     * "missionary" → (missionary position:1.7), (missionary sex:1.7), (woman lying on back:1.6), (man on top of woman:1.6), (legs spread wide:1.5), (between her legs:1.5), (vaginal penetration:1.5), hips between thighs, arms wrapped around, from above angle
4. If [Required Action/Pose: ...] is given, treat it as mandatory — place those action tags first with strong weights.
5. If [Required Composition: ...] is given, respect it (do NOT add conflicting shot types).
6. After action tags, add PHOTOREALISM tags that make the image look like a real photograph:
   - Camera/lens: (shot on Canon EOS R5:1.2), 85mm lens, f/2.8 aperture, shallow depth of field, lens flare
   - Skin realism: (realistic skin texture:1.3), visible skin pores, subtle skin blemishes, (natural skin imperfections:1.2), fine body hair, goosebumps, (uneven skin tone:1.1)
   - Lighting: natural window light, golden hour, soft shadows, ambient occlusion, (volumetric lighting:1.1)
   - Photo artifacts: film grain, subtle lens distortion, slight motion blur on edges, bokeh background
   - AVOID these AI tells: Do NOT use "perfect skin", "flawless", "symmetrical", "porcelain". Real photos have asymmetry and imperfections.
7. Do NOT add: age, ethnicity, body shape, hair color, hair style, or breast size tags (these are handled separately by the system).
8. Keep output under 500 characters to leave room for character tags.
9. Output ONLY comma-separated tags, nothing else.`;
    } else {
        systemPrompt = `You are a Stable Diffusion photorealistic prompt expert.
Your goal is to produce images that look like REAL PHOTOGRAPHS, not AI-generated images.
Convert user input into 15-30 comma-separated English tags.
Always output in English, regardless of input language.

CRITICAL RULES:
1. Translate any non-English input to English first.
2. This is a SFW (safe for work) generation. Do NOT include any NSFW, nude, naked, topless, sexual, or explicit tags. Keep all content clothed and non-sexual.
3. ACTION/POSE: If the user describes a pose or action, output specific pose/body position tags at the start with weights like (tag:1.3).
4. If [Required Action/Pose: ...] is given, treat it as mandatory — place those action tags first with strong weights.
5. If [Required Composition: ...] is given, respect it (do NOT add conflicting shot types).
6. Add PHOTOREALISM tags that make the image look like a real photograph:
   - Camera/lens: (shot on Canon EOS R5:1.2), 85mm lens, f/2.8 aperture, shallow depth of field, lens flare
   - Skin realism: (realistic skin texture:1.3), visible skin pores, subtle skin blemishes, (natural skin imperfections:1.2), fine body hair, goosebumps, (uneven skin tone:1.1)
   - Lighting: natural window light, golden hour, soft shadows, ambient occlusion, (volumetric lighting:1.1)
   - Photo artifacts: film grain, subtle lens distortion, slight motion blur on edges, bokeh background
   - AVOID these AI tells: Do NOT use "perfect skin", "flawless", "symmetrical", "porcelain". Real photos have asymmetry and imperfections.
7. Do NOT add: age, ethnicity, body shape, hair color, hair style, or breast size tags (these are handled separately by the system).
8. Keep output under 500 characters to leave room for character tags.
9. Output ONLY comma-separated tags, nothing else.

Example:
Input: "美しい女性、夕日のビーチ"
Output: beautiful woman, sunset beach, golden hour, cinematic lighting, (shot on Canon EOS R5:1.2), 85mm lens, shallow depth of field, (realistic skin texture:1.3), visible skin pores, natural window light, soft shadows, film grain, bokeh background`;
    }

    try {
        const llm = getLLMProvider();
        const response = await llm.generate({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: "Generation Type: " + generationType + ", NSFW: " + isNsfw + ", isXL: " + isXL + "\nUser Input: " + prompt },
            ],
            maxTokens: 200,
            temperature: 0.7,
        });

        console.log("Optimized prompt: " + response.content);
        return response.content;
    } catch (err) {
        console.error("LLM optimization failed:", err);
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
}> = {
    quick: {
        steps: 30,
        sampler: 'DPM++ 2M Karras',
        guidance: 7,
        negativePrompt: DEFAULT_NEGATIVE_PROMPT,
        qualityPrefix: 'masterpiece, best quality, ultra detailed, 8k, ',
    },
    standard: {
        steps: 35,
        sampler: 'DPM++ 2M Karras',
        guidance: 7,
        negativePrompt: DEFAULT_NEGATIVE_PROMPT,
        qualityPrefix: 'masterpiece, best quality, ultra detailed, 8k, ',
    },
    hd: {
        steps: 35,
        sampler: 'DPM++ 2M Karras',
        guidance: 7.5,
        negativePrompt: DEFAULT_NEGATIVE_PROMPT,
        qualityPrefix: '(RAW photo:1.2), masterpiece, best quality, ultra detailed, 8k, sharp focus, ',
    },
    ultra: {
        steps: 40,
        sampler: 'DPM++ 2M Karras',
        guidance: 7.5,
        negativePrompt: DEFAULT_NEGATIVE_PROMPT,
        qualityPrefix: '(RAW photo:1.3), (photorealistic:1.4), professional DSLR shot, high resolution, 8k uhd, dslr, soft lighting, high quality, film grain, Fujifilm XT4, detailed facial features, realistic skin texture, intricate details, ',
    },
};

// Map aspect ratios to pixel dimensions
function getResolutionFromAspectRatio(
    aspectRatio: AspectRatio,
    resolution: string,
    modelName: string,
): { width: number; height: number } {
    const isXL = modelName.toLowerCase().includes('xl');
    const round64 = (n: number) => Math.round(n / 64) * 64;

    if (isXL) {
        // ★ SDXL: Native 1024px base (optimized for resolution buckets)
        const sdxlMap: Record<AspectRatio, { width: number; height: number }> = {
            '1:1': { width: 1024, height: 1024 },
            '4:3': { width: 1024, height: 768 },
            '3:4': { width: 768, height: 1024 },
            '16:9': { width: 1024, height: 576 },
            '9:16': { width: 576, height: 1024 },
            '21:9': { width: 1024, height: 448 },
        };
        return sdxlMap[aspectRatio] || { width: 1024, height: 1024 };
    }

    // SD 1.5: 512-768 base
    let baseSize: number;
    switch (resolution) {
        case '512':
            baseSize = 512;
            break;
        case '1024':
            baseSize = 768;  // SD 1.5 optimal high-res
            break;
        case '2K':
            baseSize = 896;  // Higher base for 2K
            break;
        case '4K':
            baseSize = 1024; // Maximum for best quality
            break;
        default:
            baseSize = 512;
    }

    const map: Record<AspectRatio, { width: number; height: number }> = {
        '1:1': { width: baseSize, height: baseSize },
        '4:3': { width: baseSize, height: round64(baseSize * 3 / 4) },
        '3:4': { width: round64(baseSize * 3 / 4), height: baseSize },
        '16:9': { width: baseSize, height: round64(baseSize * 9 / 16) },
        '9:16': { width: round64(baseSize * 9 / 16), height: baseSize },
        '21:9': { width: baseSize, height: round64(baseSize * 9 / 21) },
    };

    return map[aspectRatio] || { width: baseSize, height: baseSize };
}



// Poll task result until complete
export async function pollTaskResult(taskId: string): Promise<{
    success: boolean;
    images?: { url: string; type: string }[];
    error?: string;
}> {
    const maxAttempts = 60; // 2s * 60 = 120s max wait
    const pollInterval = 2000;

    console.log(`Polling for task: ${taskId}, max attempts: ${maxAttempts}`);
    for (let i = 0; i < maxAttempts; i++) {
        await new Promise((r) => setTimeout(r, pollInterval));

        console.log(`Fetching task result for: ${taskId}...`);
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
        console.log(`Task status for ${taskId}: ${status}`);

        if (status === 'TASK_STATUS_SUCCEED') {
            const rawImages = data.images || [];

            // Fetch each image URL and convert to Base64 data URI with compression
            const images = await Promise.all(
                rawImages.map(async (img: { image_url: string; image_type: string }) => {
                    try {
                        const imgRes = await fetch(img.image_url);
                        if (!imgRes.ok) {
                            console.error(`Failed to fetch image: ${imgRes.status}`);
                            return { url: img.image_url, type: img.image_type }; // Fallback
                        }
                        const rawBuffer = await imgRes.arrayBuffer();
                        const buffer = Buffer.from(rawBuffer);

                        // Compress using sharp to prevent crash during JSON serialization
                        const compressedBuffer = await sharp(buffer)
                            .jpeg({ quality: 80, progressive: true })
                            .toBuffer();

                        const base64 = compressedBuffer.toString('base64');
                        return {
                            url: `data:image/jpeg;base64,${base64}`,
                            type: 'jpeg',
                        };
                    } catch (err) {
                        console.error('Image fetch/convert/compress error:', err);
                        return { url: img.image_url, type: img.image_type || 'jpeg' }; // Fallback
                    }
                })
            );

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

    const isJpegOrPng = meta.format === 'jpeg' || meta.format === 'png';

    if (w <= maxDim && h <= maxDim && isJpegOrPng) {
        // already within limits and supported format – return the raw base64 (no data-URI)
        return raw;
    }

    // Resize (if needed) and always convert to JPEG for API compatibility
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
            model_name: 'realvisxlV50_v50LightningBakedvae_718065.safetensors',
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
    return base64Image;
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

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${NOVITA_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    face_image_file: faceResized,
                    image_file: targetResized,
                    response_image_type: 'jpeg',
                }),
            });

            if (!res.ok) {
                const errText = await res.text();
                console.error(`Merge Face API error (Attempt ${attempt}/3):`, res.status, errText);

                if (res.status === 500 && attempt < 3) {
                    const delay = 1000 * attempt;
                    console.warn(`Face swap failed with 500, retrying in ${delay}ms...`);
                    await new Promise(r => setTimeout(r, delay));
                    continue;
                }

                let msg = `Face Swap API error: ${res.status}`;
                if (errText.includes('"code":2') || res.status === 500) {
                    msg += " — 顔が検出されなかったか、画像が不適切です。別の画像（正面を向いたはっきりした顔）で試してください。";
                } else {
                    msg += ` — ${errText.slice(0, 200)}`;
                }
                throw new Error(msg);
            }

            const contentType = res.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                const htmlText = await res.text();
                console.error('Face Swap returned non-JSON:', htmlText.slice(0, 500));
                throw new Error('Face Swap API error: Unexpected HTML response. Please try again.');
            }

            const data = await res.json();
            if (!data.image_file) {
                throw new Error('No image returned from Face Swap API');
            }
            return data.image_file;
        } catch (err) {
            if (attempt >= 3) throw err;
        }
    }
    throw new Error('Face Swap failed after max retries');
}

// ── Wrapper to match expected return type ──
export async function handleFaceSwapFinal(
    faceImageBase64: string,
    targetImageBase64: string,
) {
    try {
        const faceSwappedBase64 = await handleMergeFace(faceImageBase64, targetImageBase64);

        // Post-process: restore face quality via img2img
        try {
            const restoredData = await restoreFaceViaImg2Img(faceSwappedBase64);
            if (restoredData.startsWith('http')) {
                return [{ url: restoredData, type: 'png' }];
            }
            return [{ url: `data:image/png;base64,${restoredData}`, type: 'png' }];
        } catch (restoreErr) {
            console.error('Face restoration error, using raw face swap result:', restoreErr);
            return [{ url: `data:image/jpeg;base64,${faceSwappedBase64}`, type: 'jpeg' }];
        }
    } catch (err) {
        throw err;
    }
}

// ── Solution A: Auto-inpainting region analysis via LLM ──
async function analyzeEditRegion(prompt: string): Promise<{
    region: 'breasts' | 'body' | 'face' | 'clothing' | 'background' | 'full';
    maskBox: { x: number; y: number; w: number; h: number }; // 0-1 normalized
}> {
    try {
        const llm = getLLMProvider();
        const response = await llm.generate({
            messages: [
                {
                    role: 'system',
                    content: `You analyze image editing requests to determine which body region to modify.
Given a user's edit instruction (in any language), output ONLY a JSON object in English:
{
  "region": "breasts"|"body"|"face"|"clothing"|"background"|"full",
  "maskBox": {"x": 0.0-1.0, "y": 0.0-1.0, "w": 0.0-1.0, "h": 0.0-1.0}
}
maskBox defines the rectangular area to edit (normalized 0-1 coordinates).

Examples:
- "巨乳にして" → {"region":"breasts","maskBox":{"x":0.2,"y":0.25,"w":0.6,"h":0.4}}
- "服を脱がせて" → {"region":"body","maskBox":{"x":0.05,"y":0.15,"w":0.9,"h":0.75}}
- "金髪にして" → {"region":"face","maskBox":{"x":0.2,"y":0.0,"w":0.6,"h":0.4}}
- "背景を変えて" → {"region":"background","maskBox":{"x":0.0,"y":0.0,"w":1.0,"h":1.0}}
- "make her nude" → {"region":"body","maskBox":{"x":0.05,"y":0.15,"w":0.9,"h":0.75}}

Output ONLY the JSON, nothing else. No markdown, no explanation.`,
                },
                { role: 'user', content: prompt },
            ],
            maxTokens: 200,
            temperature: 0.3,
        });

        const text = response.content;
        const json = JSON.parse(text.replace(/```json|```/g, ''));
        return json;
    } catch (err) {
        console.error('analyzeEditRegion error:', err);
        return { region: 'full', maskBox: { x: 0, y: 0, w: 1, h: 1 } };
    }
}

// ── Solution A: Generate mask image based on bounding box ──
async function generateAutoMask(
    imageBase64: string,
    maskBox: { x: number; y: number; w: number; h: number }
): Promise<string> {
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imgBuf = Buffer.from(cleanBase64, 'base64');
    const meta = await sharp(imgBuf).metadata();
    const imgW = meta.width || 512;
    const imgH = meta.height || 512;

    // maskBox to real pixels
    const mx = Math.round(maskBox.x * imgW);
    const my = Math.round(maskBox.y * imgH);
    const mw = Math.round(maskBox.w * imgW);
    const mh = Math.round(maskBox.h * imgH);

    // Create mask (white = edit area, black = preserve area for Novita)
    const mask = await sharp({
        create: {
            width: imgW,
            height: imgH,
            channels: 3,
            background: { r: 0, g: 0, b: 0 },
        },
    })
        .composite([{
            input: await sharp({
                create: {
                    width: mw,
                    height: mh,
                    channels: 3,
                    background: { r: 255, g: 255, b: 255 },
                },
            }).png().toBuffer(),
            left: mx,
            top: my,
        }])
        .blur(20) // Smooth blending
        .png()
        .toBuffer();

    return mask.toString('base64');
}


// ── Safe JSON parser (handles HTML error pages from Novita) ──
async function safeParseJSON(res: Response, context: string = ''): Promise<any> {
    const text = await res.text();
    if (text.startsWith('<') || text.startsWith('<!')) {
        console.error(`[${context}] Received HTML instead of JSON:`, text.slice(0, 200));
        throw new Error('API returned an error page. Please try again.');
    }
    try {
        return JSON.parse(text);
    } catch (e) {
        console.error(`[${context}] JSON parse failed:`, text.slice(0, 200));
        throw new Error('Invalid response from generation API. Please try again.');
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
            aspectRatio = '4:3',
            resolution = '1024',
            imageBase64,
            additionalImages,
            faceSwapMode = false,
            inpaintMode = false,
            reposeMode = false,
            maskBase64,
            img2imgStrength,
            count = 1,
            qualityPreset = 'hd',
            tagSettings,
            nudeMode = true,
            selectedFaceImageUrl,
        } = body;

        // BUG-03: Friendly error messages (duplicated from ChatArea but for backend errors)
        const friendlyError = (raw: string): string => {
            if (raw.includes('INVALID_IMAGE_FORMAT')) {
                return '❌ この画像形式には対応していません。JPG、PNG、またはWebPを試してください。';
            }
            return raw;
        };

        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

        // ── Extract Auth Token & User ──
        const authHeader = request.headers.get('authorization');
        let userId = 'guest';
        let user: Awaited<ReturnType<typeof findUserById>> = null;
        let decodedEmail = '';

        if (authHeader) {
            const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
            if (token) {
                const decoded = verifyToken(token);
                if (decoded) {
                    userId = decoded.userId;
                    decodedEmail = decoded.email;
                    user = await findUserById(userId);
                }
            }
        }

        // ── Identify Free vs Paid User ──
        // Definition of "Free only": Credits <= 20 AND never charged (inferred by plan === 'free' and no extra credits).
        // Since we don't have a direct 'hasCharged' flag, we use plan === 'free' && credits <= 20 as the heuristic.
        let isFreeLimitedUser = user ? (user.plan === 'free' && user.credits <= 20) : false;

        // ── Bypass Limits for Test Account ──
        const isTestAccount = (user?.email === 'ooisidegesu@gmail.com') || (decodedEmail === 'ooisidegesu@gmail.com');
        if (isTestAccount) {
            isFreeLimitedUser = false; // Grants access to advanced generation types
        }

        // ── Role-based Rate Limiting ──
        const rateLimitKey = user ? `${userId}:generate` : `${ip}:generate`;

        // If not test account, apply rate limiting
        if (!isTestAccount) {
            const allowedReqsPerMin = isFreeLimitedUser || !user ? FREE_RATE_LIMIT : PAID_RATE_LIMIT;
            const rl = rateLimit(rateLimitKey, allowedReqsPerMin, WINDOW_MS);
            console.log(`[RateLimit Debug] Key: ${rateLimitKey}, Count: ${rl.count}, Max: ${allowedReqsPerMin}, Allowed: ${rl.allowed}`);
            if (!rl.allowed) {
                return NextResponse.json(
                    { error: 'error_rate_limit' },
                    { status: 429, headers: { 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': rl.resetAt.toString() } }
                );
            }
        }

        // ── Free Credit Expiry Check ──
        if (!isTestAccount && user && isFreeLimitedUser && user.freeCreditsExpireAt && Date.now() > user.freeCreditsExpireAt) {
            return NextResponse.json(
                { error: 'error_free_credits_expired' },
                { status: 403 }
            );
        }

        // ── Free Feature Restrictions ──
        if (!isTestAccount && (isFreeLimitedUser || !user)) {
            // Updated: Allow txt2img for free users, and allow Face Swap (img2img + faceSwapMode) 
            // once per day (checked below).
            const isAllowedFreeFeature = generationType === 'txt2img' || faceSwapMode;

            if (!isAllowedFreeFeature) {
                return NextResponse.json(
                    { error: 'error_free_credits_feature' },
                    { status: 403 }
                );
            }

            // Specific check for Face Swap daily limit using file-based DB
            if (faceSwapMode) {
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);
                const todayStartMs = todayStart.getTime();

                const userGenerations = getGenerationsByUser(userId);
                const todaySwaps = userGenerations.filter(
                    g => g.generationType === 'faceswap' && g.createdAt >= todayStartMs
                );

                if (todaySwaps.length > 0) {
                    return NextResponse.json(
                        { error: 'Free users can only use Face Swap once per day. Please purchase credits for unlimited access.' },
                        { status: 403 }
                    );
                }
            }
        }

        if (!prompt && generationType === 'txt2img') {
            return NextResponse.json(
                { error: 'prompt_required' },
                { status: 400 }
            );
        }

        // ── Security Check 1: Is user already banned? ──
        const banStatus = checkBanStatus(ip, userId);
        if (banStatus.banned) {
            return NextResponse.json(
                { error: 'error_access_denied', reason: banStatus.reason },
                { status: 403 }
            );
        }

        // ── Security Check 2: Prompt Validation ──
        if (prompt) {
            const validation = validatePrompt(prompt);
            if (!validation.valid) {
                const action = processViolation(ip, userId, validation.rule || 'Unknown Block', prompt);
                let message = 'error_safety_violation';
                if (action === 'temp_ban') message = 'error_temp_ban';
                if (action === 'permanent_ban') message = 'error_permanent_ban';

                return NextResponse.json({ error: message, blockAction: action }, { status: 400 });
            }
        }

        // ── Enforce free user resolution ──
        const userRecord = userId ? await findUserById(userId) : null;
        const isFreeUser = !userRecord || userRecord.plan === 'free';
        const finalResolution = (isFreeUser && resolution !== '512') ? '512' : resolution;
        if (isFreeUser && resolution !== '512') {
            console.log(`Free user attempted ${resolution}, forcing 512`);
        }

        // Look up model
        const model = AVAILABLE_MODELS.find((m) => m.id === modelId);

        // ── Build tag-based prompt fragment ──
        // Force Ultra quality for all requests to ensure maximum output
        // Resolution-based quality scaling
        const quality = { ...QUALITY_CONFIGS.ultra };
        switch (finalResolution) {
            case '512':
                quality.steps = 25;
                quality.guidance = 7;
                break;
            case '1024':
                quality.steps = 35;
                quality.guidance = 7.5;
                break;
            case '2K':
                quality.steps = 40;
                quality.guidance = 7.5;
                break;
            case '4K':
                quality.steps = 45;
                quality.guidance = 8;
                break;
        }

        let tagPromptFragment = '';
        let tagNegativeFragment = '';
        let actionHint = '';          // ← Action/pose hint sent to Claude
        
        if (tagSettings) {
            const ts = tagSettings as TagSettings;
            const tagResult = buildTagPromptResult(ts);
            tagPromptFragment = tagResult.prompt;
            tagNegativeFragment = tagResult.negativePrompt;

            if (ts.fetish && ts.fetish.length > 0) {
                const actionLabels: Record<string, string> = {
                    fellatio: 'fellatio blowjob oral sex, woman kneeling between mans legs, penis deep in mouth, sucking, tongue visible, looking up at camera, head between legs, from above angle, saliva dripping',
                    cowgirl: 'girl on top riding sex position, woman straddling man sitting on his penis, legs apart over hips, grinding hips down, vaginal penetration, bouncing motion, hands on his chest, face to face front view, sweat on skin',
                    insertion: 'vaginal penetration sex, penis inside vagina, bodies pressed together, legs spread wide, hips touching, moaning expression, arched back, sweat, intimate skin contact',
                    kiss: 'deep passionate tongue kiss, two faces in profile view from the side, lips touching, eyes closed, embracing tightly, two separate heads visible, upper body shot, romantic',
                    missionary: 'missionary sex position, woman lying flat on back on bed, man on top between her spread legs, his hips between her thighs, vaginal penetration, her ankles crossed behind his back, arms wrapped around him, from above camera angle, skin contact, bed sheets wrinkled',
                    doggy: 'doggy style rear entry sex, woman bent over on all fours, ass raised up face pressed down, man behind gripping her hips, back arched deeply, rear view camera angle, knees on bed, looking back over shoulder, sweat on back',
                    standing: 'standing sex against wall, woman pressed against wall with one leg hooked around mans waist, upright penetration, arms around shoulders, face to face, full body view, weight leaning against wall',
                    handjob: 'handjob, woman gripping penis with hand, fingers wrapped around shaft, stroking pumping motion, sitting beside him, looking at viewer, arm extended',
                    paizuri: 'paizuri titfuck, penis between breasts, woman squeezing breasts together around shaft with both hands, kneeling position, looking down at penis, cleavage wrapped around',
                };
                actionHint = ts.fetish.map(f => actionLabels[f] || f).join(', ');
            }

            console.log('Tag prompt fragment:', tagPromptFragment);
            console.log('Action hint:', actionHint);
        }

        // ── SFW mode: strip all NSFW tags from tagPromptFragment and actionHint ──
        if (!nudeMode) {
            // Remove fetish/action tags (high-weight explicit content)
            tagPromptFragment = tagPromptFragment
                .replace(/\([^)]*(?:fellatio|oral sex|blowjob|penis|vagina|sex|penetrat|nude|naked|nsfw|cowgirl|riding position|missionary|doggy|handjob|paizuri|titfuck|sucking|insertion|spread legs|genitalia|nipples)[^)]*:[\d.]+\),?\s*/gi, '')
                .replace(/\b(?:fellatio|oral sex|blowjob|penis in mouth|sucking|saliva|vaginal penetration|sex|nude|naked|nsfw|riding position|sitting on penis|hips grinding|bouncing|moaning|intimate skin contact|arched back|sweat|ass up face down|stroking penis|titfuck|penis between breasts|bare skin|no clothing|topless|nipples|genitalia|cleavage)\b,?\s*/gi, '')
                .replace(/\(1boy:[\d.]+\),?\s*/g, '')
                .replace(/\(couple:[\d.]+\),?\s*/g, '')
                .replace(/\(man and woman:[\d.]+\),?\s*/g, '')
                .replace(/\(2people:[\d.]+\),?\s*/g, '')
                .replace(/,\s*,/g, ',')
                .replace(/^,\s*|,\s*$/g, '')
                .trim();
            // Clear action hint for SFW
            actionHint = '';
            console.log('SFW mode: stripped NSFW tags from tagPromptFragment:', tagPromptFragment);
        }

        // ── Auto-detect action/pose from prompt text if not set via UI ──
        // Skip auto-detection entirely in SFW mode
        if (!actionHint && prompt && nudeMode) {
            const promptLower = prompt.toLowerCase();
            const autoActionMap: [RegExp, string, string][] = [
                [/フェラ|blowjob|fellatio|oral sex|しゃぶ/, 'fellatio', 'fellatio blowjob oral sex, woman kneeling between mans legs, penis deep in mouth, sucking, tongue visible, looking up at camera, from above angle, saliva'],
                [/騎乗位|cowgirl|girl.?on.?top|またが/, 'cowgirl', 'girl on top riding sex, woman straddling man sitting on his penis, legs apart over hips, grinding down, vaginal penetration, bouncing, face to face front view, sweat'],
                [/正常位|missionary|仰向け/, 'missionary', 'missionary sex, woman lying flat on back on bed, man on top between her spread legs, his hips between her thighs, vaginal penetration, ankles crossed behind his back, from above angle, bed sheets'],
                [/バック|後ろから|doggy|from.?behind|背面/, 'doggy', 'doggy style rear entry sex, woman bent over on all fours, ass raised face pressed down, man behind gripping her hips, back arched deeply, rear view, knees on bed, looking back'],
                [/立ち|standing.?sex|壁/, 'standing', 'standing sex against wall, woman pressed against wall with leg hooked around mans waist, upright penetration, arms around shoulders, face to face, full body'],
                [/手コキ|handjob|手で/, 'handjob', 'handjob, woman gripping penis with hand, fingers wrapped around shaft, stroking pumping motion, sitting beside'],
                [/パイズリ|paizuri|titfuck|挟/, 'paizuri', 'paizuri titfuck, penis between breasts, woman squeezing breasts together around shaft, kneeling, looking down'],
                [/キス|kiss|接吻/, 'kiss', 'deep passionate tongue kiss, two faces shown in profile side view, lips touching, eyes closed, embracing tightly, two separate heads visible, upper body shot, romantic'],
                [/挿入|セックス|sex|ペニス|penetrat|fuck|ハメ/, 'insertion', 'vaginal penetration sex, penis inside vagina, bodies pressed together, legs spread wide, hips touching, moaning, arched back, sweat'],
            ];
            for (const [pattern, fetishKey, hint] of autoActionMap) {
                if (pattern.test(promptLower) || pattern.test(prompt)) {
                    actionHint = hint;
                    // Also inject the FETISH_MAP tags into tagPromptFragment
                    const fetishTags: Record<string, string> = {
                        fellatio: '(fellatio:1.7), (oral sex:1.6), (blowjob:1.5), (penis in mouth:1.5), (sucking:1.4), kneeling between legs, mouth wide open, tongue out, looking up at viewer, hands on thighs, head between legs, (from above angle:1.3), saliva',
                        cowgirl: '(girl on top:1.7), (straddling:1.6), (riding position:1.6), (woman on top sex:1.5), (sitting on penis:1.5), legs apart straddling hips, hips grinding down, (vaginal penetration:1.5), bouncing, hands on chest, face to face, front view, sweat',
                        insertion: '(vaginal penetration:1.7), (sex:1.7), (penis inside vagina:1.6), (insertion:1.5), (spread legs:1.4), hips touching, bodies pressed together, moaning expression, arched back, sweat, intimate skin contact',
                        kiss: '(passionate kissing:1.5), (deep kiss:1.4), (tongue kiss:1.3), (two distinct faces in profile:1.4), (side view of faces:1.3), lips touching, eyes closed, embracing tightly, (two separate heads:1.3), upper body shot, romantic',
                        missionary: '(missionary position:1.7), (missionary sex:1.7), (woman lying on back:1.6), (man on top of woman:1.6), (legs spread wide:1.5), (between her legs:1.5), (vaginal penetration:1.5), hips between thighs, arms wrapped around man, ankles crossed behind back, bed sheets, pillow, from above angle, eye contact, skin contact',
                        doggy: '(doggy style sex:1.7), (from behind:1.7), (rear entry:1.6), (bent over:1.6), (on all fours:1.5), (ass up face down:1.5), hands gripping hips, back arched deeply, (rear view:1.4), knees on bed, looking back over shoulder, sweat on back',
                        standing: '(standing sex:1.7), (standing penetration:1.6), (leg lifted up:1.5), (pressed against wall:1.5), one leg hooked around waist, arms around shoulders, face to face, full body, upright position, (wall sex:1.4), weight against wall',
                        handjob: '(handjob:1.7), (hand on penis:1.6), (stroking penis:1.5), (fingers wrapped around shaft:1.4), pumping motion, sitting beside, looking at viewer, arm extended, wrist motion',
                        paizuri: '(paizuri:1.7), (titfuck:1.7), (penis between breasts:1.6), (breast squeeze:1.5), (breasts wrapped around shaft:1.5), pressing breasts together with hands, cleavage, looking down at penis, kneeling position',
                    };
                    const injectedTags = fetishTags[fetishKey] || '';
                    // Couple tags for sex positions
                    const needsCouple = ['fellatio','cowgirl','insertion','missionary','doggy','standing','handjob','paizuri'].includes(fetishKey);
                    const coupleTag = needsCouple ? ', (1boy:1.4), (1girl:1.3), (couple:1.4), (man and woman:1.3), (2people:1.3)' : '';
                    // Remove conflicting solo/1girl/2girls tags when couple is needed
                    if (needsCouple) {
                        tagPromptFragment = tagPromptFragment
                            .replace(/\(1girl:[\d.]+\),?\s*/g, '')
                            .replace(/\(2girls:[\d.]+\),?\s*/g, '')
                            .replace(/\(two women:[\d.]+\),?\s*/g, '')
                            .replace(/\(multiple girls:[\d.]+\),?\s*/g, '')
                            .replace(/several women,?\s*/g, '')
                            .replace(/solo,?\s*/g, '')
                            .replace(/,\s*,/g, ',')
                            .replace(/^,\s*|,\s*$/g, '');
                    }
                    tagPromptFragment = injectedTags + coupleTag + (tagPromptFragment ? ', ' + tagPromptFragment : '');
                    console.log('Auto-detected action from prompt:', fetishKey, '→', actionHint);
                    break;
                }
            }
        }

        // ── Auto-detect male+female couple from prompt text (even without explicit sex action) ──
        const couplePromptPattern = /男性と女性|男女|男と女|man\s*and\s*woman|couple|カップル|彼氏|boyfriend|男性が|男が/i;
        const hasCoupleInPrompt = prompt && couplePromptPattern.test(prompt);
        if (hasCoupleInPrompt && !actionHint) {
            // Couple keywords without explicit action — inject couple tags
            tagPromptFragment = tagPromptFragment
                .replace(/\(1girl:[\d.]+\),?\s*/g, '')
                .replace(/\(2girls:[\d.]+\),?\s*/g, '')
                .replace(/\(two women:[\d.]+\),?\s*/g, '')
                .replace(/\(multiple girls:[\d.]+\),?\s*/g, '')
                .replace(/several women,?\s*/g, '')
                .replace(/solo,?\s*/g, '')
                .replace(/,\s*,/g, ',')
                .replace(/^,\s*|,\s*$/g, '');
            const coupleInjection = '(1boy:1.4), (1girl:1.3), (couple:1.4), (man and woman:1.3), (2people:1.3)';
            tagPromptFragment = coupleInjection + (tagPromptFragment ? ', ' + tagPromptFragment : '');
            console.log('Auto-detected couple from prompt keywords');
        }

        // ── Model Selection Logic ──
        let novitaModelName = model?.novitaModelName || 'sd_xl_base_1.0.safetensors';

        // Keep user-selected model (no auto-switch)


        console.log(`[DEBUG] reposeMode=${reposeMode} generationType=${generationType} hasImage=${!!imageBase64}`);
        const isImg2ImgValue = (generationType === 'img2img' || inpaintMode) && !!imageBase64;
        const isPureImg2Img = generationType === 'img2img' && !!imageBase64;

        // ★ Solution A: Auto-inpainting region analysis via Claude
        let editAnalysis: { region: string; maskBox: { x: number; y: number; w: number; h: number } } = {
            region: 'full',
            maskBox: { x: 0, y: 0, w: 1, h: 1 }
        };

        if (isPureImg2Img && !faceSwapMode) {
            console.log('Solution A: Analyzing edit region for img2img...');
            editAnalysis = await analyzeEditRegion(prompt || 'a beautiful image');
            console.log(`Region analysis result: ${editAnalysis.region}`, editAnalysis.maskBox);
        }

        // ── Inpaint Model Mapping ──
        if (!reposeMode && (inpaintMode || (isPureImg2Img && editAnalysis.region !== 'full'))) {
            novitaModelName = 'realisticVisionV51_v51VAE-inpainting_94324.safetensors';
            console.log(`${inpaintMode ? 'Inpaint' : 'Auto-inpaint (' + editAnalysis.region + ')'} detected. Model: ${novitaModelName}`);
        }

        // Detect SDXL models
        const isXL = novitaModelName.toLowerCase().includes('xl');

        // ── Claude Optimization Step (user prompt + action context + composition context) ──
        const basePrompt = prompt || (inpaintMode ? '(remove all clothes, completely nude, bare breasts, uncensored:1.5), detailed skin' : 'a beautiful image');
        // Pass action and composition hints to Claude
        let promptForClaude = basePrompt;
        // Determine if couple mode is active (from UI fetish, auto-action, or prompt keywords)
        const isCoupleMode = !!(actionHint && /sex|penetrat|riding|straddl|fellatio|blowjob|missionary|doggy|behind|handjob|paizuri|titfuck|kiss/i.test(actionHint)) || hasCoupleInPrompt;

        if (actionHint) {
            // Action SD tags are already injected in tagPromptFragment.
            // Tell Claude to NOT duplicate action/pose tags, only add scene/atmosphere/lighting.
            promptForClaude += `\n[Required Action/Pose: ${actionHint}]\n[NOTE: Action/pose SD tags are already injected separately. Do NOT output action/pose/position tags. Only output scene, atmosphere, lighting, and camera tags to complement the action.]`;
        }
        if (isCoupleMode) {
            promptForClaude += `\n[IMPORTANT: This scene has TWO people (1 man + 1 woman). Do NOT output "solo", "1girl", "single person", or "alone" tags. The couple/1boy/1girl tags are already injected separately.]`;
        }
        if (tagSettings) {
            const ts = tagSettings as TagSettings;
            // Override composition based on action (same logic as tagPromptBuilder)
            const fullBodyActions = ['standing', 'cowgirl', 'missionary', 'doggy', 'insertion'];
            const waistUpActions = ['fellatio', 'handjob', 'paizuri'];
            let effectiveComp = ts.composition;
            if (ts.fetish?.length > 0) {
                if (ts.fetish.some((f: string) => fullBodyActions.includes(f))) {
                    effectiveComp = 'full_body';
                } else if (ts.fetish.some((f: string) => waistUpActions.includes(f)) && (ts.composition === 'face_closeup' || ts.composition === 'bust')) {
                    effectiveComp = 'waist_up';
                }
            }
            // Also override for auto-detected actions
            if (actionHint) {
                if (/standing|riding|straddl|missionary|lying on back|doggy|behind|all fours|penetrat/i.test(actionHint)) {
                    effectiveComp = 'full_body';
                } else if (/fellatio|blowjob|handjob|paizuri|titfuck/i.test(actionHint) && (effectiveComp === 'face_closeup' || effectiveComp === 'bust')) {
                    effectiveComp = 'waist_up';
                }
            }
            if (effectiveComp) {
                const compLabels: Record<string, string> = {
                    full_body: 'full body shot showing head to toe',
                    waist_up: 'upper body waist up shot',
                    bust: 'bust portrait from chest up',
                    face_closeup: 'face closeup portrait',
                };
                promptForClaude += `\n[Required Composition: ${compLabels[effectiveComp] || effectiveComp}]`;
            }
        }
        const optimizedPrompt = await optimizePromptWithLLM(
            promptForClaude,
            generationType,
            nudeMode,
            isXL
        );

        // ── Combine: tag fragment (character/composition/action) + Claude-optimized prompt ──
        // Tag fragment has highest priority (character tags, composition, action/pose)
        // Claude output provides supplementary atmosphere/quality/scene tags
        // Trim Claude output first to protect tag fragment from truncation
        function trimPromptToLimit(p: string, limit = 1020): string {
            if (p.length <= limit) return p;
            const segments = p.split(', ');
            while (segments.join(', ').length > limit && segments.length > 1) {
                segments.pop();
            }
            return segments.join(', ');
        }

        let combinedPrompt: string;
        if (tagPromptFragment) {
            // Reserve space for tag fragment (priority tags) + separator
            const reservedLen = tagPromptFragment.length + 2; // +2 for ", "
            const trimmedClaude = trimPromptToLimit(optimizedPrompt, 1020 - reservedLen);
            combinedPrompt = `${tagPromptFragment}, ${trimmedClaude}`;
        } else {
            combinedPrompt = optimizedPrompt;
        }
        combinedPrompt = trimPromptToLimit(combinedPrompt);
        console.log(`Final combined prompt (${combinedPrompt.length} chars):`, combinedPrompt);

        // ── Prompt Prefix Selection ──
        // Skip quality prefixes for img2img to preserve original image characteristics
        // Use SDXL-specific quality prefix for XL models
        const promptPrefix = (inpaintMode || isPureImg2Img) ? '' : (isXL ? SDXL_QUALITY_PREFIX : quality.qualityPrefix);
        // Quality tags should come AFTER composition tags to avoid overriding shot type
        const enhancedPrompt = promptPrefix ? `${combinedPrompt}, ${promptPrefix}` : combinedPrompt;
        // image1 (imageBase64) = body/target, image2 (additionalImages[0]) = face source
        if (faceSwapMode && imageBase64 && additionalImages?.length > 0) {
            try {
                // Correct order: face=additionalImages[0], target body=imageBase64
                const images = await handleFaceSwapFinal(additionalImages[0], imageBase64);
                return NextResponse.json({ images });
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Face swap failed';
                return NextResponse.json({ error: friendlyError(errorMsg) }, { status: 502 });
            }
        }

        // Face Swap with saved face from My Faces (1 upload body + selectedFaceImageUrl)
        if (faceSwapMode && imageBase64 && !additionalImages?.length && selectedFaceImageUrl) {
            try {
                let faceBase64 = '';
                if (selectedFaceImageUrl.startsWith('data:')) {
                    faceBase64 = selectedFaceImageUrl.replace(/^data:image\/\w+;base64,/, '');
                } else {
                    const faceRes = await fetch(selectedFaceImageUrl);
                    const faceBuf = await faceRes.arrayBuffer();
                    faceBase64 = Buffer.from(faceBuf).toString('base64');
                }
                const images = await handleFaceSwapFinal(faceBase64, imageBase64);
                return NextResponse.json({ images });
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Face swap failed';
                return NextResponse.json({ error: friendlyError(errorMsg) }, { status: 502 });
            }
        }

        // ── Standard SD branch ──
        // (Moved quality up)

        const { width, height } = getResolutionFromAspectRatio(
            aspectRatio as AspectRatio,
            resolution,
            novitaModelName
        );

        // Decide endpoint
        // Inpainting is a specialized img2img request
        const isNovitaImg2Img = isImg2ImgValue;

        // Use dedicated inpainting endpoint if mask is provided
        // Use dedicated inpainting endpoint if mask is provided OR auto-inpaint is triggered
        // Decide endpoint
        const endpoint = ((inpaintMode && maskBase64) || (isPureImg2Img && !reposeMode && editAnalysis.region !== 'full'))
            ? `${NOVITA_BASE}/inpainting`
            : (isPureImg2Img || reposeMode)
                ? `${NOVITA_BASE}/img2img`
                : `${NOVITA_BASE}/txt2img`;

        // ── Negative Prompt: combine default + tag-specific negatives ──
        let finalNegative = isXL ? SDXL_NEGATIVE_PROMPT : quality.negativePrompt;
        if (tagNegativeFragment && !isXL) {
            finalNegative = `${finalNegative}, ${tagNegativeFragment}`;
        }

        // Remove "multiple faces/bodies" from negative if user wants 2+ people
        if (tagSettings && (tagSettings as TagSettings).peopleCount && (tagSettings as TagSettings).peopleCount !== '1') {
            finalNegative = finalNegative
                .replace(/\(multiple faces:[\d.]+\),?\s*/g, '')
                .replace(/\(multiple bodies:[\d.]+\),?\s*/g, '')
                .replace(/multiple faces,?\s*/g, '')
                .replace(/multiple bodies,?\s*/g, '');
        }

        // Remove "male/man/boy/masculine" and "multiple faces/bodies" from negative when couple is detected
        const hasActionCouple = actionHint && /sex|penetrat|riding|straddl|fellatio|blowjob|missionary|doggy|behind|handjob|paizuri|titfuck/i.test(actionHint);
        const hasUICouple = tagSettings && (tagSettings as TagSettings).fetish && (tagSettings as TagSettings).fetish.length > 0 &&
            ['fellatio','cowgirl','insertion','kiss','missionary','doggy','standing','handjob','paizuri'].some(f => (tagSettings as TagSettings).fetish.includes(f as any));
        const isCoupleScene = !!(hasActionCouple || hasUICouple || hasCoupleInPrompt);
        if (isCoupleScene) {
            finalNegative = finalNegative
                .replace(/\bmale\b,?\s*/g, '')
                .replace(/\bman\b,?\s*/g, '')
                .replace(/\bboy\b,?\s*/g, '')
                .replace(/\bmasculine\b,?\s*/g, '')
                .replace(/multiple faces,?\s*/g, '')
                .replace(/multiple bodies,?\s*/g, '')
                .replace(/\(multiple faces:[\d.]+\),?\s*/g, '')
                .replace(/\(multiple bodies:[\d.]+\),?\s*/g, '')
                // Reduce extra limbs penalty for 2-person scenes (4 legs/arms is normal)
                .replace(/\(extra limbs:[\d.]+\),?\s*/g, '')
                .replace(/,\s*,/g, ',')
                .replace(/^,\s*|,\s*$/g, '');
            // Add solo/alone to negative to prevent single-person generation
            finalNegative += ', (solo:1.5), (alone:1.4), (single person:1.4), (only one person:1.4), (1girl solo:1.5)';
            // Prevent face merging/fusion in couple scenes (especially kiss)
            finalNegative += ', (fused faces:1.5), (merged faces:1.5), (overlapping faces:1.4), (conjoined:1.4)';
            console.log('Couple detected: adjusted negative prompt for 2-person scene');
        }

        // ── Prompt Assembly ──
        // (Moved up)

        // ── Helper to enforce 1024 character limit safely ──
        const enforceLimit = (text: string, limit: number = 1000) => {
            if (!text || text.length <= limit) return text;
            let truncated = text.slice(0, limit);
            const lastComma = truncated.lastIndexOf(',');
            if (lastComma > 0) {
                truncated = truncated.slice(0, lastComma);
            }
            return truncated;
        };


        // ── Repose Mode: img2img with prompt-driven pose change ──

        
        // Build request body
        const novitaRequest: Record<string, unknown> = {
            model_name: novitaModelName,
            width,
            height,
            image_num: Math.min(count, 4),
            steps: isXL ? 35 : quality.steps,
            seed: -1,
            clip_skip: isXL ? 1 : 2,
            sampler_name: isXL ? 'DPM++ 2M SDE Karras' : quality.sampler,
            guidance_scale: isXL ? 5.5 : (isPureImg2Img ? 5 : quality.guidance),
            // ONLY add LoRAs if the model is compatible (mostly SD1.5 for this specific LoRA)
            ...(!isXL ? {
                loras: [
                    {
                        model_name: 'add_detail_44319',
                        strength: 0.7,
                    },
                ]
            } : {}),
        };

        // --- nudeModeによるプロンプト注入 ---
        const hasClothingInPrompt = /bikini|dress|uniform|lingerie|shirt|wear|outfit|cloth|swimsuit/i
            .test(optimizedPrompt);

        // Couple body reinforcement prefix
        const coupleBodyPrefix = isCoupleScene ? '(two people:1.4), (intertwined bodies:1.3), (skin to skin contact:1.3), (4 legs:1.2), (4 arms:1.2), ' : '';

        if (nudeMode && !hasClothingInPrompt) {
            // Nude ON + 服装指定なし → ヌード生成
            novitaRequest.prompt = enforceLimit(
                `${coupleBodyPrefix}nsfw, nude, naked, bare skin, ${enhancedPrompt}`
            );
            novitaRequest.negative_prompt = enforceLimit(finalNegative);
        } else if (!nudeMode) {
            // Nude OFF → ヌード禁止（SFW画像）
            // Also strip any remaining NSFW keywords from the prompt itself
            let sfwPrompt = enhancedPrompt
                .replace(/\b(?:nsfw|nude|naked|bare skin|topless|nipples|genitalia|penis|vagina|sex|penetration|fellatio|blowjob|oral sex|cowgirl|missionary|doggy|handjob|paizuri|titfuck)\b,?\s*/gi, '')
                .replace(/,\s*,/g, ',')
                .replace(/^,\s*|,\s*$/g, '')
                .trim();
            novitaRequest.prompt = enforceLimit(`${coupleBodyPrefix}${sfwPrompt}`);
            novitaRequest.negative_prompt = enforceLimit(
                `${finalNegative}, nsfw, nude, naked, nipples, genitalia, topless, bare breasts, exposed, sexual, explicit, penis, vagina, sex, penetration`
            );
        } else {
            // Nude ON + 服装指定あり → ユーザーの服装指定を優先
            novitaRequest.prompt = enforceLimit(`${coupleBodyPrefix}${enhancedPrompt}`);
            novitaRequest.negative_prompt = enforceLimit(finalNegative);
        }

        // No HiRes Fix — it causes "failed to exec task" errors on Novita async API
        if (isImg2ImgValue) {
            // For inpainting: both image + mask MUST have identical resolution.
            // Resize both to the same dimensions using the image's natural size
            // (capped at 1024 on longest side to be safe with Novita).
            let finalImageBase64 = imageBase64!.replace(/^data:image\/\w+;base64,/, '');

            if ((inpaintMode && maskBase64) || (isPureImg2Img && editAnalysis.region !== 'full')) {
                // ... inpaint specific resize logic ...
                const MAX_INPAINT_PX = 1024;

                // Get image natural size
                const imgBuf = Buffer.from(finalImageBase64, 'base64');
                const imgMeta = await sharp(imgBuf).metadata();
                const imgW = imgMeta.width || 512;
                const imgH = imgMeta.height || 512;

                // Calculate target dimensions (preserve aspect ratio, cap at MAX)
                const imgAspect = imgW / imgH;
                const round64 = (n: number) => Math.round(n / 64) * 64;
                let targetW: number = 512, targetH: number = 512;
                if (imgW >= imgH) {
                    targetW = Math.min(imgW, MAX_INPAINT_PX);
                    targetH = round64(targetW / imgAspect);
                } else {
                    targetH = Math.min(imgH, MAX_INPAINT_PX);
                    targetW = round64(targetH * imgAspect);
                }

                // Resize image to target dimensions
                const resizedImg = await sharp(imgBuf)
                    .resize(targetW, targetH, { fit: 'fill' })
                    .png()
                    .toBuffer();
                finalImageBase64 = resizedImg.toString('base64');

                // Generate automatic mask if needed (Solution A)
                let finalMaskRaw: string = '';
                if (isPureImg2Img && editAnalysis.region !== 'full') {
                    finalMaskRaw = await generateAutoMask(finalImageBase64, editAnalysis.maskBox);
                } else if (maskBase64) {
                    finalMaskRaw = maskBase64.replace(/^data:image\/\w+;base64,/, '');
                }

                if (finalMaskRaw) {
                    // Resize mask to exact same dimensions
                    const maskBuf = Buffer.from(finalMaskRaw, 'base64');
                    const resizedMask = await sharp(maskBuf)
                        .resize(targetW, targetH, { fit: 'fill' })
                        .png()
                        .toBuffer();

                    novitaRequest.width = targetW;
                    novitaRequest.height = targetH;
                    novitaRequest.image_base64 = finalImageBase64;
                    novitaRequest.mask_image_base64 = resizedMask.toString('base64');
                    console.log(`Inpaint resize: original ${imgW}x${imgH} → API ${targetW}x${targetH} (Auto: ${isPureImg2Img})`);
                } else {
                    novitaRequest.image_base64 = finalImageBase64;
                }
            } else if (reposeMode) {
                // ═══ Change Pose: OpenPose ControlNet ═══
                const repBuf = Buffer.from(finalImageBase64, 'base64');
                const repResized = await sharp(repBuf)
                    .resize(768, 768, { fit: 'inside', withoutEnlargement: true })
                    .jpeg({ quality: 85 })
                    .toBuffer();
                novitaRequest.image_base64 = repResized.toString('base64');
                console.log('Change Pose: image resized to 768px');
            } else {
                novitaRequest.image_base64 = finalImageBase64;
            }

            if (inpaintMode) {
                // ═══ Inpaint Optimization for Near-Perfect Clothing Removal ═══
                novitaRequest.strength = 1.0;
                novitaRequest.guidance_scale = 12;
                novitaRequest.steps = 50;
                novitaRequest.mask_blur = 8;
                novitaRequest.inpaint_full_res = 1;
                novitaRequest.inpaint_full_res_padding = 48;
                novitaRequest.sampler_name = 'Euler a';
                novitaRequest.negative_prompt = enforceLimit(
                    `${INPAINT_NEGATIVE_PROMPT}${tagNegativeFragment ? ', ' + tagNegativeFragment : ''}, (censor, mosaic, bar:1.5)`
                );
                novitaRequest.prompt = enforceLimit(
                    `${INPAINT_POSITIVE_MODIFIERS}, (completely naked:1.8), (nude:1.8), (detailed genitalia:1.6), (pussy:1.6), (bare skin:1.5), (no clothing:1.6), ${enhancedPrompt}`
                );
            } else if (reposeMode) {
                // ═══ Change Pose: OpenPose ControlNet ═══
                // strength低め = 元画像の顔・体型を保持
                novitaRequest.strength = 0.55;
                novitaRequest.guidance_scale = 7;
                novitaRequest.steps = 30;
                novitaRequest.sampler_name = 'DPM++ 2M Karras';
                novitaRequest.controlnet_units = [
                    {
                        model_name: 'control_v11p_sd15_openpose',
                        image_base64: novitaRequest.image_base64,
                        strength: 0.85,
                        preprocessor: 'openpose',
                        guidance_start: 0.0,
                        guidance_end: 1.0,
                    }
                ];
                console.log('Change Pose: OpenPose ControlNet applied (strength=0.55)');
            } else if (isPureImg2Img) {
                if (editAnalysis.region !== 'full') {
                    // ═══ Solution A: Targeted Auto-Inpaint parameters ═══
                    novitaRequest.strength = 0.85;
                    novitaRequest.guidance_scale = 8;
                    novitaRequest.steps = 35;
                    novitaRequest.mask_blur = 8;
                    novitaRequest.inpaint_full_res = 1;
                    novitaRequest.sampler_name = 'Euler a';
                    novitaRequest.prompt = enforceLimit(
                        `${combinedPrompt}, natural skin texture, realistic skin, anatomically correct`
                    );
                    console.log(`Solution A: Applied targeted params for ${editAnalysis.region}`);
                } else {
                    // ═══ Global img2img ═══
                    novitaRequest.strength = 0.25;
                    novitaRequest.steps = 25;
                    novitaRequest.guidance_scale = 4;
                    console.log('Solution A: Global img2img (Strength: 0.25)');
                }
            }
        } else {
            // txt2img: boost params for couple/position scenes
            if (isCoupleScene) {
                novitaRequest.steps = isXL ? 38 : Math.max(quality.steps, 35);
                novitaRequest.guidance_scale = isXL ? 6.5 : Math.max(quality.guidance, 8);
                console.log('Couple scene: boosted steps=' + novitaRequest.steps + ' guidance=' + novitaRequest.guidance_scale);
            }
        }

        const novitaBody = {
            extra: {
                response_image_type: 'png',
                enable_nsfw_detection: false,
            },
            request: novitaRequest,
        };

        // Submit task
        console.log('=== Novita API Request Debug ===');
        console.log('Endpoint:', endpoint);
        console.log('Model:', novitaModelName);
        console.log('Dimensions:', `${width}x${height}`);
        console.log('Prompt:', (novitaRequest.prompt as string)?.slice(0, 300));
        console.log('Negative:', (novitaRequest.negative_prompt as string)?.slice(0, 200));
        console.log('HiRes Fix:', novitaRequest.hires_fix ? JSON.stringify(novitaRequest.hires_fix) : 'disabled');
        console.log('Steps:', novitaRequest.steps, 'Guidance:', novitaRequest.guidance_scale);
        console.log('================================');

        console.log('Sending request to Novita...');
        const submitRes = await fetch(endpoint, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${NOVITA_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(novitaBody),
        });
        console.log('Novita request sent. Status:', submitRes.status);

        if (!submitRes.ok) {
            const errText = await submitRes.text();
            console.error('Novita submit error:', submitRes.status, errText);
            return NextResponse.json(
                { error: `Novita API error: ${submitRes.status} — ${errText.slice(0, 500)}` },
                { status: 502 }
            );
        }

        // --- Defensive check for HTML response (SDXL/Novita stability) ---
        const contentType = submitRes.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            const errText = await submitRes.text();
            console.error('Novita returned non-JSON:', submitRes.status, errText.slice(0, 500));
            return NextResponse.json(
                { error: `Novita API error (${submitRes.status}). The model may be temporarily unavailable.` },
                { status: 502 }
            );
        }

        const submitData = await submitRes.json();
        console.log('Novita submit response received. Task ID:', submitData?.task_id);
        const taskId = submitData?.task_id;

        if (!taskId) {
            return NextResponse.json(
                { error: 'No task_id returned from Novita' },
                { status: 502 }
            );
        }

        // ── Store task metadata for status endpoint ──
        taskMetadataStore.set(taskId, {
            selectedFaceImageUrl: selectedFaceImageUrl || undefined,
            createdAt: Date.now(),
        });
        cleanupTaskMetadata();

        // Run cleanup asynchronously
        cleanupOldFiles().catch(console.error);

        // Return taskId immediately (no polling — client will poll /api/generate/status)
        console.log(`Task submitted: ${taskId}, returning immediately`);
        return NextResponse.json({
            taskId,
            status: 'PENDING',
        });
    } catch (err) {
        console.error('Generate API error:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
