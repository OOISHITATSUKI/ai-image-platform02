import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, findUserById, readUsers } from '@/lib/auth';
import type { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function checkAdmin() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return null;

    const decoded = verifyToken(token);
    if (!decoded) return null;

    const user = await findUserById(decoded.userId);
    if (!user) return null;

    const adminEmailsConfig = process.env.ADMIN_EMAILS || '';
    const adminEmails = adminEmailsConfig.split(',').map(e => e.trim().toLowerCase());

    if (!adminEmails.includes(user.email.toLowerCase())) return null;

    return user;
}

// GET /api/admin/stats
export async function GET(req: NextRequest) {
    const admin = await checkAdmin();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const msToday = today.getTime();

    // Users
    const users = Object.values(await readUsers());
    const totalUsers = users.length;
    const newUsersToday = users.filter(u => u.createdAt >= msToday).length;
    const bannedUsers = users.filter(u => u.status === 'banned').length;

    // Filter Blocks
    const FILTER_BLOCKS_FILE = path.join(process.cwd(), 'data', 'filter_blocks.json');
    let totalBlocks = 0;
    let todayBlocks = 0;
    if (fs.existsSync(FILTER_BLOCKS_FILE)) {
        const blocks = Object.values(JSON.parse(fs.readFileSync(FILTER_BLOCKS_FILE, 'utf8'))) as { createdAt: number }[];
        totalBlocks = blocks.length;
        todayBlocks = blocks.filter(b => b.createdAt >= msToday).length;
    }

    // Generations
    const GENERATIONS_FILE = path.join(process.cwd(), 'data', 'generations.json');
    let todayGenerations = 0;
    if (fs.existsSync(GENERATIONS_FILE)) {
        const gens = Object.values(JSON.parse(fs.readFileSync(GENERATIONS_FILE, 'utf8'))) as { createdAt: number }[];
        todayGenerations = gens.filter(g => g.createdAt >= msToday).length;
    }

    // Revenue
    const TRANSACTIONS_FILE = path.join(process.cwd(), 'data', 'transactions.json');
    let totalRevenue = 0;
    if (fs.existsSync(TRANSACTIONS_FILE)) {
        const txs = Object.values(JSON.parse(fs.readFileSync(TRANSACTIONS_FILE, 'utf8'))) as { amountUsd: number, status: string }[];
        totalRevenue = txs
            .filter(t => t.status === 'completed')
            .reduce((sum, t) => sum + (t.amountUsd || 0), 0);
    }

    // Demo Stats
    const DEMO_STATS_FILE = path.join(process.cwd(), 'data', 'demo_stats.json');
    let totalDemoTrials = 0;
    let todayDemoTrials = 0;
    let uniqueDemoUsers = 0;
    let todayUniqueDemoUsers = 0;
    if (fs.existsSync(DEMO_STATS_FILE)) {
        const demoEvents = JSON.parse(fs.readFileSync(DEMO_STATS_FILE, 'utf8')) as { event: string; ip: string; createdAt: number }[];
        const generated = demoEvents.filter(e => e.event === 'generated');
        totalDemoTrials = generated.length;
        todayDemoTrials = generated.filter(e => e.createdAt >= msToday).length;
        uniqueDemoUsers = new Set(generated.map(e => e.ip)).size;
        todayUniqueDemoUsers = new Set(generated.filter(e => e.createdAt >= msToday).map(e => e.ip)).size;
    }

    // ── Guest Generation Stats (from Supabase) ──
    let guestGenTotal = 0;
    let guestGenToday = 0;
    let guestUniqueTotal = 0;
    let guestUniqueToday = 0;
    let guestConversionRate = 0;
    let guestAvgGensBeforeRegister = 0;
    let guestGenByType = { txt2img: 0, faceswap: 0, inpaint: 0 };
    let guestUnlockClicks = 0;

    try {
        const todayISO = today.toISOString();

        // Total guest generations
        const { count: totalGuestCount } = await supabaseAdmin
            .from('guest_generations')
            .select('*', { count: 'exact', head: true });
        guestGenTotal = totalGuestCount || 0;

        // Today's guest generations
        const { count: todayGuestCount } = await supabaseAdmin
            .from('guest_generations')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', todayISO);
        guestGenToday = todayGuestCount || 0;

        // Unique guests (total)
        const { data: uniqueGuests } = await supabaseAdmin
            .from('guest_generations')
            .select('guest_id')
            .limit(10000);
        if (uniqueGuests) {
            guestUniqueTotal = new Set(uniqueGuests.map((g: { guest_id: string }) => g.guest_id)).size;
        }

        // Unique guests today
        const { data: uniqueGuestsToday } = await supabaseAdmin
            .from('guest_generations')
            .select('guest_id')
            .gte('created_at', todayISO)
            .limit(10000);
        if (uniqueGuestsToday) {
            guestUniqueToday = new Set(uniqueGuestsToday.map((g: { guest_id: string }) => g.guest_id)).size;
        }

        // Conversion rate (guests who registered)
        const { count: registeredCount } = await supabaseAdmin
            .from('guest_generations')
            .select('guest_id', { count: 'exact', head: true })
            .eq('registered', true);
        if (guestUniqueTotal > 0) {
            guestConversionRate = Math.round(((registeredCount || 0) / guestUniqueTotal) * 100);
        }

        // Generation type breakdown
        const { data: typeBreakdown } = await supabaseAdmin
            .from('guest_generations')
            .select('generation_type')
            .limit(50000);
        if (typeBreakdown) {
            for (const row of typeBreakdown) {
                const t = row.generation_type as keyof typeof guestGenByType;
                if (t in guestGenByType) guestGenByType[t]++;
            }
        }

        // Unlock click events
        const { count: unlockCount } = await supabaseAdmin
            .from('guest_events')
            .select('*', { count: 'exact', head: true })
            .eq('event_type', 'unlock_click');
        guestUnlockClicks = unlockCount || 0;
    } catch (e) {
        console.error('Failed to fetch guest stats:', e);
    }

    return NextResponse.json({
        totalUsers,
        newUsersToday,
        bannedUsers,
        totalBlocks,
        todayBlocks,
        todayGenerations,
        totalRevenue,
        totalDemoTrials,
        todayDemoTrials,
        uniqueDemoUsers,
        todayUniqueDemoUsers,
        // Guest generation stats
        guestGenTotal,
        guestGenToday,
        guestUniqueTotal,
        guestUniqueToday,
        guestConversionRate,
        guestAvgGensBeforeRegister,
        guestGenByType,
        guestUnlockClicks,
    });
}
