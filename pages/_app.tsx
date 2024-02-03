import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from 'react-query';
import { SessionProvider } from "next-auth/react"

import { appWithTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';
import type { Session } from "next-auth"
import { Inter } from 'next/font/google';
import type { Metadata } from "next";


import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "MSF AI Assistant",
  description: "Chat GPT AI Assistant for MSF Staff",
  generator: "Next.js",
  manifest: "/manifest.json",
  themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#fff" }],
  authors: [
    { name: "MSF-USA" },
    {
      name: "MSF USA",
      url: "https://ai.msf.org",
    },
  ],
  viewport:
    "minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, viewport-fit=cover",
  icons: [
    { rel: "apple-touch-icon", url: "icons/icon-128x128.png" },
    { rel: "icon", url: "icons/icon-128x128.png" },
  ],
};

function App({ Component, pageProps: { session, ...pageProps } }: AppProps<{ session: Session }>) {
  const queryClient = new QueryClient();

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
