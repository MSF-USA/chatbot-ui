import { FC } from 'react';
import { useTranslation } from 'next-i18next';
import {
  IconDeviceDesktop,
  IconMessage,
  IconDatabase,
  IconUser,
  IconHelp,
  IconRefresh,
  IconExternalLink
} from '@tabler/icons-react';
import { NavigationItem } from './NavigationItem';
import { SettingsSection } from './types';
import { SidebarButton } from '../Sidebar/SidebarButton';
import { isUSBased } from "@/utils/app/userAuth";
import { FEEDBACK_EMAIL, US_FEEDBACK_EMAIL } from "@/types/contact";

interface SettingsSidebarProps {
  activeSection: SettingsSection;
  setActiveSection: (section: SettingsSection) => void;
  handleReset: () => void;
  onClose: () => void;
  user?: any; // Using any for simplicity, should be refined based on actual user type
}

export const SettingsSidebar: FC<SettingsSidebarProps> = ({
  activeSection,
  setActiveSection,
  handleReset,
  onClose,
  user,
}) => {
  const { t } = useTranslation('settings');

  return (
    <div className="hidden md:block md:w-64 md:min-w-64 md:border-r border-gray-300 dark:border-neutral-700 p-4 overflow-y-auto">
      <h2 className="text-lg font-bold mb-4 text-black dark:text-white">
        {t('Settings')}
      </h2>

      <div className="space-y-1">
        <NavigationItem
          section={SettingsSection.GENERAL}
          activeSection={activeSection}
          label={t('General')}
          icon={<IconDeviceDesktop size={18} />}
          onClick={setActiveSection}
        />

        <NavigationItem
          section={SettingsSection.CHAT_SETTINGS}
          activeSection={activeSection}
          label={t('Chat Settings')}
          icon={<IconMessage size={18} />}
          onClick={setActiveSection}
        />

        <NavigationItem
          section={SettingsSection.DATA_MANAGEMENT}
          activeSection={activeSection}
          label={t('Data Management')}
          icon={<IconDatabase size={18} />}
          onClick={setActiveSection}
        />

        <NavigationItem
          section={SettingsSection.ACCOUNT}
          activeSection={activeSection}
          label={t('Account')}
          icon={<IconUser size={18} />}
          onClick={setActiveSection}
        />

        <NavigationItem
          section={SettingsSection.HELP_SUPPORT}
          activeSection={activeSection}
          label={t('Help & Support')}
          icon={<IconHelp size={18} />}
          onClick={setActiveSection}
        />
      </div>

      {/* Divider */}
      <div className="my-4 border-t border-gray-300 dark:border-neutral-700"></div>

      {/* Action buttons at the bottom */}
      <div className="space-y-2 mt-auto">
        {/* Feedback link */}
        <a
          href={`mailto:${isUSBased(user?.mail ?? '') ? US_FEEDBACK_EMAIL : FEEDBACK_EMAIL}`}
          className="block"
        >
          <SidebarButton
            text={t('sendFeedback')}
            icon={<IconExternalLink size={18} />}
            onClick={() => {}}
          />
        </a>

        {/* Reset settings button */}
        <SidebarButton
          text={t('Reset Settings')}
          icon={<IconRefresh size={18} />}
          onClick={() => {
            handleReset();
            onClose();
          }}
        />
      </div>
    </div>
  );
};
