import { NextRequest, NextResponse } from 'next/server';

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

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Admin basic auth protection
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

    // Block search engine indexing for non-whitelisted paths (spam URL protection)
    if (!isAllowedPath(pathname)) {
        const response = NextResponse.next();
        response.headers.set('X-Robots-Tag', 'noindex, nofollow');
        return response;
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
