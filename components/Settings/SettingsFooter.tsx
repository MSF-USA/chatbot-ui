import { FC } from 'react';
import { useTranslation } from 'next-i18next';
import { IconExternalLink } from '@tabler/icons-react';
import { Session } from 'next-auth';
import { isUSBased } from "@/utils/app/userAuth";
import { FEEDBACK_EMAIL, US_FEEDBACK_EMAIL } from "@/types/contact";

interface SettingsFooterProps {
  version: string;
  build: string;
  env: string;
  user?: Session['user'];
}

export const SettingsFooter: FC<SettingsFooterProps> = ({
  version,
  build,
  env,
  user,
}) => {
  const { t } = useTranslation('settings');

  return (
    <div className="flex flex-col md:flex-row px-4 py-3 md:justify-between border-t border-gray-300 dark:border-neutral-700">
      <div className="text-gray-500 text-sm">
        v{version}.{build}.{env}
      </div>
      <a
        href={`mailto:${isUSBased(user?.mail ?? '') ? US_FEEDBACK_EMAIL : FEEDBACK_EMAIL}`}
        className="flex items-center mt-2 md:mt-0 text-black dark:text-white text-sm"
      >
        <IconExternalLink
          size={16}
          className={'inline mr-1 text-black dark:text-white'}
        />
        {t('sendFeedback')}
      </a>
    </div>
  );
};
