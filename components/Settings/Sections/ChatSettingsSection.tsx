import { FC } from 'react';
import { useTranslation } from 'next-i18next';
import { Session } from 'next-auth';
import { Settings } from '@/types/settings';
import { TemperatureSlider } from '../Temperature';
import { SystemPrompt } from '../SystemPrompt';

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
  const { t } = useTranslation('settings');

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-6 text-black dark:text-white">
        {t('Chat Settings')}
      </h2>

      <div className="space-y-6">
        {/* Temperature Setting */}
        <div>
          <div className="text-sm font-bold mb-3 text-black dark:text-neutral-200">
            {t('Default') + ' ' + t('Temperature') + '*'}
          </div>
          <TemperatureSlider
            temperature={state.temperature}
            onChangeTemperature={(temperature) =>
              dispatch({ field: 'temperature', value: temperature })
            }
          />
        </div>

        {/* System Prompt - Commented out in original code */}
        {/* <div>
          <div className="text-sm font-bold text-black dark:text-neutral-200 mb-3">
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
        </div> */}

        <hr className="border-gray-300 dark:border-neutral-700" />
        <span className="block text-[12px] text-black/50 dark:text-white/50">
          {t(
            '*Note that these default settings only apply to new conversations once saved.',
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
