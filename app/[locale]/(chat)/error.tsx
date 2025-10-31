'use client';

import { useEffect } from 'react';

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Chat error:', error);
  }, [error]);

  return (
    <div className="flex h-full items-center justify-center bg-white dark:bg-[#212121]">
      <div className="rounded-lg bg-white dark:bg-[#171717] p-8 shadow-lg border border-gray-200 dark:border-gray-700 max-w-md mx-4">
        <h2 className="mb-4 text-xl font-bold text-red-600 dark:text-red-400">
          Chat Error
        </h2>
        <p className="mb-6 text-gray-700 dark:text-gray-300">
          {error.message || 'Failed to load chat'}
        </p>
        <button
          onClick={reset}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
        >
          Reload chat
        </button>
      </div>
    </div>
  );
}
