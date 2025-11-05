import { HelpPageClient } from './HelpPageClient';

import { auth } from '@/auth';

interface PageProps {
  params: Promise<{
    locale: string;
  }>;
}

// Define available FAQ locales
const AVAILABLE_FAQ_LOCALES = ['en', 'fr', 'es'];

export default async function HelpPage({ params }: PageProps) {
  const session = await auth();
  const { locale } = await params;
  const isUSUser = session?.user?.region === 'US';
  const supportEmail = isUSUser
    ? 'ai@newyork.msf.org'
    : 'ai.team@amsterdam.msf.org';

  // Load all available FAQ translations
  const faqTranslations: Record<string, any> = {};
  for (const loc of AVAILABLE_FAQ_LOCALES) {
    try {
      const data = await import(`@/lib/data/faq.${loc}.json`);
      // Handle both default export and direct faq property
      faqTranslations[loc] = data.default?.faq || data.faq;
      console.log(
        `[FAQ Page] Loaded ${loc} FAQ with ${faqTranslations[loc]?.length || 0} items`,
      );
    } catch (error) {
      console.error(`Failed to load FAQ for locale ${loc}:`, error);
      // Skip if translation doesn't exist
    }
  }

  // Determine initial locale - use user's locale if available, otherwise English
  const initialLocale = AVAILABLE_FAQ_LOCALES.includes(locale) ? locale : 'en';
  console.log(
    `[FAQ Page] User locale: ${locale}, Initial locale: ${initialLocale}`,
  );

  return (
    <HelpPageClient
      isUSUser={isUSUser}
      supportEmail={supportEmail}
      faqTranslations={faqTranslations}
      initialLocale={initialLocale}
      availableLocales={AVAILABLE_FAQ_LOCALES}
    />
  );
}
