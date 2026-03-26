import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import {
    findUserByEmail,
    saveUser,
    type UserRecord,
} from '@/lib/auth';
import { saveGeneration } from '@/lib/db/generations';
import { unlockGuestImages } from '@/lib/db/guest_images';
import { supabaseAdmin } from '@/lib/supabase-server';

const JWT_SECRET = process.env.JWT_SECRET || 'videogen-jwt-secret-change-in-production';

function getIp(req: NextRequest): string {
    return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        ?? req.headers.get('x-real-ip')
        ?? '0.0.0.0';
}

interface GoogleTokenResponse {
    access_token: string;
    id_token: string;
    token_type: string;
    error?: string;
}

interface GoogleUserInfo {
    sub: string;
    email: string;
    email_verified: boolean;
    name: string;
    given_name?: string;
    picture?: string;
}

export async function GET(req: NextRequest) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://imagenude.com';
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    // User denied access
    if (errorParam) {
        return NextResponse.redirect(new URL('/login?error=google_denied', appUrl));
    }

    if (!code || !state) {
        return NextResponse.redirect(new URL('/login?error=google_invalid', appUrl));
    }

    // Verify state
    const savedState = req.cookies.get('google_oauth_state')?.value;
    if (!savedState || savedState !== state) {
        return NextResponse.redirect(new URL('/login?error=google_state_mismatch', appUrl));
    }

    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    const redirectUri = `${appUrl}/api/auth/google/callback`;

    // Exchange code for tokens
    let tokenData: GoogleTokenResponse;
    try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }),
        });
        tokenData = await tokenRes.json();
        if (tokenData.error) {
            console.error('[Google OAuth] Token exchange error:', tokenData.error);
            return NextResponse.redirect(new URL('/login?error=google_token', appUrl));
        }
    } catch (e) {
        console.error('[Google OAuth] Token exchange failed:', e);
        return NextResponse.redirect(new URL('/login?error=google_token', appUrl));
    }

    // Get user info
    let googleUser: GoogleUserInfo;
    try {
        const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        googleUser = await userRes.json();
        if (!googleUser.email) throw new Error('No email in Google profile');
    } catch (e) {
        console.error('[Google OAuth] User info failed:', e);
        return NextResponse.redirect(new URL('/login?error=google_userinfo', appUrl));
    }

    const ip = getIp(req);
    const now = Date.now();
    const normalizedEmail = googleUser.email.toLowerCase().trim();

    // Find or create user
    let user = await findUserByEmail(normalizedEmail);
    let isNewUser = false;

    if (!user) {
        isNewUser = true;
        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
        const newUser: UserRecord = {
            id: uuidv4(),
            email: normalizedEmail,
            passwordHash: '',
            username: googleUser.name?.replace(/\s+/g, '').slice(0, 20) || normalizedEmail.split('@')[0].slice(0, 20),
            status: 'active',
            emailVerified: googleUser.email_verified ?? true,
            plan: 'free',
            credits: 20,
            locale: 'en',
            theme: 'dark',
            firstGenerationConfirmed: true,
            registrationIp: ip,
            freeCreditsExpireAt: now + SEVEN_DAYS_MS,
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
            authProvider: 'google',
            googleId: googleUser.sub,
            avatarUrl: googleUser.picture ?? undefined,
            displayName: googleUser.name ?? undefined,
            createdAt: now,
            updatedAt: now,
            lastLoginAt: now,
        };
        await saveUser(newUser);
        user = newUser;

        // Enqueue step email sequences
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
                        user_id: user!.id,
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
            console.error('[Google OAuth] Step email enqueue error:', e);
        }
    } else {
        // Existing user: update last login and Google info if not set
        user.lastLoginAt = now;
        user.updatedAt = now;
        if (!user.googleId) {
            user.googleId = googleUser.sub;
            user.authProvider = user.authProvider ?? 'google';
        }
        if (!user.avatarUrl && googleUser.picture) {
            user.avatarUrl = googleUser.picture;
        }
        await saveUser(user);
    }

    // Unlock guest images
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
    } catch (e) {
        console.error('[Google OAuth] Guest image unlock error:', e);
    }

    // Generate JWT
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });

    // Store auth result in a short-lived cookie for the client to pick up
    const authResult = JSON.stringify({
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
            firstGenerationConfirmed: true,
            termsAgreedAt: user.termsAgreedAt,
            emailVerified: user.emailVerified,
            avatarUrl: user.avatarUrl,
            displayName: user.displayName,
            authProvider: user.authProvider,
        },
    });

    const response = NextResponse.redirect(new URL('/auth/callback', appUrl));

    // Clear state cookie
    response.cookies.delete('google_oauth_state');

    // Set short-lived auth result cookie (readable by JS)
    response.cookies.set('google_auth_result', authResult, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60,
        path: '/',
        sameSite: 'lax',
    });

    return response;
}
