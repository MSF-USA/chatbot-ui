import {
  IconDatabase,
  IconDeviceDesktop,
  IconDeviceMobile,
  IconExternalLink,
  IconHelp,
  IconMessage,
  IconRefresh,
  IconRobot,
  IconSettings,
  IconShield,
  IconUser,
} from '@tabler/icons-react';
import { useSession } from 'next-auth/react';
import { FC, useState } from 'react';

import { useTranslations } from 'next-intl';

import { FEEDBACK_EMAIL, US_FEEDBACK_EMAIL } from '@/types/contact';
import { Settings } from '@/types/settings';

import { SidebarButton } from '../Sidebar/SidebarButton';
import { NavigationItem } from './NavigationItem';
import { SettingsSection } from './types';

interface SettingsSidebarProps {
  activeSection: SettingsSection;
  setActiveSection: (section: SettingsSection) => void;
  handleReset: () => void;
  onClose: () => void;
  user?: any; // Using any for simplicity, should be refined based on actual user type
  state: Settings;
  dispatch: React.Dispatch<{
    field: keyof Settings;
    value: any;
  }>;
}

export const SettingsSidebar: FC<SettingsSidebarProps> = ({
  activeSection,
  setActiveSection,
  handleReset,
  onClose,
  user,
  state,
  dispatch,
}) => {
  const t = useTranslations();
  const { data: session } = useSession();
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);

  const confirmReset = () => {
    setShowResetConfirmation(true);
  };

  const handleConfirmReset = () => {
    handleReset();
    onClose();
    setShowResetConfirmation(false);
  };

  const handleCancelReset = () => {
    setShowResetConfirmation(false);
  };

  return (
    <div className="hidden md:block md:w-64 md:min-w-64 md:border-r border-gray-300 dark:border-neutral-700 p-4 overflow-y-auto flex flex-col h-full">
      <div className="flex-grow">
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

          {/* <NavigationItem
            section={SettingsSection.AGENT_FEATURES}
            activeSection={activeSection}
            label={t('Agent Features')}
            icon={<IconRobot size={18} />}
            onClick={setActiveSection}
          /> */}

          <NavigationItem
            section={SettingsSection.PRIVACY_CONTROL}
            activeSection={activeSection}
            label={t('Privacy & Security')}
            icon={<IconShield size={18} />}
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
            section={SettingsSection.MOBILE_APP}
            activeSection={activeSection}
            label={t('Mobile App')}
            icon={<IconDeviceMobile size={18} />}
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

      {/* Divider */}
      <div className="border-t border-gray-300 dark:border-neutral-700 my-4"></div>

      {/* Action buttons at the bottom */}
      <div className="space-y-2 mt-auto">
        {/* Advanced Settings Toggle */}
        <div className="flex items-center justify-between px-2 py-1 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors text-black/70 dark:text-white/70 text-sm">
          <div className="flex items-center">
            <IconSettings
              size={16}
              className="mr-2 text-black dark:text-white/70"
            />
            <span>{t('Advanced Settings')}</span>
          </div>
          <div
            className={`relative inline-block w-10 h-5 rounded-full cursor-pointer transition-colors ease-in-out duration-200 ${
              state.advancedMode
                ? 'bg-green-500'
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
            onClick={() =>
              dispatch({ field: 'advancedMode', value: !state.advancedMode })
            }
          >
            <span
              className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform duration-200 transform ${
                state.advancedMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </div>
        </div>

        {/* Feedback link - styled similar to ChatTopbar */}
        <a
          href={`mailto:${
            session?.user?.region === 'US' ? US_FEEDBACK_EMAIL : FEEDBACK_EMAIL
          }`}
          className="flex items-center px-2 py-1 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors text-black/50 dark:text-white/50 text-sm"
          title={t('sendFeedback')}
        >
          <IconExternalLink
            size={16}
            className="mr-2 text-black dark:text-white/50"
          />
          <span>{t('sendFeedback')}</span>
        </a>

        {/* Reset settings button - made more distinct */}
        <button
          className="flex items-center w-full px-2 py-1.5 rounded-md bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 transition-colors text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50"
          onClick={confirmReset}
          aria-label={t('Reset Settings')}
          title={t('Reset Settings')}
        >
          <IconRefresh size={18} className="mr-2" />
          <span className="font-medium">{t('Reset Settings')}</span>
        </button>
      </div>

      {/* Reset Confirmation Dialog */}
      {showResetConfirmation && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-bold mb-3 text-black dark:text-white">
              {t('Confirm Reset')}
            </h3>
            <p className="text-neutral-700 dark:text-neutral-300 mb-4">
              {t('Reset Confirmation Message')}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                className="px-4 py-2 rounded-md bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600 transition-colors text-black dark:text-white"
                onClick={handleCancelReset}
              >
                {t('Cancel')}
              </button>
              <button
                className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 transition-colors text-white"
                onClick={handleConfirmReset}
              >
                {t('Reset')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
