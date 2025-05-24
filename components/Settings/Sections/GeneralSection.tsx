import { FC } from 'react';
import { useTranslation } from 'next-i18next';
import { Session } from 'next-auth';
import { Settings } from '@/types/settings';
import LanguageSwitcher from '@/components/Sidebar/components/LanguageSwitcher';

interface GeneralSectionProps {
  state: Settings;
  dispatch: React.Dispatch<{
    field: keyof Settings;
    value: any;
  }>;
  user?: Session['user'];
  onSave: () => void;
  onClose: () => void;
}

export const GeneralSection: FC<GeneralSectionProps> = ({
  state,
  dispatch,
  user,
  onSave,
  onClose,
}) => {
  const { t } = useTranslation('settings');

  return (
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
              onSave();
              onClose();
            }}
          >
            {t('Save')}
          </button>
        </div>
      </div>
    </div>
  );
};
