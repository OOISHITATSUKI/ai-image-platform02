import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const BANS_FILE = path.join(process.cwd(), 'data', 'bans.json');

function readBans() {
    if (!fs.existsSync(BANS_FILE)) return { ips: {}, users: {} };
    try {
        return JSON.parse(fs.readFileSync(BANS_FILE, 'utf8'));
    } catch {
        return { ips: {}, users: {} };
    }
}

function writeBans(data: unknown) {
    fs.writeFileSync(BANS_FILE, JSON.stringify(data, null, 2));
}

// GET: Return all bans
export async function GET() {
    const bans = readBans();

    const ipList = Object.entries(bans.ips as Record<string, Record<string, unknown>>).map(([ip, data]) => ({
        id: ip,
        type: 'ip',
        strikes: data.strikes ?? 0,
        permanent: data.permanent ?? false,
        bannedUntil: data.bannedUntil ?? null,
        email: data.email ?? '',      // ← メールアドレス (optional)
        note: data.note ?? '',        // ← 備考メモ (optional)
    }));

    return NextResponse.json({ bans: ipList });
}

// POST: Ban or Unban an IP, and optionally store email/note
export async function POST(req: NextRequest) {
    const { ip, action, email, note } = await req.json();
    if (!ip || !action) return NextResponse.json({ error: 'Missing ip or action' }, { status: 400 });

    const bans = readBans();

    if (action === 'ban') {
        if (!bans.ips[ip]) bans.ips[ip] = { strikes: 0 };
        bans.ips[ip].permanent = true;
        delete bans.ips[ip].bannedUntil;
        if (email !== undefined) bans.ips[ip].email = email;
        if (note !== undefined) bans.ips[ip].note = note;
    } else if (action === 'unban') {
        delete bans.ips[ip];
    } else if (action === 'temp_ban') {
        if (!bans.ips[ip]) bans.ips[ip] = { strikes: 0 };
        bans.ips[ip].bannedUntil = Date.now() + (24 * 60 * 60 * 1000);
        bans.ips[ip].permanent = false;
        if (email !== undefined) bans.ips[ip].email = email;
        if (note !== undefined) bans.ips[ip].note = note;
    } else if (action === 'update_info') {
        // Update email/note only (no ban status change)
        if (!bans.ips[ip]) bans.ips[ip] = { strikes: 0 };
        if (email !== undefined) bans.ips[ip].email = email;
        if (note !== undefined) bans.ips[ip].note = note;
    }

    writeBans(bans);
    return NextResponse.json({ success: true });
}
