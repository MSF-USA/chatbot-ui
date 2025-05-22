import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from 'react-query';
import { SessionProvider } from "next-auth/react"

import { appWithTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';
import type { Session } from "next-auth"
import { Inter } from 'next/font/google';

import TermsAcceptanceProvider from '@/components/Terms/TermsAcceptanceProvider';
import { StreamingSettingsProvider } from '@/context/StreamingSettingsContext';

import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

function App({ Component, pageProps: { session, ...pageProps } }: AppProps<{ session: Session }>) {
  const queryClient = new QueryClient();

  return (
    <SessionProvider session={session}>
      <TermsAcceptanceProvider>
        <StreamingSettingsProvider>
          <div className={inter.className}>
            <Toaster />
            <QueryClientProvider client={queryClient}>
              <Component {...pageProps} />
            </QueryClientProvider>
          </div>
        </StreamingSettingsProvider>
      </TermsAcceptanceProvider>
    </SessionProvider>
  );
}

export default appWithTranslation(App);
