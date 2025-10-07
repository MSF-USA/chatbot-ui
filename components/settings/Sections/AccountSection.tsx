import { FC } from 'react';

import { Session } from 'next-auth';
import { useTranslations } from 'next-intl';

import { SignInSignOut } from '../SignInSignOut';

interface AccountSectionProps {
  user?: Session['user'];
}

export const AccountSection: FC<AccountSectionProps> = ({ user }) => {
  const t = useTranslations();

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-6 text-black dark:text-white">
        {t('Account')}
      </h2>

      <div className="space-y-6">
        {/* User Profile Information */}
        {user && (
          <div className="mt-4 bg-gray-50 dark:bg-gray-800/40 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center mb-3">
              <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mr-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-blue-600 dark:text-blue-300"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-black dark:text-white">
                {t('Profile')}
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {user?.displayName && (
                <div className="col-span-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t('Name')}
                  </div>
                  <div className="text-sm font-medium text-black dark:text-white">
                    {user.displayName}
                  </div>
                </div>
              )}
              {user?.jobTitle && (
                <div className="col-span-2 sm:col-span-1 mt-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t('Job Title')}
                  </div>
                  <div className="text-sm font-medium text-black dark:text-white">
                    {user.jobTitle}
                  </div>
                </div>
              )}
              {user?.department && (
                <div className="col-span-2 sm:col-span-1 mt-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t('Department')}
                  </div>
                  <div className="text-sm font-medium text-black dark:text-white">
                    {user.department}
                  </div>
                </div>
              )}
              {user?.mail && (
                <div className="col-span-2 mt-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t('Email')}
                  </div>
                  <div className="text-sm font-medium text-black dark:text-white">
                    {user.mail}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

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
};
