import { HelpPageClient } from './HelpPageClient';

import { auth } from '@/auth';

interface PageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default async function HelpPage({ params }: PageProps) {
  const session = await auth();
  const { locale } = await params;
  const isUSUser = session?.user?.region === 'US';
  const supportEmail = isUSUser
    ? 'ai@newyork.msf.org'
    : 'ai.team@amsterdam.msf.org';

  // Load locale-specific FAQ data, fallback to English
  let faqData;
  try {
    faqData = await import(`@/lib/data/faq.${locale}.json`);
  } catch {
    faqData = await import('@/lib/data/faq.en.json');
  }

  return (
    <HelpPageClient
      isUSUser={isUSUser}
      supportEmail={supportEmail}
      faqData={faqData.faq}
    />
  );
}
