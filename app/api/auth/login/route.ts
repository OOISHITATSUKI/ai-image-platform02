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
import { saveGeneration } from '@/lib/db/generations';
import { unlockGuestImages } from '@/lib/db/guest_images';

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
        const user = await findUserByEmail(normalizedEmail);
        if (!user) {
            await logLoginAttempt({ email: normalizedEmail, success: false, failReason: 'user_not_found', ipAddress: getIp(req), userAgent: getUserAgent(req) });
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        // Check account status
        if (user.status === 'banned') {
            await logLoginAttempt({ userId: user.id, email: user.email, success: false, failReason: 'account_banned', ipAddress: getIp(req) });
            return NextResponse.json({ error: 'This account has been suspended' }, { status: 403 });
        }
        if (user.status === 'age_restricted') {
            await logLoginAttempt({ userId: user.id, email: user.email, success: false, failReason: 'age_restricted', ipAddress: getIp(req) });
            return NextResponse.json({ error: 'This account is restricted due to age requirements' }, { status: 403 });
        }
        if (user.status === 'pending_otp') {
            await logLoginAttempt({ userId: user.id, email: user.email, success: false, failReason: 'email_not_verified', ipAddress: getIp(req) });
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
            await saveUser(user);
            await logLoginAttempt({ userId: user.id, email: user.email, success: false, failReason: 'invalid_password', ipAddress: getIp(req) });
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        // Reset login fail count on password success
        user.loginFailCount = 0;

        // Check if user needs to finish registration steps
        if (user.status === 'pending_password' || user.status === 'pending_agreements' || user.status === 'pending_profile') {
            const token = signToken(user.id, user.email);
            await saveUser(user);
            return NextResponse.json({
                success: true,
                incompleteRegistration: true,
                registrationStep: user.status,
                token,
                user: { id: user.id, email: user.email, username: user.username, status: user.status },
            });
        }

        // ── Issue JWT ─────────────────────────────────────────────────────
        const country = getCountry(req);
        const ua = getUserAgent(req);
        const now = Date.now();

        const deviceTokenCookie = req.cookies.get('device_token')?.value;
        const trustedDevice = deviceTokenCookie ? await findDeviceByToken(deviceTokenCookie) : null;

        const token = signToken(user.id, user.email);
        user.lastLoginAt = now;
        user.lastKnownCountry = country;
        // Auto-recover termsAgreedAt for users who have agreements but missing timestamp
        if (!user.termsAgreedAt && user.agreements && Object.keys(user.agreements).length > 0) {
            const firstAgreement = Object.values(user.agreements as Record<string, { agreedAt?: number }>)[0];
            user.termsAgreedAt = firstAgreement?.agreedAt || now;
            user.termsVersion = user.termsVersion || '1.0';
        }
        await saveUser(user);
        await logLoginAttempt({ userId: user.id, email: user.email, success: true, ipAddress: ip, userAgent: ua });

        // Refresh trusted device record
        if (trustedDevice) {
            await touchDevice(trustedDevice.id, ip, country);
        }

        // ── Unlock guest images on login ──
        let unlockedCount = 0;
        try {
            const guestImages = unlockGuestImages(ip, user.id);

            for (const img of guestImages) {
                saveGeneration({
                    userId: user.id,
                    prompt: img.prompt || 'Guest generation (unlocked)',
                    modelName: 'novita-helloworld-xl',
                    params: {},
                    fileUrl: img.originalPath,
                    fileType: 'image',
                    generationType: (img.generationType === 'faceswap' ? 'faceswap' : img.generationType === 'inpaint' ? 'inpaint' : 'txt2img') as 'txt2img' | 'img2img' | 'inpaint' | 'faceswap',
                    creditsUsed: 0,
                    status: 'success',
                });
            }
            unlockedCount = guestImages.length;
            if (unlockedCount > 0) {
                console.log(`[Login] Unlocked ${unlockedCount} guest images for user ${user.id}`);
            }
        } catch (e) {
            console.error('[Login] Guest image unlock error:', e);
        }

        const responseBody = {
            success: true,
            token,
            unlockedCount,
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
                termsAgreedAt: user.termsAgreedAt,
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
