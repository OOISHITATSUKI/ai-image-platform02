import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, saveUser } from '@/lib/auth';

const AGREEMENT_VERSION = '1.0';

const REQUIRED_AGREEMENTS = [
    'termsOfService',
    'contentPolicy',
    'privacyPolicy',
    'ageConfirmation',
    'minorContentBan',
    'noRefund',
    'personalUseOnly',
] as const;

// POST: STEP 4 — Agreement submission + account activation
export async function POST(req: NextRequest) {
    try {
        const { email, agreements } = await req.json();

        if (!email || !agreements) {
            return NextResponse.json({ error: 'Email and agreements are required' }, { status: 400 });
        }

        const user = findUserByEmail(email.toLowerCase().trim());
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (user.status !== 'pending_agreements') {
            return NextResponse.json({ error: 'Invalid registration step' }, { status: 400 });
        }

        // Verify all agreements are checked
        for (const key of REQUIRED_AGREEMENTS) {
            if (!agreements[key]) {
                return NextResponse.json({ error: `You must agree to all terms: missing ${key}` }, { status: 400 });
            }
        }

        // Get client IP
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            || req.headers.get('x-real-ip')
            || 'unknown';

        const now = Date.now();

        // Record all agreements with timestamp, version, and IP
        user.agreements = {};
        for (const key of REQUIRED_AGREEMENTS) {
            (user.agreements as Record<string, { agreedAt: number; version: string; ip: string }>)[key] = {
                agreedAt: now,
                version: AGREEMENT_VERSION,
                ip,
            };
        }

        // Activate account → move to profile step
        user.status = 'pending_profile';
        saveUser(user);

        return NextResponse.json({
            success: true,
            message: 'Account created successfully! Please complete your profile.',
        });
    } catch (error) {
        console.error('Complete registration error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
