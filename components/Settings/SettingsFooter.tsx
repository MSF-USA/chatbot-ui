import { IconExternalLink } from '@tabler/icons-react';
import { FC, useState } from 'react';

import { Session } from 'next-auth';
import { useTranslation } from 'next-i18next';

import { SupportModal } from '@/components/Support/SupportModal';

interface SettingsFooterProps {
  version: string;
  build: string;
  env: string;
  user?: Session['user'];
  handleReset?: () => void;
  onClose?: () => void;
}

export const SettingsFooter: FC<SettingsFooterProps> = ({
  version,
  build,
  env,
  user,
  handleReset,
  onClose,
}) => {
  const { t } = useTranslation('settings');
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

  return (
    <div className="flex flex-col px-4 py-3 border-t border-gray-300 dark:border-neutral-700">
      {/* Reset settings button - only visible on mobile */}
      {handleReset && onClose && (
        <button
          className="md:hidden w-full mb-3 p-2 border rounded-lg shadow border-neutral-500 text-neutral-900 hover:bg-neutral-100 focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-300"
          onClick={() => {
            handleReset();
            onClose();
          }}
        >
          {t('Reset Settings')}
        </button>
      )}

      {/* Footer content */}
      <div className="flex flex-col md:flex-row md:justify-between">
        <div className="text-gray-500 text-sm">
          v{version}.{build}.{env}
        </div>
        <button
          onClick={() => setIsSupportModalOpen(true)}
          className="flex items-center mt-2 md:mt-0 text-black dark:text-white text-sm hover:opacity-80 transition-opacity"
        >
          <IconExternalLink
            size={16}
            className={'inline mr-1 text-black dark:text-white'}
          />
          {t('sendFeedback')}
        </button>
      </div>

      <SupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
        userEmail={user?.mail}
      />
    </div>
  );
};
