import { IconChevronLeft } from '@tabler/icons-react';
import { FC } from 'react';

import { useTranslations } from 'next-intl';

import { SettingsSection } from './types';

interface MobileNavigationProps {
  activeSection: SettingsSection;
  setActiveSection: (section: SettingsSection) => void;
}

export const MobileNavigation: FC<MobileNavigationProps> = ({
  activeSection,
  setActiveSection,
}) => {
  const t = useTranslations();
  const sections = Object.values(SettingsSection);
  const currentIndex = sections.indexOf(activeSection);

  // Helper function to get the section title
  const getSectionTitle = (section: SettingsSection): string => {
    switch (section) {
      case SettingsSection.GENERAL:
        return t('General');
      case SettingsSection.CHAT_SETTINGS:
        return t('Chat Settings');
      case SettingsSection.AGENT_FEATURES:
        return t('Agent Features');
      case SettingsSection.PRIVACY_CONTROL:
        return t('Privacy & Security');
      case SettingsSection.DATA_MANAGEMENT:
        return t('Data Management');
      case SettingsSection.ACCOUNT:
        return t('Account');
      case SettingsSection.HELP_SUPPORT:
        return t('Help & Support');
      default:
        return '';
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#171717] border-t border-gray-300 dark:border-neutral-700 p-2">
      <div className="flex justify-between items-center">
        <button
          className="p-2 rounded-lg text-black dark:text-white disabled:opacity-50"
          onClick={() => {
            if (currentIndex > 0) {
              setActiveSection(sections[currentIndex - 1]);
            }
          }}
          disabled={currentIndex === 0}
        >
          <IconChevronLeft size={20} />
        </button>

        <div className="text-sm font-medium text-black dark:text-white">
          {getSectionTitle(activeSection)}
        </div>

        <button
          className="p-2 rounded-lg text-black dark:text-white disabled:opacity-50"
          onClick={() => {
            if (currentIndex < sections.length - 1) {
              setActiveSection(sections[currentIndex + 1]);
            }
          }}
          disabled={currentIndex === sections.length - 1}
        >
          <IconChevronLeft size={20} className="transform rotate-180" />
        </button>
      </div>
    </div>
  );
};
