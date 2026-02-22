import { NextRequest, NextResponse } from 'next/server';
import {
    findUserByEmail,
    saveUser,
    isOTPValid,
    OTP_MAX_ATTEMPTS,
    OTP_LOCK_MS,
} from '@/lib/auth';

// POST: STEP 2 — OTP verification
export async function POST(req: NextRequest) {
    try {
        const { email, code } = await req.json();

        if (!email || !code) {
            return NextResponse.json({ error: 'Email and code are required' }, { status: 400 });
        }

        const user = findUserByEmail(email.toLowerCase().trim());
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Check if OTP is valid (not locked, not expired)
        const otpCheck = isOTPValid(user);
        if (!otpCheck.valid) {
            return NextResponse.json({ error: otpCheck.error }, { status: 400 });
        }

        // Verify OTP code
        if (user.otpCode !== code) {
            user.otpAttempts = (user.otpAttempts || 0) + 1;

            // Lock after max attempts
            if (user.otpAttempts >= OTP_MAX_ATTEMPTS) {
                user.otpLockedUntil = Date.now() + OTP_LOCK_MS;
                saveUser(user);
                return NextResponse.json({
                    error: 'Too many failed attempts. Locked for 30 minutes.',
                }, { status: 429 });
            }

            saveUser(user);
            return NextResponse.json({
                error: 'Incorrect code',
                attemptsRemaining: OTP_MAX_ATTEMPTS - user.otpAttempts,
            }, { status: 400 });
        }

        // OTP correct — mark email as verified
        user.emailVerified = true;
        user.status = 'pending_password';
        user.otpCode = undefined;
        user.otpExpiresAt = undefined;
        user.otpAttempts = 0;
        user.otpLockedUntil = undefined;
        saveUser(user);

        return NextResponse.json({
            success: true,
            message: 'Email verified successfully',
            userId: user.id,
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
