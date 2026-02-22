import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, saveUser } from '@/lib/auth';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, otpCode, newPassword } = body;

        if (!email || !otpCode || !newPassword) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (newPassword.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = findUserByEmail(normalizedEmail);

        if (!user) {
            return NextResponse.json({ error: 'Invalid email or OTP' }, { status: 401 });
        }

        const now = Date.now();

        // Verify OTP exists and matches
        if (!user.passwordResetOtp || user.passwordResetOtp !== otpCode.trim()) {
            return NextResponse.json({ error: 'Invalid OTP code' }, { status: 401 });
        }

        // Verify OTP is not expired
        if (!user.passwordResetExpiresAt || now > user.passwordResetExpiresAt) {
            return NextResponse.json({ error: 'OTP code has expired. Please request a new one.' }, { status: 401 });
        }

        // Hash new password and save
        const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

        user.passwordHash = hashedPassword;

        // Clear OTP state and reset the attempts counter since they successfully recovered
        user.passwordResetOtp = undefined;
        user.passwordResetExpiresAt = undefined;
        user.passwordResetAttempts = 0;
        user.passwordResetLockedUntil = undefined;

        // Also clear login failures so they can log in smoothly
        user.loginFailCount = 0;
        user.loginFailResetAt = undefined;

        saveUser(user);

        return NextResponse.json({ success: true, message: 'Password updated successfully' });

    } catch (e) {
        console.error('Reset Password error:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
