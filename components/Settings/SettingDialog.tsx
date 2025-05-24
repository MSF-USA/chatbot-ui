import { Switch } from '@headlessui/react';
import {
  IconExternalLink,
  IconFileExport,
  IconSettings,
  IconMessage,
  IconDatabase,
  IconUser,
  IconHelp,
  IconChevronLeft,
  IconDeviceDesktop
} from '@tabler/icons-react';
import { FC, useContext, useEffect, useRef, useState } from 'react';
import { useSwipeable } from 'react-swipeable';

import { Session } from 'next-auth';
import { useTranslation } from 'next-i18next';

import { useCreateReducer } from '@/hooks/useCreateReducer';
import { useStorageMonitor } from '@/context/StorageMonitorContext';

import { getSettings, saveSettings } from '@/utils/app/settings';
import { getStorageUsage } from '@/utils/app/storageMonitor';

import { FAQData } from '@/types/faq';
import { Settings } from '@/types/settings';

import HomeContext from '@/pages/api/home/home.context';

import LanguageSwitcher from '@/components/Sidebar/components/LanguageSwitcher';

import ChatbarContext from '../Chatbar/Chatbar.context';
import { SidebarButton } from '../Sidebar/SidebarButton';
import { ClearConversations } from './ClearConversations';
import { Import } from './Import';
import { SignInSignOut } from './SignInSignOut';
import { SystemPrompt } from './SystemPrompt';
import { TemperatureSlider } from './Temperature';
import { FAQ } from './faq';
import faqData from './faq.json';
import {isUSBased} from "@/utils/app/userAuth";
import {FEEDBACK_EMAIL, US_FEEDBACK_EMAIL} from "@/types/contact";

const version = process.env.NEXT_PUBLIC_VERSION;
const build = process.env.NEXT_PUBLIC_BUILD;
const env = process.env.NEXT_PUBLIC_ENV;
const email = process.env.NEXT_PUBLIC_EMAIL;

/**
 * Enum representing the different sections of the settings dialog
 */
enum SettingsSection {
  GENERAL = 'GENERAL',
  CHAT_SETTINGS = 'CHAT_SETTINGS',
  DATA_MANAGEMENT = 'DATA_MANAGEMENT',
  ACCOUNT = 'ACCOUNT',
  HELP_SUPPORT = 'HELP_SUPPORT',
}

/**
 * Props for the SettingDialog component
 */
interface Props {
  open: boolean;
  onClose: () => void;
  user?: Session['user'];
}

/**
 * Props for the NavigationItem component
 */
interface NavigationItemProps {
  section: SettingsSection;
  activeSection: SettingsSection;
  label: string;
  icon?: React.ReactNode;
  onClick: (section: SettingsSection) => void;
}

/**
 * NavigationItem component for the settings dialog
 * Renders a button that can be clicked to navigate to a different section
 */
const NavigationItem: FC<NavigationItemProps> = ({
  section,
  activeSection,
  label,
  icon,
  onClick,
}) => {
  const isActive = section === activeSection;

  return (
    <button
      className={`flex items-center w-full text-left p-3 my-1 rounded-lg ${
        isActive 
          ? 'bg-gray-200 dark:bg-gray-700 font-medium' 
          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
      onClick={() => onClick(section)}
      aria-current={isActive ? 'page' : undefined}
    >
      {icon && <span className="mr-3">{icon}</span>}
      <span>{label}</span>
    </button>
  );
};

/**
 * SettingDialog component
 * Renders a modal dialog with settings for the application
 */
export const SettingDialog: FC<Props> = ({ open, onClose, user }) => {
  const { t } = useTranslation('settings');
  const settings: Settings = getSettings();
  const { state, dispatch } = useCreateReducer<Settings>({
    initialState: settings,
  });

  const {
    handleImportConversations,
    handleExportData,
    handleClearConversations,
  } = useContext(ChatbarContext);

  const { state: homeState, dispatch: homeDispatch } = useContext(HomeContext);
  const { storagePercentage, checkStorage } = useStorageMonitor();
  const [storageData, setStorageData] = useState(() => getStorageUsage());
  const modalRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState<SettingsSection>(SettingsSection.GENERAL);
  const [isMobileView, setIsMobileView] = useState<boolean>(false);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        window.addEventListener('mouseup', handleMouseUp);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      window.removeEventListener('mouseup', handleMouseUp);
      onClose();
    };

    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [onClose]);

  // Update storage data when dialog opens
  useEffect(() => {
    if (open) {
      setStorageData(getStorageUsage());
      checkStorage();
    }
  }, [open, checkStorage]);

  // Check screen size to determine if it's in mobile view
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    // Initial check
    checkMobileView();

    // Add event listener for window resize
    window.addEventListener('resize', checkMobileView);

    // Clean up event listener
    return () => {
      window.removeEventListener('resize', checkMobileView);
    };
  }, []);

  // Configure swipe handlers for mobile navigation
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      // Navigate to next section if available
      const sections = Object.values(SettingsSection);
      const currentIndex = sections.indexOf(activeSection);
      if (currentIndex < sections.length - 1) {
        setActiveSection(sections[currentIndex + 1]);
      }
    },
    onSwipedRight: () => {
      // Navigate to previous section if available
      const sections = Object.values(SettingsSection);
      const currentIndex = sections.indexOf(activeSection);
      if (currentIndex > 0) {
        setActiveSection(sections[currentIndex - 1]);
      }
    },
    preventScrollOnSwipe: true,
    trackMouse: false
  });

  const handleSave = () => {
    homeDispatch({ field: 'lightMode', value: state.theme });
    homeDispatch({ field: 'temperature', value: state.temperature });
    homeDispatch({ field: 'systemPrompt', value: state.systemPrompt });
    saveSettings(state);
  };

  const handleReset = () => {
    const defaultTheme: 'light' | 'dark' = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    const defaultSettings: Settings = {
      theme: defaultTheme,
      temperature: 0.5,
      systemPrompt: process.env.NEXT_PUBLIC_DEFAULT_SYSTEM_PROMPT || '',
    };
    homeDispatch({ field: 'lightMode', value: defaultTheme });
    homeDispatch({ field: 'temperature', value: 0.5 });
    homeDispatch({
      field: 'systemPrompt',
      value: process.env.NEXT_PUBLIC_DEFAULT_SYSTEM_PROMPT || '',
    });
    saveSettings(defaultSettings);
  };

  // Format bytes to more readable format
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(2)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  // Render nothing if the dialog is not open.
  if (!open) {
    return <></>;
  }

  /**
   * Renders the content for the General section
   */
  const renderGeneralSection = () => (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-6 text-black dark:text-white">
        {t('General')}
      </h2>

      <div className="space-y-6">
        {/* Language Setting */}
        <div className="flex flex-row justify-between items-center">
          <div className="text-sm font-bold text-black dark:text-neutral-200">
            {t('Language')}
          </div>
          <LanguageSwitcher />
        </div>

        {/* Theme Setting */}
        <div className="flex flex-row justify-between items-center">
          <div className="text-sm font-bold text-black dark:text-neutral-200">
            {t('Theme')}
          </div>
          <select
            className="w-[120px] cursor-pointer bg-transparent p-2 text-neutral-700 dark:text-neutral-200 text-center text-sm border-none hover:bg-gray-500/10"
            value={state.theme}
            onChange={(event) =>
              dispatch({ field: 'theme', value: event.target.value })
            }
          >
            <option className={'bg-white dark:bg-black'} value="dark">{t('Dark mode')}</option>
            <option className={'bg-white dark:bg-black'} value="light">{t('Light mode')}</option>
          </select>
        </div>

        {/* User Information */}
        <div className="mt-6">
          <h3 className="text-sm font-bold mb-3 text-black dark:text-neutral-200">
            {t('User Information')}
          </h3>
          <table className="w-full">
            <tbody>
              {user?.displayName && (
                <tr>
                  <td className="py-1 text-black dark:text-neutral-100">
                    {user.displayName}
                  </td>
                </tr>
              )}
              {user?.department && (
                <tr>
                  <td className="py-1 text-black dark:text-neutral-100">
                    {user.department}
                  </td>
                </tr>
              )}
              {user?.jobTitle && (
                <tr>
                  <td className="py-1 text-black dark:text-neutral-100">
                    {user.jobTitle}
                  </td>
                </tr>
              )}
              {user?.mail && (
                <tr>
                  <td className="py-1 text-black dark:text-neutral-100">
                    {user.mail}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mt-6">
          <button
            type="button"
            className="w-[120px] p-2 border rounded-lg shadow border-neutral-500 text-neutral-900 hover:bg-neutral-100 focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-300"
            onClick={() => {
              handleSave();
              onClose();
            }}
          >
            {t('Save')}
          </button>
        </div>
      </div>
    </div>
  );

  /**
   * Renders the content for the Chat Settings section
   */
  const renderChatSettingsSection = () => (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-6 text-black dark:text-white">
        {t('Chat Settings')}
      </h2>

      <div className="space-y-6">
        {/* Temperature Setting */}
        <div>
          <div className="text-sm font-bold mb-3 text-black dark:text-neutral-200">
            {t('Default') + ' ' + t('Temperature') + '*'}
          </div>
          <TemperatureSlider
            temperature={state.temperature}
            onChangeTemperature={(temperature) =>
              dispatch({ field: 'temperature', value: temperature })
            }
          />
        </div>

        {/* System Prompt - Commented out in original code */}
        {/* <div>
          <div className="text-sm font-bold text-black dark:text-neutral-200 mb-3">
            {t('Default System Prompt') + '*'}
          </div>
          <SystemPrompt
            prompts={homeState.prompts}
            systemPrompt={state.systemPrompt}
            user={user}
            onChangePrompt={(prompt) =>
              dispatch({
                field: 'systemPrompt',
                value: prompt,
              })
            }
          />
        </div> */}

        <hr className="border-gray-300 dark:border-neutral-700" />
        <span className="block text-[12px] text-black/50 dark:text-white/50">
          {t(
            '*Note that these default settings only apply to new conversations once saved.',
          )}
        </span>

        <div className="flex justify-end">
          <button
            type="button"
            className="w-[120px] p-2 border rounded-lg shadow border-neutral-500 text-neutral-900 hover:bg-neutral-100 focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-300"
            onClick={() => {
              handleSave();
              onClose();
            }}
          >
            {t('Save')}
          </button>
        </div>
      </div>
    </div>
  );

  /**
   * Renders the content for the Data Management section
   */
  const renderDataManagementSection = () => (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-6 text-black dark:text-white">
        {t('Data Management')}
      </h2>

      <div className="space-y-6">
        {/* Storage Usage Information */}
        <div>
          <h3 className="text-sm font-bold mb-3 text-black dark:text-neutral-200">
            {t('Storage Information')}
          </h3>
          <div className="mb-5 text-sm text-black dark:text-neutral-300">
            <div className="mb-2">
              <span className="font-medium">Storage Usage:</span> {formatBytes(storageData.currentUsage)} / {formatBytes(storageData.maxUsage)} ({storageData.percentUsed.toFixed(1)}%)
            </div>

            <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2.5 mb-2">
              <div
                className={`h-2.5 rounded-full ${storageData.percentUsed > 85 ? 'bg-red-600' : storageData.percentUsed > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(storageData.percentUsed, 100)}%` }}
              ></div>
            </div>

            <div className="text-xs text-gray-600 dark:text-gray-400">
              {storageData.percentUsed > 85 ? (
                <span className="text-red-600 dark:text-red-400">Storage almost full! Consider clearing old conversations.</span>
              ) : storageData.percentUsed > 70 ? (
                <span className="text-yellow-600 dark:text-yellow-400">Storage usage is getting high.</span>
              ) : (
                <span>Storage usage is normal.</span>
              )}
            </div>
          </div>
        </div>

        {/* Data Management Actions */}
        <div>
          <h3 className="text-sm font-bold mb-3 text-black dark:text-neutral-200">
            {t('Data Actions')}
          </h3>
          <div className="flex flex-col space-y-2">
            {homeState.conversations.length > 0 ? (
              <ClearConversations
                onClearConversations={() => {
                  handleClearConversations();
                  // Update storage data after clearing conversations
                  setTimeout(() => {
                    setStorageData(getStorageUsage());
                    checkStorage();
                  }, 100);
                }}
              />
            ) : null}
            <Import onImport={(data) => {
              handleImportConversations(data);
              // Update storage data after importing conversations
              setTimeout(() => {
                setStorageData(getStorageUsage());
                checkStorage();
              }, 100);
            }} />
            <SidebarButton
              text={t('Export data')}
              icon={<IconFileExport size={18} />}
              onClick={() => handleExportData()}
            />
          </div>
        </div>

        {/* Reset Settings */}
        <div className="pt-4">
          <h3 className="text-sm font-bold mb-3 text-black dark:text-neutral-200">
            {t('Reset Settings')}
          </h3>
          <button
            type="button"
            className="w-full p-2 border rounded-lg shadow border-neutral-500 text-neutral-900 hover:bg-neutral-100 focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-300"
            onClick={() => {
              handleReset();
              onClose();
            }}
          >
            {t('Reset to Default Settings')}
          </button>
        </div>
      </div>
    </div>
  );

  /**
   * Renders the content for the Account section
   */
  const renderAccountSection = () => (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-6 text-black dark:text-white">
        {t('Account')}
      </h2>

      <div className="space-y-6">
        {/* Sign In/Sign Out */}
        <div>
          <h3 className="text-sm font-bold mb-3 text-black dark:text-neutral-200">
            {t('Authentication')}
          </h3>
          <SignInSignOut />
        </div>
      </div>
    </div>
  );

  /**
   * Renders the content for the Help & Support section
   */
  const renderHelpSupportSection = () => (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-6 text-black dark:text-white">
        {t('Help & Support')}
      </h2>

      <div className="space-y-6">
        {/* FAQ */}
        <div>
          <h3 className="text-sm font-bold mb-3 text-black dark:text-neutral-200">
            {t('Frequently Asked Questions')}
          </h3>
          <FAQ faq={faqData.faq} />
        </div>
      </div>
    </div>
  );

  /**
   * Renders the mobile navigation for the settings dialog
   */
  const renderMobileNavigation = () => {
    const sections = Object.values(SettingsSection);
    const currentIndex = sections.indexOf(activeSection);

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
            {(() => {
              switch (activeSection) {
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
                  return '';
              }
            })()}
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

  // Render the dialog.
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="fixed inset-0 z-10 overflow-hidden">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <div
            className="hidden sm:inline-block sm:h-screen sm:align-middle"
            aria-hidden="true"
          />

          <div
            ref={modalRef}
            className="dark:border-netural-400 inline-block transform rounded-lg border border-gray-300 bg-white text-left align-bottom shadow-xl transition-all dark:bg-[#171717] sm:my-8 w-full md:max-w-[700px] lg:max-w-[800px] xl:max-w-[900px] sm:align-middle"
            role="dialog"
          >
            <div className="flex flex-col md:flex-row h-[500px] md:h-[600px]">
              {/* Navigation sidebar - hidden on mobile */}
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

              {/* Content area */}
              <div
                className="flex-grow overflow-y-auto relative"
                {...swipeHandlers}
              >
                {/* Mobile back button - only visible on mobile */}
                {isMobileView && (
                  <div className="sticky top-0 bg-white dark:bg-[#171717] p-4 border-b border-gray-300 dark:border-neutral-700 z-10">
                    <h2 className="text-lg font-bold text-black dark:text-white">
                      {(() => {
                        switch (activeSection) {
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
                      })()}
                    </h2>
                  </div>
                )}

                {/* Section content */}
                {activeSection === SettingsSection.GENERAL && renderGeneralSection()}
                {activeSection === SettingsSection.CHAT_SETTINGS && renderChatSettingsSection()}
                {activeSection === SettingsSection.DATA_MANAGEMENT && renderDataManagementSection()}
                {activeSection === SettingsSection.ACCOUNT && renderAccountSection()}
                {activeSection === SettingsSection.HELP_SUPPORT && renderHelpSupportSection()}

                {/* Mobile navigation */}
                {isMobileView && renderMobileNavigation()}

                {/* Footer */}
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
