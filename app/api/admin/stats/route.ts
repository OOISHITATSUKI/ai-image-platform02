import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, findUserById, readUsers } from '@/lib/auth';
import type { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function checkAdmin() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return null;

    const decoded = verifyToken(token);
    if (!decoded) return null;

    const user = findUserById(decoded.userId);
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
    const users = Object.values(readUsers());
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
    });
}
