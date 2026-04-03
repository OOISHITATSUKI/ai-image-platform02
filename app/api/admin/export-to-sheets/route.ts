import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { checkAdmin } from '@/app/api/admin/stats/route';
import { getAllGuestGenerations } from '@/lib/db/guest_generations';

// ── Google Sheets helpers ──

function getAuthClient() {
    const keyBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!keyBase64) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY is not set');

    const keyJson = JSON.parse(Buffer.from(keyBase64, 'base64').toString('utf8'));

    return new google.auth.GoogleAuth({
        credentials: keyJson,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
}

// ── Umami Analytics helpers ──

interface UmamiStats {
    pageviews: number;
    visitors: number;
    bounceRate: number;
    mobileRatio: number;
    topReferrers: string[];
}

async function fetchUmamiStats(): Promise<UmamiStats> {
    const apiUrl = process.env.UMAMI_API_URL;
    const apiKey = process.env.UMAMI_API_KEY;
    const websiteId = process.env.UMAMI_WEBSITE_ID;

    if (!apiUrl || !apiKey || !websiteId) {
        console.warn('[umami] Missing UMAMI_API_URL, UMAMI_API_KEY, or UMAMI_WEBSITE_ID');
        return { pageviews: 0, visitors: 0, bounceRate: 0, mobileRatio: 0, topReferrers: [] };
    }

    const headers = { 'x-umami-api-key': apiKey };

    // Yesterday's date range (full day UTC)
    const now = new Date();
    const startOfYesterday = new Date(now);
    startOfYesterday.setUTCDate(now.getUTCDate() - 1);
    startOfYesterday.setUTCHours(0, 0, 0, 0);
    const endOfYesterday = new Date(startOfYesterday);
    endOfYesterday.setUTCHours(23, 59, 59, 999);

    const startAt = startOfYesterday.getTime();
    const endAt = endOfYesterday.getTime();

    try {
        // Fetch stats (pageviews, visitors, bounces, totaltime)
        const statsRes = await fetch(
            `${apiUrl}/websites/${websiteId}/stats?startAt=${startAt}&endAt=${endAt}`,
            { headers }
        );
        const statsData = await statsRes.json();

        const pageviews = statsData?.pageviews?.value ?? 0;
        const visitors = statsData?.visitors?.value ?? 0;
        const bounces = statsData?.bounces?.value ?? 0;
        const bounceRate = pageviews > 0 ? Math.round((bounces / pageviews) * 100) : 0;

        // Fetch device breakdown for mobile ratio
        let mobileRatio = 0;
        try {
            const devicesRes = await fetch(
                `${apiUrl}/websites/${websiteId}/metrics?startAt=${startAt}&endAt=${endAt}&type=device`,
                { headers }
            );
            const devicesData: { x: string; y: number }[] = await devicesRes.json();
            const totalDevices = devicesData.reduce((sum, d) => sum + d.y, 0);
            const mobileCount = devicesData.find(d => d.x === 'mobile')?.y ?? 0;
            mobileRatio = totalDevices > 0 ? Math.round((mobileCount / totalDevices) * 100) : 0;
        } catch (e) {
            console.warn('[umami] Failed to fetch device metrics:', e);
        }

        // Fetch referrers TOP 3
        let topReferrers: string[] = [];
        try {
            const refRes = await fetch(
                `${apiUrl}/websites/${websiteId}/metrics?startAt=${startAt}&endAt=${endAt}&type=referrer`,
                { headers }
            );
            const refData: { x: string; y: number }[] = await refRes.json();
            topReferrers = refData
                .sort((a, b) => b.y - a.y)
                .slice(0, 3)
                .map(r => `${r.x || '(direct)'}(${r.y})`);
        } catch (e) {
            console.warn('[umami] Failed to fetch referrer metrics:', e);
        }

        return { pageviews, visitors, bounceRate, mobileRatio, topReferrers };
    } catch (err) {
        console.error('[umami] Failed to fetch stats:', err);
        return { pageviews: 0, visitors: 0, bounceRate: 0, mobileRatio: 0, topReferrers: [] };
    }
}

// ── KPI data collection ──

export async function collectKpiData() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Date string (JST)
    const dateStr = new Date().toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' });

    // ── All generations (registered users) ──
    const GENERATIONS_FILE = path.join(process.cwd(), 'data', 'generations.json');
    let allGens: { prompt: string; createdAt: number }[] = [];
    if (fs.existsSync(GENERATIONS_FILE)) {
        allGens = Object.values(JSON.parse(fs.readFileSync(GENERATIONS_FILE, 'utf8'))) as typeof allGens;
    }

    // ── Guest generations ──
    const GUEST_IMAGES_FILE = path.join(process.cwd(), 'data', 'guest_images.json');
    let guestImages: { guestId: string; unlocked: boolean; createdAt: number }[] = [];
    if (fs.existsSync(GUEST_IMAGES_FILE)) {
        try {
            guestImages = Object.values(JSON.parse(fs.readFileSync(GUEST_IMAGES_FILE, 'utf8'))) as typeof guestImages;
        } catch { /* ignore */ }
    }

    const guestRecords = getAllGuestGenerations();

    // ── Total generation count (registered + guest) ──
    const totalGens = allGens.length + guestImages.length;

    // ── Prompt input rate: generations with non-empty prompt / total ──
    const gensWithPrompt = allGens.filter(g => g.prompt && g.prompt.trim().length > 0).length;
    const guestWithPrompt = guestRecords.filter(r => r.prompt && r.prompt.trim().length > 0).length;
    const promptInputRate = totalGens > 0
        ? Math.round(((gensWithPrompt + guestWithPrompt) / totalGens) * 100)
        : 0;

    // ── Guest re-generation rate ──
    const guestGenCounts: Record<string, number> = {};
    for (const img of guestImages) {
        guestGenCounts[img.guestId] = (guestGenCounts[img.guestId] || 0) + 1;
    }
    const uniqueGuests = Object.keys(guestGenCounts).length;
    const guestsWhoRegenerated = Object.values(guestGenCounts).filter(c => c > 1).length;
    const guestRegenerationRate = uniqueGuests > 0
        ? Math.round((guestsWhoRegenerated / uniqueGuests) * 100)
        : 0;

    // ── Guest → Registration conversion rate ──
    const unlockedGuestIPs = new Set(guestImages.filter(g => g.unlocked).map(g => g.guestId));
    const guestConversionRate = uniqueGuests > 0
        ? Math.round((unlockedGuestIPs.size / uniqueGuests) * 100)
        : 0;

    // ── Q&A completion rate ──
    const qaRecords = guestRecords.filter(r => r.qaQuestions && r.qaQuestions.length > 0);
    const qaCompleted = qaRecords.filter(r => r.qaCompleted).length;
    const qaCompletionRate = qaRecords.length > 0
        ? Math.round((qaCompleted / qaRecords.length) * 100)
        : 0;

    // ── NSFW ON rate ──
    const DEMO_STATS_FILE = path.join(process.cwd(), 'data', 'demo_stats.json');
    let nsfwOnRate = 0;
    if (fs.existsSync(DEMO_STATS_FILE)) {
        try {
            const demoEvents = JSON.parse(fs.readFileSync(DEMO_STATS_FILE, 'utf8')) as { event: string; nudeMode?: boolean }[];
            const generated = demoEvents.filter(e => e.event === 'generated');
            if (generated.length > 0) {
                const nsfwOn = generated.filter(e => e.nudeMode !== false).length;
                nsfwOnRate = Math.round((nsfwOn / generated.length) * 100);
            }
        } catch { /* ignore */ }
    }

    // ── Umami analytics ──
    const umami = await fetchUmamiStats();

    return {
        dateStr,
        totalGens,
        promptInputRate,
        guestRegenerationRate,
        guestConversionRate,
        qaCompletionRate,
        nsfwOnRate,
        // Umami
        pageviews: umami.pageviews,
        visitors: umami.visitors,
        bounceRate: umami.bounceRate,
        mobileRatio: umami.mobileRatio,
        topReferrers: umami.topReferrers,
    };
}

// ── Write to Google Sheets ──

export async function writeToSheets(data: Awaited<ReturnType<typeof collectKpiData>>) {
    const sheetId = process.env.GOOGLE_SHEET_ID;
    if (!sheetId) throw new Error('GOOGLE_SHEET_ID is not set');

    const auth = getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    const row = [
        data.dateStr,
        data.totalGens,
        `${data.promptInputRate}%`,
        `${data.guestRegenerationRate}%`,
        `${data.guestConversionRate}%`,
        `${data.qaCompletionRate}%`,
        `${data.nsfwOnRate}%`,
        // Umami columns
        data.pageviews,
        data.visitors,
        `${data.bounceRate}%`,
        `${data.mobileRatio}%`,
        data.topReferrers.join(', '),
    ];

    await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: 'KPI_Daily!A:L',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
            values: [row],
        },
    });

    return row;
}

// ── API Route (Admin only) ──

export async function POST(req: NextRequest) {
    const admin = await checkAdmin();
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const data = await collectKpiData();
        const row = await writeToSheets(data);

        return NextResponse.json({
            success: true,
            message: 'KPI data exported to Google Sheets',
            row,
        });
    } catch (err: unknown) {
        console.error('[export-to-sheets] Error:', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
