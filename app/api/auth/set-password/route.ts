import { NextRequest, NextResponse } from 'next/server';
import {
    findUserByEmail,
    saveUser,
    hashPassword,
    validatePasswordStrength,
    signToken,
} from '@/lib/auth';

// POST: STEP 3 — Password creation + immediate activation
export async function POST(req: NextRequest) {
    try {
        const { email, password, confirmPassword } = await req.json();

        if (!email || !password || !confirmPassword) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
        }

        if (password !== confirmPassword) {
            return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
        }

        // Validate password strength
        const strength = validatePasswordStrength(password);
        if (!strength.valid) {
            return NextResponse.json({ error: strength.error }, { status: 400 });
        }

        const user = findUserByEmail(email.toLowerCase().trim());
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (user.status !== 'pending_password') {
            return NextResponse.json({ error: 'Invalid registration step' }, { status: 400 });
        }

        // Hash and save password, activate account immediately
        const now = Date.now();
        user.passwordHash = await hashPassword(password);
        user.status = 'active';
        user.username = user.email.split('@')[0];
        // Mark terms as agreed at registration time
        user.termsAgreedAt = now;
        user.termsVersion = '1.0';
        user.agreements = user.agreements || {};
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
        const agreementRecord = { agreedAt: now, version: '1.0', ip };
        (user.agreements as Record<string, unknown>).termsOfService = agreementRecord;
        (user.agreements as Record<string, unknown>).contentPolicy = agreementRecord;
        (user.agreements as Record<string, unknown>).privacyPolicy = agreementRecord;
        (user.agreements as Record<string, unknown>).ageConfirmation = agreementRecord;
        (user.agreements as Record<string, unknown>).minorContentBan = agreementRecord;
        saveUser(user);

        // Generate JWT token
        const token = signToken(user.id, user.email);

        return NextResponse.json({
            success: true,
            message: 'Account created successfully!',
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                plan: user.plan,
                credits: user.credits,
                locale: user.locale,
                theme: user.theme,
                status: user.status,
                firstGenerationConfirmed: user.firstGenerationConfirmed,
                termsAgreedAt: user.termsAgreedAt,
            },
        });
    } catch (error) {
        console.error('Set password error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
