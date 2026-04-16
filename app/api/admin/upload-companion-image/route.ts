import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

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

    const ext = (() => {
      switch (file.type) {
        case 'image/png':  return 'png';
        case 'image/webp': return 'webp';
        case 'image/gif':  return 'gif';
        default:           return 'jpg';
      }
    })();

    const safeId = companionId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'custom';
    const filename = `${safeId}-${Date.now()}.${ext}`;
    const destDir = path.join(process.cwd(), 'public', 'companions', 'avatars');
    await fs.mkdir(destDir, { recursive: true });
    const fullPath = path.join(destDir, filename);

    const bytes = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(fullPath, bytes);

    const publicUrl = `/companions/avatars/${filename}`;
    return NextResponse.json({ ok: true, url: publicUrl });
  } catch (err: unknown) {
    console.error('upload-companion-image error:', err);
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
