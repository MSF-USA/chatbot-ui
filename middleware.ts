export { auth as middleware } from '@/auth';

export const config = {
  matcher: [
    '/((?!api/auth|auth/signin|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
