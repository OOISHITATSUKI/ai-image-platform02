import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { extractToken, verifyToken, findUserById } from '@/lib/auth';

const KEYWORDS_FILE = path.join(process.cwd(), 'data', 'blocked_keywords.json');

// Get combined keywords (static + dynamic)
export async function GET(req: NextRequest) {
    const token = extractToken(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const admin = findUserById(decoded.userId);
    if (!admin || admin.plan !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let dynamicKeywords: Record<string, string[]> = { "1": [], "7": [], "9": [] };
    if (fs.existsSync(KEYWORDS_FILE)) {
        try {
            dynamicKeywords = JSON.parse(fs.readFileSync(KEYWORDS_FILE, 'utf8'));
        } catch (e) {
            console.error(e);
        }
    }

    return NextResponse.json({
        dynamicKeywords
    });
}

// Add a keyword to a category
export async function POST(req: NextRequest) {
    const token = extractToken(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const admin = findUserById(decoded.userId);
    if (!admin || admin.plan !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { category, keyword } = await req.json();
    if (!category || !keyword) {
        return NextResponse.json({ error: 'Missing category or keyword' }, { status: 400 });
    }

    let dynamicKeywords: Record<string, string[]> = { "1": [], "7": [], "9": [] };
    if (fs.existsSync(KEYWORDS_FILE)) {
        try {
            dynamicKeywords = JSON.parse(fs.readFileSync(KEYWORDS_FILE, 'utf8'));
        } catch (e) {
            console.error(e);
        }
    }

    if (!dynamicKeywords[category]) {
        dynamicKeywords[category] = [];
    }

    const kw = keyword.trim().toLowerCase();
    if (dynamicKeywords[category].includes(kw)) {
        return NextResponse.json({ error: 'Keyword already exists in this category' }, { status: 400 });
    }

    dynamicKeywords[category].push(kw);

    try {
        fs.writeFileSync(KEYWORDS_FILE, JSON.stringify(dynamicKeywords, null, 2));
    } catch (e) {
        return NextResponse.json({ error: 'Failed to write' }, { status: 500 });
    }

    return NextResponse.json({ success: true, dynamicKeywords });
}
