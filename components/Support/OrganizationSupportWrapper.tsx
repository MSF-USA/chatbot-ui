'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

import { Session } from 'next-auth';

interface OrganizationSupportWrapperProps {
  /** Session from server-side auth() call */
  session: Session | null;
  /** Content that requires SessionProvider (e.g., OrganizationSelector) */
  children: ReactNode;
}

/**
 * Wrapper component that provides SessionProvider for organization support components.
 * Use this in pages that are outside the main (chat) route group which has AppProviders.
 *
 * @example
 * // In a server component
 * const session = await auth();
 *
 * // In the client component
 * <OrganizationSupportWrapper session={session}>
 *   <OrganizationSelector />
 *   <SupportContact />
 * </OrganizationSupportWrapper>
 */
export function OrganizationSupportWrapper({
  session,
  children,
}: OrganizationSupportWrapperProps) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
