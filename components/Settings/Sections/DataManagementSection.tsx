import {
  IconAlertTriangle,
  IconDatabase,
  IconFileExport,
  IconRefresh,
  IconTrash,
  IconUsersGroup,
} from '@tabler/icons-react';
import { FC, useCallback, useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useConversations } from '@/client/hooks/conversation/useConversations';

import { LocalStorageService } from '@/client/services/storage/localStorageService';

import { getStorageBreakdown } from '@/lib/utils/app/storage/storageMonitor';
import { formatBytes } from '@/lib/utils/app/storage/storageUtils';

import { StorageBreakdown } from '@/types/storage';

import { SidebarButton } from '../../Sidebar/SidebarButton';
import { ClearConversations } from '../ClearConversations';
import { Import } from '../Import';
import { TeamTemplateModal } from '../TeamTemplateModal';

interface DataManagementSectionProps {
  handleClearConversations: () => void;
  handleImportConversations: (data: unknown) => void;
  handleExportData: () => void;
  handleReset: () => void;
  onClose: () => void;
  checkStorage: () => void;
  onOpenMigration?: () => void;
}

export const DataManagementSection: FC<DataManagementSectionProps> = ({
  handleClearConversations,
  handleImportConversations,
  handleExportData,
  onClose,
  checkStorage,
  onOpenMigration,
}) => {
  const { conversations } = useConversations();
  const t = useTranslations();
  const [breakdown, setBreakdown] = useState<StorageBreakdown | null>(null);
  const [isTeamTemplateModalOpen, setIsTeamTemplateModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{
    success: boolean;
    freedBytes: number;
  } | null>(null);

  // Refresh storage breakdown
  const refreshBreakdown = useCallback(() => {
    try {
      const data = getStorageBreakdown();
      setBreakdown(data);
    } catch (error) {
      console.error('Error getting storage breakdown:', error);
    }
  }, []);

  // Update storage data when component mounts
  useEffect(() => {
    refreshBreakdown();
    checkStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Handle export legacy data
  const handleExportLegacy = () => {
    try {
      LocalStorageService.exportLegacyData();
    } catch (error) {
      console.error('Error exporting legacy data:', error);
      alert(
        error instanceof Error ? error.message : 'Failed to export legacy data',
      );
    }
  };

  // Handle delete legacy data
  const handleDeleteLegacy = () => {
    setShowDeleteConfirm(true);
  };

  // Confirm delete legacy data
  const confirmDeleteLegacy = () => {
    setIsDeleting(true);
    try {
      const result = LocalStorageService.deleteLegacyData();
      setDeleteResult({ success: true, freedBytes: result.freedBytes });
      refreshBreakdown();
      checkStorage();
    } catch (error) {
      console.error('Error deleting legacy data:', error);
      setDeleteResult({ success: false, freedBytes: 0 });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Calculate percentage of total for a category
  const getPercentOfTotal = (size: number): number => {
    if (!breakdown || breakdown.total === 0) return 0;
    return (size / breakdown.total) * 100;
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <IconDatabase size={24} className="text-black dark:text-white" />
        <h2 className="text-xl font-bold text-black dark:text-white">
          {t('settings.Data Management')}
        </h2>
      </div>

      <div className="space-y-6">
        {/* Storage Usage Information */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h3 className="text-md font-bold mb-4 text-black dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
            {t('settings.Storage Information')}
          </h3>

          {breakdown ? (
            <div className="space-y-4">
              {/* Total Usage */}
              <div className="text-sm text-black dark:text-neutral-300">
                <span className="font-medium">
                  {t('settings.Storage Usage')}:
                </span>{' '}
                {formatBytes(breakdown.total)} /{' '}
                {formatBytes(breakdown.maxUsage)} (
                {breakdown.percentUsed.toFixed(1)}%)
              </div>

              {/* Main progress bar */}
              <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all ${
                    breakdown.percentUsed > 85
                      ? 'bg-red-600'
                      : breakdown.percentUsed > 70
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(breakdown.percentUsed, 100)}%` }}
                ></div>
              </div>

              {/* Status message */}
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {breakdown.percentUsed > 85 ? (
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    {t('settings.storageAlmostFull')}
                  </span>
                ) : breakdown.percentUsed > 70 ? (
                  <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                    {t('settings.storageUsageHigh')}
                  </span>
                ) : (
                  <span>{t('settings.storageUsageNormal')}</span>
                )}
              </div>

              {/* Breakdown by category */}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  {t('settings.Breakdown')}:
                </div>
                <div className="space-y-2">
                  {/* Conversations */}
                  <div className="flex items-center gap-2">
                    <div className="w-24 text-xs text-gray-600 dark:text-gray-400">
                      {t('settings.Conversations')}
                    </div>
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full"
                        style={{
                          width: `${Math.min(getPercentOfTotal(breakdown.zustand.conversations), 100)}%`,
                        }}
                      ></div>
                    </div>
                    <div className="w-20 text-xs text-right text-gray-600 dark:text-gray-400">
                      {formatBytes(breakdown.zustand.conversations)}
                    </div>
                  </div>

                  {/* Settings */}
                  <div className="flex items-center gap-2">
                    <div className="w-24 text-xs text-gray-600 dark:text-gray-400">
                      {t('settings.Settings')}
                    </div>
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-purple-500 h-1.5 rounded-full"
                        style={{
                          width: `${Math.min(getPercentOfTotal(breakdown.zustand.settings), 100)}%`,
                        }}
                      ></div>
                    </div>
                    <div className="w-20 text-xs text-right text-gray-600 dark:text-gray-400">
                      {formatBytes(breakdown.zustand.settings)}
                    </div>
                  </div>

                  {/* Legacy (if exists) */}
                  {breakdown.legacy.hasLegacyData && (
                    <div className="flex items-center gap-2">
                      <div className="w-24 text-xs text-yellow-600 dark:text-yellow-400">
                        {t('settings.Legacy')}
                      </div>
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div
                          className="bg-yellow-500 h-1.5 rounded-full"
                          style={{
                            width: `${Math.min(getPercentOfTotal(breakdown.legacy.total), 100)}%`,
                          }}
                        ></div>
                      </div>
                      <div className="w-20 text-xs text-right text-yellow-600 dark:text-yellow-400">
                        {formatBytes(breakdown.legacy.total)}
                      </div>
                    </div>
                  )}

                  {/* Other */}
                  {breakdown.other > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-24 text-xs text-gray-600 dark:text-gray-400">
                        {t('settings.Other')}
                      </div>
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div
                          className="bg-gray-400 h-1.5 rounded-full"
                          style={{
                            width: `${Math.min(getPercentOfTotal(breakdown.other), 100)}%`,
                          }}
                        ></div>
                      </div>
                      <div className="w-20 text-xs text-right text-gray-600 dark:text-gray-400">
                        {formatBytes(breakdown.other)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              {t('settings.Loading')}...
            </div>
          )}
        </div>

        {/* Legacy Data Section - Only show if legacy data exists */}
        {breakdown?.legacy.hasLegacyData && (
          <div className="border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <IconAlertTriangle
                size={18}
                className="text-yellow-600 dark:text-yellow-400"
              />
              <h3 className="text-md font-bold text-yellow-800 dark:text-yellow-300">
                {t('settings.Legacy Data Detected')}
              </h3>
            </div>
            <p className="text-xs text-yellow-700 dark:text-yellow-400 mb-4">
              {t('settings.legacyDataDescription', {
                size: formatBytes(breakdown.legacy.total),
              })}
            </p>

            {/* Delete result message */}
            {deleteResult && (
              <div
                className={`mb-3 p-2 rounded text-xs ${
                  deleteResult.success
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                }`}
              >
                {deleteResult.success
                  ? t('settings.legacyDeleteSuccess', {
                      size: formatBytes(deleteResult.freedBytes),
                    })
                  : t('settings.legacyDeleteError')}
              </div>
            )}

            <div className="flex flex-col space-y-2">
              {/* Migrate button */}
              {onOpenMigration && (
                <SidebarButton
                  text={t('settings.Migrate to Current Format')}
                  icon={<IconRefresh size={18} />}
                  onClick={onOpenMigration}
                />
              )}

              {/* Export legacy button */}
              <SidebarButton
                text={t('settings.Export Legacy Data')}
                icon={<IconFileExport size={18} />}
                onClick={handleExportLegacy}
              />

              {/* Delete legacy button */}
              <SidebarButton
                text={t('settings.Delete Legacy Data')}
                icon={<IconTrash size={18} />}
                onClick={handleDeleteLegacy}
              />
            </div>

            {/* Delete confirmation dialog */}
            {showDeleteConfirm && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                <p className="text-xs text-red-700 dark:text-red-400 mb-3">
                  {t('settings.deleteLegacyConfirm')}
                </p>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                    onClick={confirmDeleteLegacy}
                    disabled={isDeleting}
                  >
                    {isDeleting
                      ? t('settings.Deleting')
                      : t('settings.Confirm Delete')}
                  </button>
                  <button
                    className="px-3 py-1 text-xs bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                  >
                    {t('settings.Cancel')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Backup & Restore */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h3 className="text-md font-bold mb-4 text-black dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
            {t('settings.Backup & Restore')}
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
            {t('settings.backupDescription')}
          </p>
          <div className="flex flex-col space-y-2">
            <SidebarButton
              text={t('settings.Export Full Backup')}
              icon={<IconFileExport size={18} />}
              onClick={() => handleExportData()}
            />
            <Import
              onImport={(data) => {
                handleImportConversations(data);
                setTimeout(() => {
                  refreshBreakdown();
                  checkStorage();
                }, 100);
              }}
            />
          </div>
        </div>

        {/* Clear Conversations */}
        {conversations && conversations.length > 0 && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h3 className="text-md font-bold mb-4 text-black dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              {t('settings.Clear Data')}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
              {t('settings.clearDataWarning')}
            </p>
            <ClearConversations
              onClearConversations={() => {
                handleClearConversations();
                setTimeout(() => {
                  refreshBreakdown();
                  checkStorage();
                }, 100);
              }}
            />
          </div>
        )}

        {/* Team Templates Section */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
            <h3 className="text-md font-bold text-black dark:text-white">
              {t('settings.Team Templates')}
            </h3>
            <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded">
              {t('settings.Experimental')}
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
            {t('settings.teamTemplatesDescription')}
          </p>
          <SidebarButton
            text={t('settings.Manage Team Templates')}
            icon={<IconUsersGroup size={18} />}
            onClick={() => setIsTeamTemplateModalOpen(true)}
          />
        </div>
      </div>

      {/* Team Template Modal */}
      <TeamTemplateModal
        isOpen={isTeamTemplateModalOpen}
        onClose={() => setIsTeamTemplateModalOpen(false)}
      />
    </div>
  );
};
