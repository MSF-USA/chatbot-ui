'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { useUI } from '@/lib/hooks/ui/useUI';
import { useSettings } from '@/lib/hooks/settings/useSettings';
import { TemperatureSlider } from './Temperature';
import { IconX } from '@tabler/icons-react';

enum Tab {
  CHAT_SETTINGS = 'CHAT_SETTINGS',
  APP_SETTINGS = 'APP_SETTINGS',
}

/**
 * Settings dialog for chat and app configuration
 */
export function SettingsDialog() {
  const t = useTranslations();
  const { data: session } = useSession();
  const { isSettingsOpen, setIsSettingsOpen, theme, setTheme } = useUI();
  const { temperature, setTemperature, systemPrompt, setSystemPrompt } = useSettings();

  const [activeTab, setActiveTab] = useState<Tab>(Tab.CHAT_SETTINGS);
  const [localSystemPrompt, setLocalSystemPrompt] = useState(systemPrompt);
  const [localTemperature, setLocalTemperature] = useState(temperature);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalSystemPrompt(systemPrompt);
    setLocalTemperature(temperature);
  }, [systemPrompt, temperature, isSettingsOpen]);

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

  const handleSave = () => {
    setTemperature(localTemperature);
    setSystemPrompt(localSystemPrompt);
    setIsSettingsOpen(false);
  };

  if (!isSettingsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={modalRef}
        className="relative max-h-[600px] w-full max-w-[800px] overflow-y-auto rounded-lg border border-gray-300 bg-white p-6 shadow-xl dark:border-neutral-700 dark:bg-[#171717]"
      >
        {/* Header with tabs */}
        <div className="mb-4 flex items-center justify-between border-b border-gray-300 dark:border-neutral-700">
          <div className="flex">
            <button
              className={`px-4 py-2 text-sm font-semibold ${
                activeTab === Tab.CHAT_SETTINGS
                  ? 'border-b-2 border-black dark:border-white'
                  : ''
              }`}
              onClick={() => setActiveTab(Tab.CHAT_SETTINGS)}
            >
              {t('Chat Settings')}
            </button>
            <button
              className={`px-4 py-2 text-sm font-semibold ${
                activeTab === Tab.APP_SETTINGS
                  ? 'border-b-2 border-black dark:border-white'
                  : ''
              }`}
              onClick={() => setActiveTab(Tab.APP_SETTINGS)}
            >
              {t('App Settings')}
            </button>
          </div>
          <button
            className="rounded p-1 hover:bg-gray-100 dark:hover:bg-neutral-800"
            onClick={() => setIsSettingsOpen(false)}
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === Tab.CHAT_SETTINGS && (
            <>
              {/* Temperature */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-black dark:text-white">
                  {t('Default Temperature')}
                </label>
                <TemperatureSlider
                  temperature={localTemperature}
                  onChangeTemperature={setLocalTemperature}
                />
              </div>

              {/* System Prompt */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-black dark:text-white">
                  {t('Default System Prompt')}
                </label>
                <textarea
                  className="w-full rounded border border-gray-300 bg-white p-3 text-sm text-black dark:border-neutral-600 dark:bg-[#212121] dark:text-white"
                  rows={6}
                  value={localSystemPrompt}
                  onChange={(e) => setLocalSystemPrompt(e.target.value)}
                  placeholder={t('Enter system prompt...')}
                />
              </div>
            </>
          )}

          {activeTab === Tab.APP_SETTINGS && (
            <>
              {/* Theme */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-black dark:text-white">
                  {t('Theme')}
                </label>
                <select
                  className="w-full rounded border border-gray-300 bg-white p-2 text-sm text-black dark:border-neutral-600 dark:bg-[#212121] dark:text-white"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
                >
                  <option value="light">{t('Light')}</option>
                  <option value="dark">{t('Dark')}</option>
                </select>
              </div>

              {/* User Info */}
              {session?.user && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-black dark:text-white">
                    {t('User Information')}
                  </label>
                  <div className="space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
                    <div><strong>{t('Name')}:</strong> {session.user.displayName}</div>
                    <div><strong>{t('Email')}:</strong> {session.user.mail}</div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-3 border-t border-gray-300 pt-4 dark:border-neutral-700">
          <button
            className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-black hover:bg-gray-300 dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-600"
            onClick={() => setIsSettingsOpen(false)}
          >
            {t('Cancel')}
          </button>
          <button
            className="rounded bg-[#D7211E] px-4 py-2 text-sm font-medium text-white hover:bg-[#B81B18]"
            onClick={handleSave}
          >
            {t('Save')}
          </button>
        </div>
      </div>
    </div>
  );
}
