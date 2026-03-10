import { NextRequest, NextResponse } from 'next/server';
import { extractToken, verifyToken, findUserById, saveUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const token = extractToken(req.headers.get('authorization'));
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded = verifyToken(token);
        if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        const user = findUserById(decoded.userId);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
        const now = Date.now();

        user.termsAgreedAt = now;
        user.termsVersion = '1.0';
        user.agreements = user.agreements || {};
        const agreementRecord = { agreedAt: now, version: '1.0', ip };
        (user.agreements as Record<string, unknown>).termsOfService = agreementRecord;
        (user.agreements as Record<string, unknown>).contentPolicy = agreementRecord;
        (user.agreements as Record<string, unknown>).privacyPolicy = agreementRecord;
        (user.agreements as Record<string, unknown>).ageConfirmation = agreementRecord;
        (user.agreements as Record<string, unknown>).minorContentBan = agreementRecord;

        saveUser(user);

        return NextResponse.json({ success: true, termsAgreedAt: now });
    } catch (error) {
        console.error('Agree terms error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
