'use client';

import { IconAlertTriangle, IconCopy, IconRefresh } from '@tabler/icons-react';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

import { FEEDBACK_EMAIL, US_FEEDBACK_EMAIL } from '@/types/contact';

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { data: session } = useSession();
  const [copied, setCopied] = useState(false);

  const supportEmail =
    session?.user?.region === 'US' ? US_FEEDBACK_EMAIL : FEEDBACK_EMAIL;

  useEffect(() => {
    console.error('Chat error:', error);
  }, [error]);

  const copyErrorToClipboard = async () => {
    const errorText = `Error: ${error.message || 'Failed to load chat'}${error.digest ? `\nError ID: ${error.digest}` : ''}`;
    await navigator.clipboard.writeText(errorText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-full w-full items-center justify-center bg-white dark:bg-[#212121] p-4">
      <div className="relative rounded-xl bg-white dark:bg-[#171717] p-6 shadow-xl border border-red-200 dark:border-red-900/50 w-full max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header with Icon and Title */}
        <div className="flex items-center gap-4 mb-6">
          <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-3 flex-shrink-0">
            <IconAlertTriangle
              size={24}
              className="text-red-600 dark:text-red-400"
              strokeWidth={2}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Something went wrong
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              An error occurred while loading the chat
            </p>
          </div>
        </div>

        {/* Error Message with Copy Button */}
        <div className="rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 px-4 py-4 mb-6">
          <div className="flex items-start justify-between gap-3 mb-3">
            <p className="text-sm text-red-800 dark:text-red-300 break-words font-mono flex-1 leading-relaxed">
              {error.message || 'Failed to load chat'}
            </p>
            <button
              onClick={copyErrorToClipboard}
              className="flex-shrink-0 p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              title="Copy error message"
            >
              {copied ? (
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                  ✓
                </span>
              ) : (
                <IconCopy
                  size={16}
                  className="text-red-600 dark:text-red-400"
                />
              )}
            </button>
          </div>
          {error.digest && (
            <p className="text-xs text-red-700 dark:text-red-400 font-mono">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        {/* Reload Button */}
        <button
          onClick={() => window.location.reload()}
          className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-4 py-2 text-white text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 group mb-5"
        >
          <IconRefresh
            size={16}
            className="group-hover:rotate-180 transition-transform duration-500"
          />
          Reload chat
        </button>

        {/* Support Instructions */}
        <div className="text-center">
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            If this issue persists, please contact support at{' '}
            <a
              href={`mailto:${supportEmail}`}
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              {supportEmail}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
