import { FC } from 'react';
import { useTranslation } from 'next-i18next';
import { Session } from 'next-auth';
import { Settings } from '@/types/settings';
import LanguageSwitcher from '@/components/Sidebar/components/LanguageSwitcher';
import {IconLanguage, IconPaint} from "@tabler/icons-react";

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
                    <div className="text-sm font-bold text-black dark:text-neutral-200 flex items-center">
                        <IconLanguage className="mr-1" /> {t('Language')}
                    </div>
                    <LanguageSwitcher />
                </div>

                {/* Theme Setting */}
                <div className="flex flex-row justify-between items-center">
                    <div className="text-sm font-bold text-black dark:text-neutral-200 flex items-center">
                        <IconPaint className="mr-1" /> {t('Theme')}
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
                {user && (
                    <div className="mt-8 bg-gray-50 dark:bg-gray-800/40 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center mb-3">
                            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mr-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-300" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <h3 className="text-sm font-bold text-black dark:text-white">
                                {t('Profile')}
                            </h3>
                        </div>
                        {/*  TODO: Add some relevant information, such as it influencing your system prompt if/when we do that */}
                        {/*<p className="text-xs text-gray-500 dark:text-gray-400 mb-3">*/}
                        {/*  {t('This is how your profile appears in our system')}*/}
                        {/*</p>*/}
                        <div className="grid grid-cols-2 gap-2">
                            {user?.displayName && (
                                <div className="col-span-2">
                                    <div className="text-xs text-gray-500 dark:text-gray-400">{t('Name')}</div>
                                    <div className="text-sm font-medium text-black dark:text-white">{user.displayName}</div>
                                </div>
                            )}
                            {user?.jobTitle && (
                                <div className="col-span-2 sm:col-span-1 mt-2">
                                    <div className="text-xs text-gray-500 dark:text-gray-400">{t('Job Title')}</div>
                                    <div className="text-sm font-medium text-black dark:text-white">{user.jobTitle}</div>
                                </div>
                            )}
                            {user?.department && (
                                <div className="col-span-2 sm:col-span-1 mt-2">
                                    <div className="text-xs text-gray-500 dark:text-gray-400">{t('Department')}</div>
                                    <div className="text-sm font-medium text-black dark:text-white">{user.department}</div>
                                </div>
                            )}
                            {user?.mail && (
                                <div className="col-span-2 mt-2">
                                    <div className="text-xs text-gray-500 dark:text-gray-400">{t('Email')}</div>
                                    <div className="text-sm font-medium text-black dark:text-white">{user.mail}</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

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
