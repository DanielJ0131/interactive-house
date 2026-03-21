// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // We check for a cookie named 'auth_session'
    const session = request.cookies.get('auth_session')?.value;
    const { pathname } = request.nextUrl;

    // PROTECT THE HUB: Redirect guests to login
    if (!session && pathname.startsWith('/hub')) {
        return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    // PROTECT GUEST/LOGIN PAGES: Redirect logged-in users to the hub
    if (session && (pathname.startsWith('/auth') || pathname === '/guest')) {
        return NextResponse.redirect(new URL('/hub', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/hub/:path*', '/auth/:path*', '/guest'],
};