import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

import { locales, routing } from './config/i18n';

import { auth } from '@/auth';

const handleI18nRouting = createMiddleware(routing);

// Public pages that don't require authentication
const publicPages = ['/signin', '/auth-error'];

// Regex to match public pages with optional locale prefix
const publicPathnameRegex = RegExp(
  `^(/(${locales.join('|')})?)?(${publicPages.map((p) => p.replace('/', '\\/')).join('|')}|/api)/?$`,
  'i',
);

// Auth middleware that also handles i18n
const authMiddleware = auth((req) => {
  // For authenticated routes, run i18n middleware
  if (!req.auth) {
    const signInUrl = new URL('/signin', req.url);
    return NextResponse.redirect(signInUrl);
  }
  return handleI18nRouting(req as unknown as NextRequest);
});

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip API routes and static files entirely
  if (pathname.startsWith('/api') || pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  const isPublicPage = publicPathnameRegex.test(pathname);

  let response: NextResponse;

  // For public pages, only run i18n middleware (don't wrap in auth)
  if (isPublicPage) {
    response = handleI18nRouting(req);
  } else {
    // For protected pages, run auth middleware which includes i18n
    response = (authMiddleware as any)(req);
  }

  // Add security headers to all responses
  if (response) {
    // Prevent clickjacking attacks
    response.headers.set('X-Frame-Options', 'DENY');

    // Prevent MIME type sniffing
    response.headers.set('X-Content-Type-Options', 'nosniff');

    // Enable XSS protection (legacy, but doesn't hurt)
    response.headers.set('X-XSS-Protection', '1; mode=block');

    // Control referrer information
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Content Security Policy (strict - adjust based on your needs)
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://login.microsoftonline.com; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "font-src 'self' data:; " +
        "connect-src 'self' https://login.microsoftonline.com https://graph.microsoft.com https://*.ai.msfusa.org; " +
        "frame-ancestors 'none';",
    );

    // Permissions Policy (formerly Feature-Policy)
    response.headers.set(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()',
    );
  }

  return response;
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|_vercel|.*\\..*).*)',
  ],
};
