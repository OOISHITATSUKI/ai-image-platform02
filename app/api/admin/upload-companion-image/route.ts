import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const companionId = (form.get('companionId') as string | null) ?? 'custom';

    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: `Unsupported type: ${file.type}` }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    const safeId = companionId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'custom';
    const filename = `${safeId}-${Date.now()}.webp`;
    const destDir = path.join(process.cwd(), 'public', 'companions', 'avatars');
    await fs.mkdir(destDir, { recursive: true });
    const fullPath = path.join(destDir, filename);

    const bytes = Buffer.from(await file.arrayBuffer());

    // Convert to WebP with sharp (quality 82 = good balance of size/quality)
    const webpBuffer = await sharp(bytes)
      .webp({ quality: 82 })
      .toBuffer();

    await fs.writeFile(fullPath, webpBuffer);

    const publicUrl = `/companions/avatars/${filename}`;
    return NextResponse.json({ ok: true, url: publicUrl });
  } catch (err: unknown) {
    console.error('upload-companion-image error:', err);
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
