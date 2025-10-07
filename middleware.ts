import createMiddleware from 'next-intl/middleware';
import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { routing } from './config/i18n';

const handleI18nRouting = createMiddleware(routing);

export default auth((req) => {
  // Run i18n middleware for all requests
  return handleI18nRouting(req as unknown as NextRequest);
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|_vercel|.*\\..*).*)',
  ],
};
