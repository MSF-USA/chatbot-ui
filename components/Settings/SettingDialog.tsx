import { FC, useContext, useEffect, useReducer, useRef, useState } from 'react';

import { useTranslation } from 'next-i18next';
import { IconExternalLink, IconFileExport } from '@tabler/icons-react';

import { useCreateReducer } from '@/hooks/useCreateReducer';

import { getSettings, saveSettings } from '@/utils/app/settings';
import { Session } from 'next-auth';
import { Import } from './Import';
import { SidebarButton } from '../Sidebar/SidebarButton';

import { Settings } from '@/types/settings';
import { SignInSignOut } from './SignInSignOut';
import { TemperatureSlider } from './Temperature';
import { SystemPrompt } from './SystemPrompt';
import LanguageSwitcher from "@/components/Sidebar/components/LanguageSwitcher";
import { ClearConversations } from './ClearConversations';

import HomeContext from '@/pages/api/home/home.context';
import ChatbarContext from '../Chatbar/Chatbar.context';

const version = process.env.NEXT_PUBLIC_VERSION;
const build = process.env.NEXT_PUBLIC_BUILD;
const env = process.env.NEXT_PUBLIC_ENV;
const email = process.env.NEXT_PUBLIC_EMAIL;

enum Tab {
  CHAT_SETTINGS = 'CHAT_SETTINGS',
  APP_SETTINGS = 'APP_SETTINGS',
}

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

  const {
    handleImportConversations,
    handleExportData,
    handleClearConversations,
  } = useContext(ChatbarContext);

  const {
    state: homeState,
    dispatch: homeDispatch
  } = useContext(HomeContext);
  const modalRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.CHAT_SETTINGS);

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
    localStorage.setItem('temperature', JSON.stringify(homeState.temperature));
    localStorage.setItem('systemPrompt', JSON.stringify(homeState.systemPrompt));
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
            className="dark:border-netural-400 inline-block max-h-[400px] transform overflow-y-auto rounded-lg border border-gray-300 bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all dark:bg-[#171717] sm:my-8 sm:max-h-[600px] sm:w-full md:max-w-[400px] lg:max-w-[600px] xl:max-w-[800px] sm:p-6 sm:align-middle overflow-hidden"
            role="dialog"
          >
            <div className="flex">
              <button
                className={`flex-grow text-sm font-bold mb-2 mr-4 py-2 focus:outline-none text-black dark:text-white ${
                  activeTab === Tab.CHAT_SETTINGS
                    ? 'border-b-2 border-black dark:border-white'
                    : 'border-0'
                }`}
                onClick={() => setActiveTab(Tab.CHAT_SETTINGS)}
              >
                {t('Chat') + ' ' + t('Settings')}
              </button>
              <button
                className={`flex-grow text-sm font-bold mb-2 mr-4 py-2 focus:outline-none text-black dark:text-white ${
                  activeTab === Tab.APP_SETTINGS
                  ? 'border-b-2 border-black dark:border-white'
                  : 'border-0'
                }`}
                onClick={() => setActiveTab(Tab.APP_SETTINGS)}
              >
                {t('App') + ' ' + t('Settings')}
              </button>
            </div>

            {activeTab === Tab.CHAT_SETTINGS && (
              <>
              <div className="text-sm font-bold my-10 text-black dark:text-neutral-200">
                {t('Temperature')}
              </div>

              <TemperatureSlider
                temperature={homeState.temperature}
                onChangeTemperature={(temperature) =>
                  homeDispatch({ field: 'temperature', value: temperature })
                }
              />
              <hr className="my-10 border-gray-300 dark:border-neutral-700" />
              <div className="text-sm font-bold text-black dark:text-neutral-200 mb-10">
                {t('System Prompt')}
              </div>
              <SystemPrompt
                prompts={homeState.prompts}
                systemPrompt={homeState.systemPrompt}
                user={user}
                onChangePrompt={(prompt) =>
                  homeDispatch({
                    field: 'systemPrompt',
                    value: prompt,
                  })
                }
              />
              <hr className="my-10 border-gray-300 dark:border-neutral-700" />
                <div className='flex justify-end mr-1 mt-10'>
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
              </>)
            }

            {activeTab === Tab.APP_SETTINGS && (
            <>
            <div className='flex flex-row justify-between items-center my-10'>
              <div className="text-sm font-bold text-black dark:text-neutral-200">
                {t('Language')}
              </div>
              <LanguageSwitcher/>
            </div>
            <div className='flex flex-row justify-between items-center my-10'>
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
                <option value="dark">{t('Dark mode')}</option>
                <option value="light">{t('Light mode')}</option>
              </select>
            </div>
            <div className='flex justify-end mr-1'>
              <button
                type="button"
                className="w-[120px] p-2 border mb-10 rounded-lg shadow border-neutral-500 text-neutral-900 hover:bg-neutral-100 focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-300"
                onClick={() => {
                  handleSave();
                  onClose();
                }}
              >
                {t('Save')}
              </button>
            </div>
            <hr className="mb-10 border-gray-300 dark:border-neutral-700" />
        <div className="text-sm font-bold mb-5 text-black dark:text-neutral-200">
          User
        </div>
          <table>
            <tbody>
              <tr>
                {/* <td className="pr-4 text-black dark:text-neutral-300">Name:</td> */}
                <td className="text-black dark:text-neutral-100">{user?.displayName}</td>
              </tr>
              <tr>
                {/* <td className="pr-4 text-black dark:text-neutral-300">Department:</td> */}
                <td className="text-black dark:text-neutral-100">{user?.department}</td>
              </tr>
              <tr>
                {/* <td className="pr-4 text-black dark:text-neutral-300">Position:</td> */}
                <td className="text-black dark:text-neutral-100">{user?.jobTitle}</td>
              </tr>
              <tr>
               {/* <td className="pr-4 text-black dark:text-neutral-300">Email:</td> */}
                <td className="text-black dark:text-neutral-100">{user?.mail}</td>
              </tr>
            </tbody>
          </table>
          <hr className="my-10 border-gray-300 dark:border-neutral-700" />
          <div className='flex flex-row justify-between'>
            <div className="text-sm mb-5 font-bold text-black dark:text-neutral-200">
              Data
            </div>
            <div className='flex justify-end mr-1 mb-10 items-center flex-col'>
              {homeState.conversations.length > 0 ? (
                  <ClearConversations onClearConversations={handleClearConversations} />
              ) : null}
              <Import onImport={handleImportConversations} />

              <SidebarButton
                text={t('Export data')}
                icon={<IconFileExport size={18} />}
                onClick={() => handleExportData()}
              />
            </div>
          </div>
          <div className='flex justify-end mr-1'>
            <SignInSignOut />
          </div>
          </>
        )}
          <div className="flex flex-col md:flex-row px-1 md:justify-between mt-10 mr-1">
            <div className="text-gray-500">v{version}.{build}.{env}</div>
            <a
              href={`mailto:${email}`}
              className="flex items-center mt-2 md:mt-0 text-black dark:text-white"
            >
              <IconExternalLink size={18} className={'inline mr-1 text-black dark:text-white'} />
              {t('Send your Feedback')}
            </a>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};
