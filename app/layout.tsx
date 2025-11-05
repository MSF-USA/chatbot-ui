import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';

import 'katex/dist/katex.min.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MSF AI Assistant',
  description: 'AI Assistant for MSF Staff - Internal Use Only',
  applicationName: 'MSF AI Assistant',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MSF AI',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#212121' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

/**
 * Root layout for the entire application
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Read UI preferences from localStorage (simple JSON format)
                  var prefs = localStorage.getItem('ui-preferences');
                  var parsed = prefs ? JSON.parse(prefs) : null;

                  // Apply theme before hydration to prevent flash
                  var theme = parsed?.theme || 'dark';

                  // Store the actual theme preference in a data attribute
                  document.documentElement.setAttribute('data-theme-preference', theme);

                  // Determine if dark mode should be applied
                  var isDark = theme === 'dark' ||
                    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }

                  // Set sidebar state (default to collapsed)
                  var showChatbar = parsed?.showChatbar ?? false;
                  document.documentElement.setAttribute('data-sidebar-state', showChatbar ? 'expanded' : 'collapsed');

                  // Set promptbar state (default to expanded)
                  var showPromptbar = parsed?.showPromptbar ?? true;
                  document.documentElement.setAttribute('data-promptbar-state', showPromptbar ? 'expanded' : 'collapsed');
                } catch (e) {
                  // Fallback to defaults on error
                  document.documentElement.classList.add('dark');
                  document.documentElement.setAttribute('data-theme-preference', 'dark');
                  document.documentElement.setAttribute('data-sidebar-state', 'collapsed');
                  document.documentElement.setAttribute('data-promptbar-state', 'expanded');
                }
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
