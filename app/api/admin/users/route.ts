import { NextRequest, NextResponse } from 'next/server';
import { readUsers, saveUser, type UserRecord } from '@/lib/auth';

// GET: List all users (for admin panel)
export async function GET() {
    try {
        const users = readUsers();

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

        const users = readUsers();
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
            case 'set_plan':
                if (['free', 'paid', 'basic', 'unlimited'].includes(strValue || value)) {
                    user.plan = strValue || value;
                }
                break;
            case 'set_status':
                if (['active', 'banned', 'age_restricted'].includes(value)) {
                    user.status = value as UserRecord['status'];
                }
                break;
            case 'delete': {
                const { writeUsers } = await import('@/lib/auth');
                const allUsers = (await import('@/lib/auth')).readUsers();
                delete allUsers[userId];
                writeUsers(allUsers);
                return NextResponse.json({ success: true, deleted: true });
            }
            case 'delete': {
                const allUsers = readUsers();
                delete allUsers[userId];
                const { writeUsers } = await import('@/lib/auth');
                writeUsers(allUsers);
                return NextResponse.json({ success: true, deleted: true });
            }
            default:
                return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
        }

        saveUser(user);

        return NextResponse.json({ success: true, user: { id: user.id, status: user.status, credits: user.credits, plan: user.plan } });
    } catch (error) {
        console.error('Admin user action error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
