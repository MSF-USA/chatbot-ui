'use client';

import { useTranslation } from 'next-i18next';
import { SuggestedPrompts } from './SuggestedPrompts';
import Image from 'next/image';
import { useUI } from '@/lib/hooks/ui/useUI';
import lightTextLogo from '@/public/international_logo_black.png';
import darkTextLogo from '@/public/international_logo_white.png';

/**
 * Empty state shown when no messages in conversation
 */
export function EmptyState() {
  const { t } = useTranslation('chat');
  const { theme } = useUI();

  return (
    <div className="flex h-full flex-col items-center justify-center space-y-8 px-4">
      {/* Logo */}
      <div className="flex flex-col items-center space-y-4">
        <Image
          src={theme === 'dark' ? darkTextLogo : lightTextLogo}
          alt="MSF Logo"
          width={200}
          height={60}
          priority
        />
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">
          {t('welcomeMessage') || 'How can I help you today?'}
        </h1>
      </div>

      {/* Suggested Prompts */}
      <SuggestedPrompts />
    </div>
  );
}
