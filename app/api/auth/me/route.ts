import { NextRequest, NextResponse } from 'next/server';
import { extractToken, verifyToken, findUserById, saveUser } from '@/lib/auth';

// GET: Get current user from JWT token
export async function GET(req: NextRequest) {
    try {
        const token = extractToken(req.headers.get('authorization'));
        if (!token) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const decoded = verifyToken(token);
        if (!decoded) {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
        }

        const user = findUserById(decoded.userId);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                plan: user.plan,
                credits: user.credits,
                locale: user.locale,
                theme: user.theme,
                status: user.status,
                dateOfBirth: user.dateOfBirth,
                country: user.country,
                firstGenerationConfirmed: user.firstGenerationConfirmed,
                lastLoginAt: user.lastLoginAt,
                termsAgreedAt: user.termsAgreedAt,
                termsVersion: user.termsVersion,
                settings: user.settings,
            },
        });
    } catch (error) {
        console.error('Me GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST: Update first generation confirmed flag
export async function POST(req: NextRequest) {
    try {
        const token = extractToken(req.headers.get('authorization'));
        if (!token) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const decoded = verifyToken(token);
        if (!decoded) {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
        }

        const user = findUserById(decoded.userId);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const { firstGenerationConfirmed, username } = await req.json();

        let updated = false;

        if (firstGenerationConfirmed !== undefined) {
            user.firstGenerationConfirmed = firstGenerationConfirmed;
            updated = true;
        }

        if (username !== undefined && typeof username === 'string' && username.trim().length > 0) {
            user.username = username.trim();
            updated = true;
        }

        if (updated) {
            saveUser(user);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Me POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH: Update user settings
export async function PATCH(req: NextRequest) {
    try {
        const token = extractToken(req.headers.get('authorization'));
        if (!token) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const decoded = verifyToken(token);
        if (!decoded) {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
        }

        const user = findUserById(decoded.userId);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const body = await req.json();

        // Allow updating top-level preference fields
        if (body.theme !== undefined) user.theme = body.theme;
        if (body.locale !== undefined) user.locale = body.locale;

        // Allow updating the settings object
        if (body.settings !== undefined) {
            user.settings = {
                theme: body.settings.theme ?? user.settings?.theme ?? user.theme,
                locale: body.settings.locale ?? user.settings?.locale ?? user.locale,
                notifications: body.settings.notifications ?? user.settings?.notifications ?? true,
                defaultGenSettings: body.settings.defaultGenSettings ?? user.settings?.defaultGenSettings,
                nsfwIntensity: body.settings.nsfwIntensity ?? user.settings?.nsfwIntensity,
            };
        }

        saveUser(user);

        return NextResponse.json({
            success: true,
            settings: user.settings,
        });
    } catch (error) {
        console.error('Me PATCH error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
