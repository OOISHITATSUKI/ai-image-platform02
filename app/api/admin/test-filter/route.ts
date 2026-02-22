import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkAdmin } from '../stats/route';
import fs from 'fs';
import path from 'path';

const FILTER_KEYWORDS: Record<string, string[]> = {
    'Cat.1': ['child', 'children', 'kid', 'minor', 'underage', 'preteen', 'infant', 'baby', 'toddler'],
    'Cat.7': ['loli', 'lolicon', 'shota', 'shotacon', 'jailbait', '幼女', 'ロリ', 'ショタ'],
    'Cat.9': ['ch1ld', 'k1d', 'l0li', 'sch00l', 'l0l1'],
};

// Also load real persons list
function getRealPersons(): string[] {
    const file = path.join(process.cwd(), 'data', 'real_persons.json');
    if (!fs.existsSync(file)) return [];
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8')).blocked_names ?? [];
    } catch { return []; }
}

// POST /api/admin/test-filter
export async function POST(req: NextRequest) {
    const admin = await checkAdmin();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { prompt } = await req.json();

        if (!prompt || typeof prompt !== 'string') {
            return NextResponse.json({ error: 'Invalid prompt provided.' }, { status: 400 });
        }

        const promptLower = prompt.toLowerCase();

        // Check real persons
        const realPersons = getRealPersons();
        const matchedPerson = realPersons.find(name => promptLower.includes(name.toLowerCase()));
        if (matchedPerson) {
            return NextResponse.json({
                isSafe: false,
                blocked: true,
                ruleName: `Real Person: ${matchedPerson}`,
                action: 'warning',
                message: `ブロック（Cat.2: 実在人物 — ${matchedPerson}）`,
            });
        }

        // Check keyword filters
        for (const [cat, keywords] of Object.entries(FILTER_KEYWORDS)) {
            const hit = keywords.find(kw => promptLower.includes(kw.toLowerCase()));
            if (hit) {
                return NextResponse.json({
                    isSafe: false,
                    blocked: true,
                    ruleName: `${cat}: ${hit}`,
                    action: 'warning',
                    message: `ブロック（${cat}: ${hit}）`,
                });
            }
        }

        return NextResponse.json({
            isSafe: true,
            blocked: false,
            message: '通過 — フィルターに一致するキーワードは見つかりませんでした。',
        });

    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
}
