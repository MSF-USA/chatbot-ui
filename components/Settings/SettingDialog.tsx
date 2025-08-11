import { FC, useContext, useEffect, useRef, useState } from 'react';
import { useSwipeable } from 'react-swipeable';

import { Session } from 'next-auth';
import { useTranslation } from 'next-i18next';

import { useCreateReducer } from '@/hooks/useCreateReducer';

import { getSettings, saveSettings } from '@/utils/app/settings';
import { getStorageUsage } from '@/utils/app/storageMonitor';

import { Settings } from '@/types/settings';

import HomeContext from '@/pages/api/home/home.context';

import ChatbarContext from '../Chatbar/Chatbar.context';
import { MobileHeader } from './MobileHeader';
import { MobileNavigation } from './MobileNavigation';
import { AccountSection } from './Sections/AccountSection';
// import { AgentFeaturesSection } from './Sections/AgentFeaturesSection';
import { ChatSettingsSection } from './Sections/ChatSettingsSection';
import { DataManagementSection } from './Sections/DataManagementSection';
import { GeneralSection } from './Sections/GeneralSection';
import { HelpSupportSection } from './Sections/HelpSupportSection';
import { PrivacyControlSection } from './Sections/PrivacyControlSection';
import { SettingsFooter } from './SettingsFooter';
import { SettingsSidebar } from './SettingsSidebar';
import faqData from './faq.json';
import { SettingsSection } from './types';

import { useStorageMonitor } from '@/context/StorageMonitorContext';

const version = process.env.NEXT_PUBLIC_VERSION;
const build = process.env.NEXT_PUBLIC_BUILD;
const env = process.env.NEXT_PUBLIC_ENV;

/**
 * Props for the SettingDialog component
 */
interface Props {
  open: boolean;
  onClose: () => void;
  user?: Session['user'];
  initialSection?: SettingsSection;
}

/**
 * SettingDialog component
 * Renders a modal dialog with settings for the application
 */
export const SettingDialog: FC<Props> = ({
  open,
  onClose,
  user,
  initialSection,
}) => {
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
  const [activeSection, setActiveSection] = useState<SettingsSection>(
    initialSection || SettingsSection.GENERAL,
  );
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

  // Update active section when initialSection changes
  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);

  // Handle ESC key to close dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Only add listener when dialog is open
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
    }

    // Clean up event listener
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

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
    trackMouse: false,
  });

  const handleSave = () => {
    homeDispatch({ field: 'lightMode', value: state.theme });
    homeDispatch({ field: 'temperature', value: state.temperature });
    homeDispatch({ field: 'systemPrompt', value: state.systemPrompt });
    saveSettings(state);
  };

  const handleReset = () => {
    const defaultTheme: 'light' | 'dark' = window.matchMedia(
      '(prefers-color-scheme: dark)',
    ).matches
      ? 'dark'
      : 'light';
    const defaultSettings: Settings = {
      theme: defaultTheme,
      temperature: 0.5,
      systemPrompt: process.env.NEXT_PUBLIC_DEFAULT_SYSTEM_PROMPT || '',
      advancedMode: false,
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

  // Render the dialog.
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-50">
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
              <SettingsSidebar
                activeSection={activeSection}
                setActiveSection={setActiveSection}
                handleReset={handleReset}
                onClose={onClose}
                user={user}
                state={state}
                dispatch={dispatch}
              />

              {/* Content area */}
              <div
                className="flex-grow overflow-y-auto relative"
                {...swipeHandlers}
              >
                {/* Mobile header - only visible on mobile */}
                {isMobileView && <MobileHeader activeSection={activeSection} />}

                {/* Section content */}
                {activeSection === SettingsSection.GENERAL && (
                  <GeneralSection
                    state={state}
                    dispatch={dispatch}
                    user={user}
                    onSave={handleSave}
                    onClose={onClose}
                  />
                )}

                {activeSection === SettingsSection.CHAT_SETTINGS && (
                  <ChatSettingsSection
                    state={state}
                    dispatch={dispatch}
                    homeState={homeState}
                    user={user}
                    onSave={handleSave}
                    onClose={onClose}
                  />
                )}

                {/* activeSection === SettingsSection.AGENT_FEATURES && (
                  <AgentFeaturesSection onClose={onClose} />
                ) */}

                {activeSection === SettingsSection.PRIVACY_CONTROL && (
                  <PrivacyControlSection onClose={onClose} />
                )}

                {activeSection === SettingsSection.DATA_MANAGEMENT && (
                  <DataManagementSection
                    homeState={homeState}
                    handleClearConversations={handleClearConversations}
                    handleImportConversations={handleImportConversations}
                    handleExportData={handleExportData}
                    handleReset={handleReset}
                    onClose={onClose}
                    checkStorage={checkStorage}
                  />
                )}

                {activeSection === SettingsSection.ACCOUNT && (
                  <AccountSection user={user} />
                )}

                {activeSection === SettingsSection.HELP_SUPPORT && (
                  <HelpSupportSection faqData={faqData} />
                )}

                {/* Mobile navigation */}
                {isMobileView && (
                  <MobileNavigation
                    activeSection={activeSection}
                    setActiveSection={setActiveSection}
                  />
                )}

                {/* Footer */}
                <SettingsFooter
                  version={version || ''}
                  build={build || ''}
                  env={env || ''}
                  user={user}
                  handleReset={handleReset}
                  onClose={onClose}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
