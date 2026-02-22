import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const LOGS_FILE = path.join(process.cwd(), 'logs', 'security.jsonl');

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const limit = 50;

    let allLogs: Record<string, string>[] = [];
    try {
        if (fs.existsSync(LOGS_FILE)) {
            const raw = fs.readFileSync(LOGS_FILE, 'utf8').trim();
            if (raw) {
                allLogs = raw.split('\n').map(line => JSON.parse(line));
            }
        }
    } catch { }

    // Sort newest first
    const sorted = allLogs.reverse();
    const total = sorted.length;
    const paginated = sorted.slice((page - 1) * limit, page * limit);

    return NextResponse.json({ logs: paginated, total, page, limit });
}
