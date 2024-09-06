import { Toaster } from 'react-hot-toast';

import { NextIntlClientProvider } from 'next-intl';
import { Inter } from 'next/font/google';
import { useRouter } from 'next/router';

import { HomeProvider } from './home-provider';

import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'MSF AI Assistant',
  description: 'Chat GPT AI Assistant for MSF Staff - Internal Use Only',
  viewport:
    'width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=no',
  themeColor: '#FFF',
  appleWebApp: {
    capable: 'yes',
    title: 'MSF AI Assistant',
    statusBarStyle: 'black-translucent',
  },
  robots: 'noindex, nofollow',
  manifest: '/manifest.json',
  icons: [
    {
      rel: 'icon',
      url: '/icons/favicon-16x16.png',
      sizes: '16x16',
      type: 'image/png',
    },
    {
      rel: 'icon',
      url: '/icons/favicon-32x32.png',
      sizes: '32x32',
      type: 'image/png',
    },
    { rel: 'apple-touch-icon', url: '/icons/icon-192x192.png' },
    { rel: 'icon', url: '/icons/icon-192x192.png' },
  ],
};

export default async function RootLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  let messages;
  try {
    messages = (await import(`../public/locales/${locale}/common.json`))
      .default;
  } catch (error) {
    console.error(`Could not load messages for locale "${locale}":`, error);
    throw new Error('Locale messages not found');
  }

  return (
    <html lang="en" className={inter.className}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Toaster />
          <HomeProvider>{children}</HomeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
