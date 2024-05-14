import { FC, useContext, useEffect, useReducer, useRef } from 'react';

import { useTranslation } from 'next-i18next';
import {IconExternalLink, IconSettings, IconUser} from '@tabler/icons-react';

import { useCreateReducer } from '@/hooks/useCreateReducer';

import { getSettings, saveSettings } from '@/utils/app/settings';
import { Session } from 'next-auth';

import { Settings } from '@/types/settings';
import { SignInSignOut } from './SignInSignOut';

import HomeContext from '@/pages/api/home/home.context';

const version = process.env.NEXT_PUBLIC_VERSION;
const build = process.env.NEXT_PUBLIC_BUILD;
const env = process.env.NEXT_PUBLIC_ENV;
const email = process.env.NEXT_PUBLIC_EMAIL;

interface Props {
  open: boolean;
  onClose: () => void;
  user?: Session['user'];
}

export const SettingDialog: FC<Props> = ({ open, onClose, user }) => {
  const { t } = useTranslation('settings');
  const settings: Settings = getSettings();
  const { state, dispatch } = useCreateReducer<Settings>({
    initialState: settings,
  });
  const { dispatch: homeDispatch } = useContext(HomeContext);
  const modalRef = useRef<HTMLDivElement>(null);

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

  const handleSave = () => {
    homeDispatch({ field: 'lightMode', value: state.theme });
    saveSettings(state);
  };

  // Render nothing if the dialog is not open.
  if (!open) {
    return <></>;
  }

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
              className="dark:border-netural-400 inline-block max-h-[400px] transform overflow-y-auto rounded-lg border border-gray-300 bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all dark:bg-[#202123] sm:my-8 sm:max-h-[600px] sm:w-full sm:max-w-lg sm:p-6 sm:align-middle overflow-hidden"
              role="dialog"
          >
            <div className="text-lg pb-4 font-bold text-black dark:text-neutral-200 flex">
              <IconSettings/>
              <span>{t('Settings')}</span>
            </div>

            <div className="text-sm font-bold mb-2 text-black dark:text-neutral-200">
              {t('Theme')}
            </div>

            <select
                className="w-full cursor-pointer bg-transparent p-2 text-neutral-700 dark:text-neutral-200 dark:bg-black"
                value={state.theme}
                onChange={(event) =>
                    dispatch({field: 'theme', value: event.target.value})
                }
            >
              <option value="dark">{t('Dark mode')}</option>
              <option value="light">{t('Light mode')}</option>
            </select>

            <button
                type="button"
                className="w-full px-4 py-2 mt-6 border rounded-lg shadow border-neutral-500 text-neutral-900 hover:bg-neutral-100 focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-300"
                onClick={() => {
                  handleSave();
                  onClose();
                }}
            >
              {t('Save')}
            </button>
            <hr className="my-4 border-gray-300 dark:border-neutral-700"/>
            <div className="text-lg pb-4 font-bold text-black dark:text-neutral-200 flex">
              <IconUser/>
              <span>{t('User')}</span>
            </div>
            <div className="text-sm font-bold mb-2 text-black dark:text-neutral-200">
              {t('Basic user info')}
            </div>
            <table>
              <tbody>
              <tr>
                <td className="pr-4 text-black dark:text-neutral-300">Name:</td>
                <td className="text-black dark:text-neutral-100">{user?.displayName}</td>
              </tr>
              <tr>
                <td className="pr-4 text-black dark:text-neutral-300">Department:</td>
                <td className="text-black dark:text-neutral-100">{user?.department}</td>
              </tr>
              <tr>
                <td className="pr-4 text-black dark:text-neutral-300">Position:</td>
                <td className="text-black dark:text-neutral-100">{user?.jobTitle}</td>
              </tr>
              <tr>
                <td className="pr-4 text-black dark:text-neutral-300">Email:</td>
                <td className="text-black dark:text-neutral-100">{user?.mail}</td>
              </tr>
              </tbody>
            </table>
            <hr className="my-4 border-gray-300 dark:border-neutral-700"/>
            <div className="flex justify-end w-full">
              <SignInSignOut/>
            </div>
            <div className="flex flex-col md:flex-row px-1 md:justify-between mt-5">
              <div className="text-gray-500">v{version}.{build}.{env}</div>
              <a
                  href={`mailto:${email}`}
                  className="flex items-center mt-2 md:mt-0"
              >
                <IconExternalLink size={18} className={'inline mr-1'}/>
                {t('Send your Feedback')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
