import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DEMO_STATS_FILE = path.join(process.cwd(), "data", "demo_stats.json");

function recordDemoEvent(event: "generated" | "limit_reached", ip: string) {
    try {
        const stats = fs.existsSync(DEMO_STATS_FILE)
            ? JSON.parse(fs.readFileSync(DEMO_STATS_FILE, "utf8"))
            : [];
        stats.push({ event, ip, createdAt: Date.now() });
        fs.writeFileSync(DEMO_STATS_FILE, JSON.stringify(stats));
    } catch {}
}

const NOVITA_API_KEY = process.env.NOVITA_API_KEY || "";
const NOVITA_BASE = "https://api.novita.ai/v3/async";

const demoUsage = new Map<string, { count: number; firstUsed: number }>();
const MAX_DEMO_PER_KEY = 2;
const DEMO_WINDOW_MS = 24 * 60 * 60 * 1000;

function checkDemoLimit(key: string): boolean {
    const now = Date.now();
    const entry = demoUsage.get(key);
    if (!entry) { demoUsage.set(key, { count: 1, firstUsed: now }); return true; }
    if (now - entry.firstUsed > DEMO_WINDOW_MS) { demoUsage.set(key, { count: 1, firstUsed: now }); return true; }
    if (entry.count >= MAX_DEMO_PER_KEY) return false;
    entry.count++;
    return true;
}

async function pollTask(taskId: string): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
    for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const res = await fetch(`${NOVITA_BASE}/task-result?task_id=${taskId}`, { headers: { Authorization: `Bearer ${NOVITA_API_KEY}` } });
        if (!res.ok) continue;
        const data = await res.json();
        const status = data?.task?.status;
        if (status === "TASK_STATUS_SUCCEED") return { success: true, imageUrl: data.images?.[0]?.image_url };
        if (status === "TASK_STATUS_FAILED") return { success: false, error: data?.task?.reason || "Generation failed" };
    }
    return { success: false, error: "Timed out" };
}

export async function POST(request: NextRequest) {
    if (!NOVITA_API_KEY) return NextResponse.json({ error: "API not configured" }, { status: 500 });
    try {
        const body = await request.json();
        const { ethnicity, bustSize, prompt, fingerprintHash } = body;

        const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        const limitKey = fingerprintHash || ip;
        if (!checkDemoLimit(limitKey)) {
            recordDemoEvent("limit_reached", ip);
            return NextResponse.json({ error: "Demo limit reached. Sign up free to continue!", limitReached: true }, { status: 429 });
        }

        const ethnicityTag: Record<string, string> = {
            asian: "asian woman, east asian face",
            european: "caucasian woman, european face",
            middleeastern: "middle eastern woman",
            latina: "latina woman",
            black: "black woman, african american",
        };
        const bustTag: Record<string, string> = {
            small: "small breasts, flat chest",
            medium: "medium breasts",
            large: "large breasts, big boobs",
            huge: "huge breasts, massive boobs",
        };

        const ethTag = ethnicityTag[ethnicity] || "beautiful woman";
        const bTag = bustTag[bustSize] || "medium breasts";
        const userPrompt = prompt ? `, ${prompt}` : "";

        const fullPrompt = `${ethTag}, (nsfw:1.4), completely nude, naked, bare skin, ${bTag}, photorealistic, best quality, masterpiece, 8k${userPrompt}`;
        const negPrompt = "worst quality, low quality, blurry, deformed, disfigured, bad anatomy, extra limbs, clothing, dressed, watermark, text, logo";

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

        console.log(`[Demo txt2img] IP=${ip} ethnicity=${ethnicity} bust=${bustSize}`);

        const submitRes = await fetch(`${NOVITA_BASE}/txt2img`, {
            method: "POST",
            headers: { Authorization: `Bearer ${NOVITA_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify(novitaBody),
        });

        if (!submitRes.ok) {
            const errData = await submitRes.json().catch(() => ({}));
            console.error("[Demo txt2img] Submit error:", errData);
            return NextResponse.json({ error: "Generation failed" }, { status: 502 });
        }

        const submitData = await submitRes.json();
        const taskId = submitData.task_id;
        if (!taskId) return NextResponse.json({ error: "No task ID" }, { status: 502 });

        const result = await pollTask(taskId);
        if (!result.success || !result.imageUrl) return NextResponse.json({ error: result.error || "Generation failed" }, { status: 502 });

        recordDemoEvent("generated", ip);
        return NextResponse.json({ success: true, image: result.imageUrl });
    } catch (error) {
        console.error("[Demo txt2img] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
