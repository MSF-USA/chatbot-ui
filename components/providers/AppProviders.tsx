'use client';

import { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { LDProvider } from 'launchdarkly-react-client-sdk';
import { Session } from 'next-auth';
import TermsAcceptanceProvider from '@/components/Terms/TermsAcceptanceProvider';
import { StreamingSettingsProvider } from '@/lib/context/StreamingSettingsContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

interface AppProvidersProps {
  children: ReactNode;
  session?: Session | null;
  launchDarklyClientId?: string;
  userContext?: {
    id: string;
    email?: string;
    givenName?: string;
    surname?: string;
    displayName?: string;
    jobTitle?: string;
    department?: string;
    companyName?: string;
  };
}

/**
 * Wrapper for all application providers
 * Composes: Session, React Query, LaunchDarkly, Terms, Streaming Settings, Toast
 */
export function AppProviders({
  children,
  session,
  launchDarklyClientId,
  userContext,
}: AppProvidersProps) {
  return (
    <SessionProvider session={session} refetchInterval={5 * 60} refetchOnWindowFocus={true}>
      <QueryClientProvider client={queryClient}>
        {launchDarklyClientId ? (
          <LDProvider
            clientSideID={launchDarklyClientId}
            options={{
              bootstrap: 'localStorage',
              sendEvents: true,
            }}
            context={{
              kind: 'user',
              key: userContext?.id || 'anonymous-user',
              email: userContext?.email,
              givenName: userContext?.givenName,
              surName: userContext?.surname,
              displayName: userContext?.displayName,
              jobTitle: userContext?.jobTitle,
              department: userContext?.department,
              companyName: userContext?.companyName,
            }}
          >
            <TermsAcceptanceProvider>
              <StreamingSettingsProvider>
                <Toaster position="top-center" />
                {children}
              </StreamingSettingsProvider>
            </TermsAcceptanceProvider>
          </LDProvider>
        ) : (
          <TermsAcceptanceProvider>
            <StreamingSettingsProvider>
              <Toaster position="top-center" />
              {children}
            </StreamingSettingsProvider>
          </TermsAcceptanceProvider>
        )}
      </QueryClientProvider>
    </SessionProvider>
  );
}
