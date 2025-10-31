import { redirect } from 'next/navigation';

import { AppProviders } from '@/components/Providers/AppProviders';

import { ChatShell } from './ChatShell';

import { auth } from '@/auth';

/**
 * Layout for authenticated chat pages
 * Server component that handles auth and provides session/providers
 * ChatShell is the client component that manages the UI structure
 */
export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect('/signin');
  }

  return (
    <AppProviders
      session={session}
      launchDarklyClientId={process.env.LAUNCHDARKLY_CLIENT_ID}
      userContext={{
        id: session.user?.id || 'anonymous',
        email: session.user?.mail,
        givenName: session.user?.givenName,
        surname: session.user?.surname,
        displayName: session.user?.displayName,
        jobTitle: session.user?.jobTitle,
        department: session.user?.department,
        companyName: session.user?.companyName,
      }}
    >
      <ChatShell>{children}</ChatShell>
    </AppProviders>
  );
}
