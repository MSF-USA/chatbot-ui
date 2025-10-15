import createMiddleware from 'next-intl/middleware';
import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { routing } from './config/i18n';

const handleI18nRouting = createMiddleware(routing);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Skip middleware entirely for API routes (especially auth callbacks)
  if (pathname.startsWith('/api')) {
    return;
  }

  // Allow public routes (signin, auth-error)
  const publicRoutes = ['/signin', '/auth-error'];
  const isPublicRoute = publicRoutes.some(route => pathname.includes(route));

  // Require auth for protected routes
  if (!isPublicRoute && !req.auth) {
    const signInUrl = new URL('/signin', req.url);
    return Response.redirect(signInUrl);
  }

  // Run i18n middleware for all non-API requests
  return handleI18nRouting(req as unknown as NextRequest);
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|_vercel|.*\\..*).*)',
  ],
};
