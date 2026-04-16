import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// App Router: force Node.js runtime, long duration, no static optimization.
export const runtime = 'nodejs';
export const maxDuration = 600;
export const dynamic = 'force-dynamic';

// Legacy Pages Router-style hint kept per spec; harmless on App Router.
export const config = {
  api: {
    bodyParser: false,
  },
};

const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_SIZE = 500 * 1024 * 1024; // 500 MB

/**
 * POST /api/admin/upload-companion-video
 *
 * multipart/form-data fields:
 *   video       — the video file (≤ 150 MB, mp4/webm/mov)
 *   companionId — e.g. "luna"
 *   actionId    — e.g. "greeting", "sexy_tease", "redress", "ahegao", ...
 *   variant     — "dressed" | "undressed" | "off" | "on"
 *
 * Saves to /public/companions/videos/{id}-{actionId}-{variant}.mp4
 * (matches lib/companions.ts getActionVideoUrl).
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Accept both "video" (spec) and "file" (legacy) to be resilient.
    const file =
      (formData.get('video') as File | null) ??
      (formData.get('file') as File | null);
    const companionId = (formData.get('companionId') as string | null) ?? '';
    const actionId = (formData.get('actionId') as string | null) ?? '';
    const variant = (formData.get('variant') as string | null) ?? '';

    if (!file || !companionId || !actionId || !variant) {
      return NextResponse.json(
        { error: 'Missing required fields: video, companionId, actionId, variant' },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 500MB.' },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type (${file.type}). Only mp4, webm, mov allowed.` },
        { status: 400 },
      );
    }

    const safeId = companionId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
    const safeAction = actionId.replace(/[^a-z0-9_]/g, '').slice(0, 40);
    const safeVariant = variant.replace(/[^a-z]/g, '').slice(0, 20);
    if (!safeId || !safeAction || !safeVariant) {
      return NextResponse.json({ error: 'Invalid identifiers' }, { status: 400 });
    }

    const fileName = `${safeId}-${safeAction}-${safeVariant}.mp4`;
    const savePath = path.join(
      process.cwd(),
      'public',
      'companions',
      'videos',
      fileName,
    );

    await fs.mkdir(path.dirname(savePath), { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(savePath, buffer);

    return NextResponse.json({
      success: true,
      ok: true,
      url: `/companions/videos/${fileName}`,
      fileName,
    });
  } catch (err: unknown) {
    console.error('[upload-companion-video] ERROR:', err);
    if (err instanceof Error) {
      console.error('[upload-companion-video] stack:', err.stack);
    }
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json(
      {
        error: msg,
        type: err instanceof Error ? err.constructor.name : typeof err,
      },
      { status: 500 },
    );
  }
}
