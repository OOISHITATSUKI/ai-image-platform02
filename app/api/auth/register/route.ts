import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
    findUserByEmail,
    saveUser,
    isDisposableEmail,
    isValidEmail,
    type UserRecord,
} from '@/lib/auth';

import { logRegistrationAttempt, countRecentAttemptsByIp } from '@/lib/db/registration_attempts';
import { saveGeneration } from '@/lib/db/generations';
import { unlockGuestImages } from '@/lib/db/guest_images';
import { rateLimit } from '@/lib/rateLimit';
import { supabaseAdmin } from '@/lib/supabase-server';
import { sendWelcomeEmail } from '@/lib/email';
import { markGuestGenerationsRegistered } from '@/lib/db/guest_generations';

const SUPPORTED_LOCALES = ['en', 'ja', 'es', 'zh', 'ko', 'pt'];
function normalizeLocale(locale: unknown): string {
    if (typeof locale === 'string') {
        const base = locale.split('-')[0].toLowerCase();
        if (SUPPORTED_LOCALES.includes(base)) return base;
    }
    return 'en';
}

const JWT_SECRET = process.env.JWT_SECRET || 'videogen-jwt-secret-change-in-production';
const SALT_ROUNDS = 10;

// 24 hours in MS
const REGISTRATION_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_ATTEMPTS_PER_IP = 10;
const MAX_ACCOUNTS_PER_IP = 3;

function getIp(req: NextRequest): string {
    return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        ?? req.headers.get('x-real-ip')
        ?? '0.0.0.0';
}

// POST: Direct account creation (email + password)
export async function POST(req: NextRequest) {
    try {
        const ip = getIp(req);

        // ── 1. General Rate Limit ──
        const rl = rateLimit(`${ip}:register`, MAX_ATTEMPTS_PER_IP, REGISTRATION_WINDOW_MS);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: 'Too many registration attempts. Please try again later.' },
                { status: 429, headers: { 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': rl.resetAt.toString() } }
            );
        }

        const { email, password, fingerprintHash, locale: rawLocale } = await req.json();
        const locale = normalizeLocale(rawLocale);

        if (!email || !isValidEmail(email)) {
            return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
        }
        if (!password || password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // ── 2. IP Registration Limit ──
        const recentAccounts = await countRecentAttemptsByIp(ip, REGISTRATION_WINDOW_MS);
        if (recentAccounts >= MAX_ACCOUNTS_PER_IP) {
            await logRegistrationAttempt(ip, normalizedEmail, false);
            return NextResponse.json(
                { error: 'Too many accounts created from this network. Please try again later.' },
                { status: 429 }
            );
        }

        // Block disposable emails
        if (isDisposableEmail(normalizedEmail)) {
            await logRegistrationAttempt(ip, normalizedEmail, false);
            return NextResponse.json({ error: 'This email domain is not allowed (Disposable Email)' }, { status: 400 });
        }

        // Check if already registered
        const existingUser = await findUserByEmail(normalizedEmail);
        if (existingUser && existingUser.status !== 'pending_otp' && existingUser.status !== 'pending_password') {
            return NextResponse.json({ error: 'This email is already registered' }, { status: 409 });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        const now = Date.now();
        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

        // Create or update user as active
        const userId = existingUser?.id || uuidv4();
        const newUser: UserRecord = {
            ...(existingUser || {}),
            id: userId,
            email: normalizedEmail,
            passwordHash,
            username: normalizedEmail.split('@')[0].slice(0, 20),
            status: 'active',
            emailVerified: false,
            plan: 'free',
            credits: existingUser?.credits ?? 20,
            locale,
            theme: 'dark',
            firstGenerationConfirmed: true,
            fingerprintHash: fingerprintHash || existingUser?.fingerprintHash,
            freeCreditsExpireAt: existingUser?.freeCreditsExpireAt ?? (now + SEVEN_DAYS_MS),
            registrationIp: ip,
            termsAgreedAt: now,
            termsVersion: '2025-01-01',
            agreements: {
                termsOfService: { agreedAt: now, version: '2025-01-01', ip },
                contentPolicy: { agreedAt: now, version: '2025-01-01', ip },
                privacyPolicy: { agreedAt: now, version: '2025-01-01', ip },
                ageConfirmation: { agreedAt: now, version: '2025-01-01', ip },
                minorContentBan: { agreedAt: now, version: '2025-01-01', ip },
                noRefund: { agreedAt: now, version: '2025-01-01', ip },
                personalUseOnly: { agreedAt: now, version: '2025-01-01', ip },
            },
            createdAt: existingUser?.createdAt ?? now,
            updatedAt: now,
        };

        await saveUser(newUser);
        await logRegistrationAttempt(ip, normalizedEmail, true);

        // Send welcome email (non-blocking)
        sendWelcomeEmail(normalizedEmail, locale).catch((e) =>
            console.error('[Register] Welcome email error:', e)
        );

        // Mark guest analytics records as registered
        try { markGuestGenerationsRegistered(ip); } catch {}


        // Enqueue step email sequences triggered by registration
        try {
            const { data: sequences } = await supabaseAdmin
                .from('step_email_sequences')
                .select('id, steps')
                .eq('trigger', 'on_register')
                .eq('is_active', true);
            if (sequences && sequences.length > 0) {
                const queueRows = sequences.map((seq: any) => {
                    const firstStep = seq.steps?.[0];
                    const delayMs = (firstStep?.delayHours ?? 24) * 60 * 60 * 1000;
                    return {
                        user_id: newUser.id,
                        sequence_id: seq.id,
                        current_step: 0,
                        next_send_at: now + delayMs,
                        status: 'pending',
                        created_at: now,
                    };
                });
                await supabaseAdmin.from('step_email_queue').insert(queueRows);
            }
        } catch (e) {
            console.error('[Register] Step email enqueue error:', e);
        }

        // ── Unlock guest images: move to user's library (watermark-free) ──
        let unlockedCount = 0;
        const unlockedImages: { id: string; url: string; prompt: string; type: string }[] = [];
        try {
            const guestImages = unlockGuestImages(ip, userId);

            for (const img of guestImages) {
                // Add the ORIGINAL (watermark-free) image to user's generation library
                saveGeneration({
                    userId,
                    prompt: img.prompt || 'Guest generation (unlocked)',
                    modelName: 'novita-helloworld-xl',
                    params: {},
                    fileUrl: img.originalPath,
                    fileType: 'image',
                    generationType: (img.generationType === 'faceswap' ? 'faceswap' : img.generationType === 'inpaint' ? 'inpaint' : 'txt2img') as 'txt2img' | 'img2img' | 'inpaint' | 'faceswap',
                    creditsUsed: 0,
                    status: 'success',
                });

                unlockedImages.push({
                    id: img.id,
                    url: img.originalPath,
                    prompt: img.prompt || '',
                    type: img.generationType,
                });
            }
            unlockedCount = guestImages.length;

            if (unlockedCount > 0) {
                console.log(`[Register] Unlocked ${unlockedCount} guest images for user ${userId}`);
            }
        } catch (e) {
            console.error('[Register] Guest image unlock error:', e);
        }

        // Generate JWT
        const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '30d' });

        return NextResponse.json({
            success: true,
            token,
            unlockedCount,
            unlockedImages,
            user: {
                id: newUser.id,
                email: newUser.email,
                username: newUser.username,
                plan: newUser.plan,
                credits: newUser.credits,
                locale: newUser.locale,
                theme: newUser.theme,
                firstGenerationConfirmed: true,
                termsAgreedAt: newUser.termsAgreedAt,
                emailVerified: false,
            },
        });
    } catch (error) {
        console.error('Register error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
