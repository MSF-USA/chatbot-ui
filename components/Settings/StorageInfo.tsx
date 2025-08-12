import { FC, useEffect, useState } from 'react';

import { useTranslation } from 'next-i18next';

import { getStorageUsage } from '@/utils/app/storageMonitor';

export const StorageInfo: FC = () => {
  const { t } = useTranslation('settings');
  const [storageInfo, setStorageInfo] = useState(getStorageUsage());

  useEffect(() => {
    // Update storage info when component mounts
    setStorageInfo(getStorageUsage());
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(2)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="my-4">
      <div className="text-sm font-bold mb-2 text-black dark:text-neutral-200">
        {t('Storage Usage')}
      </div>

      <div className="mb-1 text-sm">
        <span className="text-black dark:text-neutral-300">
          {t('Used')}: {formatBytes(storageInfo.currentUsage)} /{' '}
          {formatBytes(storageInfo.maxUsage)} (
          {storageInfo.percentUsed.toFixed(1)}%)
        </span>
      </div>

      <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2.5 mb-4">
        <div
          className={`h-2.5 rounded-full ${
            storageInfo.percentUsed > 90
              ? 'bg-red-600'
              : storageInfo.percentUsed > 70
              ? 'bg-yellow-500'
              : 'bg-green-500'
          }`}
          style={{ width: `${Math.min(storageInfo.percentUsed, 100)}%` }}
        ></div>
      </div>

      <div className="text-xs text-gray-600 dark:text-gray-400">
        {t(
          'Local storage is used to save your conversations, settings, and preferences.',
        )}
      </div>
    </div>
  );
};
