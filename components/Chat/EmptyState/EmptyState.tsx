'use client';

import React from 'react';

import Image from 'next/image';

import { useUI } from '@/lib/hooks/ui/useUI';

import { SuggestedPrompts } from './SuggestedPrompts';

import lightTextLogo from '@/public/international_logo_black.png';
import darkTextLogo from '@/public/international_logo_white.png';

interface EmptyStateProps {
  onSelectPrompt?: (prompt: string) => void;
}

/**
 * Empty state shown when no messages in conversation
 */
export function EmptyState({ onSelectPrompt }: EmptyStateProps) {
  const { theme } = useUI();

  return (
    <div className="w-full flex flex-col items-center">
      <div className="flex items-center gap-4 mb-10">
        <Image
          src={theme === 'dark' ? darkTextLogo : lightTextLogo}
          alt="MSF Logo"
          priority
          style={{
            width: '80px',
            height: 'auto',
          }}
        />
        <h2 className="text-3xl font-extralight text-gray-700 dark:text-gray-200">
          Here to help
        </h2>
      </div>
      <SuggestedPrompts onSelectPrompt={onSelectPrompt} />
    </div>
  );
}
