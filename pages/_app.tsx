import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from 'react-query';
import { SessionProvider } from "next-auth/react"

import { appWithTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';
import type { Session } from "next-auth"
import { Inter } from 'next/font/google';
import { useState } from 'react';
import RefreshTokenHandler from '../components/RefreshTokenHandler';


import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

function App({ Component, pageProps: { session, ...pageProps } }: AppProps<{ session: Session }>) {
  const queryClient = new QueryClient();
  const [interval, setInterval] = useState(0);

  return (
    <SessionProvider session={session}>
    <div className={inter.className}>
      <Toaster />
      <QueryClientProvider client={queryClient}>
        <Component {...pageProps} />
      </QueryClientProvider>
    </div>
    </SessionProvider>
  );
}

export default appWithTranslation(App);
