'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSwipeable } from 'react-swipeable';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';

import { useCreateReducer } from '@/lib/hooks/useCreateReducer';
import { getSettings, saveSettings } from '@/lib/utils/app/settings';
import { getStorageUsage } from '@/utils/app/storageMonitor';

import { Settings } from '@/types/settings';

import { useUI } from '@/lib/hooks/ui/useUI';
import { useSettings } from '@/lib/hooks/settings/useSettings';
import { useConversations } from '@/lib/hooks/conversation/useConversations';

import { MobileHeader } from './MobileHeader';
import { MobileNavigation } from './MobileNavigation';
import { AccountSection } from './Sections/AccountSection';
import { ChatSettingsSection } from './Sections/ChatSettingsSection';
import { DataManagementSection } from './Sections/DataManagementSection';
import { GeneralSection } from './Sections/GeneralSection';
import { HelpSupportSection } from './Sections/HelpSupportSection';
import { PrivacyControlSection } from './Sections/PrivacyControlSection';
import { SettingsFooter } from './SettingsFooter';
import { SettingsSidebar } from './SettingsSidebar';
import faqData from './faq.json';
import { SettingsSection } from './types';

const version = process.env.NEXT_PUBLIC_VERSION;
const build = process.env.NEXT_PUBLIC_BUILD;
const env = process.env.NEXT_PUBLIC_ENV;

/**
 * SettingDialog component adapted for Zustand stores
 */
export function SettingDialog() {
  const t = useTranslations();
  const { data: session } = useSession();
  const { isSettingsOpen, setIsSettingsOpen, theme, setTheme } = useUI();
  const {
    temperature,
    setTemperature,
    systemPrompt,
    setSystemPrompt,
    prompts
  } = useSettings();
  const { conversations, clearAll: clearAllConversations } = useConversations();

  const { state, dispatch } = useCreateReducer<Settings>({
    initialState: {
      theme: 'light',
      temperature: 0.5,
      systemPrompt: '',
    },
  });

  const [storageData, setStorageData] = useState<any>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState<SettingsSection>(SettingsSection.GENERAL);
  const [isMobileView, setIsMobileView] = useState<boolean>(false);

  // Load settings and storage on client side only
  useEffect(() => {
    const loadedSettings = getSettings();
    Object.keys(loadedSettings).forEach((key) => {
      dispatch({ field: key as keyof Settings, value: loadedSettings[key as keyof Settings] });
    });
    setStorageData(getStorageUsage());
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        window.addEventListener('mouseup', handleMouseUp);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      window.removeEventListener('mouseup', handleMouseUp);
      setIsSettingsOpen(false);
    };

    if (isSettingsOpen) {
      window.addEventListener('mousedown', handleMouseDown);
    }

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [isSettingsOpen, setIsSettingsOpen]);

  // Update storage data when dialog opens
  useEffect(() => {
    if (isSettingsOpen) {
      setStorageData(getStorageUsage());
    }
  }, [isSettingsOpen]);

  // Check for mobile view
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    checkMobileView();
    window.addEventListener('resize', checkMobileView);

    return () => {
      window.removeEventListener('resize', checkMobileView);
    };
  }, []);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSettingsOpen(false);
      }
    };

    if (isSettingsOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSettingsOpen, setIsSettingsOpen]);

  // Swipe handlers for mobile
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      const sections = Object.values(SettingsSection);
      const currentIndex = sections.indexOf(activeSection);
      if (currentIndex < sections.length - 1) {
        setActiveSection(sections[currentIndex + 1]);
      }
    },
    onSwipedRight: () => {
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
    setTheme(state.theme);
    setTemperature(state.temperature);
    setSystemPrompt(state.systemPrompt);
    saveSettings(state);
  };

  const handleReset = () => {
    const defaultTheme: 'light' | 'dark' = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
    const defaultSettings: Settings = {
      theme: defaultTheme,
      temperature: 0.5,
      systemPrompt: process.env.NEXT_PUBLIC_DEFAULT_SYSTEM_PROMPT || '',
      advancedMode: false,
    };
    setTheme(defaultTheme);
    setTemperature(0.5);
    setSystemPrompt(process.env.NEXT_PUBLIC_DEFAULT_SYSTEM_PROMPT || '');
    saveSettings(defaultSettings);
  };

  const handleClearConversations = () => {
    clearAllConversations();
  };

  const handleExportData = () => {
    const dataToExport = {
      version: 4,
      history: conversations,
      prompts: prompts,
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chatbot_data_${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportConversations = (data: any) => {
    // TODO: Implement import functionality with Zustand
    console.log('Import not yet implemented for Zustand', data);
  };

  const checkStorage = useCallback(() => {
    setStorageData(getStorageUsage());
  }, []);

  // Render nothing if not open
  if (!isSettingsOpen) {
    return null;
  }

  // Create homeState object for compatibility with sections
  const homeState = {
    conversations,
    prompts,
  };

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
                onClose={() => setIsSettingsOpen(false)}
                user={session?.user}
                state={state}
                dispatch={dispatch}
              />

              {/* Content area */}
              <div
                className="flex-grow overflow-y-auto relative"
                {...swipeHandlers}
              >
                {/* Mobile header */}
                {isMobileView && <MobileHeader activeSection={activeSection} />}

                {/* Section content */}
                {activeSection === SettingsSection.GENERAL && (
                  <GeneralSection
                    state={state}
                    dispatch={dispatch}
                    user={session?.user}
                    onSave={handleSave}
                    onClose={() => setIsSettingsOpen(false)}
                  />
                )}

                {activeSection === SettingsSection.CHAT_SETTINGS && (
                  <ChatSettingsSection
                    state={state}
                    dispatch={dispatch}
                    homeState={homeState}
                    user={session?.user}
                    onSave={handleSave}
                    onClose={() => setIsSettingsOpen(false)}
                  />
                )}

                {activeSection === SettingsSection.PRIVACY_CONTROL && (
                  <PrivacyControlSection onClose={() => setIsSettingsOpen(false)} />
                )}

                {activeSection === SettingsSection.DATA_MANAGEMENT && (
                  <DataManagementSection
                    handleClearConversations={handleClearConversations}
                    handleImportConversations={handleImportConversations}
                    handleExportData={handleExportData}
                    handleReset={handleReset}
                    onClose={() => setIsSettingsOpen(false)}
                    checkStorage={checkStorage}
                  />
                )}

                {activeSection === SettingsSection.ACCOUNT && (
                  <AccountSection user={session?.user} />
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
              </div>
            </div>

            {/* Footer */}
            <SettingsFooter
              version={version}
              build={build}
              env={env}
              userEmail={session?.user?.mail}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
