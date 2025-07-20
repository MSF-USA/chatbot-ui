import { FC, useEffect, useState } from 'react';
import React from 'react';

import { useTranslation } from 'next-i18next';

import { exportData } from '@/utils/app/importExport';
import {
  MIN_RETAINED_CONVERSATIONS,
  calculateSpaceFreed,
  clearOlderConversations,
  getStorageUsage,
} from '@/utils/app/storageMonitor';

interface StorageWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClear: () => void;
  currentThreshold?: string | null;
  isEmergencyLevel?: boolean;
  isCriticalLevel?: boolean;
  onDismissThreshold?: () => void;
}

export const StorageWarningModal: FC<StorageWarningModalProps> = ({
  isOpen,
  onClose,
  onClear,
  currentThreshold = null,
  isEmergencyLevel = false,
  isCriticalLevel = false,
  onDismissThreshold,
}) => {
  const { t } = useTranslation('settings');
  const [keepCount, setKeepCount] = useState(MIN_RETAINED_CONVERSATIONS);
  const [storageData, setStorageData] = useState<{
    currentUsage: number;
    maxUsage: number;
    percentUsed: number;
    isNearingLimit: boolean;
  } | null>(null);
  const [spaceFreedInfo, setSpaceFreedInfo] = useState<{
    spaceFreed: number;
    conversationsRemoved: number;
    percentFreed: number;
  } | null>(null);

  // Initialize storage data on client side only
  useEffect(() => {
    try {
      const usage = getStorageUsage();
      setStorageData(usage);
      setSpaceFreedInfo(calculateSpaceFreed(keepCount));
    } catch (error) {
      console.error('Failed to get storage usage:', error);
      // Set a default value if storage access fails
      setStorageData({
        currentUsage: 0,
        maxUsage: 5 * 1024 * 1024, // Default 5MB
        percentUsed: 0,
        isNearingLimit: false
      });
      setSpaceFreedInfo({
        spaceFreed: 0,
        conversationsRemoved: 0,
        percentFreed: 0,
      });
    }
  }, [keepCount]);

  // Update calculations when keepCount changes
  useEffect(() => {
    if (isOpen && storageData) {
      setSpaceFreedInfo(calculateSpaceFreed(keepCount));
    }
  }, [keepCount, isOpen]);

  const handleExport = () => {
    exportData();
  };

  const handleClear = () => {
    const success = clearOlderConversations(keepCount);
    if (success) {
      setStorageData(getStorageUsage());
      onClear();
      onClose();
    }
  };

  const handleKeepCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    if (!isNaN(newValue) && newValue >= 1) {
      setKeepCount(newValue);
    }
  };

  if (!isOpen) return null;

  // Don't render until storage data is loaded
  if (!storageData || !spaceFreedInfo) {
    return null;
  }

  const { currentUsage, maxUsage, percentUsed } = storageData;
  const { spaceFreed, conversationsRemoved, percentFreed } = spaceFreedInfo;

  // Format bytes to more readable format
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(2)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  // Get appropriate title and message based on threshold level
  const getThresholdTitle = () => {
    if (isEmergencyLevel) return t('Storage Emergency');
    if (isCriticalLevel) return t('Storage Critical');
    return t('Storage Warning');
  };

  const getThresholdMessage = () => {
    if (isEmergencyLevel) {
      return t(
        'Your browser storage is critically full! You must free up space to continue using the application.',
      );
    }
    if (isCriticalLevel) {
      return t(
        'Your browser storage is almost full! It is strongly recommended to free up space soon.',
      );
    }
    return t(
      'Your browser storage is getting full. Consider freeing up some space.',
    );
  };

  // Handle close or dismiss
  const handleCloseOrDismiss = () => {
    if (onDismissThreshold) {
      onDismissThreshold();
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white dark:bg-[#171717] rounded-lg p-6 max-w-md w-full shadow-xl">
        <h2
          className={`text-xl font-bold mb-4 text-black dark:text-white ${
            isEmergencyLevel ? 'text-red-600 dark:text-red-400' : ''
          }`}
        >
          {getThresholdTitle()}
        </h2>

        <div className="mb-4">
          <p
            className={`font-semibold mb-2 ${
              isEmergencyLevel
                ? 'text-red-600 dark:text-red-400'
                : isCriticalLevel
                ? 'text-orange-500 dark:text-orange-400'
                : 'text-yellow-500 dark:text-yellow-400'
            }`}
          >
            {getThresholdMessage()}
          </p>

          <p className="mb-2 text-black dark:text-neutral-300">
            {t('Current usage')}: {formatBytes(currentUsage)} /{' '}
            {formatBytes(maxUsage)} ({percentUsed.toFixed(1)}%)
          </p>

          <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2.5 mb-4">
            <div
              className={`h-2.5 rounded-full ${
                isEmergencyLevel
                  ? 'bg-red-600'
                  : isCriticalLevel
                  ? 'bg-orange-500'
                  : 'bg-yellow-500'
              }`}
              style={{ width: `${Math.min(percentUsed, 100)}%` }}
            ></div>
          </div>

          <p className="text-black dark:text-neutral-300 mb-4">
            {isEmergencyLevel
              ? t(
                  "Your storage is critically full. The application may stop working correctly and you could lose access to your conversations if you don't free up space immediately.",
                )
              : t(
                  'If your storage fills up completely, the application may stop working correctly and you could lose access to your conversations.',
                )}
          </p>
        </div>

        <div className="mb-4">
          <h3 className="font-bold text-black dark:text-white mb-2">
            {t('Options to free up space')}:
          </h3>

          <div className="mb-4 p-3 border border-gray-300 dark:border-gray-700 rounded">
            <p className="font-medium text-black dark:text-white mb-2">
              {t('1. Export your conversations')}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {t(
                'Save your conversations to your computer before clearing them.',
              )}
            </p>
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm"
              onClick={handleExport}
            >
              {t('Export All Data')}
            </button>
          </div>

          <div className="p-3 border border-gray-300 dark:border-gray-700 rounded">
            <p className="font-medium text-black dark:text-white mb-2">
              {t('2. Clear older conversations')}
            </p>

            <div className="mb-3">
              <label
                htmlFor="keepCountInput"
                className="block text-sm text-gray-600 dark:text-gray-400 mb-1"
              >
                {t('Keep recent conversations')}:
              </label>
              <input
                id="keepCountInput"
                type="number"
                min="1"
                value={keepCount}
                onChange={handleKeepCountChange}
                className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-black dark:text-white"
              />
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              <p>
                {t('This will remove')} {conversationsRemoved}{' '}
                {t('older conversations')}
              </p>
              <p>
                {t('Space freed')}: {formatBytes(spaceFreed)} (
                {percentFreed.toFixed(1)}%)
              </p>
            </div>

            <button
              className="bg-red-600 hover:bg-red-700 text-white py-1 px-3 rounded text-sm"
              onClick={handleClear}
              disabled={conversationsRemoved === 0}
            >
              {t('Clear Older Conversations')}
            </button>
          </div>
        </div>

        <div className="flex justify-end mt-4 space-x-2">
          {/* For emergency level, show a disabled close button */}
          {isEmergencyLevel ? (
            <button
              className="bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 py-2 px-4 rounded opacity-50 cursor-not-allowed"
              disabled={true}
              title={t('You must free up space before dismissing this warning')}
            >
              {t('Close')}
            </button>
          ) : (
            <>
              {/* For warning and critical levels, show a dismiss button */}
              <button
                className={`
                  ${
                    isCriticalLevel
                      ? 'bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700'
                      : 'bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700'
                  } 
                  text-white py-2 px-4 rounded
                `}
                onClick={handleCloseOrDismiss}
              >
                {t('Dismiss Warning')}
              </button>
            </>
          )}

          {/* Always show the close button for non-emergency levels */}
          {!isEmergencyLevel && (
            <button
              className="bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-black dark:text-white py-2 px-4 rounded"
              onClick={onClose}
            >
              {t('Close')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
