import { NextRequest, NextResponse } from 'next/server';
import {
    findUserById,
    saveUser,
    signToken,
} from '@/lib/auth';
import { verifyToken } from '@/lib/auth';
import {
    saveDevice,
    generateDeviceToken,
    DEVICE_TRUST_TTL_MS,
} from '@/lib/db/trusted_devices';
import { logLoginAttempt } from '@/lib/db/security';

const MFA_OTP_ATTEMPTS_MAX = 3;
const MFA_LOCK_MS = 30 * 60 * 1000; // 30-minute lockout on 3 failures

function getIp(req: NextRequest): string {
    return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        ?? req.headers.get('x-real-ip')
        ?? '0.0.0.0';
}

function getCountry(req: NextRequest): string {
    return req.headers.get('cf-ipcountry') ?? req.headers.get('x-geo-country') ?? 'XX';
}

function getUa(req: NextRequest): string {
    return req.headers.get('user-agent') ?? 'unknown';
}

function getDeviceName(ua: string): string {
    let os = 'Unknown OS';
    let browser = 'Unknown Browser';

    if (/Windows/.test(ua)) os = 'Windows';
    else if (/Mac OS/.test(ua)) os = 'Mac';
    else if (/iPhone|iPad/.test(ua)) os = 'iOS';
    else if (/Android/.test(ua)) os = 'Android';
    else if (/Linux/.test(ua)) os = 'Linux';

    if (/Edg\//.test(ua)) browser = 'Edge';
    else if (/Chrome\//.test(ua)) browser = 'Chrome';
    else if (/Firefox\//.test(ua)) browser = 'Firefox';
    else if (/Safari\//.test(ua)) browser = 'Safari';

    return `${browser} / ${os}`;
}

// POST /api/auth/verify-device
// Handles the second step of high-risk logins: OTP verification + optional device trust
export async function POST(req: NextRequest) {
    try {
        const { sessionToken, otpCode, trustDevice } = await req.json();

        if (!sessionToken || !otpCode) {
            return NextResponse.json({ error: 'Session token and OTP code are required' }, { status: 400 });
        }

        // Verify session token (short-lived JWT from login step)
        const decoded = verifyToken(sessionToken);
        if (!decoded) {
            return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 });
        }

        const user = findUserById(decoded.userId);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const now = Date.now();

        // Check lockout
        if (user.deviceOtpLockedUntil && now < user.deviceOtpLockedUntil) {
            const minutesLeft = Math.ceil((user.deviceOtpLockedUntil - now) / 60000);
            return NextResponse.json(
                { error: `Too many failed attempts. Please try again in ${minutesLeft} minute(s).` },
                { status: 429 }
            );
        }

        // Check OTP expiry
        if (!user.deviceOtpCode || !user.deviceOtpExpiresAt || now > user.deviceOtpExpiresAt) {
            return NextResponse.json({ error: 'Verification code has expired. Please log in again.' }, { status: 401 });
        }

        // Validate OTP
        if (user.deviceOtpCode !== otpCode.trim()) {
            user.deviceOtpAttempts = (user.deviceOtpAttempts ?? 0) + 1;
            if ((user.deviceOtpAttempts ?? 0) >= MFA_OTP_ATTEMPTS_MAX) {
                user.deviceOtpLockedUntil = now + MFA_LOCK_MS;
                user.deviceOtpCode = undefined;
                saveUser(user);
                return NextResponse.json(
                    { error: 'Too many failed attempts. Account locked for 30 minutes.' },
                    { status: 429 }
                );
            }
            saveUser(user);
            const remaining = MFA_OTP_ATTEMPTS_MAX - (user.deviceOtpAttempts ?? 0);
            return NextResponse.json(
                { error: `Invalid verification code. ${remaining} attempt(s) remaining.` },
                { status: 401 }
            );
        }

        // OTP matched — clear device OTP state
        user.deviceOtpCode = undefined;
        user.deviceOtpExpiresAt = undefined;
        user.deviceOtpAttempts = 0;
        user.deviceOtpLockedUntil = undefined;
        user.loginFailCount = 0;
        user.lastLoginAt = now;

        const ip = getIp(req);
        const country = getCountry(req);
        const ua = getUa(req);
        user.lastKnownCountry = country;
        saveUser(user);
        logLoginAttempt({ userId: user.id, email: user.email, success: true, ipAddress: ip, userAgent: ua });

        // Issue full auth JWT
        const token = signToken(user.id, user.email);

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

        // Set auth_token cookie
        response.cookies.set('auth_token', token, {
            httpOnly: false,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
            secure: process.env.NODE_ENV === 'production',
        });

        // Optionally trust this device (90-day device_token cookie)
        if (trustDevice) {
            const deviceToken = generateDeviceToken();
            saveDevice({
                userId: user.id,
                deviceToken,
                deviceName: getDeviceName(ua),
                ipAddress: ip,
                countryCode: country,
                expiresAt: now + DEVICE_TRUST_TTL_MS,
            });
            response.cookies.set('device_token', deviceToken, {
                httpOnly: true,
                sameSite: 'strict',
                maxAge: DEVICE_TRUST_TTL_MS / 1000,
                path: '/',
                secure: process.env.NODE_ENV === 'production',
            });
        }

        return response;

    } catch (error) {
        console.error('verify-device error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/auth/verify-device/resend — resend OTP for device verification
// (handled as a separate sub-route, call POST with { action: 'resend', sessionToken })
