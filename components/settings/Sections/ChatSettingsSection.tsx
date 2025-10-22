import { FC } from 'react';

import { Session } from 'next-auth';
import { useTranslations } from 'next-intl';

import { Settings } from '@/types/settings';

import { SystemPrompt } from '../SystemPrompt';
import { TemperatureSlider } from '../Temperature';

interface ChatSettingsSectionProps {
  state: Settings;
  dispatch: React.Dispatch<{
    field: keyof Settings;
    value: any;
  }>;
  homeState: any; // Type should be refined based on actual HomeContext state
  user?: Session['user'];
  onSave: () => void;
  onClose: () => void;
}

export const ChatSettingsSection: FC<ChatSettingsSectionProps> = ({
  state,
  dispatch,
  homeState,
  user,
  onSave,
  onClose,
}) => {
  const t = useTranslations();

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-6 text-black dark:text-white">
        {t('Chat Settings')}
      </h2>

      <div className="space-y-8">
        {/* Model Response Settings Section */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h3 className="text-md font-bold mb-4 text-black dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
            {t('Model Response Settings')}
          </h3>

          {/* Temperature Setting */}
          <div className="mb-4">
            <div className="text-sm font-bold mb-3 text-black dark:text-neutral-200">
              {t('Default') + ' ' + t('Temperature') + '*'}
            </div>
            <TemperatureSlider
              temperature={state.temperature}
              onChangeTemperature={(temperature) =>
                dispatch({ field: 'temperature', value: temperature })
              }
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {t(
                'Higher values produce more creative and varied responses, lower values are more focused and deterministic',
              )}
            </p>
          </div>
        </div>

        {/* Advanced Settings Section */}
        {state.advancedMode && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
              <h3 className="text-md font-bold text-black dark:text-white">
                {t('Advanced Settings')}
              </h3>
              <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100 rounded-full">
                {t('Advanced')}
              </span>
            </div>

            {/* System Prompt */}
            <div>
              <div className="text-sm font-bold mb-3 text-black dark:text-neutral-200">
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
            </div>
          </div>
        )}

        <hr className="border-gray-300 dark:border-neutral-700" />
        <span className="block text-[12px] text-black/50 dark:text-white/50">
          {t(
            '*Note that these default settings only apply to new conversations once saved',
          )}
        </span>

        <div className="flex justify-end">
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
