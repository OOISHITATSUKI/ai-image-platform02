import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, findUserById } from '@/lib/auth';
import { fetchCompanionById } from '@/lib/companions-db';
import { supabaseAdmin } from '@/lib/supabase-server';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { logCompanionEvent } from '@/lib/companion-analytics';
import { COMPANION_EVENTS } from '@/lib/companion-constants';
import { CREDIT_COSTS } from '@/lib/creditCosts';

export const runtime = 'nodejs';
export const maxDuration = 180; // 3 minutes max for image generation

const NOVITA_API_KEY = process.env.NOVITA_API_KEY;
const NOVITA_BASE = 'https://api.novita.ai/v3/async';
const NOVITA_BASE_SYNC = 'https://api.novita.ai/v3';

// ── Auto-cleanup: delete companion photos older than 1 hour ──
const PHOTO_DIR = path.join(process.cwd(), 'data', 'companion-photos');
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

// Content level negative prompts — v4.2: relaxed for higher levels
const NEGATIVE_BY_LEVEL: Record<string, string> = {
  sfw: 'nsfw, nude, naked, topless, nipples, genitalia, sex, explicit, pornographic, lingerie, underwear, bikini, see-through, suggestive pose, sexual, erotic, cleavage',
  swimsuit: 'nude, naked, topless, nipples, genitalia, sex, explicit, pornographic, see-through',
  lingerie: 'genitalia, explicit pornographic acts',
  nsfw: '',
};
const BASE_NEGATIVE = '(worst quality:1.4), (low quality:1.4), (ugly:1.3), (deformed:1.3), bad anatomy, bad proportions, blurry, watermark, text, signature, plastic skin, doll-like, CGI, 3d render, anime, cartoon, illustration, painting, drawing, art, sketch, unrealistic, airbrushed, oversmoothed skin, extra fingers, mutated hands, poorly drawn face, poorly drawn hands, missing fingers, extra limbs, fused fingers, long neck, cross-eyed';

async function pollResult(taskId: string): Promise<string | null> {
  for (let i = 0; i < 35; i++) {
    await new Promise(r => setTimeout(r, 3000));
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

async function fetchImageAsBase64(url: string, retries = 3): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      return Buffer.from(buf).toString('base64');
    } catch (e) {
      console.error(`[companion-photo] fetchImage attempt ${i + 1}/${retries} failed:`, e);
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error('fetchImageAsBase64 exhausted retries');
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
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`[companion-photo] merge-face API ${res.status}: ${errText.slice(0, 200)}`);
      return null;
    }
    const data = await res.json();
    return data.image_file ?? null;
  } catch (e) {
    console.error('[companion-photo] merge-face exception:', e);
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

    // Fetch relationship level + affection
    let userAffection = 0;
    if (isLoggedIn && authHeader) {
      const payload = verifyToken(authHeader.slice(7));
      if (payload) {
        const { data: relData } = await supabaseAdmin
          .from('companion_relationships')
          .select('level, affection')
          .eq('user_id', payload.userId)
          .eq('companion_id', companionId)
          .maybeSingle();
        if (relData?.affection != null) userAffection = relData.affection;
      }
    }

    // v4.4: Raised thresholds — NSFW requires real relationship investment
    const contentLevel = (() => {
      if (!isPaid) {
        if (userAffection >= 150) return 'swimsuit';
        return 'sfw';
      }
      if (userAffection >= 600) return 'nsfw';
      if (userAffection >= 400) return 'lingerie';
      if (userAffection >= 150) return 'swimsuit';
      return 'sfw';
    })();
    console.log(`[companion-photo] affection=${userAffection}, isPaid=${isPaid}, contentLevel=${contentLevel}`);

    // ── Credit deduction for photo generation ──
    const isNsfwContent = contentLevel === 'lingerie' || contentLevel === 'nsfw';
    const photoCreditCost = isNsfwContent ? CREDIT_COSTS.girlfriendPhotoNsfw : CREDIT_COSTS.girlfriendPhotoSfw;
    if (isLoggedIn && authHeader && photoCreditCost > 0) {
      const payload2 = verifyToken(authHeader.slice(7));
      if (payload2) {
        const { data: balData } = await supabaseAdmin
          .from('users')
          .select('credits')
          .eq('id', payload2.userId)
          .single();
        const bal = (balData?.credits as number) ?? 0;
        if (bal < photoCreditCost) {
          return NextResponse.json({
            error: 'insufficient_credits',
            required: photoCreditCost,
            current: bal,
          }, { status: 402 });
        }
        await supabaseAdmin
          .from('users')
          .update({ credits: bal - photoCreditCost })
          .eq('id', payload2.userId);
      }
    }

    // Build generation prompt — boost based on content level
    const levelNeg = NEGATIVE_BY_LEVEL[contentLevel] || NEGATIVE_BY_LEVEL.sfw;
    const negativePrompt = levelNeg ? `${levelNeg}, ${BASE_NEGATIVE}` : BASE_NEGATIVE;

    const LEVEL_BOOST: Record<string, string> = {
      sfw: ', selfie, smartphone photo, casual, looking at camera with warm smile, natural lighting, POV boyfriend perspective, cozy',
      swimsuit: ', bikini selfie, sending photo to boyfriend, playful smile, looking at camera, smartphone selfie, POV boyfriend perspective, flirty, showing skin, cleavage',
      lingerie: ', lingerie selfie, bedroom, sending intimate photo to boyfriend, shy smile, looking at camera, smartphone selfie, POV boyfriend perspective, seductive but intimate, showing skin, cleavage, sensual',
      nsfw: ', nude selfie, sending intimate photo to boyfriend, shy and seductive expression, looking at camera, POV boyfriend perspective, bedroom, natural lighting, intimate moment, topless, nipples visible, no clothes, showing breasts',
    };
    const boost = LEVEL_BOOST[contentLevel] || '';

    // Inject companion's physical attributes into the prompt
    const p = companion.profile;
    const bodyDesc = p?.bodyType
      ? `${p.hairColor ?? ''} ${p.hairStyle ?? ''} hair, ${p.skinTone ?? ''} skin, ${p.bodyType} body, ${p.breastSize ?? 'medium'} breasts${p.specialFeatures ? `, ${p.specialFeatures}` : ''}`
      : '';

    const finalPrompt = `(RAW photo:1.2), (photorealistic:1.4), (masterpiece:1.2), (best quality:1.2), beautiful woman, ${bodyDesc ? bodyDesc + ', ' : ''}${prompt}${boost}, ultra realistic, professional photograph, DSLR, 85mm lens, natural skin texture, skin pores, detailed skin, subsurface scattering, natural lighting, film grain, sharp focus on face, depth of field, bokeh background`;
    console.log(`[companion-photo] contentLevel=${contentLevel}, prompt=${finalPrompt.slice(0, 200)}...`);

    // Step 1: Generate base image via txt2img (with 1 retry)
    let imageUrl: string | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
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
        const errText = await genRes.text();
        console.error(`[companion-photo] txt2img attempt ${attempt + 1} error:`, errText);
        if (attempt === 1) return NextResponse.json({ error: 'Image generation failed' }, { status: 502 });
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }

      const genData = await genRes.json();
      const taskId = genData.task_id;
      if (!taskId) {
        console.error('[companion-photo] No task_id in response');
        if (attempt === 1) return NextResponse.json({ error: 'No task ID' }, { status: 502 });
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }

      // Step 2: Poll for result
      imageUrl = await pollResult(taskId);
      if (imageUrl) break;
      console.error(`[companion-photo] poll timed out, attempt ${attempt + 1}`);
      if (attempt === 1) return NextResponse.json({ error: 'Image generation timed out' }, { status: 504 });
    }

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image generation failed after retries' }, { status: 504 });
    }

    // Step 3: Face swap with companion's avatar (or gallery fallback)
    let finalBase64: string | null = null;

    // Collect all candidate face images: avatar + gallery
    const faceCandidates: string[] = [];
    if (companion.avatarUrl) faceCandidates.push(companion.avatarUrl);
    if (Array.isArray(companion.galleryUrls)) {
      for (const url of companion.galleryUrls) {
        if (url && !faceCandidates.includes(url)) faceCandidates.push(url);
      }
    }

    // Only use DB-registered avatar + gallery images (no filesystem auto-discovery)
    // This ensures face swap always uses the current companion's face, not leftover files
    console.log(`[companion-photo] Face candidates for ${companionId}: ${faceCandidates.length} images (DB-only)`);

    for (const faceUrl of faceCandidates) {
      try {
        let faceBuf: Buffer;
        if (faceUrl.startsWith('http')) {
          const b64 = await fetchImageAsBase64(faceUrl);
          faceBuf = Buffer.from(b64, 'base64');
        } else {
          const facePath = path.join(process.cwd(), 'public', faceUrl);
          faceBuf = await fs.readFile(facePath);
          // Skip placeholder files (< 1KB = likely not a real image)
          if (faceBuf.length < 1024) {
            console.log(`[companion-photo] Skipping placeholder face: ${faceUrl} (${faceBuf.length} bytes)`);
            continue;
          }
        }

        // Convert to JPEG for merge-face API (webp not supported by Novita)
        const jpegBuf = await sharp(faceBuf).jpeg({ quality: 90 }).toBuffer();
        const faceBase64 = jpegBuf.toString('base64');

        const targetBase64 = await fetchImageAsBase64(imageUrl);
        finalBase64 = await mergeFace(faceBase64, targetBase64);
        if (finalBase64) {
          console.log(`[companion-photo] Face swap success with: ${faceUrl}`);
          break; // Use first successful face swap
        }
        console.warn(`[companion-photo] merge-face returned null for: ${faceUrl}`);
      } catch (e) {
        console.error(`[companion-photo] Face swap failed with ${faceUrl}:`, e);
        continue; // Try next candidate
      }
    }

    // If no face swap result, fetch the original image
    if (!finalBase64) {
      finalBase64 = await fetchImageAsBase64(imageUrl);
    }

    // Step 4: Save to disk (auto-deleted after 1 hour)
    await fs.mkdir(PHOTO_DIR, { recursive: true });
    const filename = `cp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
    const filePath = path.join(PHOTO_DIR, filename);

    // Convert to WebP for smaller file size
    const webpBuffer = await sharp(Buffer.from(finalBase64, 'base64'))
      .webp({ quality: 82 })
      .toBuffer();
    await fs.writeFile(filePath, webpBuffer);

    const publicUrl = `/api/companion-photos/${filename}`;

    // Log photo request event
    if (isLoggedIn && authHeader) {
      const payload = verifyToken(authHeader.slice(7));
      if (payload) {
        logCompanionEvent({
          userId: payload.userId,
          eventType: COMPANION_EVENTS.PHOTO_REQUESTED,
          characterId: companionId,
          metadata: { content_level: contentLevel, affection: userAffection },
        });
      }
    }

    return NextResponse.json({ ok: true, imageUrl: publicUrl });
  } catch (error) {
    console.error('companion-photo error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
