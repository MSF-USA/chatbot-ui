import { FC, useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { 
  getStorageUsage, 
  calculateSpaceFreed, 
  clearOlderConversations,
  MIN_RETAINED_CONVERSATIONS
} from '@/utils/app/storageMonitor';
import { exportData } from '@/utils/app/importExport';

interface StorageWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClear: () => void;
}

export const StorageWarningModal: FC<StorageWarningModalProps> = ({ 
  isOpen,
  onClose,
  onClear
}) => {
  const { t } = useTranslation('storage');
  const [keepCount, setKeepCount] = useState(MIN_RETAINED_CONVERSATIONS);
  const [storageData, setStorageData] = useState(() => getStorageUsage());
  const [spaceFreedInfo, setSpaceFreedInfo] = useState(() => calculateSpaceFreed(keepCount));

  // Update calculations when keepCount changes
  useEffect(() => {
    if (isOpen) {
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

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white dark:bg-[#171717] rounded-lg p-6 max-w-md w-full shadow-xl">
        <h2 className="text-xl font-bold mb-4 text-black dark:text-white">
          {t('Storage Warning')}
        </h2>
        
        <div className="mb-4">
          <p className="text-red-600 dark:text-red-400 font-semibold mb-2">
            {t('Your browser storage is almost full!')}
          </p>
          
          <p className="mb-2 text-black dark:text-neutral-300">
            {t('Current usage')}: {formatBytes(currentUsage)} / {formatBytes(maxUsage)} ({percentUsed.toFixed(1)}%)
          </p>
          
          <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2.5 mb-4">
            <div 
              className={`h-2.5 rounded-full ${percentUsed > 90 ? 'bg-red-600' : 'bg-yellow-500'}`} 
              style={{ width: `${Math.min(percentUsed, 100)}%` }}
            ></div>
          </div>
          
          <p className="text-black dark:text-neutral-300 mb-4">
            {t('If your storage fills up completely, the application may stop working correctly and you could lose access to your conversations.')}
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
              {t('Save your conversations to your computer before clearing them.')}
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
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                {t('Keep recent conversations')}:
              </label>
              <input 
                type="number" 
                min="1"
                value={keepCount} 
                onChange={handleKeepCountChange}
                className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-black dark:text-white"
              />
            </div>
            
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              <p>{t('This will remove')} {conversationsRemoved} {t('older conversations')}</p>
              <p>{t('Space freed')}: {formatBytes(spaceFreed)} ({percentFreed.toFixed(1)}%)</p>
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
        
        <div className="flex justify-end mt-4">
          <button 
            className="bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-black dark:text-white py-2 px-4 rounded"
            onClick={onClose}
          >
            {t('Close')}
          </button>
        </div>
      </div>
    </div>
  );
};