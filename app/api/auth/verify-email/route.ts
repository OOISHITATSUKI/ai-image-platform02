import { NextRequest, NextResponse } from 'next/server';
import {
    verifyToken,
    extractToken,
    findUserById,
    saveUser,
    generateOTP,
    isOTPValid,
    OTP_EXPIRY_MS,
    OTP_MAX_ATTEMPTS,
    OTP_LOCK_MS,
} from '@/lib/auth';
import { sendOTPEmail } from '@/lib/email';

// POST: Send or verify email OTP for paid plan upgrade
export async function POST(req: NextRequest) {
    try {
        const token = extractToken(req.headers.get('Authorization'));
        const decoded = token ? verifyToken(token) : null;
        if (!decoded) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = findUserById(decoded.userId);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const { action, code } = await req.json();

        // Check if already verified
        if (user.emailVerified) {
            return NextResponse.json({ success: true, verified: true, message: 'Email already verified' });
        }

        // ACTION: send — Send verification OTP
        if (action === 'send') {
            const otp = generateOTP();
            user.otpCode = otp;
            user.otpExpiresAt = Date.now() + OTP_EXPIRY_MS;
            user.otpAttempts = 0;
            user.otpLockedUntil = undefined;
            user.otpLastSentAt = Date.now();
            saveUser(user);

            if (process.env.NODE_ENV === 'production') {
                await sendOTPEmail(user.email, otp, 'register');
            }

            return NextResponse.json({
                success: true,
                message: 'Verification code sent',
                ...(process.env.NODE_ENV !== 'production' ? { devOtp: otp } : {}),
            });
        }

        // ACTION: verify — Verify the OTP code
        if (action === 'verify') {
            if (!code) {
                return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
            }

            // Check OTP validity
            const otpCheck = isOTPValid(user);
            if (!otpCheck.valid) {
                return NextResponse.json({ error: otpCheck.error }, { status: 400 });
            }

            // Check code match
            if (user.otpCode !== code) {
                user.otpAttempts = (user.otpAttempts || 0) + 1;
                if (user.otpAttempts >= OTP_MAX_ATTEMPTS) {
                    user.otpLockedUntil = Date.now() + OTP_LOCK_MS;
                }
                saveUser(user);
                return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
            }

            // Verification successful
            user.emailVerified = true;
            user.otpCode = undefined;
            user.otpExpiresAt = undefined;
            user.otpAttempts = undefined;
            user.otpLockedUntil = undefined;
            user.otpLastSentAt = undefined;
            saveUser(user);

            return NextResponse.json({
                success: true,
                verified: true,
                message: 'Email verified successfully',
            });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Verify email error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
