import {
  IconDevices,
  IconId,
  IconLanguage,
  IconMoon,
  IconPencil,
  IconSettings,
  IconSun,
  IconUser,
  IconUserCircle,
  IconUserOff,
} from '@tabler/icons-react';
import { FC, useEffect, useState } from 'react';

import { Session } from 'next-auth';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

import { useSettings } from '@/client/hooks/settings/useSettings';
import { useUI } from '@/client/hooks/ui/useUI';

import { getUserDisplayName } from '@/lib/utils/app/user/displayName';

import { DisplayNamePreference } from '@/types/settings';
import { Settings } from '@/types/settings';

import LanguageSwitcher from '@/components/Sidebar/components/LanguageSwitcher';
import { Tooltip } from '@/components/UI/Tooltip';

import { SignInSignOut } from '../SignInSignOut';

import packageJson from '@/package.json';

const version = packageJson.version;
const build = process.env.NEXT_PUBLIC_BUILD || 'Unknown';
const env = process.env.NEXT_PUBLIC_ENV || 'development';

interface FullUserProfile {
  id: string;
  displayName: string;
  givenName?: string;
  surname?: string;
  mail?: string;
  jobTitle?: string;
  department?: string;
  companyName?: string;
  photoUrl?: string | null;
}

interface GeneralSectionProps {
  state: Settings;
  dispatch: React.Dispatch<{
    field: keyof Settings;
    value: any;
  }>;
  user?: Session['user'];
  onSave: () => void;
  onClose: () => void;
  prefetchedProfile?: FullUserProfile | null;
}

export const GeneralSection: FC<GeneralSectionProps> = ({
  state,
  dispatch,
  user,
  onSave,
  onClose,
  prefetchedProfile,
}) => {
  const t = useTranslations();

  // Display name preference options with icons
  const displayNameOptions = [
    {
      key: 'firstName' as const,
      icon: IconUserCircle,
      tooltip: t('settings.First Name'),
    },
    {
      key: 'lastName' as const,
      icon: IconId,
      tooltip: t('settings.Last Name'),
    },
    {
      key: 'fullName' as const,
      icon: IconUser,
      tooltip: t('settings.Full Name'),
    },
    { key: 'custom' as const, icon: IconPencil, tooltip: t('settings.Custom') },
    { key: 'none' as const, icon: IconUserOff, tooltip: t('settings.None') },
  ];

  const { theme, setTheme } = useUI();
  const {
    displayNamePreference,
    customDisplayName,
    setDisplayNamePreference,
    setCustomDisplayName,
  } = useSettings();
  const [fullProfile, setFullProfile] = useState<FullUserProfile | null>(
    prefetchedProfile || null,
  );

  // Use prefetched profile or fetch if not available (fallback)
  useEffect(() => {
    const fetchFullProfile = async () => {
      if (!user || prefetchedProfile) return;

      try {
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const profile = await response.json();
          setFullProfile(profile);
        }
      } catch (error) {
        console.error('Failed to fetch full profile:', error);
      }
    };

    fetchFullProfile();
  }, [user, prefetchedProfile]);

  // Update local state when prefetched profile becomes available
  useEffect(() => {
    if (prefetchedProfile) {
      setTimeout(() => {
        setFullProfile(prefetchedProfile);
      }, 0);
    }
  }, [prefetchedProfile]);

  return (
    <div className="p-4 flex flex-col h-full">
      <div className="space-y-6 flex-1">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <IconSettings size={24} className="text-black dark:text-white" />
          <h2 className="text-xl font-bold text-black dark:text-white">
            {t('settings.General')}
          </h2>
        </div>

        {/* User Profile Information with Display Name Preferences */}
        {user && (
          <div className="bg-gray-50 dark:bg-gray-800/40 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            {/* Profile Info Row */}
            <div className="flex items-start gap-4">
              {/* Photo - larger 64px */}
              <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                {fullProfile?.photoUrl ? (
                  <Image
                    src={fullProfile.photoUrl}
                    alt={user?.displayName || 'User'}
                    fill
                    className="rounded-full object-cover"
                  />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-blue-600 dark:text-blue-300"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>

              {/* Info Column */}
              <div className="flex-1 min-w-0">
                <div className="text-base font-medium text-black dark:text-white">
                  {user?.displayName || fullProfile?.displayName}
                </div>
                {(fullProfile?.jobTitle || fullProfile?.department) && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {[fullProfile.jobTitle, fullProfile.department]
                      .filter(Boolean)
                      .join(' • ')}
                  </div>
                )}
                {(user?.mail || fullProfile?.mail) && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {user?.mail || fullProfile?.mail}
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-600 my-4" />

            {/* Display Name Preference */}
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {t('settings.howShouldWeAddressYou')}
              </div>

              {/* Icon Buttons */}
              <div className="flex items-center gap-1 p-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 w-fit">
                {displayNameOptions.map(({ key, icon: Icon, tooltip }) => (
                  <Tooltip key={key} content={tooltip}>
                    <button
                      onClick={() => setDisplayNamePreference(key)}
                      className={`p-2 rounded-md transition-all ${
                        displayNamePreference === key
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon size={18} />
                    </button>
                  </Tooltip>
                ))}
              </div>

              {/* Custom Name Input */}
              {displayNamePreference === 'custom' && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={customDisplayName}
                    onChange={(e) => setCustomDisplayName(e.target.value)}
                    placeholder={t('settings.Custom Display Name Placeholder')}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    maxLength={50}
                  />
                </div>
              )}

              {/* Preview */}
              <div className="mt-3 text-sm text-gray-500 dark:text-gray-400 italic">
                {t('settings.displayNamePreview', {
                  name:
                    getUserDisplayName(
                      user,
                      displayNamePreference,
                      customDisplayName,
                    ) || 'User',
                })}
              </div>
            </div>
          </div>
        )}

        {/* App Settings Header */}
        <div>
          <h3 className="text-base font-bold text-black dark:text-white mb-6 pb-2 border-b border-gray-200 dark:border-gray-700">
            {t('settings.App Settings')}
          </h3>

          <div className="space-y-5">
            {/* Language Setting */}
            <div className="flex flex-row justify-between items-center px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <div className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <IconLanguage
                  size={18}
                  className="text-gray-500 dark:text-gray-400"
                />
                {t('Language')}
              </div>
              <LanguageSwitcher />
            </div>

            {/* Theme Setting */}
            <div className="flex flex-row justify-between items-center px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <div className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <IconMoon
                  size={18}
                  className="text-gray-500 dark:text-gray-400"
                />
                {t('Theme')}
              </div>
              <div className="flex items-center gap-1 p-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <Tooltip content="Light">
                  <button
                    onClick={() => setTheme('light')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      theme === 'light'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <IconSun size={16} />
                  </button>
                </Tooltip>
                <Tooltip content="Device default">
                  <button
                    onClick={() => setTheme('system')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      theme === 'system'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <IconDevices size={16} />
                  </button>
                </Tooltip>
                <Tooltip content="Dark">
                  <button
                    onClick={() => setTheme('dark')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      theme === 'dark'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <IconMoon size={16} />
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sign Out Button - Aligned Right */}
      <div className="flex justify-end">
        <SignInSignOut />
      </div>

      {/* Version Information - At Very Bottom */}
      <div className="mt-auto pt-4 pb-2 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          v{version}.{build}.{env}
        </div>
      </div>
    </div>
  );
};
