'use client';

import { useTranslations } from 'next-intl';
import { SuggestedPrompts } from './SuggestedPrompts';
import Image from 'next/image';
import { useUI } from '@/lib/hooks/ui/useUI';
import { IconInfoCircle } from '@tabler/icons-react';
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
                <div className="ml-2 group relative flex flex-row">
                  <Image
                    src={theme === 'dark' ? darkTextLogo : lightTextLogo}
                    alt="MSF Logo"
                    style={{
                      maxWidth: '150px',
                      maxHeight: '150px',
                    }}
                  />
                  <IconInfoCircle
                    size={20}
                    className="text-black dark:text-white"
                  />
                  <span className="tooltip absolute bg-gray-700 text-white text-center py-2 px-3 w-[255px] rounded-lg text-sm bottom-full left-1/2 transform -translate-x-1/2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-300">
                    Type question below to get started.
                    <br />
                    <br />
                    Individual chat settings can be modified with top banner gear icon.
                    <br />
                    <br />
                    Default settings can be modified in bottom left settings menu.
                  </span>
                </div>
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
