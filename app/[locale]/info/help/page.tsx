import { HelpPageClient } from './HelpPageClient';

import { auth } from '@/auth';

export default async function HelpPage() {
  const session = await auth();
  const isUSUser = session?.user?.region === 'US';
  const supportEmail = isUSUser
    ? 'ai@newyork.msf.org'
    : 'ai.team@amsterdam.msf.org';

  return <HelpPageClient isUSUser={isUSUser} supportEmail={supportEmail} />;
}
