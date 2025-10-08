import { IconExternalLink } from '@tabler/icons-react';
import { FC } from 'react';

import { Session } from 'next-auth';
import { useTranslations } from 'next-intl';

import { isUSBased } from '@/lib/utils/app/userAuth';

import { FEEDBACK_EMAIL, US_FEEDBACK_EMAIL } from '@/types/contact';

interface SettingsFooterProps {
  version: string;
  build: string;
  env: string;
  userEmail?: string;
  handleReset?: () => void;
  onClose?: () => void;
}

export const SettingsFooter: FC<SettingsFooterProps> = ({
  version,
  build,
  env,
  userEmail,
  handleReset,
  onClose,
}) => {
  const t = useTranslations();

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
        <a
          href={`mailto:${
            isUSBased(userEmail ?? '') ? US_FEEDBACK_EMAIL : FEEDBACK_EMAIL
          }`}
          className="flex items-center mt-2 md:mt-0 text-black dark:text-white text-sm"
        >
          <IconExternalLink
            size={16}
            className={'inline mr-1 text-black dark:text-white'}
          />
          {t('sendFeedback')}
        </a>
      </div>
    </div>
  );
};
