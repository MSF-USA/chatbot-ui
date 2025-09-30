import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from 'react-query';

import type { Session } from 'next-auth';
import { appWithTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';

import TermsAcceptanceProvider from '@/components/Terms/TermsAcceptanceProvider';

import { StorageMonitorProvider } from '@/contexts/StorageMonitorContext';
import { StreamingSettingsProvider } from '@/contexts/StreamingSettingsContext';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps<{ session: Session }>) {
  const queryClient = new QueryClient();

  return (
    <SessionProvider session={session}>
      <TermsAcceptanceProvider>
        <StreamingSettingsProvider>
          <StorageMonitorProvider>
            <div className={inter.className}>
              <Toaster />
              <QueryClientProvider client={queryClient}>
                <Component {...pageProps} />
              </QueryClientProvider>
            </div>
          </StorageMonitorProvider>
        </StreamingSettingsProvider>
      </TermsAcceptanceProvider>
    </SessionProvider>
  );
}

export default appWithTranslation(App);
