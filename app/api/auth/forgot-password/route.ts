import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, saveUser } from '@/lib/auth';
import { sendOTPEmail } from '@/lib/email';

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_RESET_ATTEMPTS = 5;
const RESET_LOCKOUT_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = findUserByEmail(normalizedEmail);

        // Security best practice: don't reveal if user exists, just return success immediately
        // BUT for a better UX (assuming small scale or less strict threat model), we'll return an error if not found.
        if (!user) {
            return NextResponse.json({ error: 'Account not found' }, { status: 404 });
        }

        const now = Date.now();

        // Check if locked out
        if (user.passwordResetLockedUntil && now < user.passwordResetLockedUntil) {
            return NextResponse.json(
                { error: '一時的にロックされています。24時間後にもう一度お試しください。' },
                { status: 429 }
            );
        }

        // Increment attempts, locking out if >= MAX
        // Reset attempts count if the last attempt was over 24 hours ago
        if (user.passwordResetAttempts && user.passwordResetLockedUntil && now > user.passwordResetLockedUntil) {
            user.passwordResetAttempts = 0;
            user.passwordResetLockedUntil = undefined;
        }

        user.passwordResetAttempts = (user.passwordResetAttempts || 0) + 1;

        if (user.passwordResetAttempts >= MAX_RESET_ATTEMPTS) {
            user.passwordResetLockedUntil = now + RESET_LOCKOUT_MS;
            saveUser(user);
            return NextResponse.json(
                { error: '一時的にロックされています。24時間後にもう一度お試しください。' },
                { status: 429 }
            );
        }

        // Generate 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.passwordResetOtp = otpCode;
        user.passwordResetExpiresAt = now + OTP_EXPIRY_MS;

        saveUser(user);

        // Send email via Resend
        await sendOTPEmail(user.email, otpCode, 'reset');

        return NextResponse.json({ success: true, message: 'OTP sent' });

    } catch (e) {
        console.error('Forgot Password error:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
