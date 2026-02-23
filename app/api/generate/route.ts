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

// ── Rate Limit Constants ──
const FREE_RATE_LIMIT = 1; // 1 per min
const PAID_RATE_LIMIT = 5; // 5 per min
const WINDOW_MS = 60 * 1000; // 1 minute

// ... (rest of the file until the POST handler) ...


// ── Default Negative Prompt (auto-appended to all generations) ──
const DEFAULT_NEGATIVE_PROMPT =
    '(worst quality:1.4), (low quality:1.4), (illustration, 3d, 2d, painting, cartoons, sketch:1.5), (plastic skin:1.4), (airbrushed:1.4), (synthetic:1.4), lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, jpeg artifacts, signature, watermark, blurry, deformed, disfigured, ugly, (deformed genitalia:1.5), (extra genitalia:1.3), (fused body parts:1.3), (extra limbs:1.3), (missing limbs:1.3), (bad proportions:1.3), (child:1.5), (loli:1.5), (underage:1.5), (baby face:1.3), (doll face:1.3), (uncanny valley:1.3), (cloned face:1.3), (malformed hands:1.4), (extra fingers:1.3), (multiple faces:1.5), (multiple bodies:1.5), (extra breasts:1.5), (three breasts:1.5), (anime:1.5), (cartoon:1.5), (oversaturated:1.3)';

// Extra negative prompt specifically for inpaint clothing removal
const INPAINT_CLOTHING_NEGATIVE =
    '(clothing:1.8), (fabric:1.7), (cloth:1.7), (dressed:1.8), (shirt:1.7), (dress:1.8), (bra:1.8), (underwear:1.8), (panties:1.8), (lingerie:1.7), (bikini:1.8), (swimsuit:1.8), (tank top:1.7), (t-shirt:1.7), (skirt:1.7), (pants:1.7), (shorts:1.7), (leotard:1.7), (bodysuit:1.8), (tight dress:1.8), (knit dress:1.8), (sweater:1.7), (corset:1.7), (stockings:1.6), (socks:1.6), (gloves:1.6), (latex:1.7), (spandex:1.7), (textile:1.6), (fiber:1.6), (texture:1.5), (strap:1.8), (string:1.8), (necklace:1.8), (choker:1.8), (harness:1.8), (jewelry:1.6), (ribbon:1.6), (lace:1.6)';

// ── Claude Prompt Optimization ──
// Use Claude to turn natural language or Japanese into high-quality Stable Diffusion tags.
async function optimizePromptWithClaude(prompt: string, generationType: string, isNsfw: boolean): Promise<string> {
    if (!ANTHROPIC_API_KEY) {
        console.warn('ANTHROPIC_API_KEY not found, using raw prompt');
        return prompt;
    }

    console.log(`Optimizing prompt with Claude: ${prompt}`);

    const systemPrompt = `You are a prompt engineering expert for Stable Diffusion 1.5 photorealistic models.
Convert the user's input into a highly effective comma-separated list of English tags for PHOTOREALISTIC image generation.

CRITICAL RULES:
1. Translate to English if needed (Japanese, etc.)
2. ALWAYS prioritize photorealistic quality tags: RAW photo, DSLR, 85mm lens, natural lighting, film grain, detailed skin texture, skin pores, realistic skin
3. NEVER use anime/illustration/cartoon tags. This is STRICTLY photorealistic generation.
4. For NSFW content, use direct descriptive tags: "nude", "naked", "bare breasts", "exposed skin", etc.
5. For Inpainting requests, focus ONLY on what should appear in the masked area. Keep it concise.
6. Emphasize camera equipment and lighting: "Fujifilm XT4", "85mm portrait", "soft studio lighting", "natural volumetric light", "bokeh"
7. Add extreme skin realism tags: "detailed skin texture", "skin pores", "peach fuzz", "goosebumps", "subtle sweat", "anatomically correct"

Output ONLY the comma-separated list of English tags, nothing else. Keep under 120 tags.`;

    try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-latest',
                max_tokens: 200,
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
        qualityPrefix: '(RAW photo:1.3), (photorealistic:1.4), professional DSLR portrait, high resolution, 8k uhd, dslr, soft lighting, high quality, film grain, Fujifilm XT4, detailed facial features, realistic skin texture, intricate details, ',
    },
};

// Map aspect ratios to pixel dimensions
function getResolutionFromAspectRatio(
    aspectRatio: AspectRatio,
    resolution: string
): { width: number; height: number } {
    // Use appropriate base sizes directly — no HiRes Fix (causes Novita API failures)
    // SD 1.5 optimal range: 512-768, max safe: 1024
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

    // Round to nearest multiple of 64 (required by SD)
    const round64 = (n: number) => Math.round(n / 64) * 64;

    const map: Record<AspectRatio, { width: number; height: number }> = {
        '1:1': { width: baseSize, height: baseSize },
        '4:3': { width: baseSize, height: round64(baseSize * 3 / 4) },
        '3:4': { width: round64(baseSize * 3 / 4), height: baseSize },
        '16:9': { width: baseSize, height: round64(baseSize * 9 / 16) },
        '9:16': { width: round64(baseSize * 9 / 16), height: baseSize },
        '21:9': { width: baseSize, height: round64(baseSize * 9 / 21) },
    };

    return map[aspectRatio] || { width: 512, height: 512 };
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
            const rawImages = data.images || [];

            // Fetch each image URL and convert to Base64 data URI
            const images = await Promise.all(
                rawImages.map(async (img: { image_url: string; image_type: string }) => {
                    try {
                        const imgRes = await fetch(img.image_url);
                        if (!imgRes.ok) {
                            console.error(`Failed to fetch image: ${imgRes.status}`);
                            return { url: img.image_url, type: img.image_type }; // Fallback
                        }
                        const buffer = await imgRes.arrayBuffer();
                        const base64 = Buffer.from(buffer).toString('base64');
                        const mimeType = img.image_type === 'jpeg' ? 'image/jpeg' : 'image/png';
                        return {
                            url: `data:${mimeType};base64,${base64}`,
                            type: img.image_type,
                        };
                    } catch (err) {
                        console.error('Image fetch/convert error:', err);
                        return { url: img.image_url, type: img.image_type }; // Fallback
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
            model_name: 'realisticVisionV60B1_v60B1VAE_190174.safetensors',
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
        console.error('Merge Face API error:', res.status, errText);
        let msg = `Face Swap API error: ${res.status}`;
        if (errText.includes('"code":2') || res.status === 500) {
            msg += " — 顔が検出されなかったか、画像が不適切です。別の画像（正面を向いたはっきりした顔）で試してください。";
        } else {
            msg += ` — ${errText.slice(0, 200)}`;
        }
        throw new Error(msg);
    }

    const data = await res.json();

    if (!data.image_file) {
        throw new Error('No image returned from Face Swap API');
    }

    // ── Post-process: restore face quality via img2img ──
    try {
        const restoredData = await restoreFaceViaImg2Img(data.image_file);
        // If restoredData is a full URL (from task result), return it
        if (restoredData.startsWith('http')) {
            return [{ url: restoredData, type: 'png' }];
        }
        // Otherwise it's the processed/fallback base64 string
        return [{ url: `data:image/png;base64,${restoredData}`, type: 'png' }];
    } catch (restoreErr) {
        console.error('Face restoration error, using raw face swap result:', restoreErr);
        // Fallback: return raw face swap result
        return [{ url: `data:image/jpeg;base64,${data.image_file}`, type: 'jpeg' }];
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
            maskBase64,
            count = 1,
            qualityPreset = 'hd',
            tagSettings,
        } = body;

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
        let tagPromptFragment = '';
        let tagNegativeFragment = '';
        let actionHint = '';          // ← Action/pose hint sent to Claude
        if (tagSettings) {
            const ts = tagSettings as TagSettings;
            const tagResult = buildTagPromptResult(ts);
            tagPromptFragment = tagResult.prompt;
            tagNegativeFragment = tagResult.negativePrompt;

            // Extract action/pose tags to hint Claude about the desired scene type
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

        // ── Claude Optimization Step (user prompt + action context) ──
        const basePrompt = prompt || (inpaintMode ? '(remove all clothes, completely nude, bare breasts, uncensored:1.5), detailed skin' : 'a beautiful image');
        // Pass the action hint to Claude so it can generate matching scene context
        const promptForClaude = actionHint
            ? `${basePrompt}\n[Required Action/Pose: ${actionHint}]`
            : basePrompt;
        const optimizedPrompt = await optimizePromptWithClaude(
            promptForClaude,
            generationType,
            model?.nsfw ?? true
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
        // image1 (imageBase64) = body/target, image2 (additionalImages[0]) = face source
        if (faceSwapMode && imageBase64 && additionalImages?.length > 0) {
            try {
                // Correct order: face=additionalImages[0], target body=imageBase64
                const images = await handleMergeFace(additionalImages[0], imageBase64);
                return NextResponse.json({ images });
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Face swap failed';
                return NextResponse.json({ error: errorMsg }, { status: 502 });
            }
        }

        // ── Standard SD branch ──
        // Force Ultra quality for all requests to ensure maximum output
        const quality = QUALITY_CONFIGS.ultra;

        let novitaModelName = model?.novitaModelName || 'sd_xl_base_1.0.safetensors';

        // ── Inpaint Model Mapping ──
        // Dedicated Inpainting API (/v3/async/inpainting) requires specialized models.
        // If we are in inpaintMode, we switch to a proven inpainting model.
        if (inpaintMode) {
            novitaModelName = 'realisticVisionV51_v51VAE-inpainting_94324.safetensors';
            console.log(`Inpaint detected. Swapping model to: ${novitaModelName}`);
        }

        const { width, height } = getResolutionFromAspectRatio(
            aspectRatio as AspectRatio,
            resolution
        );

        // Decide endpoint
        // Inpainting is a specialized img2img request
        const isImg2Img = (generationType === 'img2img' || inpaintMode) && !!imageBase64;

        // Use dedicated inpainting endpoint if mask is provided
        const endpoint = (inpaintMode && maskBase64)
            ? `${NOVITA_BASE}/inpainting`
            : isImg2Img
                ? `${NOVITA_BASE}/img2img`
                : `${NOVITA_BASE}/txt2img`;

        // ── Negative Prompt: combine default + tag-specific negatives ──
        let finalNegative = quality.negativePrompt;
        if (tagNegativeFragment) {
            finalNegative = `${finalNegative}, ${tagNegativeFragment}`;
        }
        // Remove "multiple faces/bodies" from negative if user wants 2+ people
        if (tagSettings && (tagSettings as TagSettings).peopleCount && (tagSettings as TagSettings).peopleCount !== '1') {
            finalNegative = finalNegative
                .replace(/\(multiple faces:[\d.]+\),?\s*/g, '')
                .replace(/\(multiple bodies:[\d.]+\),?\s*/g, '');
        }

        // ── Prompt Assembly ──
        const promptPrefix = inpaintMode ? '' : quality.qualityPrefix;
        const enhancedPrompt = promptPrefix + combinedPrompt;

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
            prompt: enforceLimit(enhancedPrompt),
            negative_prompt: enforceLimit(finalNegative),
            width,
            height,
            image_num: Math.min(count, 4),
            steps: quality.steps,
            seed: -1,
            clip_skip: 2,
            sampler_name: quality.sampler,
            guidance_scale: quality.guidance,
            ...(model?.nsfw ? {
                prompt: enforceLimit(inpaintMode
                    ? `(nsfw:1.5), (completely nude:1.5), (uncensored:1.4), bare skin, realistic skin texture, no clothes, undressed, ${enhancedPrompt}`
                    : `(nsfw:1.3), high quality, detailed skin, ${enhancedPrompt}`),
                negative_prompt: enforceLimit(inpaintMode
                    ? `(clothes, clothing, fabric, bra, underwear, bikini, swimsuit, censor, mosaic, bar:1.5), ${finalNegative}`
                    : finalNegative)
            } : {}),
            // ONLY add LoRAs if the model is compatible (mostly SD1.5 for this specific LoRA)
            loras: novitaModelName.toLowerCase().includes('xl') ? [] : [
                {
                    model_name: 'add_detail_44319',
                    strength: 0.7,
                },
            ],
        };

        // No HiRes Fix — it causes "failed to exec task" errors on Novita async API
        if (isImg2Img) {
            // For inpainting: both image + mask MUST have identical resolution.
            // Resize both to the same dimensions using the image's natural size
            // (capped at 1024 on longest side to be safe with Novita).
            let finalImageBase64 = imageBase64!.replace(/^data:image\/\w+;base64,/, '');

            if (inpaintMode && maskBase64) {
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

                // Resize mask to exact same dimensions
                const maskRaw = maskBase64.replace(/^data:image\/\w+;base64,/, '');
                const maskBuf = Buffer.from(maskRaw, 'base64');
                const resizedMask = await sharp(maskBuf)
                    .resize(targetW, targetH, { fit: 'fill' })
                    .png()
                    .toBuffer();

                novitaRequest.width = targetW;
                novitaRequest.height = targetH;
                novitaRequest.image_base64 = finalImageBase64;
                novitaRequest.mask_image_base64 = resizedMask.toString('base64');

                console.log(`Inpaint resize: original ${imgW}x${imgH} → API ${targetW}x${targetH}`);
            } else {
                novitaRequest.image_base64 = finalImageBase64;
            }

            if (inpaintMode) {
                // strength=1.0: completely ignores original pixels in masked region
                // (critical for full-body clothing where AI otherwise sees clothing texture)
                novitaRequest.strength = 1.0;
                // Extremely high guidance forces the prompt instead of input image
                novitaRequest.guidance_scale = 12;
                novitaRequest.steps = 50;
                // Mask blur: softens mask edges for natural skin-to-background blending
                novitaRequest.mask_blur = 4;
                // Comprehensive clothing-removal negative prompt
                novitaRequest.negative_prompt = enforceLimit(`${finalNegative}, ${INPAINT_CLOTHING_NEGATIVE}, (huge nipples:1.6), (giant areola:1.6), (oversized nipples:1.6), (exaggerated proportions:1.5)`);
                // Transformation-first prompt: lead with undress directive, then skin descriptors
                novitaRequest.prompt = enforceLimit(
                    `remove clothes, undress, (no straps:1.5), (no strings:1.5), (no collar:1.5), (nsfw:1.5), (completely nude:1.5), (naked body:1.5), (bare skin:1.5), (exposed chest:1.5), (bare breasts:1.5), (bare torso:1.5), (natural size nipples:1.4), (small areola:1.4), (proportional anatomy:1.4), natural skin texture, realistic skin, skin pores, smooth skin, anatomically correct body, ${enhancedPrompt}`
                );
            } else {
                novitaRequest.strength = 0.7;
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
                { error: `Novita API error: ${submitRes.status} — ${errText.slice(0, 500)}` },
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
