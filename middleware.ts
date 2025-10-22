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

  const response = handleI18nRouting(req as unknown as NextRequest);

  // If i18n is trying to redirect (307/308), just continue instead
  // This prevents redirect loops when localePrefix is 'never'
  if (response && (response.status === 307 || response.status === 308)) {
    return NextResponse.next();
  }

  return response;
});

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip API routes and static files entirely
  if (pathname.startsWith('/api') || pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  const isPublicPage = publicPathnameRegex.test(pathname);

  // For public pages, only run i18n middleware (don't wrap in auth)
  if (isPublicPage) {
    return handleI18nRouting(req);
  }

  // For protected pages, run auth middleware which includes i18n
  return (authMiddleware as any)(req);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|_vercel|.*\\..*).*)',
  ],
};
