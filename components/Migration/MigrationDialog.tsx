'use client';

import { FC, useCallback, useState } from 'react';

import { useTranslations } from 'next-intl';

import {
  LocalStorageService,
  MigrationResult,
  MigrationStats,
} from '@/client/services/storage/localStorageService';

type MigrationStatus =
  | 'prompt'
  | 'migrating'
  | 'complete'
  | 'error'
  | 'skipped';

interface MigrationDialogProps {
  isOpen: boolean;
  onComplete: () => void;
}

/**
 * Dialog shown to users when legacy localStorage data needs migration.
 * Provides options to migrate data or skip, with progress feedback.
 */
export const MigrationDialog: FC<MigrationDialogProps> = ({
  isOpen,
  onComplete,
}) => {
  const t = useTranslations();
  const [status, setStatus] = useState<MigrationStatus>('prompt');
  const [stats, setStats] = useState<MigrationStats | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleMigrate = useCallback(async () => {
    setStatus('migrating');

    // Small delay to show the progress animation
    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      const result: MigrationResult = LocalStorageService.migrateFromLegacy();

      if (result.success) {
        setStats(result.stats);
        setWarnings(result.warnings || []);
        setStatus('complete');
      } else {
        setError(result.errors.join('\n') || 'Unknown error occurred');
        setWarnings(result.warnings || []);
        setStatus('error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
    }
  }, []);

  const handleSkip = useCallback(() => {
    // Mark as skipped in localStorage so we don't show again
    if (typeof window !== 'undefined') {
      localStorage.setItem('data_migration_v2_skipped', 'true');
    }
    setStatus('skipped');
    onComplete();
  }, [onComplete]);

  const handleContinue = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const handleRetry = useCallback(() => {
    setError(null);
    setStatus('prompt');
  }, []);

  if (!isOpen) return null;

  // Build stats summary for display
  const getStatsSummary = (): string[] => {
    if (!stats) return [];
    const items: string[] = [];
    if (stats.conversations > 0) {
      items.push(
        `${stats.conversations} ${stats.conversations === 1 ? t('conversation') : t('conversations')}`,
      );
    }
    if (stats.folders > 0) {
      items.push(
        `${stats.folders} ${stats.folders === 1 ? t('folder') : t('folders')}`,
      );
    }
    if (stats.prompts > 0) {
      items.push(
        `${stats.prompts} ${stats.prompts === 1 ? t('prompt') : t('prompts')}`,
      );
    }
    if (stats.customAgents > 0) {
      items.push(
        `${stats.customAgents} ${stats.customAgents === 1 ? t('custom agent') : t('custom agents')}`,
      );
    }
    return items;
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-300 dark:border-gray-600">
        {/* Prompt State - Ask user if they want to migrate */}
        {status === 'prompt' && (
          <>
            <div className="px-6 py-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <svg
                    className="w-5 h-5 text-blue-600 dark:text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                  {t('Update Available')}
                </h2>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                {t(
                  'We found data from a previous version. Would you like to migrate it to work with the improved system?',
                )}
              </p>

              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-2">
                  {t('Benefits')}:
                </p>
                <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
                  <li className="flex items-center gap-2">
                    <svg
                      className="w-3.5 h-3.5 text-green-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {t('Faster performance')}
                  </li>
                  <li className="flex items-center gap-2">
                    <svg
                      className="w-3.5 h-3.5 text-green-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {t('Better reliability')}
                  </li>
                  <li className="flex items-center gap-2">
                    <svg
                      className="w-3.5 h-3.5 text-green-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {t('Your data is preserved')}
                  </li>
                </ul>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
              <button
                onClick={handleSkip}
                className="flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
              >
                {t('Skip')}
              </button>
              <button
                onClick={handleMigrate}
                className="flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
              >
                {t('Migrate Data')}
              </button>
            </div>
          </>
        )}

        {/* Migrating State - Show progress */}
        {status === 'migrating' && (
          <div className="px-6 py-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                {t('Migrating Data')}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t('Please wait while we update your data...')}
              </p>

              {/* Animated progress bar */}
              <div className="mt-6 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full animate-pulse w-3/4"></div>
              </div>
            </div>
          </div>
        )}

        {/* Complete State - Show results */}
        {status === 'complete' && (
          <>
            <div className="px-6 py-5">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 mb-3 rounded-full bg-green-100 dark:bg-green-900/30">
                  <svg
                    className="w-6 h-6 text-green-600 dark:text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                  {t('Migration Complete')}
                </h2>
              </div>

              {getStatsSummary().length > 0 ? (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                    {t('Successfully migrated')}:
                  </p>
                  <ul className="text-sm text-gray-700 dark:text-gray-200 space-y-1">
                    {getStatsSummary().map((item, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-green-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
                  {t('Your settings have been updated.')}
                </p>
              )}

              {/* Warnings section */}
              {warnings.length > 0 && (
                <div className="mt-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
                  <p className="text-xs text-yellow-700 dark:text-yellow-400 font-medium mb-1">
                    {t('Notes')}:
                  </p>
                  <ul className="text-xs text-yellow-600 dark:text-yellow-300 space-y-1">
                    {warnings.slice(0, 3).map((warning, index) => (
                      <li key={index} className="flex items-start gap-1.5">
                        <span className="mt-0.5">-</span>
                        <span>{warning}</span>
                      </li>
                    ))}
                    {warnings.length > 3 && (
                      <li className="text-yellow-500 dark:text-yellow-400">
                        ...and {warnings.length - 3} more (see console)
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleContinue}
                className="w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
              >
                {t('Continue')}
              </button>
            </div>
          </>
        )}

        {/* Error State */}
        {status === 'error' && (
          <>
            <div className="px-6 py-5">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 mb-3 rounded-full bg-red-100 dark:bg-red-900/30">
                  <svg
                    className="w-6 h-6 text-red-600 dark:text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                  {t('Migration Failed')}
                </h2>
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                  {error}
                </p>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {t(
                  'Your original data is safe. You can try again or skip for now.',
                )}
              </p>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
              <button
                onClick={handleSkip}
                className="flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
              >
                {t('Skip')}
              </button>
              <button
                onClick={handleRetry}
                className="flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
              >
                {t('Retry')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MigrationDialog;
