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
    const apiKey = process.env.UMAMI_API_KEY;
    const websiteId = process.env.UMAMI_WEBSITE_ID;
    // Use the new Umami Cloud API endpoint (api.umami.is/v1)
    const apiUrl = 'https://api.umami.is/v1';

    console.log('[umami] Config:', { apiUrl, apiKey: apiKey ? '***set***' : 'MISSING', websiteId });

    if (!apiKey || !websiteId) {
        console.warn('[umami] Missing UMAMI_API_KEY or UMAMI_WEBSITE_ID');
        return { pageviews: 0, visitors: 0, bounceRate: 0, mobileRatio: 0, topReferrers: [] };
    }

    const headers = { 'x-umami-api-key': apiKey };

    // Yesterday's date range in JST (UTC+9)
    const now = new Date();
    const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const jstYesterday = new Date(jstNow);
    jstYesterday.setUTCDate(jstNow.getUTCDate() - 1);

    // Start of yesterday JST = yesterday 00:00 JST = yesterday -9h UTC
    const startOfYesterdayJST = new Date(Date.UTC(
        jstYesterday.getUTCFullYear(),
        jstYesterday.getUTCMonth(),
        jstYesterday.getUTCDate(),
        0, 0, 0, 0
    ));
    startOfYesterdayJST.setTime(startOfYesterdayJST.getTime() - 9 * 60 * 60 * 1000);

    // End of yesterday JST = yesterday 23:59:59.999 JST
    const endOfYesterdayJST = new Date(startOfYesterdayJST.getTime() + 24 * 60 * 60 * 1000 - 1);

    const startAt = startOfYesterdayJST.getTime();
    const endAt = endOfYesterdayJST.getTime();

    console.log('[umami] Fetching stats for:', { startAt, endAt, start: new Date(startAt).toISOString(), end: new Date(endAt).toISOString() });

    try {
        // Fetch stats (pageviews, visitors, bounces, totaltime)
        const statsUrl = `${apiUrl}/websites/${websiteId}/stats?startAt=${startAt}&endAt=${endAt}`;
        console.log('[umami] Stats URL:', statsUrl);
        const statsRes = await fetch(statsUrl, { headers });
        console.log('[umami] Stats response status:', statsRes.status);
        const statsText = await statsRes.text();
        console.log('[umami] Stats raw response:', statsText);

        const statsData = JSON.parse(statsText);
        // New API returns flat values (e.g. { pageviews: 3, visitors: 2, ... })
        // Old API returned nested { pageviews: { value: 3 }, ... }
        const pageviews = statsData?.pageviews?.value ?? statsData?.pageviews ?? 0;
        const visitors = statsData?.visitors?.value ?? statsData?.visitors ?? 0;
        const bounces = statsData?.bounces?.value ?? statsData?.bounces ?? 0;
        const bounceRate = pageviews > 0 ? Math.round((bounces / pageviews) * 100) : 0;

        console.log('[umami] Parsed stats:', { pageviews, visitors, bounces, bounceRate });

        // Fetch device breakdown for mobile ratio
        let mobileRatio = 0;
        try {
            const devicesUrl = `${apiUrl}/websites/${websiteId}/metrics?startAt=${startAt}&endAt=${endAt}&type=device`;
            console.log('[umami] Devices URL:', devicesUrl);
            const devicesRes = await fetch(devicesUrl, { headers });
            console.log('[umami] Devices response status:', devicesRes.status);
            const devicesText = await devicesRes.text();
            console.log('[umami] Devices raw response:', devicesText);

            const devicesRaw = JSON.parse(devicesText);
            const devicesData: { x: string; y: number }[] = Array.isArray(devicesRaw) ? devicesRaw
                : (devicesRaw?.data ?? devicesRaw?.rows ?? []);
            console.log('[umami] Devices parsed:', devicesData);
            const totalDevices = devicesData.reduce((sum, d) => sum + d.y, 0);
            const mobileCount = devicesData.find(d => d.x === 'mobile')?.y ?? 0;
            mobileRatio = totalDevices > 0 ? Math.round((mobileCount / totalDevices) * 100) : 0;
        } catch (e) {
            console.error('[umami] Failed to fetch device metrics:', e);
        }

        // Fetch referrers TOP 3
        let topReferrers: string[] = [];
        try {
            const refUrl = `${apiUrl}/websites/${websiteId}/metrics?startAt=${startAt}&endAt=${endAt}&type=referrer`;
            console.log('[umami] Referrers URL:', refUrl);
            const refRes = await fetch(refUrl, { headers });
            console.log('[umami] Referrers response status:', refRes.status);
            const refText = await refRes.text();
            console.log('[umami] Referrers raw response:', refText);

            const refRaw = JSON.parse(refText);
            const refData: { x: string; y: number }[] = Array.isArray(refRaw) ? refRaw
                : (refRaw?.data ?? refRaw?.rows ?? []);
            topReferrers = refData
                .sort((a, b) => b.y - a.y)
                .slice(0, 3)
                .map(r => `${r.x || '(direct)'}(${r.y})`);
        } catch (e) {
            console.error('[umami] Failed to fetch referrer metrics:', e);
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

    // ── Umami analytics (isolated – failure won't block Sheets export) ──
    let umami: UmamiStats = { pageviews: 0, visitors: 0, bounceRate: 0, mobileRatio: 0, topReferrers: [] };
    try {
        umami = await fetchUmamiStats();
    } catch (e) {
        console.error('[collectKpiData] Umami fetch failed, continuing without Umami data:', e);
    }

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

    // Debug: fetch actual sheet names to verify the target sheet exists
    const sheetInfo = await sheets.spreadsheets.get({
        spreadsheetId: sheetId,
    });
    const sheetNames = sheetInfo.data.sheets?.map(s => s.properties?.title) ?? [];
    console.log('[export-to-sheets] Available sheets:', sheetNames);

    const targetSheet = sheetNames.includes('imagenude_kpi_tracker01') ? 'imagenude_kpi_tracker01'
        : sheetNames.includes('KPI_Daily') ? 'KPI_Daily'
        : sheetNames[0] ?? 'Sheet1';
    if (targetSheet !== 'imagenude_kpi_tracker01') {
        console.warn(`[export-to-sheets] 'imagenude_kpi_tracker01' not found. Using '${targetSheet}' instead.`);
    }

    // Ensure header row (row 2) has Umami column names in O-U
    try {
        const headerRes = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `'${targetSheet}'!O2:U2`,
        });
        const existing = headerRes.data.values?.[0] ?? [];
        if (!existing[0]) {
            await sheets.spreadsheets.values.update({
                spreadsheetId: sheetId,
                range: `'${targetSheet}'!O2:U2`,
                valueInputOption: 'RAW',
                requestBody: {
                    values: [['ページビュー数', 'ユニークビジター数', '直帰率', 'モバイル比率', '流入元TOP1', '流入元TOP2', '流入元TOP3']],
                },
            });
            console.log('[export-to-sheets] Added Umami header columns O2:U2');
        }
    } catch (e) {
        console.warn('[export-to-sheets] Failed to update Umami headers:', e);
    }

    // Split referrers into 3 separate columns
    const ref1 = data.topReferrers[0] ?? '';
    const ref2 = data.topReferrers[1] ?? '';
    const ref3 = data.topReferrers[2] ?? '';

    // A:日付 B:バージョン C:全生成数 D:プロンプト入力率 E:サジェストタップ率
    // F:ゲスト再生成率 G:ゲスト→登録転換率 H:モーダル①登録転換率
    // I:顔保存率 J:顔モーダル課金転換 K:無料→有料転換率
    // L:平均生成数/ゲスト M:NSFW ON率 N:メモ
    // O:ページビュー数 P:ユニークビジター数 Q:直帰率 R:モバイル比率
    // S:流入元TOP1 T:流入元TOP2 U:流入元TOP3
    const row = [
        data.dateStr,                     // A: 日付
        'v2.0',                           // B: バージョン
        data.totalGens,                   // C: 全生成数
        `${data.promptInputRate}%`,       // D: プロンプト入力率
        '',                               // E: サジェストタップ率（未実装）
        `${data.guestRegenerationRate}%`, // F: ゲスト再生成率
        `${data.guestConversionRate}%`,   // G: ゲスト→登録転換率
        '',                               // H: モーダル①登録転換率（未実装）
        '',                               // I: 顔保存率（未実装）
        '',                               // J: 顔モーダル課金転換（未実装）
        '',                               // K: 無料→有料転換率（未実装）
        '',                               // L: 平均生成数/ゲスト（未実装）
        `${data.nsfwOnRate}%`,            // M: NSFW ON率
        '',                               // N: メモ
        data.pageviews,                   // O: ページビュー数
        data.visitors,                    // P: ユニークビジター数
        `${data.bounceRate}%`,            // Q: 直帰率
        `${data.mobileRatio}%`,           // R: モバイル比率
        ref1,                             // S: 流入元TOP1
        ref2,                             // T: 流入元TOP2
        ref3,                             // U: 流入元TOP3
    ];

    await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: `'${targetSheet}'!A:U`,
        valueInputOption: 'RAW',
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
