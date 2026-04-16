import { NextRequest, NextResponse } from 'next/server';

// ボットフィルタリング対象の国コード
const CHALLENGE_COUNTRIES = ['CN'];
const CHALLENGE_COOKIE = 'geo_verified';

// Whitelisted path prefixes that are legitimate routes
const ALLOWED_PREFIXES = [
    '/editor',
    '/login',
    '/register',
    '/blog',
    '/face-swap',
    '/library',
    '/settings',
    '/admin',
    '/api',
    '/_next',
];

function isAllowedPath(pathname: string): boolean {
    if (pathname === '/') return true;
    return ALLOWED_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'));
}

function getCountry(request: NextRequest): string {
    // nginx GeoIPモジュールが設定するヘッダー
    const geoCountry = request.headers.get('x-geo-country');
    // Cloudflare経由の場合（将来対応）
    const cfCountry = request.headers.get('cf-ipcountry');

    return geoCountry ?? cfCountry ?? 'XX';
}

/**
 * JSチャレンジページを返す
 * ボット（JS未実行）→ ここで止まる
 * 本物のブラウザ → Cookie設定 → 自動リロードで通過
 */
function serveJsChallenge(): NextResponse {
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Verifying...</title>
<script>document.cookie="${CHALLENGE_COOKIE}=1;path=/;max-age=86400;SameSite=Lax";location.reload();</script>
</head><body><noscript><p>Please enable JavaScript to access this site.</p></noscript></body></html>`;

    return new NextResponse(html, {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
    });
}

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // --- 中国ボットフィルタリング（JSチャレンジ） ---
    const country = getCountry(req);
    if (CHALLENGE_COUNTRIES.includes(country)) {
        const verified = req.cookies.get(CHALLENGE_COOKIE)?.value;
        if (!verified) {
            // APIリクエスト → 403（JSチャレンジ不可のため）
            if (pathname.startsWith('/api/')) {
                return new NextResponse(
                    JSON.stringify({ error: 'Access not available in your region' }),
                    { status: 403, headers: { 'content-type': 'application/json' } }
                );
            }
            // ページリクエスト → JSチャレンジ
            return serveJsChallenge();
        }
    }

    // --- Admin basic auth protection ---
    if (pathname.startsWith('/admin')) {
        const basicAuth = req.headers.get('authorization');

        if (basicAuth) {
            const authValue = basicAuth.split(' ')[1];
            const [user, password] = atob(authValue).split(':');

            const adminPassword = process.env.ADMIN_PASSWORD || 'admin';

            if (user === 'admin' && password === adminPassword) {
                return NextResponse.next();
            }
        }

        return new NextResponse('Unauthorized', {
            status: 401,
            headers: {
                'WWW-Authenticate': 'Basic realm="Admin Panel"',
            },
        });
    }

    // --- Block search engine indexing for non-whitelisted paths (spam URL protection) ---
    if (!isAllowedPath(pathname)) {
        const response = NextResponse.next();
        response.headers.set('X-Robots-Tag', 'noindex, nofollow');
        return response;
    }

    return NextResponse.next();
}

export const config = {
    // Exclude the admin upload endpoints so the middleware body-size limit
    // (default 10MB in Next.js 16) doesn't truncate multipart uploads.
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|videos/|images/|outputs/|api/admin/upload-companion-video|api/admin/upload-companion-image).*)',
    ],
};
