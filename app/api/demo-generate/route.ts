import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import { supabaseAdmin } from "@/lib/supabase-server";

const DEMO_STATS_FILE = path.join(process.cwd(), "data", "demo_stats.json");
const GUEST_IMAGES_DIR = path.join(process.cwd(), "public", "outputs", "guest");

// Ensure guest images directory exists
try { fs.mkdirSync(GUEST_IMAGES_DIR, { recursive: true }); } catch {}

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

// ── Rate limiting: 75-second cooldown per IP ──
const lastGenerationTime = new Map<string, number>();
const COOLDOWN_MS = 75 * 1000;

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
function buildGuestPrompt(prompt: string, tagSettings?: Record<string, unknown>): { fullPrompt: string; negPrompt: string } {
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
    const fullPrompt = `${baseParts.join(", ")}, (nsfw:1.4), completely nude, naked, bare skin, photorealistic, best quality, masterpiece, 8k${userPart}`;
    const negPrompt = "worst quality, low quality, blurry, deformed, disfigured, bad anatomy, extra limbs, clothing, dressed, watermark, text, logo";

    return { fullPrompt, negPrompt };
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
            const { fullPrompt, negPrompt } = buildGuestPrompt(prompt, tagSettings);

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
            // Face swap - use Novita face swap API
            console.log(`[Guest face_swap] IP=${ip}`);

            const submitRes = await fetch("https://api.novita.ai/v3/async/img2img-face-fusion", {
                method: "POST",
                headers: { Authorization: `Bearer ${NOVITA_API_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    extra: { response_image_type: "jpeg", enable_nsfw_detection: false },
                    request: {
                        face_image_url: `data:image/jpeg;base64,${additionalImages[0]}`,
                        template_image_url: `data:image/jpeg;base64,${imageBase64}`,
                    },
                }),
            });

            if (!submitRes.ok) {
                console.error("[Guest face_swap] Submit error");
                return NextResponse.json({ error: "Face swap failed" }, { status: 502 });
            }

            const submitData = await submitRes.json();
            const taskId = submitData.task_id;
            if (!taskId) return NextResponse.json({ error: "No task ID" }, { status: 502 });

            result = await pollTask(taskId);
        } else if (inpaintMode && imageBase64 && maskBase64) {
            // Inpaint mode
            console.log(`[Guest inpaint] IP=${ip}`);

            const inpaintPrompt = prompt || "nude, naked, bare skin, photorealistic, natural body";
            const inpaintNeg = "clothing, dressed, fabric, watermark, text, worst quality, low quality";

            const submitRes = await fetch(`${NOVITA_BASE}/img2img`, {
                method: "POST",
                headers: { Authorization: `Bearer ${NOVITA_API_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    extra: { response_image_type: "jpeg", enable_nsfw_detection: false, nsfw_detection_level: 0 },
                    request: {
                        model_name: "leosamsHelloworldXL_helloworldXL70_485879.safetensors",
                        prompt: inpaintPrompt,
                        negative_prompt: inpaintNeg,
                        init_images: [`data:image/png;base64,${imageBase64}`],
                        mask: `data:image/png;base64,${maskBase64}`,
                        width: 512, height: 768,
                        image_num: 1, steps: 30, seed: -1,
                        sampler_name: "DPM++ 2M Karras", guidance_scale: 7,
                        denoising_strength: 0.75,
                        inpainting_fill: 1,
                        inpaint_full_res: true,
                    },
                }),
            });

            if (!submitRes.ok) {
                console.error("[Guest inpaint] Submit error");
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

        // ── Download the generated image ──
        const imgRes = await fetch(result.imageUrl);
        if (!imgRes.ok) return NextResponse.json({ error: "Failed to fetch generated image" }, { status: 502 });
        const originalBuffer = Buffer.from(await imgRes.arrayBuffer());

        // ── Apply watermark ──
        const watermarkedBuffer = await addWatermark(originalBuffer);

        // ── Save both versions to disk ──
        const originalPath = path.join(GUEST_IMAGES_DIR, `${imageId}_original.jpg`);
        const watermarkedPath = path.join(GUEST_IMAGES_DIR, `${imageId}_watermarked.jpg`);
        fs.writeFileSync(originalPath, originalBuffer);
        fs.writeFileSync(watermarkedPath, watermarkedBuffer);

        // ── Record to database ──
        try {
            await supabaseAdmin.from("guest_generations").insert({
                id: imageId,
                guest_id: guestId,
                generation_type: generationType === "txt2img" ? "txt2img" : faceSwapMode ? "faceswap" : inpaintMode ? "inpaint" : "txt2img",
                prompt: prompt || null,
                original_path: `/outputs/guest/${imageId}_original.jpg`,
                watermarked_path: `/outputs/guest/${imageId}_watermarked.jpg`,
                unlocked: false,
                registered: false,
            });
        } catch (dbErr) {
            console.error("[Guest gen] DB insert error:", dbErr);
            // Don't fail the request if DB insert fails
        }

        // ── Record cooldown ──
        lastGenerationTime.set(ip, Date.now());

        recordDemoEvent("generated", ip, { generationType, imageId });

        // ── Return watermarked image URL ──
        const watermarkedUrl = `/outputs/guest/${imageId}_watermarked.jpg`;
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
