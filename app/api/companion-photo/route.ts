import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, findUserById } from '@/lib/auth';
import { fetchCompanionById } from '@/lib/companions-db';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const maxDuration = 120; // 2 minutes max for image generation

const NOVITA_API_KEY = process.env.NOVITA_API_KEY;
const NOVITA_BASE = 'https://api.novita.ai/v3/async';
const NOVITA_BASE_SYNC = 'https://api.novita.ai/v3';

// ── Auto-cleanup: delete companion photos older than 1 hour ──
const PHOTO_DIR = path.join(process.cwd(), 'public', 'companions', 'photos');
const PHOTO_TTL_MS = 60 * 60 * 1000; // 1 hour

async function cleanupOldPhotos() {
  try {
    await fs.mkdir(PHOTO_DIR, { recursive: true });
    const files = await fs.readdir(PHOTO_DIR);
    const now = Date.now();
    for (const file of files) {
      const filePath = path.join(PHOTO_DIR, file);
      const stat = await fs.stat(filePath);
      if (now - stat.mtimeMs > PHOTO_TTL_MS) {
        await fs.unlink(filePath).catch(() => {});
      }
    }
  } catch {}
}

// Run cleanup every 15 minutes
setInterval(cleanupOldPhotos, 15 * 60 * 1000);
cleanupOldPhotos(); // also run on startup

// ── Guest photo rate limit: 1 per day per IP ──
const guestPhotoUsage = new Map<string, number>(); // ip -> timestamp of last photo
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [ip, ts] of guestPhotoUsage) {
    if (now - ts > ONE_DAY_MS) guestPhotoUsage.delete(ip);
  }
}, 30 * 60 * 1000);

// SFW negative prompt
const SFW_NEGATIVE = 'nsfw, nude, naked, topless, nipples, genitalia, sex, explicit, pornographic, lingerie, underwear, bikini, see-through, suggestive pose, sexual, erotic';
const BASE_NEGATIVE = '(worst quality:1.4), (low quality:1.4), (ugly:1.3), (deformed:1.3), bad anatomy, bad proportions, blurry, watermark, text, signature, plastic skin, doll-like, CGI, 3d render, anime, cartoon, illustration, painting, drawing, art, sketch, unrealistic, airbrushed, oversmoothed skin, extra fingers, mutated hands, poorly drawn face, poorly drawn hands, missing fingers, extra limbs, fused fingers, long neck, cross-eyed';

async function pollResult(taskId: string): Promise<string | null> {
  for (let i = 0; i < 45; i++) {
    await new Promise(r => setTimeout(r, 2500));
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`${NOVITA_BASE}/task-result?task_id=${taskId}`, {
        headers: { Authorization: `Bearer ${NOVITA_API_KEY}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const data = await res.json();
      const status = data?.task?.status;
      if (i % 5 === 0) console.log(`[companion-photo] poll ${taskId}: ${status}`);
      if (status === 'TASK_STATUS_SUCCEED') {
        const imgs = data.images;
        if (Array.isArray(imgs) && imgs.length > 0) {
          return imgs[0].image_url ?? null;
        }
      }
      if (status === 'TASK_STATUS_FAILED') {
        console.error('[companion-photo] task failed:', JSON.stringify(data.task?.reason));
        return null;
      }
    } catch {
      // fetch timeout — just retry
      continue;
    }
  }
  return null;
}

async function fetchImageAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  return Buffer.from(buf).toString('base64');
}

async function mergeFace(faceBase64: string, targetBase64: string): Promise<string | null> {
  try {
    const res = await fetch(`${NOVITA_BASE_SYNC}/merge-face`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${NOVITA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        face_image_file: faceBase64,
        image_file: targetBase64,
        response_image_type: 'jpeg',
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.image_file ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { companionId, prompt } = await req.json();

    if (!companionId || !prompt) {
      return NextResponse.json({ error: 'Missing companionId or prompt' }, { status: 400 });
    }

    if (!NOVITA_API_KEY) {
      return NextResponse.json({ error: 'Image service unavailable' }, { status: 503 });
    }

    const companion = await fetchCompanionById(companionId);
    if (!companion) {
      return NextResponse.json({ error: 'Companion not found' }, { status: 404 });
    }

    // Auth check
    let isPaid = false;
    let isLoggedIn = false;
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const payload = verifyToken(authHeader.slice(7));
      if (payload) {
        isLoggedIn = true;
        const user = await findUserById(payload.userId);
        if (user && user.plan !== 'free') isPaid = true;
      }
    }

    // Guest rate limit: 1 photo per day
    if (!isLoggedIn) {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
      const lastUsed = guestPhotoUsage.get(ip);
      if (lastUsed && Date.now() - lastUsed < ONE_DAY_MS) {
        return NextResponse.json({ error: 'photo_limit' }, { status: 429 });
      }
      guestPhotoUsage.set(ip, Date.now());
    }

    // Build generation prompt
    const negativePrompt = isPaid
      ? BASE_NEGATIVE
      : `${SFW_NEGATIVE}, ${BASE_NEGATIVE}`;

    const finalPrompt = `(RAW photo:1.2), (photorealistic:1.4), (masterpiece:1.2), (best quality:1.2), beautiful woman, ${prompt}, ultra realistic, professional photograph, DSLR, 85mm lens, natural skin texture, skin pores, detailed skin, subsurface scattering, natural lighting, film grain, sharp focus on face, depth of field, bokeh background`;

    // Step 1: Generate base image via txt2img
    const genRes = await fetch(`${NOVITA_BASE}/txt2img`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${NOVITA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        extra: {
          response_image_type: 'jpeg',
          enable_nsfw_detection: false,
        },
        request: {
          model_name: 'leosamsHelloworldXL_helloworldXL70_485879.safetensors',
          prompt: finalPrompt,
          negative_prompt: negativePrompt,
          width: 832,
          height: 1216,
          steps: 32,
          guidance_scale: 5.5,
          sampler_name: 'DPM++ 2M Karras',
          image_num: 1,
          seed: -1,
        },
      }),
    });

    if (!genRes.ok) {
      console.error('txt2img error:', await genRes.text());
      return NextResponse.json({ error: 'Image generation failed' }, { status: 502 });
    }

    const genData = await genRes.json();
    const taskId = genData.task_id;
    if (!taskId) {
      return NextResponse.json({ error: 'No task ID' }, { status: 502 });
    }

    // Step 2: Poll for result
    const imageUrl = await pollResult(taskId);
    if (!imageUrl) {
      return NextResponse.json({ error: 'Image generation timed out' }, { status: 504 });
    }

    // Step 3: Face swap with companion's avatar
    let finalBase64: string | null = null;
    if (companion.avatarUrl) {
      try {
        const avatarFullUrl = companion.avatarUrl.startsWith('http')
          ? companion.avatarUrl
          : `${req.nextUrl.origin}${companion.avatarUrl}`;

        const [faceBase64, targetBase64] = await Promise.all([
          fetchImageAsBase64(avatarFullUrl),
          fetchImageAsBase64(imageUrl),
        ]);

        finalBase64 = await mergeFace(faceBase64, targetBase64);
      } catch (e) {
        console.error('Face swap failed, using original:', e);
      }
    }

    // If no face swap result, fetch the original image
    if (!finalBase64) {
      finalBase64 = await fetchImageAsBase64(imageUrl);
    }

    // Step 4: Save to disk (auto-deleted after 1 hour)
    await fs.mkdir(PHOTO_DIR, { recursive: true });
    const filename = `cp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const filePath = path.join(PHOTO_DIR, filename);
    await fs.writeFile(filePath, Buffer.from(finalBase64, 'base64'));

    const publicUrl = `/companions/photos/${filename}`;
    return NextResponse.json({ ok: true, imageUrl: publicUrl });
  } catch (error) {
    console.error('companion-photo error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
