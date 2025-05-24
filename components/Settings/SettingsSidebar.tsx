import { FC } from 'react';
import { useTranslation } from 'next-i18next';
import {
  IconDeviceDesktop,
  IconMessage,
  IconDatabase,
  IconUser,
  IconHelp
} from '@tabler/icons-react';
import { NavigationItem } from './NavigationItem';
import { SettingsSection } from './types';

interface SettingsSidebarProps {
  activeSection: SettingsSection;
  setActiveSection: (section: SettingsSection) => void;
}

export const SettingsSidebar: FC<SettingsSidebarProps> = ({
  activeSection,
  setActiveSection,
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
    </div>
  );
};
