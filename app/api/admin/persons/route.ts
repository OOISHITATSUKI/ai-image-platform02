import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, findUserById } from '@/lib/auth';
import type { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

// Helper to verify admin
async function checkAdmin() {
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

const PERSONS_FILE = path.join(process.cwd(), 'data', 'real_persons.json');

// GET /api/admin/persons
export async function GET(req: NextRequest) {
    const admin = await checkAdmin();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        if (!fs.existsSync(PERSONS_FILE)) {
            return NextResponse.json({ blocked_persons: [] });
        }
        const data = JSON.parse(fs.readFileSync(PERSONS_FILE, 'utf8'));
        return NextResponse.json({ blocked_persons: data.blocked_persons || [] });
    } catch (e) {
        return NextResponse.json({ error: 'Failed to read persons data' }, { status: 500 });
    }
}

// POST /api/admin/persons
export async function POST(req: NextRequest) {
    const admin = await checkAdmin();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        const { name_en, name_ja, category } = body;

        if (!name_en || !name_ja || !category) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        let data = { blocked_persons: [] as any[] };
        if (fs.existsSync(PERSONS_FILE)) {
            data = JSON.parse(fs.readFileSync(PERSONS_FILE, 'utf8'));
            if (!data.blocked_persons) {
                data.blocked_persons = [];
            }
        }

        // Check for duplicates
        const isDuplicate = data.blocked_persons.some(
            p => p.name_en.toLowerCase() === name_en.toLowerCase() || p.name_ja === name_ja
        );

        if (isDuplicate) {
            return NextResponse.json({ error: 'This person is already registered (duplicate name).' }, { status: 409 });
        }

        const maxId = data.blocked_persons.reduce((max, p) => Math.max(max, p.id || 0), 0);
        const newPerson = {
            id: maxId + 1,
            name_en: name_en.trim(),
            name_ja: name_ja.trim(),
            category: category.trim()
        };

        // Add to top of list
        data.blocked_persons.unshift(newPerson);

        fs.writeFileSync(PERSONS_FILE, JSON.stringify(data, null, 2), 'utf8');

        return NextResponse.json({ success: true, person: newPerson });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to save person' }, { status: 500 });
    }
}
