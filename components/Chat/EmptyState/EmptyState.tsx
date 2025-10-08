'use client';

import { useTranslations } from 'next-intl';
import { SuggestedPrompts } from './SuggestedPrompts';
import Image from 'next/image';
import { useUI } from '@/lib/hooks/ui/useUI';
import lightTextLogo from '@/public/international_logo_black.png';
import darkTextLogo from '@/public/international_logo_white.png';

interface EmptyStateProps {
  onSelectPrompt?: (prompt: string) => void;
}

/**
 * Empty state shown when no messages in conversation
 */
export function EmptyState({ onSelectPrompt }: EmptyStateProps) {
  const t = useTranslations();
  const { theme } = useUI();

  return (
    <div className="flex h-[88%] items-center justify-center">
      <div className="mx-auto flex flex-col px-3">
        <div className="text-center text-3xl font-thin text-gray-800 dark:text-gray-100">
          <div className="flex flex-col items-center">
            <div className="flex flex-row justify-center items-end">
              <div className="flex-shrink-0 flex flex-col items-center">
                <Image
                  src={theme === 'dark' ? darkTextLogo : lightTextLogo}
                  alt="MSF Logo"
                  priority
                  style={{
                    maxWidth: '150px',
                    maxHeight: '150px',
                  }}
                />
              </div>
            </div>
            <div className="mt-8 flex justify-center w-full">
              <SuggestedPrompts onSelectPrompt={onSelectPrompt} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
