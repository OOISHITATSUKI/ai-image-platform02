import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
    findUserByEmail,
    saveUser,
    hashPassword,
    validatePasswordStrength,
    signToken,
    isDisposableEmail,
    isValidEmail,
    type UserRecord,
} from '@/lib/auth';

import { logRegistrationAttempt, countRecentAttemptsByIp } from '@/lib/db/registration_attempts';
import { rateLimit } from '@/lib/rateLimit';

// 24 hours in MS
const REGISTRATION_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_ACCOUNTS_PER_IP = 3;

function getIp(req: NextRequest): string {
    return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        ?? req.headers.get('x-real-ip')
        ?? '0.0.0.0';
}

// POST: Single-step registration — email + password → active account
export async function POST(req: NextRequest) {
    try {
        const ip = getIp(req);

        // ── 1. General Rate Limit (10 attempts per IP per 24h) ──
        const rl = rateLimit(`${ip}:register`, 10, REGISTRATION_WINDOW_MS);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: 'Too many registration attempts. Please try again later.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': rl.resetAt.toString() } }
            );
        }

        const reqBody = await req.json();
        const { email, password, fingerprintHash } = reqBody;

        if (!email || !isValidEmail(email)) {
            return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
        }

        if (!password) {
            return NextResponse.json({ error: 'Password is required' }, { status: 400 });
        }

        // Validate password strength
        const strength = validatePasswordStrength(password);
        if (!strength.valid) {
            return NextResponse.json({ error: strength.error }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // ── 2. IP Registration Limit (max 3 successful accounts per IP/24h) ──
        const recentAccounts = countRecentAttemptsByIp(ip, REGISTRATION_WINDOW_MS);
        if (recentAccounts >= MAX_ACCOUNTS_PER_IP) {
            logRegistrationAttempt(ip, normalizedEmail, false);
            return NextResponse.json(
                { error: 'Too many accounts created. Please try again later.' },
                { status: 429 }
            );
        }

        // Block disposable emails
        if (isDisposableEmail(normalizedEmail)) {
            logRegistrationAttempt(ip, normalizedEmail, false);
            return NextResponse.json({ error: 'This email domain is not allowed (Disposable Email)' }, { status: 400 });
        }

        // Check if already registered
        const existingUser = findUserByEmail(normalizedEmail);
        if (existingUser && existingUser.status === 'active') {
            return NextResponse.json({ error: 'This email is already registered' }, { status: 409 });
        }

        // Hash password
        const passwordHash = await hashPassword(password);
        const now = Date.now();
        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

        // Record agreements
        const agreementRecord = { agreedAt: now, version: '1.0', ip };

        if (existingUser && (existingUser.status === 'pending_otp' || existingUser.status === 'pending_password' || existingUser.status === 'pending_agreements' || existingUser.status === 'pending_profile')) {
            // Reactivate incomplete registration
            existingUser.passwordHash = passwordHash;
            existingUser.status = 'active';
            existingUser.username = normalizedEmail.split('@')[0];
            existingUser.emailVerified = false;
            existingUser.termsAgreedAt = now;
            existingUser.termsVersion = '1.0';
            existingUser.agreements = {
                termsOfService: agreementRecord,
                contentPolicy: agreementRecord,
                privacyPolicy: agreementRecord,
                ageConfirmation: agreementRecord,
                minorContentBan: agreementRecord,
            };
            if (fingerprintHash) existingUser.fingerprintHash = fingerprintHash;
            existingUser.registrationIp = ip;
            // Clear OTP fields
            existingUser.otpCode = undefined;
            existingUser.otpExpiresAt = undefined;
            existingUser.otpAttempts = undefined;
            existingUser.otpLockedUntil = undefined;
            existingUser.otpLastSentAt = undefined;
            saveUser(existingUser);

            const token = signToken(existingUser.id, existingUser.email);
            logRegistrationAttempt(ip, normalizedEmail, true);

            return NextResponse.json({
                success: true,
                message: 'Account created successfully!',
                token,
                user: {
                    id: existingUser.id,
                    email: existingUser.email,
                    username: existingUser.username,
                    plan: existingUser.plan,
                    credits: existingUser.credits,
                    locale: existingUser.locale,
                    theme: existingUser.theme,
                    status: existingUser.status,
                    firstGenerationConfirmed: existingUser.firstGenerationConfirmed,
                    termsAgreedAt: existingUser.termsAgreedAt,
                },
            });
        }

        // Create new active user
        const newUser: UserRecord = {
            id: uuidv4(),
            email: normalizedEmail,
            passwordHash,
            username: normalizedEmail.split('@')[0],
            status: 'active',
            emailVerified: false,
            plan: 'free',
            credits: 20,
            locale: 'en',
            theme: 'dark',
            firstGenerationConfirmed: false,
            fingerprintHash: fingerprintHash || undefined,
            registrationIp: ip,
            freeCreditsExpireAt: now + SEVEN_DAYS_MS,
            termsAgreedAt: now,
            termsVersion: '1.0',
            agreements: {
                termsOfService: agreementRecord,
                contentPolicy: agreementRecord,
                privacyPolicy: agreementRecord,
                ageConfirmation: agreementRecord,
                minorContentBan: agreementRecord,
            },
            createdAt: now,
            updatedAt: now,
        };
        saveUser(newUser);

        // Log successful registration
        logRegistrationAttempt(ip, normalizedEmail, true);

        // Generate JWT token
        const token = signToken(newUser.id, newUser.email);

        return NextResponse.json({
            success: true,
            message: 'Account created successfully!',
            token,
            user: {
                id: newUser.id,
                email: newUser.email,
                username: newUser.username,
                plan: newUser.plan,
                credits: newUser.credits,
                locale: newUser.locale,
                theme: newUser.theme,
                status: newUser.status,
                firstGenerationConfirmed: newUser.firstGenerationConfirmed,
                termsAgreedAt: newUser.termsAgreedAt,
            },
        });
    } catch (error) {
        console.error('Register error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
