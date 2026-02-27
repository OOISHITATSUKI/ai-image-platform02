import { NextRequest, NextResponse } from 'next/server';
import { AVAILABLE_MODELS } from '@/lib/types';
import type { AspectRatio, QualityPreset, TagSettings } from '@/lib/types';
import { buildTagPromptResult } from '@/lib/tagPromptBuilder';
import { validatePrompt } from '@/lib/security';
import { processViolation, checkBanStatus } from '@/lib/auditLogger';
import { rateLimit } from '@/lib/rateLimit';
import { findUserById, verifyToken } from '@/lib/auth';
import sharp from 'sharp';

const NOVITA_API_KEY = process.env.NOVITA_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const NOVITA_BASE = 'https://api.novita.ai/v3/async';
const NOVITA_BASE_SYNC = 'https://api.novita.ai/v3';
import fs from 'fs';
import path from 'path';

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
                fs.unlinkSync(filePath);
                console.log(`Deleted expired image: ${file}`);
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
    'illustration, 3d render, cartoon, anime, ' +
    'ugly face, asymmetrical face, deformed face, disfigured, ' +
    'crooked nose, crooked mouth, bad teeth, ' +
    'plastic skin, airbrushed, lowres, bad anatomy, ' +
    'bad hands, text, watermark, blurry, deformed, ' +
    'child, underage, extra fingers, missing fingers';

// ── Claude Prompt Optimization ──
// Use Claude to turn natural language or Japanese into high-quality Stable Diffusion tags.
async function optimizePromptWithClaude(prompt: string, generationType: string, isNsfw: boolean, isXL: boolean): Promise<string> {
    if (!ANTHROPIC_API_KEY) {
        console.warn('ANTHROPIC_API_KEY not found, using raw prompt');
        return prompt;
    }

    console.log(`Optimizing prompt with Claude (isXL: ${isXL}): ${prompt}`);

    const sd15SystemPrompt = `You are a prompt engineering expert for Stable Diffusion 1.5 photorealistic models.
Convert the user's input into a highly effective comma-separated list of English tags for PHOTOREALISTIC image generation.

CRITICAL RULES:
1. Translate to English if needed (Japanese, etc.)
2. ALWAYS prioritize photorealistic quality tags: RAW photo, DSLR, 85mm lens, natural lighting, film grain, detailed skin texture, skin pores, realistic skin
3. NEVER use anime/illustration/cartoon tags. This is STRICTLY photorealistic generation.
4. For NSFW content, be EXPLICIT and direct. Use specific anatomical terms: (completely nude:1.5), (bare breasts:1.4), (detailed pussy:1.4), (spreading legs:1.3), (exposed clitoris:1.3), (large nipples:1.3), (penetration:1.4), (cum:1.3).
5. For sexual positions, describe the action clearly: cowgirl, missionary, doggy style, standing sex, facial, oral sex (fellatio/cunnilingus).
6. Emphasize camera equipment and lighting: "Fujifilm XT4", "85mm portrait", "soft studio lighting", "natural volumetric light", "bokeh"
7. Add extreme skin realism tags: "detailed skin texture", "skin pores", "peach fuzz", "goosebumps", "subtle sweat", "anatomically correct"

Output ONLY the comma-separated list of English tags, nothing else. Keep under 120 tags.`;

    const sdxlSystemPrompt = `You are a prompt expert for SDXL photorealistic models.
Convert input into natural English descriptions (NOT comma-separated tags).
SDXL responds best to descriptive sentences, not weighted tags.
Focus on: lighting description, camera angle, atmosphere, skin detail.
For NSFW content, be explicitly descriptive about the scene, body parts, and sexual actions to ensure high explicitness.

COMPOSITION RULES (CRITICAL):
- If user mentions 全身/full body → ALWAYS start with: "full body shot, head to toe, wide angle"
- If user mentions 上半身/waist up → start with: "upper body, waist up"  
- If user mentions 顔/face → start with: "face closeup, portrait"
- If no composition specified → default to "upper body shot, waist up, from chest up"
- NEVER use the word "portrait" unless user explicitly asks for face/顔
- NEVER add "detailed face", "detailed eyes" tags — these cause extreme face zoom
- NEVER let quality/detail tags override composition. Composition tags MUST come first in the output string.

FACE QUALITY (ALWAYS INCLUDE):
- Always add: "beautiful face, symmetrical face, detailed eyes, natural makeup"
- For Asian women: "korean beauty, japanese idol, ulzzang"
- NEVER use: "ugly", "deformed face" in prompt (negative prompt handles this)

Output format: composition tags FIRST, then subject, then scene, then quality.
Example: "full body shot, head to toe, wide angle, Japanese woman in her 20s, wearing bikini, playful pose, beach, summer sunlight"

Do NOT use (tag:weight) syntax. Output natural language only.`;

    const img2imgSystemPrompt = `You are a prompt expert for Stable Diffusion img2img.
The user has uploaded a reference image and wants to MODIFY it, not create a new one.

CRITICAL RULES:
1. Translate to English if needed
2. Focus ONLY on what the user wants to CHANGE about the image
3. Do NOT add descriptive tags about the person's appearance (face, ethnicity, body type) — the reference image already provides this
4. Do NOT add camera/lighting/quality tags — these override the original image's look
5. Keep the output SHORT and focused: only the modification tags
6. If user says "巨乳にしてください" → output: "(large breasts:1.3), (bigger breasts:1.2)"
   NOT: "beautiful woman, large breasts, photorealistic, RAW photo..."

Output ONLY the modification tags, nothing else. Keep under 30 tags.`;

    const inpaintSystemPrompt = `You are a prompt expert for Stable Diffusion inpainting (Nude Mode).
Focus EXCLUSIVELY on what should appear in the painted (masked) area.

CRITICAL RULES:
1. Translate to English if needed
2. For clothing removal: use "(completely naked:1.6), (bare breasts:1.5), (large nipples:1.4), (detailed pussy:1.5), (exposed clitoris:1.4), bare skin, natural skin texture, uncensored, no clothes, undressed"
3. Do NOT describe the whole scene, ONLY the masked part
4. Add realism tags: "detailed skin texture", "skin pores", "peach fuzz"

Output ONLY the tags for the masked area.`;

    let systemPrompt = isXL ? sdxlSystemPrompt : sd15SystemPrompt;
    if (generationType === 'img2img') {
        systemPrompt = img2imgSystemPrompt;
    } else if (generationType === 'img_edit') {
        systemPrompt = inpaintSystemPrompt;
    }

    try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20240620',
                max_tokens: 1000,
                system: systemPrompt,
                messages: [
                    { role: 'user', content: `Generation Type: ${generationType}, NSFW Mode: ${isNsfw}\nUser Input: ${prompt}` }
                ],
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            console.error('Claude API Error:', res.status, err);
            return prompt;
        }

        const data = await res.json();
        const optimized = data.content[0].text.trim();
        console.log(`Optimized prompt: ${optimized}`);
        return optimized;
    } catch (err) {
        console.error('Claude optimization failed:', err);
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
            baseSize = 1024; // Maximum safe for SD 1.5
            break;
        case '4K':
            baseSize = 1024; // Capped at 1024 for stability
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
async function pollTaskResult(taskId: string): Promise<{
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
async function handleFaceSwapFinal(
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

// ── Solution A: Auto-inpainting region analysis via Claude ──
async function analyzeEditRegion(prompt: string): Promise<{
    region: 'breasts' | 'body' | 'face' | 'clothing' | 'background' | 'full';
    maskBox: { x: number; y: number; w: number; h: number }; // 0-1 normalized
}> {
    if (!ANTHROPIC_API_KEY) {
        return { region: 'full', maskBox: { x: 0, y: 0, w: 1, h: 1 } };
    }

    try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20240620',
                max_tokens: 200,
                system: `You analyze image editing requests to determine which body region to modify.
Given a user's edit instruction, output ONLY a JSON object:
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
Output ONLY the JSON, nothing else.`,
                messages: [{ role: 'user', content: prompt }],
            }),
        });

        const data = await res.json();
        const text = data.content[0].text.trim();
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
            maskBase64,
            img2imgStrength,
            count = 1,
            qualityPreset = 'hd',
            tagSettings,
            nudeMode = true,
        } = body;

        // BUG-03: Friendly error messages (duplicated from ChatArea but for backend errors)
        const friendlyError = (raw: string): string => {
            if (raw.includes('INVALID_IMAGE_FORMAT')) {
                return '❌ この画像形式には対応していません。JPGまたはPNGを試してください。';
            }
            return raw;
        };

        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

        // ── Extract Auth Token & User ──
        const authHeader = request.headers.get('authorization');
        let userId = 'guest';
        let user: ReturnType<typeof findUserById> = null;
        let decodedEmail = '';

        if (authHeader) {
            const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
            if (token) {
                const decoded = verifyToken(token);
                if (decoded) {
                    userId = decoded.userId;
                    decodedEmail = decoded.email;
                    user = findUserById(userId);
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
            if (generationType !== 'txt2img') {
                return NextResponse.json(
                    { error: 'error_free_credits_feature' },
                    { status: 403 }
                );
            }
        }

        if (!prompt && generationType === 'txt2img') {
            return NextResponse.json(
                { error: 'A prompt is required for text-to-image generation' },
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

        // Look up model
        const model = AVAILABLE_MODELS.find((m) => m.id === modelId);

        // ── Build tag-based prompt fragment ──
        // Force Ultra quality for all requests to ensure maximum output
        const quality = QUALITY_CONFIGS.ultra;

        let tagPromptFragment = '';
        let tagNegativeFragment = '';
        let actionHint = '';          // ← Action/pose hint sent to Claude
        /* 
        if (tagSettings) {
            const ts = tagSettings as TagSettings;
            const tagResult = buildTagPromptResult(ts);
            tagPromptFragment = tagResult.prompt;
            tagNegativeFragment = tagResult.negativePrompt;

            if (ts.fetish && ts.fetish.length > 0) {
                const actionLabels: Record<string, string> = {
                    fellatio: 'blowjob oral sex',
                    cowgirl: 'cowgirl riding sex position',
                    insertion: 'vaginal penetration sex',
                    kiss: 'passionate kissing',
                    missionary: 'missionary sex position lying down',
                    doggy: 'doggy style sex from behind',
                    standing: 'standing sex position',
                    handjob: 'handjob stroking penis',
                    paizuri: 'paizuri titfuck',
                };
                actionHint = ts.fetish.map(f => actionLabels[f] || f).join(', ');
            }

            console.log('Tag prompt fragment:', tagPromptFragment);
            console.log('Action hint:', actionHint);
        }
        */

        // ── Model Selection Logic ──
        // ── Model Selection Logic ──
        let novitaModelName = model?.novitaModelName || 'sd_xl_base_1.0.safetensors';

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
        if (inpaintMode || (isPureImg2Img && editAnalysis.region !== 'full')) {
            novitaModelName = 'realisticVisionV51_v51VAE-inpainting_94324.safetensors';
            console.log(`${inpaintMode ? 'Inpaint' : 'Auto-inpaint (' + editAnalysis.region + ')'} detected. Model: ${novitaModelName}`);
        }

        // Detect SDXL models
        const isXL = novitaModelName.toLowerCase().includes('xl');

        // ── Claude Optimization Step (user prompt + action context) ──
        const basePrompt = prompt || (inpaintMode ? '(remove all clothes, completely nude, bare breasts, uncensored:1.5), detailed skin' : 'a beautiful image');
        // Pass the action hint to Claude so it can generate matching scene context
        const promptForClaude = actionHint
            ? `${basePrompt}\n[Required Action/Pose: ${actionHint}]`
            : basePrompt;
        const optimizedPrompt = await optimizePromptWithClaude(
            promptForClaude,
            generationType,
            nudeMode,
            isXL
        );

        // ── Combine: optimized prompt + all character/quality tag fragment ──
        // Action/pose context was already given to Claude above; no need to front-load raw SD tags.
        let combinedPrompt: string;
        combinedPrompt = tagPromptFragment
            ? `${optimizedPrompt}, ${tagPromptFragment}`
            : optimizedPrompt;

        // ── Novita API hard cap: max 1024 runes. Trim from the END. ──
        function trimPromptToLimit(p: string, limit = 1020): string {
            if (p.length <= limit) return p;
            const segments = p.split(', ');
            while (segments.join(', ').length > limit && segments.length > 1) {
                segments.pop();
            }
            return segments.join(', ');
        }
        combinedPrompt = trimPromptToLimit(combinedPrompt);
        console.log(`Final combined prompt (${combinedPrompt.length} chars):`, combinedPrompt);

        // ── Prompt Prefix Selection ──
        // Skip quality prefixes for img2img to preserve original image characteristics
        const promptPrefix = (inpaintMode || isPureImg2Img || isXL) ? '' : quality.qualityPrefix;
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
        const endpoint = ((inpaintMode && maskBase64) || (isPureImg2Img && editAnalysis.region !== 'full'))
            ? `${NOVITA_BASE}/inpainting`
            : isPureImg2Img
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
                .replace(/\(multiple bodies:[\d.]+\),?\s*/g, '');
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

        // Build request body
        const novitaRequest: Record<string, unknown> = {
            model_name: novitaModelName,
            width,
            height,
            image_num: Math.min(count, 4),
            steps: isXL ? 30 : quality.steps,
            seed: -1,
            clip_skip: isXL ? 1 : 2,
            sampler_name: quality.sampler,
            guidance_scale: isXL ? 6.5 : (isPureImg2Img ? 5 : quality.guidance),
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

        if (nudeMode && !hasClothingInPrompt) {
            // Nude ON + 服装指定なし → ヌード生成
            novitaRequest.prompt = enforceLimit(
                `nsfw, nude, naked, bare skin, ${enhancedPrompt}`
            );
            novitaRequest.negative_prompt = enforceLimit(finalNegative);
        } else if (!nudeMode) {
            // Nude OFF → ヌード禁止（SFW画像）
            novitaRequest.prompt = enforceLimit(enhancedPrompt);
            novitaRequest.negative_prompt = enforceLimit(
                `${finalNegative}, nsfw, nude, naked, nipples, genitalia`
            );
        } else {
            // Nude ON + 服装指定あり → ユーザーの服装指定を優先
            novitaRequest.prompt = enforceLimit(enhancedPrompt);
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
                let targetW: number, targetH: number;
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
                let finalMaskRaw: string;
                if (isPureImg2Img && editAnalysis.region !== 'full') {
                    finalMaskRaw = await generateAutoMask(finalImageBase64, editAnalysis.maskBox);
                } else {
                    finalMaskRaw = maskBase64!.replace(/^data:image\/\w+;base64,/, '');
                }

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

            if (inpaintMode) {
                // ═══ Inpaint Optimization for Near-Perfect Clothing Removal ═══
                novitaRequest.strength = 1.0;
                novitaRequest.guidance_scale = 12;
                novitaRequest.steps = 50;
                novitaRequest.mask_blur = 8;
                novitaRequest.inpaint_full_res = 1;
                novitaRequest.inpaint_full_res_padding = 48;
                novitaRequest.sampler_name = 'Euler a';

                // Mode-specific prompts for inpaint
                novitaRequest.negative_prompt = enforceLimit(
                    `${INPAINT_NEGATIVE_PROMPT}${tagNegativeFragment ? ', ' + tagNegativeFragment : ''}, (censor, mosaic, bar:1.5)`
                );
                novitaRequest.prompt = enforceLimit(
                    `${INPAINT_POSITIVE_MODIFIERS}, (completely naked:1.8), (nude:1.8), (detailed genitalia:1.6), (pussy:1.6), (bare skin:1.5), (no clothing:1.6), ${enhancedPrompt}`
                );
            } else if (isPureImg2Img) {
                if (editAnalysis.region !== 'full') {
                    // ═══ Solution A: Targeted Auto-Inpaint parameters ═══
                    novitaRequest.strength = 0.85;
                    novitaRequest.guidance_scale = 8;
                    novitaRequest.steps = 35;
                    novitaRequest.mask_blur = 8;
                    novitaRequest.inpaint_full_res = 1;
                    novitaRequest.sampler_name = 'Euler a';

                    // Re-optimize prompt for targeted edit region attributes
                    novitaRequest.prompt = enforceLimit(
                        `${combinedPrompt}, natural skin texture, realistic skin, anatomically correct`
                    );
                    console.log(`Solution A: Applied targeted params for ${editAnalysis.region}`);
                } else {
                    // ═══ Global img2img: Very low strength to preserve identity ═══
                    novitaRequest.strength = 0.25;
                    novitaRequest.steps = 25;
                    novitaRequest.guidance_scale = 4;
                    console.log(`Solution A: Global img2img (Strength: 0.25)`);
                }
            }
        } else {
            // txt2img: No specific strength/guidance override needed here beyond base params
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

        console.log(`Starting polling for task: ${taskId}`);
        // Poll for the result
        let result;
        try {
            result = await pollTaskResult(taskId);
        } catch (pollErr) {
            console.error(`Poll task error for ${taskId}:`, pollErr);
            throw pollErr;
        }
        console.log(`Polling finished for task: ${taskId}, success: ${result.success}`);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Generation failed' },
                { status: 500 }
            );
        }

        // Run cleanup asynchronously
        cleanupOldFiles().catch(console.error);

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
