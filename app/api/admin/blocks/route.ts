import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { checkAdmin } from '../stats/route';

const FILTER_BLOCKS_FILE = path.join(process.cwd(), 'data', 'filter_blocks.json');

// GET /api/admin/blocks
export async function GET(req: NextRequest) {
    const admin = await checkAdmin();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let blocks: object[] = [];
    if (fs.existsSync(FILTER_BLOCKS_FILE)) {
        blocks = Object.values(JSON.parse(fs.readFileSync(FILTER_BLOCKS_FILE, 'utf8')));
    }

    // Sort newest first
    blocks.sort((a: any, b: any) => (b as any).createdAt - (a as any).createdAt);

    return NextResponse.json({
        blocks,
        total: blocks.length
    });
}
