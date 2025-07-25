import { FC } from 'react';

import { useTranslation } from 'next-i18next';

import { SettingsSection } from './types';

interface MobileHeaderProps {
  activeSection: SettingsSection;
}

export const MobileHeader: FC<MobileHeaderProps> = ({ activeSection }) => {
  const { t } = useTranslation('settings');

  // Helper function to get the section title
  const getSectionTitle = (section: SettingsSection): string => {
    switch (section) {
      case SettingsSection.GENERAL:
        return t('General');
      case SettingsSection.CHAT_SETTINGS:
        return t('Chat Settings');
      case SettingsSection.DATA_MANAGEMENT:
        return t('Data Management');
      case SettingsSection.ACCOUNT:
        return t('Account');
      case SettingsSection.HELP_SUPPORT:
        return t('Help & Support');
      default:
        return t('Settings');
    }
  };

  return (
    <div className="sticky top-0 bg-white dark:bg-[#171717] p-4 border-b border-gray-300 dark:border-neutral-700 z-10">
      <h2 className="text-lg font-bold text-black dark:text-white">
        {getSectionTitle(activeSection)}
      </h2>
    </div>
  );
};
