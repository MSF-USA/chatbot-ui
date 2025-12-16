'use client';

import React from 'react';

import { useTranslations } from 'next-intl';

interface EmptyStateProps {
  userName?: string;
}

/**
 * Empty state header with greeting.
 * Displays a localized greeting message with optional user name.
 */
export function EmptyState({ userName }: EmptyStateProps) {
  const t = useTranslations('emptyState');

  return (
    <div className="flex items-center justify-center">
      <h1 className="text-2xl font-light bg-gradient-to-r from-[#F73837] from-0% via-rose-500 via-15% to-rose-900 to-100% dark:from-[#F73837] dark:from-0% dark:via-[#FF8A89] dark:via-15% dark:to-gray-400 dark:to-100% bg-clip-text text-transparent">
        {t('greeting')}
        {userName ? `, ${userName}` : ''}?
      </h1>
    </div>
  );
}
