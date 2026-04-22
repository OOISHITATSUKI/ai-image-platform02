import { NextRequest, NextResponse } from 'next/server';
import { readUsers, saveUser, deleteUser, type UserRecord } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';

// GET: List all users (for admin panel)
export async function GET() {
    try {
        const users = await readUsers();

        const userList = Object.values(users).map((u: UserRecord) => ({
            id: u.id,
            email: u.email,
            username: u.username,
            status: u.status,
            plan: u.plan,
            credits: u.credits,
            emailVerified: u.emailVerified,
            dateOfBirth: u.dateOfBirth,
            country: u.country,
            firstGenerationConfirmed: u.firstGenerationConfirmed,
            createdAt: u.createdAt,
            updatedAt: u.updatedAt,
            termsAgreedAt: u.agreements?.termsOfService ? u.agreements.termsOfService : null,
            agreementsCompleted: !!u.agreements?.termsOfService,
        }));

        // Sort by newest first
        userList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        return NextResponse.json({
            users: userList,
            total: userList.length,
        });
    } catch (error) {
        console.error('Admin users error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST: Admin actions on users (ban, unban, update credits, change status)
export async function POST(req: NextRequest) {
    try {
        const { userId, action, value, strValue } = await req.json();

        if (!userId || !action) {
            return NextResponse.json({ error: 'userId and action are required' }, { status: 400 });
        }

        const users = await readUsers();
        const user = users[userId];

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        switch (action) {
            case 'ban':
                user.status = 'banned';
                break;
            case 'unban':
                user.status = 'active';
                break;
            case 'set_credits':
                if (typeof value === 'number' && value >= 0) {
                    user.credits = value;
                }
                break;
            case 'set_coins':
                if (typeof value === 'number' && value >= 0) {
                    await supabaseAdmin
                        .from('users')
                        .update({ coins: value })
                        .eq('id', userId);
                }
                return NextResponse.json({ success: true, coins: value });
            case 'set_daily_chat_limit':
                // null = use plan default, number = custom limit
                await supabaseAdmin
                    .from('users')
                    .update({ daily_chat_limit: value === -1 ? null : (value ?? null) })
                    .eq('id', userId);
                return NextResponse.json({ success: true, daily_chat_limit: value === -1 ? null : value });

            case 'set_plan': {
                const planValue = strValue || value;
                if (['free', 'basic', 'pro', 'ultimate', 'paid'].includes(planValue)) {
                    user.plan = planValue;
                }
                break;
            }
            case 'delete':
                await deleteUser(userId);
                return NextResponse.json({ success: true, deleted: true });
            case 'set_status':
                if (['active', 'banned', 'age_restricted'].includes(value)) {
                    user.status = value as UserRecord['status'];
                }
                break;
            default:
                return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
        }

        await saveUser(user);

        return NextResponse.json({ success: true, user: { id: user.id, status: user.status, credits: user.credits, plan: user.plan } });
    } catch (error) {
        console.error('Admin user action error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
