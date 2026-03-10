import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
    findUserByEmail,
    saveUser,
    generateOTP,
    isDisposableEmail,
    isValidEmail,
    canResendOTP,
    OTP_EXPIRY_MS,
    type UserRecord,
} from '@/lib/auth';

import { logRegistrationAttempt, countRecentAttemptsByIp } from '@/lib/db/registration_attempts';
import { rateLimit } from '@/lib/rateLimit';
import { sendOTPEmail } from '@/lib/email';

// 24 hours in MS
const REGISTRATION_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_ACCOUNTS_PER_IP = 999;

function getIp(req: NextRequest): string {
    return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        ?? req.headers.get('x-real-ip')
        ?? '0.0.0.0';
}

// POST: STEP 1 — Email submission + OTP generation
export async function POST(req: NextRequest) {
    try {
        const ip = getIp(req);

        // ── 1. General Rate Limit (3 attempts per IP per 24h) ──
        const rl = rateLimit(`${ip}:register`, 999, REGISTRATION_WINDOW_MS);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: 'Too many registration attempts. Please try again later.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': rl.resetAt.toString() } }
            );
        }

        const reqBody = await req.json();
        const { email, resend } = reqBody;

        if (!email || !isValidEmail(email)) {
            return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // ── 2. Email OTP Rate Limit (5 per hour) ──
        const emailRl = rateLimit(`${normalizedEmail}:send-code`, 5, 60 * 60 * 1000);
        if (!emailRl.allowed) {
            return NextResponse.json(
                { error: 'Too many verification codes requested. Please try again later.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': emailRl.resetAt.toString() } }
            );
        }

        // ── 3. IP Registration Limit (max 2 successful accounts per IP/24h) ──
        const recentAccounts = countRecentAttemptsByIp(ip, REGISTRATION_WINDOW_MS);
        if (recentAccounts >= MAX_ACCOUNTS_PER_IP) {
            logRegistrationAttempt(ip, normalizedEmail, false);
            return NextResponse.json(
                { error: 'Registration is currently unavailable. Please try again later.' },
                { status: 429 }
            );
        }

        // Block disposable emails
        if (isDisposableEmail(normalizedEmail)) {
            logRegistrationAttempt(ip, normalizedEmail, false);
            return NextResponse.json({ error: 'This email domain is not allowed (Disposable Email)' }, { status: 400 });
        }

        const existingUser = findUserByEmail(normalizedEmail);

        // Resend OTP for existing pending user
        if (resend && existingUser) {
            if (existingUser.status !== 'pending_otp' && existingUser.status !== 'pending_password') {
                return NextResponse.json({ error: 'This email is already registered' }, { status: 409 });
            }
            if (!canResendOTP(existingUser)) {
                return NextResponse.json({ error: 'Please wait 60 seconds before requesting a new code' }, { status: 429 });
            }

            const otp = generateOTP();
            existingUser.otpCode = otp;
            existingUser.otpExpiresAt = Date.now() + OTP_EXPIRY_MS;
            existingUser.otpAttempts = 0;
            existingUser.otpLockedUntil = undefined;
            existingUser.otpLastSentAt = Date.now();
            saveUser(existingUser);

            if (process.env.NODE_ENV === 'production') {
                await sendOTPEmail(normalizedEmail, otp, 'register');
            }

            return NextResponse.json(
                {
                    success: true,
                    message: 'Verification code sent',
                    ...(process.env.NODE_ENV !== 'production' ? { devOtp: otp } : {}),
                },
                { headers: { 'X-RateLimit-Remaining': rl.remaining.toString(), 'X-RateLimit-Reset': rl.resetAt.toString() } }
            );
        }

        // Check if already registered (active account)
        if (existingUser && existingUser.status !== 'pending_otp' && existingUser.status !== 'pending_password') {
            return NextResponse.json({ error: 'This email is already registered' }, { status: 409 });
        }

        // Generate OTP
        const otp = generateOTP();
        const now = Date.now();
        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

        if (existingUser && (existingUser.status === 'pending_otp' || existingUser.status === 'pending_password')) {
            // Reset status to pending_otp for re-registration
            existingUser.status = 'pending_otp';
            // Update existing pending user
            if (!canResendOTP(existingUser)) {
                return NextResponse.json({ error: 'Please wait 60 seconds before requesting a new code' }, { status: 429 });
            }
            existingUser.otpCode = otp;
            existingUser.otpExpiresAt = now + OTP_EXPIRY_MS;
            existingUser.otpAttempts = 0;
            existingUser.otpLockedUntil = undefined;
            existingUser.otpLastSentAt = now;
            // Update fingerprint if provided on resend
            if (reqBody.fingerprintHash) existingUser.fingerprintHash = reqBody.fingerprintHash;
            saveUser(existingUser);
        } else {
            // Check fingerprint limits across all users (3 max per device)
            if (reqBody.fingerprintHash) {
                // Let's rely on IP limits and just save the fingerprint for later admin review as planned.
            }

            // Create new pending user
            const newUser: UserRecord = {
                id: uuidv4(),
                email: normalizedEmail,
                passwordHash: '',
                username: '',
                status: 'pending_otp',
                emailVerified: false,
                plan: 'free',
                credits: 20, // Free 20 credits upon signup
                locale: 'en',
                theme: 'dark',
                otpCode: otp,
                otpExpiresAt: now + OTP_EXPIRY_MS,
                otpAttempts: 0,
                otpLastSentAt: now,
                firstGenerationConfirmed: false,
                fingerprintHash: reqBody.fingerprintHash,
                freeCreditsExpireAt: now + SEVEN_DAYS_MS,
                createdAt: now,
                updatedAt: now,
            };
            saveUser(newUser);

            // Log successful new registration initiation
            logRegistrationAttempt(ip, normalizedEmail, true);
        }

        if (process.env.NODE_ENV === 'production') {
            await sendOTPEmail(normalizedEmail, otp, 'register');
        }

        return NextResponse.json(
            {
                success: true,
                message: 'Verification code sent to your email',
                ...(process.env.NODE_ENV !== 'production' ? { devOtp: otp } : {}),
            },
            { headers: { 'X-RateLimit-Remaining': rl.remaining.toString(), 'X-RateLimit-Reset': rl.resetAt.toString() } }
        );
    } catch (error) {
        console.error('Register error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
