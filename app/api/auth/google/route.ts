import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

const SUPPORTED_LOCALES = ['en', 'ja', 'es', 'zh', 'ko', 'pt'];

export async function GET(req: NextRequest) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
        return NextResponse.redirect(new URL('/login?error=google_not_configured', req.url));
    }

    const state = randomBytes(16).toString('hex');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://imagenude.com';
    const redirectUri = `${appUrl}/api/auth/google/callback`;

    // Capture browser locale from query param to pass through OAuth redirect
    const rawLocale = req.nextUrl.searchParams.get('locale') ?? '';
    const base = rawLocale.split('-')[0].toLowerCase();
    const locale = SUPPORTED_LOCALES.includes(base) ? base : 'en';

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state,
        access_type: 'offline',
        prompt: 'select_account',
    });

    const response = NextResponse.redirect(
        `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    );

    response.cookies.set('google_oauth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 600,
        path: '/',
        sameSite: 'lax',
    });

    response.cookies.set('google_oauth_locale', locale, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 600,
        path: '/',
        sameSite: 'lax',
    });

    return response;
}
