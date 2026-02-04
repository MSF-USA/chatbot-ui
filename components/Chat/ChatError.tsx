import { IconRefresh, IconX } from '@tabler/icons-react';
import React from 'react';

import { useTranslations } from 'next-intl';

interface ChatErrorProps {
  error: string | null;
  onClearError: () => void;
  onRegenerate?: () => void;
  canRegenerate?: boolean;
}

/**
 * ChatError component
 * Displays error messages with dismiss button and optional regenerate button
 */
export const ChatError: React.FC<ChatErrorProps> = ({
  error,
  onClearError,
  onRegenerate,
  canRegenerate = false,
}) => {
  const t = useTranslations();

  if (!error) return null;

  return (
    <div className="absolute bottom-[160px] left-0 right-0 px-4 py-2">
      <div className="mx-auto max-w-3xl rounded-lg bg-red-100 p-4 text-red-800 dark:bg-red-900 dark:text-red-200 flex items-start justify-between">
        <span className="flex-1">{error}</span>
        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
          {canRegenerate && onRegenerate && (
            <button
              onClick={onRegenerate}
              className="flex items-center gap-1.5 px-3 py-1 text-sm font-medium bg-red-200 dark:bg-red-800 rounded hover:bg-red-300 dark:hover:bg-red-700 transition-colors"
              aria-label={t('chat.regenerate')}
            >
              <IconRefresh size={16} />
              <span>{t('chat.regenerate')}</span>
            </button>
          )}
          <button
            onClick={onClearError}
            className="text-red-800 dark:text-red-200 hover:text-red-600 dark:hover:text-red-100 transition-colors"
            aria-label={t('errors.dismissError')}
          >
            <IconX size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
