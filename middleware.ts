import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Only protect /admin routes
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

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin', '/admin/:path*'],
};
