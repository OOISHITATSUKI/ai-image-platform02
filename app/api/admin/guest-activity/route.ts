import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkAdmin } from '@/app/api/admin/stats/route';
import { getAllGuestGenerations } from '@/lib/db/guest_generations';

export async function GET(req: NextRequest) {
    const admin = await checkAdmin();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const records = getAllGuestGenerations(); // sorted newest first

    // ── Recent 50 for display ──
    const recent = records.slice(0, 50).map(r => ({
        id: r.id,
        guestId: r.guestId.replace(/(\d+\.\d+)\.\d+\.\d+/, '$1.xxx.xxx'), // partially mask IP
        generationType: r.generationType,
        prompt: r.prompt,
        tags: r.tags,
        locale: r.locale,
        registered: r.registered,
        createdAt: r.createdAt,
    }));

    // ── Generation type breakdown ──
    const typeCounts = { txt2img: 0, faceswap: 0, inpaint: 0 };
    for (const r of records) {
        if (r.generationType in typeCounts) typeCounts[r.generationType as keyof typeof typeCounts]++;
    }
    const total = records.length || 1;
    const typeBreakdown = {
        txt2img: { count: typeCounts.txt2img, pct: Math.round((typeCounts.txt2img / total) * 100) },
        faceswap: { count: typeCounts.faceswap, pct: Math.round((typeCounts.faceswap / total) * 100) },
        inpaint: { count: typeCounts.inpaint, pct: Math.round((typeCounts.inpaint / total) * 100) },
    };

    // ── Tag ranking: ethnicity ──
    const ethnicityCounts: Record<string, number> = {};
    const situationCounts: Record<string, number> = {};
    const localeCounts: Record<string, number> = {};

    for (const r of records) {
        if (r.tags?.ethnicity && typeof r.tags.ethnicity === 'string') {
            ethnicityCounts[r.tags.ethnicity] = (ethnicityCounts[r.tags.ethnicity] || 0) + 1;
        }
        if (r.tags?.situation && typeof r.tags.situation === 'string') {
            situationCounts[r.tags.situation] = (situationCounts[r.tags.situation] || 0) + 1;
        }
        const loc = r.locale?.split('-')[0] || 'en';
        localeCounts[loc] = (localeCounts[loc] || 0) + 1;
    }

    const toRanking = (counts: Record<string, number>) =>
        Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .map(([key, count]) => ({ key, count, pct: Math.round((count / total) * 100) }));

    // ── Keyword frequency from prompts ──
    const stopWords = new Set([
        'a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'is', 'it',
        'with', 'for', 'by', 'from', 'as', 'be', 'was', 'are', 'my', 'no', 'not',
    ]);
    const wordCounts: Record<string, number> = {};
    for (const r of records) {
        if (!r.prompt) continue;
        const words = r.prompt.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
        for (const w of words) {
            if (!stopWords.has(w)) {
                wordCounts[w] = (wordCounts[w] || 0) + 1;
            }
        }
    }
    const topKeywords = Object.entries(wordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .map(([word, count]) => ({ word, count }));

    return NextResponse.json({
        total: records.length,
        recent,
        typeBreakdown,
        tagRankings: {
            ethnicity: toRanking(ethnicityCounts),
            situation: toRanking(situationCounts),
        },
        localeBreakdown: toRanking(localeCounts),
        topKeywords,
    });
}
