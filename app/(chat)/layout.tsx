import { redirect } from 'next/navigation';
import { AppProviders } from '@/components/providers/AppProviders';
import { auth } from '@/auth';

/**
 * Layout for authenticated chat pages
 * Provides session, providers, and global state
 */
export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
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
      {children}
    </AppProviders>
  );
}
