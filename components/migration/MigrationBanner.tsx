'use client';

import { useEffect, useState } from 'react';
import { IconAlertCircle, IconX, IconCheck } from '@tabler/icons-react';
import { LocalStorageService } from '@/lib/services/storage/localStorageService';
import { useConversations } from '@/lib/hooks/conversation/useConversations';
import { useSettings } from '@/lib/hooks/settings/useSettings';
import { useUI } from '@/lib/hooks/ui/useUI';

/**
 * Banner that appears on first load to migrate old localStorage data
 */
export function MigrationBanner() {
  const [needsMigration, setNeedsMigration] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if old localStorage data exists
    const hasOldData =
      localStorage.getItem('conversationHistory') ||
      localStorage.getItem('folders') ||
      localStorage.getItem('prompts');

    const hasMigrated = localStorage.getItem('migration_v2_complete');

    if (hasOldData && !hasMigrated) {
      setNeedsMigration(true);
      setShowBanner(true);
    }
  }, []);

  const handleMigrate = async () => {
    setIsMigrating(true);

    try {
      // Run migration
      const result = LocalStorageService.migrateFromLegacy();

      if (result.success) {
        // Mark migration as complete
        localStorage.setItem('migration_v2_complete', 'true');
        setMigrationComplete(true);

        // Reload page to pick up new data
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        alert(
          `Migration failed:\n${result.errors.join('\n')}\n\nPlease export your data manually.`
        );
        setIsMigrating(false);
      }
    } catch (error) {
      console.error('Migration error:', error);
      alert('Migration failed. Please export your data manually.');
      setIsMigrating(false);
    }
  };

  const handleDismiss = () => {
    if (
      window.confirm(
        'Skip migration? Your old data will not be imported. You can export it manually if needed.'
      )
    ) {
      localStorage.setItem('migration_v2_complete', 'skipped');
      setShowBanner(false);
    }
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 rounded-lg border border-yellow-500 bg-yellow-50 p-4 shadow-lg dark:bg-yellow-900/20">
      {migrationComplete ? (
        <div className="flex items-start space-x-3">
          <IconCheck size={24} className="shrink-0 text-green-500" />
          <div className="flex-1">
            <h3 className="font-semibold text-green-800 dark:text-green-200">
              Migration Complete!
            </h3>
            <p className="mt-1 text-sm text-green-700 dark:text-green-300">
              Your data has been migrated. Reloading...
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <IconAlertCircle size={24} className="shrink-0 text-yellow-600" />
              <div>
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
                  Data Migration Required
                </h3>
                <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                  We&apos;ve detected data from an older version. Migrate it to the new
                  format?
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="shrink-0 rounded p-1 hover:bg-yellow-200 dark:hover:bg-yellow-800"
              disabled={isMigrating}
            >
              <IconX size={16} />
            </button>
          </div>

          <div className="mt-4 flex space-x-2">
            <button
              onClick={handleMigrate}
              disabled={isMigrating}
              className="flex-1 rounded-md bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 disabled:opacity-50"
            >
              {isMigrating ? 'Migrating...' : 'Migrate Now'}
            </button>
            <button
              onClick={handleDismiss}
              disabled={isMigrating}
              className="rounded-md px-4 py-2 text-sm font-medium text-yellow-800 hover:bg-yellow-200 dark:text-yellow-200 dark:hover:bg-yellow-800 disabled:opacity-50"
            >
              Skip
            </button>
          </div>
        </>
      )}
    </div>
  );
}
