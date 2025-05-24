import { FC, useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { IconFileExport } from '@tabler/icons-react';
import { ClearConversations } from '../ClearConversations';
import { Import } from '../Import';
import { SidebarButton } from '../../Sidebar/SidebarButton';
import { getStorageUsage } from '@/utils/app/storageMonitor';
import {formatBytes} from "@/utils/app/storageUtils";

interface StorageData {
  currentUsage: number;
  maxUsage: number;
  percentUsed: number;
}

interface DataManagementSectionProps {
  homeState: any; // Type should be refined based on actual HomeContext state
  handleClearConversations: () => void;
  handleImportConversations: (data: any) => void;
  handleExportData: () => void;
  handleReset: () => void;
  onClose: () => void;
  checkStorage: () => void;
}

export const DataManagementSection: FC<DataManagementSectionProps> = ({
  homeState,
  handleClearConversations,
  handleImportConversations,
  handleExportData,
  handleReset,
  onClose,
  checkStorage,
}) => {
  const { t } = useTranslation('settings');
  const [storageData, setStorageData] = useState<StorageData>(() => getStorageUsage());

  // Update storage data when component mounts
  useEffect(() => {
    setStorageData(getStorageUsage());
    checkStorage();
  }, [checkStorage]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-6 text-black dark:text-white">
        {t('Data Management')}
      </h2>

      <div className="space-y-6">
        {/* Storage Usage Information */}
        <div>
          <h3 className="text-sm font-bold mb-3 text-black dark:text-neutral-200">
            {t('Storage Information')}
          </h3>
          <div className="mb-5 text-sm text-black dark:text-neutral-300">
            <div className="mb-2">
              <span className="font-medium">Storage Usage:</span> {formatBytes(storageData.currentUsage)} / {formatBytes(storageData.maxUsage)} ({storageData.percentUsed.toFixed(1)}%)
            </div>

            <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2.5 mb-2">
              <div
                className={`h-2.5 rounded-full ${storageData.percentUsed > 85 ? 'bg-red-600' : storageData.percentUsed > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(storageData.percentUsed, 100)}%` }}
              ></div>
            </div>

            <div className="text-xs text-gray-600 dark:text-gray-400">
              {storageData.percentUsed > 85 ? (
                <span className="text-red-600 dark:text-red-400">Storage almost full! Consider clearing old conversations.</span>
              ) : storageData.percentUsed > 70 ? (
                <span className="text-yellow-600 dark:text-yellow-400">Storage usage is getting high.</span>
              ) : (
                <span>Storage usage is normal.</span>
              )}
            </div>
          </div>
        </div>

        {/* Data Management Actions */}
        <div>
          <h3 className="text-sm font-bold mb-3 text-black dark:text-neutral-200">
            {t('Data Actions')}
          </h3>
          <div className="flex flex-col space-y-2">
            {homeState.conversations.length > 0 ? (
              <ClearConversations
                onClearConversations={() => {
                  handleClearConversations();
                  // Update storage data after clearing conversations
                  setTimeout(() => {
                    setStorageData(getStorageUsage());
                    checkStorage();
                  }, 100);
                }}
              />
            ) : null}
            <Import onImport={(data) => {
              handleImportConversations(data);
              // Update storage data after importing conversations
              setTimeout(() => {
                setStorageData(getStorageUsage());
                checkStorage();
              }, 100);
            }} />
            <SidebarButton
              text={t('Export data')}
              icon={<IconFileExport size={18} />}
              onClick={() => handleExportData()}
            />
          </div>
        </div>

      </div>
    </div>
  );
};
