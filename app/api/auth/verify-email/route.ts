import { NextRequest, NextResponse } from 'next/server';
import {
    verifyToken,
    extractToken,
    findUserById,
    saveUser,
    generateOTP,
    OTP_EXPIRY_MS,
} from '@/lib/auth';
import { sendOTPEmail } from '@/lib/email';
import { rateLimit } from '@/lib/rateLimit';

// POST: Send or verify email OTP (for paid plan upgrade)
export async function POST(req: NextRequest) {
    try {
        const token = extractToken(req.headers.get('Authorization'));
        const decoded = token ? verifyToken(token) : null;
        if (!decoded) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await findUserById(decoded.userId);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const { action, code } = await req.json();

        // ── SEND OTP ──
        if (action === 'send') {
            // Rate limit: 5 per hour
            const rl = rateLimit(`${user.email}:verify-email`, 5, 60 * 60 * 1000);
            if (!rl.allowed) {
                return NextResponse.json(
                    { error: 'Too many verification codes requested. Please try again later.' },
                    { status: 429 }
                );
            }

            const otp = generateOTP();
            user.otpCode = otp;
            user.otpExpiresAt = Date.now() + OTP_EXPIRY_MS;
            user.otpAttempts = 0;
            user.otpLastSentAt = Date.now();
            await saveUser(user);

            if (process.env.NODE_ENV === 'production') {
                await sendOTPEmail(user.email, otp, 'verify');
            }

            return NextResponse.json({
                success: true,
                message: 'Verification code sent',
                ...(process.env.NODE_ENV !== 'production' ? { devOtp: otp } : {}),
            });
        }

        // ── VERIFY OTP ──
        if (action === 'verify') {
            if (!code) {
                return NextResponse.json({ error: 'Code is required' }, { status: 400 });
            }
            if (!user.otpCode || !user.otpExpiresAt) {
                return NextResponse.json({ error: 'No verification code pending. Please request a new one.' }, { status: 400 });
            }
            if (Date.now() > user.otpExpiresAt) {
                return NextResponse.json({ error: 'Verification code expired. Please request a new one.' }, { status: 400 });
            }

            const attempts = (user.otpAttempts || 0) + 1;
            if (attempts > 5) {
                return NextResponse.json({ error: 'Too many attempts. Please request a new code.' }, { status: 429 });
            }

            if (code !== user.otpCode) {
                user.otpAttempts = attempts;
                await saveUser(user);
                return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
            }

            // Success — mark email as verified
            user.emailVerified = true;
            user.otpCode = undefined;
            user.otpExpiresAt = undefined;
            user.otpAttempts = 0;
            user.updatedAt = Date.now();
            await saveUser(user);

            return NextResponse.json({ success: true, message: 'Email verified successfully' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Verify email error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
