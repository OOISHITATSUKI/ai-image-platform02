import { NextRequest, NextResponse } from 'next/server';
import {
    findUserByEmail,
    verifyPassword,
    signToken,
    saveUser,
    findUserById,
} from '@/lib/auth';
import { logLoginAttempt } from '@/lib/db/security';
import {
    findDeviceByToken,
    touchDevice,
    DEVICE_TRUST_TTL_MS,
} from '@/lib/db/trusted_devices';
import { rateLimit } from '@/lib/rateLimit';
import { sendOTPEmail } from '@/lib/email';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const DEVICE_OTP_TTL_MS = 10 * 60 * 1000;  // 10 minutes
const MAX_LOGIN_FAILS = 3;
const FAIL_RESET_MS = 60 * 60 * 1000; // 1 hour reset window

function getCountry(req: NextRequest): string {
    // CF-IPCountry from Cloudflare, or X-Geo-Country from other proxies
    return req.headers.get('cf-ipcountry') ?? req.headers.get('x-geo-country') ?? 'XX';
}

function getIp(req: NextRequest): string {
    return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        ?? req.headers.get('x-real-ip')
        ?? '0.0.0.0';
}

function getUserAgent(req: NextRequest): string {
    return req.headers.get('user-agent') ?? 'unknown';
}

// POST: Login with email + password
export async function POST(req: NextRequest) {
    try {
        const ip = getIp(req);
        // Login rate limit: 10 attempts per 15 minutes per IP
        const rl = rateLimit(`${ip}:login`, 10, 15 * 60 * 1000);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: 'Too many login attempts. Please try again later.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': rl.resetAt.toString() } }
            );
        }

        const body = await req.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = findUserByEmail(normalizedEmail);
        if (!user) {
            logLoginAttempt({ email: normalizedEmail, success: false, failReason: 'user_not_found', ipAddress: getIp(req), userAgent: getUserAgent(req) });
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        // Check account status
        if (user.status === 'banned') {
            logLoginAttempt({ userId: user.id, email: user.email, success: false, failReason: 'account_banned', ipAddress: getIp(req) });
            return NextResponse.json({ error: 'This account has been suspended' }, { status: 403 });
        }
        if (user.status === 'age_restricted') {
            logLoginAttempt({ userId: user.id, email: user.email, success: false, failReason: 'age_restricted', ipAddress: getIp(req) });
            return NextResponse.json({ error: 'This account is restricted due to age requirements' }, { status: 403 });
        }
        if (user.status === 'pending_otp' || !user.emailVerified) {
            logLoginAttempt({ userId: user.id, email: user.email, success: false, failReason: 'email_not_verified', ipAddress: getIp(req) });
            return NextResponse.json({ error: 'Please complete email verification first' }, { status: 403 });
        }
        if (!user.passwordHash) {
            return NextResponse.json({ error: 'Account setup incomplete. Please complete registration.' }, { status: 403 });
        }

        // Verify password
        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) {
            // Track login failures
            const now = Date.now();
            if (!user.loginFailResetAt || now > user.loginFailResetAt) {
                user.loginFailCount = 1;
                user.loginFailResetAt = now + FAIL_RESET_MS;
            } else {
                user.loginFailCount = (user.loginFailCount ?? 0) + 1;
            }
            saveUser(user);
            logLoginAttempt({ userId: user.id, email: user.email, success: false, failReason: 'invalid_password', ipAddress: getIp(req) });
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        // Reset login fail count on password success
        user.loginFailCount = 0;

        // Check if user needs to finish registration steps
        if (user.status === 'pending_password' || user.status === 'pending_agreements' || user.status === 'pending_profile') {
            const token = signToken(user.id, user.email);
            saveUser(user);
            return NextResponse.json({
                success: true,
                incompleteRegistration: true,
                registrationStep: user.status,
                token,
                user: { id: user.id, email: user.email, username: user.username, status: user.status },
            });
        }

        // ── Risk Assessment ──────────────────────────────────────────────
        const country = getCountry(req);
        const ua = getUserAgent(req);
        const now = Date.now();

        let riskReason: string | null = null;

        // 1. Check device_token cookie
        const deviceTokenCookie = req.cookies.get('device_token')?.value;
        let trustedDevice = deviceTokenCookie ? findDeviceByToken(deviceTokenCookie) : null;

        // Validate trusted device belongs to this user
        if (trustedDevice && trustedDevice.userId !== user.id) {
            trustedDevice = null; // Token belongs to someone else
        }

        if (!trustedDevice) {
            riskReason = 'new_device';
        } else if (trustedDevice.countryCode && trustedDevice.countryCode !== country && country !== 'XX') {
            riskReason = 'country_changed';
        }

        // 2. Check 30-day inactivity
        if (!riskReason && user.lastLoginAt && (now - user.lastLoginAt) > THIRTY_DAYS_MS) {
            riskReason = 'long_absence';
        }

        // 3. Check recent login failures (>= 3 fails = require MFA even on known device)
        if (!riskReason && (user.loginFailCount ?? 0) >= MAX_LOGIN_FAILS) {
            riskReason = 'repeated_failures';
        }

        // ── High-risk: send OTP and return mfa_required ──────────────────
        if (riskReason) {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            user.deviceOtpCode = otp;
            user.deviceOtpExpiresAt = now + DEVICE_OTP_TTL_MS;
            user.deviceOtpAttempts = 0;
            user.deviceOtpLockedUntil = undefined;
            saveUser(user);
            logLoginAttempt({ userId: user.id, email: user.email, success: false, failReason: `mfa_required:${riskReason}`, ipAddress: ip });

            // Send OTP via email
            // In dev mode, the OTP is returned in the response body (matching registration flow pattern)
            // In production: integrate your email provider here (e.g. Resend, SendGrid, etc.)
            if (process.env.NODE_ENV === 'production') {
                await sendOTPEmail(user.email, otp, 'login');
            }

            // Issue a short-lived session token (5 minutes) for the MFA step
            // We use a standard 7-day token but the OTP expires in 10 minutes anyway
            const sessionToken = signToken(user.id, user.email);

            return NextResponse.json({
                success: false,
                step: 'mfa_required',
                sessionToken,
                reason: riskReason,
                emailHint: user.email.replace(/(.{2}).+(@.+)/, '$1***$2'),
                // Dev mode only: include OTP in response body for testing
                ...(process.env.NODE_ENV !== 'production' ? { devOtp: otp } : {}),
            });
        }

        // ── Low-risk: issue JWT and refresh device_token ─────────────────
        const token = signToken(user.id, user.email);
        user.lastLoginAt = now;
        user.lastKnownCountry = country;
        saveUser(user);
        logLoginAttempt({ userId: user.id, email: user.email, success: true, ipAddress: ip, userAgent: ua });

        // Refresh trusted device record
        if (trustedDevice) {
            touchDevice(trustedDevice.id, ip, country);
        }

        const responseBody = {
            success: true,
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
                dateOfBirth: user.dateOfBirth,
                country: user.country,
                firstGenerationConfirmed: user.firstGenerationConfirmed,
                lastLoginAt: user.lastLoginAt,
            },
        };

        const response = NextResponse.json(responseBody);
        // Auth cookie for server components
        response.cookies.set('auth_token', token, {
            httpOnly: false,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
            secure: process.env.NODE_ENV === 'production',
        });
        // Refresh device_token cookie (rolling 90-day window)
        if (trustedDevice && deviceTokenCookie) {
            response.cookies.set('device_token', deviceTokenCookie, {
                httpOnly: true,
                sameSite: 'strict',
                maxAge: DEVICE_TRUST_TTL_MS / 1000,
                path: '/',
                secure: process.env.NODE_ENV === 'production',
            });
        }
        return response;

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
