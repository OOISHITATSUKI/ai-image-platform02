import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import { saveGuestImage } from "@/lib/db/guest_images";
import { saveGuestGeneration } from "@/lib/db/guest_generations";

const DEMO_STATS_FILE = path.join(process.cwd(), "data", "demo_stats.json");
const IMAGES_DIR = path.join(process.cwd(), "data", "images");

// Ensure images directory exists
try { fs.mkdirSync(IMAGES_DIR, { recursive: true }); } catch {}

function recordDemoEvent(event: string, ip: string, extra?: Record<string, unknown>) {
    try {
        const stats = fs.existsSync(DEMO_STATS_FILE)
            ? JSON.parse(fs.readFileSync(DEMO_STATS_FILE, "utf8"))
            : [];
        stats.push({ event, ip, createdAt: Date.now(), ...extra });
        fs.writeFileSync(DEMO_STATS_FILE, JSON.stringify(stats));
    } catch {}
}

const NOVITA_API_KEY = process.env.NOVITA_API_KEY || "";
const NOVITA_BASE = "https://api.novita.ai/v3/async";
const NOVITA_BASE_SYNC = "https://api.novita.ai/v3";

// ── Rate limiting: 75-second cooldown per IP ──
const lastGenerationTime = new Map<string, number>();
const COOLDOWN_MS = 45 * 1000;

function checkCooldown(ip: string): { allowed: boolean; remainingSeconds: number } {
    const now = Date.now();
    const lastTime = lastGenerationTime.get(ip);
    if (!lastTime) return { allowed: true, remainingSeconds: 0 };
    const elapsed = now - lastTime;
    if (elapsed >= COOLDOWN_MS) return { allowed: true, remainingSeconds: 0 };
    return { allowed: false, remainingSeconds: Math.ceil((COOLDOWN_MS - elapsed) / 1000) };
}

// ── Polling for async tasks ──
async function pollTask(taskId: string): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
    for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const res = await fetch(`${NOVITA_BASE}/task-result?task_id=${taskId}`, {
            headers: { Authorization: `Bearer ${NOVITA_API_KEY}` },
        });
        if (!res.ok) continue;
        const data = await res.json();
        const status = data?.task?.status;
        if (status === "TASK_STATUS_SUCCEED") return { success: true, imageUrl: data.images?.[0]?.image_url };
        if (status === "TASK_STATUS_FAILED") return { success: false, error: data?.task?.reason || "Generation failed" };
    }
    return { success: false, error: "Timed out" };
}

// ── Watermark: burn "imagenude.com" diagonally across the image ──
async function addWatermark(imageBuffer: Buffer): Promise<Buffer> {
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 512;
    const height = metadata.height || 768;

    const fontSize = Math.max(Math.floor(width / 10), 28);
    const lineHeight = fontSize * 1.2;

    // Create SVG watermark overlay with repeated diagonal text
    const rows: string[] = [];
    const text = "imagenude.com";
    const textWidth = text.length * fontSize * 0.55;
    const gap = textWidth * 0.6;

    // Cover enough area for rotation
    const expandedW = width * 3;
    const expandedH = height * 3;

    for (let y = -expandedH; y < expandedH * 2; y += lineHeight * 3) {
        for (let x = -expandedW; x < expandedW * 2; x += textWidth + gap) {
            rows.push(
                `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${fontSize}" fill="rgba(255,255,255,0.12)" font-weight="bold">${text}</text>`
            );
        }
    }

    const svgOverlay = Buffer.from(`
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <g transform="rotate(-30, ${width / 2}, ${height / 2})">
                ${rows.join("\n")}
            </g>
        </svg>
    `);

    return sharp(imageBuffer)
        .composite([{ input: svgOverlay, top: 0, left: 0 }])
        .jpeg({ quality: 85 })
        .toBuffer();
}

// ── Build prompt from tag settings ──
function buildGuestPrompt(prompt: string, tagSettings?: Record<string, unknown>, nudeMode: boolean = true): { fullPrompt: string; negPrompt: string } {
    const baseParts: string[] = [];

    if (tagSettings) {
        const ethMap: Record<string, string> = {
            asian: "asian woman, east asian face",
            european: "caucasian woman, european face",
            american: "american woman",
            southeast_asian: "southeast asian woman",
            latina: "latina woman",
            african: "african woman",
        };
        if (tagSettings.ethnicity && ethMap[tagSettings.ethnicity as string]) {
            baseParts.push(ethMap[tagSettings.ethnicity as string]);
        }

        const sitMap: Record<string, string> = {
            bedroom: "in a bedroom", shower: "in a shower", pool: "by the pool",
            beach: "on the beach", office: "in an office", gym: "in a gym",
            onsen: "in an onsen", outdoor: "outdoors", studio: "in a studio",
        };
        if (tagSettings.situation && sitMap[tagSettings.situation as string]) {
            baseParts.push(sitMap[tagSettings.situation as string]);
        }

        if (typeof tagSettings.breastSize === "number") {
            const bs = tagSettings.breastSize as number;
            if (bs < 25) baseParts.push("small breasts");
            else if (bs < 50) baseParts.push("medium breasts");
            else if (bs < 75) baseParts.push("large breasts");
            else baseParts.push("huge breasts");
        }
    }

    if (!baseParts.some(p => p.includes("woman"))) {
        baseParts.unshift("beautiful woman");
    }

    const userPart = prompt ? `, ${prompt}` : "";

    if (nudeMode) {
        // NSFW mode
        const fullPrompt = `${baseParts.join(", ")}, (nsfw:1.4), completely nude, naked, bare skin, photorealistic, best quality, masterpiece, 8k${userPart}`;
        const negPrompt = "worst quality, low quality, blurry, deformed, disfigured, bad anatomy, extra limbs, clothing, dressed, watermark, text, logo";
        return { fullPrompt, negPrompt };
    } else {
        // SFW mode — no nude/nsfw tags, add clothing, block explicit in negative
        const fullPrompt = `${baseParts.join(", ")}, wearing elegant clothing, photorealistic, best quality, masterpiece, 8k${userPart}`;
        const negPrompt = "worst quality, low quality, blurry, deformed, disfigured, bad anatomy, extra limbs, nsfw, nude, naked, nipples, genitalia, topless, bare breasts, explicit, sexual, watermark, text, logo";
        return { fullPrompt, negPrompt };
    }
}

export async function POST(request: NextRequest) {
    if (!NOVITA_API_KEY) return NextResponse.json({ error: "API not configured" }, { status: 500 });

    try {
        const body = await request.json();
        const {
            prompt = "",
            generationType = "txt2img",
            tagSettings,
            imageBase64,
            maskBase64,
            faceSwapMode,
            inpaintMode,
            additionalImages,
            locale = "en",
            nudeMode = true,
            qaData,
        } = body;

        const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

        // ── Rate limit check: 75-second cooldown ──
        const cooldownCheck = checkCooldown(ip);
        if (!cooldownCheck.allowed) {
            recordDemoEvent("rate_limited", ip);
            return NextResponse.json(
                {
                    error: `Please wait ${cooldownCheck.remainingSeconds} seconds before generating again.`,
                    remainingSeconds: cooldownCheck.remainingSeconds,
                },
                { status: 429 }
            );
        }

        const guestId = ip;
        const imageId = uuidv4();

        // ── Determine generation type and build request ──
        let result: { success: boolean; imageUrl?: string; error?: string };

        if (generationType === "txt2img" || (!imageBase64 && !faceSwapMode && !inpaintMode)) {
            // Text-to-image generation
            const { fullPrompt, negPrompt } = buildGuestPrompt(prompt, tagSettings, nudeMode);

            const novitaBody = {
                extra: { response_image_type: "jpeg", enable_nsfw_detection: false, nsfw_detection_level: 0 },
                request: {
                    model_name: "leosamsHelloworldXL_helloworldXL70_485879.safetensors",
                    prompt: fullPrompt,
                    negative_prompt: negPrompt,
                    width: 512, height: 768,
                    image_num: 1, steps: 25, seed: -1, clip_skip: 2,
                    sampler_name: "DPM++ 2M Karras", guidance_scale: 7,
                },
            };

            console.log(`[Guest txt2img] IP=${ip} type=${generationType}`);

            const submitRes = await fetch(`${NOVITA_BASE}/txt2img`, {
                method: "POST",
                headers: { Authorization: `Bearer ${NOVITA_API_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify(novitaBody),
            });

            if (!submitRes.ok) {
                const errData = await submitRes.json().catch(() => ({}));
                console.error("[Guest txt2img] Submit error:", errData);
                return NextResponse.json({ error: "Generation failed" }, { status: 502 });
            }

            const submitData = await submitRes.json();
            const taskId = submitData.task_id;
            if (!taskId) return NextResponse.json({ error: "No task ID" }, { status: 502 });

            result = await pollTask(taskId);
        } else if (faceSwapMode && imageBase64 && additionalImages?.length > 0) {
            // Face swap - use Novita sync merge-face API (same as authenticated route)
            console.log(`[Guest face_swap] IP=${ip}`);

            // Resize images to stay within Novita's 2048px limit
            const faceRaw = additionalImages[0].replace(/^data:image\/\w+;base64,/, '');
            const targetRaw = imageBase64.replace(/^data:image\/\w+;base64,/, '');

            const resizeIfNeeded = async (b64: string): Promise<string> => {
                const buf = Buffer.from(b64, 'base64');
                const meta = await sharp(buf).metadata();
                const w = meta.width ?? 0;
                const h = meta.height ?? 0;
                if (w <= 2048 && h <= 2048 && (meta.format === 'jpeg' || meta.format === 'png')) return b64;
                const resized = await sharp(buf).resize(2048, 2048, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
                console.log(`Resized image from ${w}×${h} → fits within 2048px`);
                return resized.toString('base64');
            };

            const [faceResized, targetResized] = await Promise.all([
                resizeIfNeeded(faceRaw),
                resizeIfNeeded(targetRaw),
            ]);

            const submitRes = await fetch(`${NOVITA_BASE_SYNC}/merge-face`, {
                method: "POST",
                headers: { Authorization: `Bearer ${NOVITA_API_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    face_image_file: faceResized,
                    image_file: targetResized,
                    response_image_type: "jpeg",
                }),
            });

            if (!submitRes.ok) {
                const errText = await submitRes.text();
                console.error("[Guest face_swap] Merge-face error:", submitRes.status, errText);
                const msg = (submitRes.status === 500 || errText.includes('"code":2'))
                    ? "Face not detected. Please use a clear, front-facing photo."
                    : "Face swap failed";
                return NextResponse.json({ error: msg }, { status: 502 });
            }

            const mergeData = await submitRes.json();
            if (!mergeData.image_file) {
                return NextResponse.json({ error: "Face swap returned no image" }, { status: 502 });
            }

            // merge-face returns base64 directly, convert to a data URL for unified handling
            result = { success: true, imageUrl: `data:image/jpeg;base64,${mergeData.image_file}` };
        } else if (inpaintMode && imageBase64 && maskBase64) {
            // Inpaint mode - use dedicated inpainting model and endpoint (same as authenticated route)
            console.log(`[Guest inpaint] IP=${ip}`);

            const inpaintPrompt = prompt || "(remove all clothes, completely nude, bare breasts, uncensored:1.5), detailed skin";
            const inpaintNeg = "illustration, 3d render, cartoon, anime, sketch, painting, worst quality, low quality, blurry, (clothing:1.4), (dressed:1.4), (fabric:1.3), (censor, mosaic, bar:1.5), watermark, text";

            // Resize image and mask to matching dimensions (capped at 1024px)
            const MAX_INPAINT_PX = 1024;
            const imgRaw = imageBase64.replace(/^data:image\/\w+;base64,/, '');
            const maskRaw = maskBase64.replace(/^data:image\/\w+;base64,/, '');

            const imgBuf = Buffer.from(imgRaw, 'base64');
            const imgMeta = await sharp(imgBuf).metadata();
            const imgW = imgMeta.width || 512;
            const imgH = imgMeta.height || 512;

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

            const resizedImg = await sharp(imgBuf)
                .resize(targetW, targetH, { fit: 'fill' })
                .png()
                .toBuffer();
            const resizedMask = await sharp(Buffer.from(maskRaw, 'base64'))
                .resize(targetW, targetH, { fit: 'fill' })
                .png()
                .toBuffer();

            console.log(`[Guest inpaint] Resize: ${imgW}x${imgH} → ${targetW}x${targetH}`);

            const submitRes = await fetch(`${NOVITA_BASE}/inpainting`, {
                method: "POST",
                headers: { Authorization: `Bearer ${NOVITA_API_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    extra: { response_image_type: "jpeg", enable_nsfw_detection: false, nsfw_detection_level: 0 },
                    request: {
                        model_name: "realisticVisionV51_v51VAE-inpainting_94324.safetensors",
                        prompt: inpaintPrompt,
                        negative_prompt: inpaintNeg,
                        image_base64: resizedImg.toString('base64'),
                        mask_image_base64: resizedMask.toString('base64'),
                        width: targetW, height: targetH,
                        image_num: 1, steps: 50, seed: -1,
                        sampler_name: "Euler a",
                        guidance_scale: 12,
                        strength: 1.0,
                        mask_blur: 8,
                        inpaint_full_res: 1,
                        inpaint_full_res_padding: 48,
                        loras: [{ model_name: "add_detail_44319", strength: 0.7 }],
                    },
                }),
            });

            if (!submitRes.ok) {
                const errText = await submitRes.text().catch(() => '');
                console.error("[Guest inpaint] Submit error:", submitRes.status, errText);
                return NextResponse.json({ error: "Inpaint failed" }, { status: 502 });
            }

            const submitData = await submitRes.json();
            const taskId = submitData.task_id;
            if (!taskId) return NextResponse.json({ error: "No task ID" }, { status: 502 });

            result = await pollTask(taskId);
        } else {
            return NextResponse.json({ error: "Invalid generation parameters" }, { status: 400 });
        }

        if (!result.success || !result.imageUrl) {
            return NextResponse.json({ error: result.error || "Generation failed" }, { status: 502 });
        }

        // ── Download the generated image (handle both URLs and data URIs) ──
        let originalBuffer: Buffer;
        if (result.imageUrl.startsWith('data:')) {
            const b64 = result.imageUrl.replace(/^data:image\/\w+;base64,/, '');
            originalBuffer = Buffer.from(b64, 'base64');
        } else {
            const imgRes = await fetch(result.imageUrl);
            if (!imgRes.ok) return NextResponse.json({ error: "Failed to fetch generated image" }, { status: 502 });
            originalBuffer = Buffer.from(await imgRes.arrayBuffer());
        }

        // ── Apply watermark ──
        const watermarkedBuffer = await addWatermark(originalBuffer);

        // ── Save both versions to disk ──
        const originalFilename = `guest_${imageId}_original.jpg`;
        const watermarkedFilename = `guest_${imageId}_watermarked.jpg`;
        fs.writeFileSync(path.join(IMAGES_DIR, originalFilename), originalBuffer);
        fs.writeFileSync(path.join(IMAGES_DIR, watermarkedFilename), watermarkedBuffer);

        // ── Record to local file ──
        const resolvedType = generationType === "txt2img" ? "txt2img" : faceSwapMode ? "faceswap" : inpaintMode ? "inpaint" : "txt2img";
        try {
            saveGuestImage({
                id: imageId,
                guestId,
                generationType: resolvedType,
                prompt: prompt || "",
                originalPath: `/api/images/${originalFilename}`,
                watermarkedPath: `/api/images/${watermarkedFilename}`,
                unlocked: false,
                createdAt: Date.now(),
            });
        } catch (err) {
            console.error("[Guest gen] Record error:", err);
        }

        // ── Record text-only analytics (no image data) ──
        try {
            saveGuestGeneration({
                id: imageId,
                guestId,
                generationType: resolvedType as 'txt2img' | 'faceswap' | 'inpaint',
                prompt: prompt || "",
                tags: tagSettings || {},
                locale: typeof locale === 'string' ? locale.slice(0, 10) : 'en',
                registered: false,
                createdAt: Date.now(),
                ...(qaData ? {
                    qaAnswers: qaData.answers,
                    qaQuestions: qaData.questions,
                    qaCompleted: qaData.completed,
                    qaSkippedCount: qaData.skippedCount,
                } : {}),
            });
        } catch (err) {
            console.error("[Guest gen] Analytics record error:", err);
        }

        // ── Record cooldown ──
        lastGenerationTime.set(ip, Date.now());

        recordDemoEvent("generated", ip, { generationType, imageId });

        // ── Return watermarked image URL ──
        const watermarkedUrl = `/api/images/${watermarkedFilename}`;
        return NextResponse.json({
            success: true,
            image: watermarkedUrl,
            imageId,
        });
    } catch (error) {
        console.error("[Guest generate] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
