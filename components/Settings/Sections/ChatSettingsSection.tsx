import { FC } from 'react';
import { useTranslation } from 'next-i18next';
import { Session } from 'next-auth';
import { Settings } from '@/types/settings';
import { TemperatureSlider } from '../Temperature';
import { SystemPrompt } from '../SystemPrompt';
import { useStreamingSettings } from '@/context/StreamingSettingsContext';
import { IconSettings } from '@tabler/icons-react';

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
  const { settings, updateSettings } = useStreamingSettings();

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
              {t('Higher values produce more creative and varied responses, lower values are more focused and deterministic.')}
            </p>
          </div>
        </div>

        {/* Text Streaming Settings Section */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
            <h3 className="text-md font-bold text-black dark:text-white">
              {t('Text Streaming Settings')}
            </h3>
            <IconSettings size={16} className="ml-2 text-gray-500" />
          </div>

          <div className="space-y-5">
            {/* Smooth Streaming Toggle */}
            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/40 p-3 rounded-lg">
              <label className="cursor-pointer text-sm text-gray-700 dark:text-gray-300 flex items-center">
                <span className="font-medium">{t('Smooth streaming')}</span>
                <p className="text-xs text-gray-500 dark:text-gray-400 block mt-1">
                  {t('Enable for a more natural reading experience')}
                </p>
              </label>
              <div className="relative inline-block w-10 h-5">
                <input
                  type="checkbox"
                  className="opacity-0 w-0 h-0"
                  checked={settings.smoothStreamingEnabled}
                  onChange={(e) =>
                    updateSettings({ smoothStreamingEnabled: e.target.checked })
                  }
                />
                <span className={`absolute cursor-pointer inset-0 rounded-full transition-all duration-300 ${
                  settings.smoothStreamingEnabled
                    ? 'bg-blue-500 dark:bg-blue-600'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                  <span className={`absolute w-4 h-4 bg-white rounded-full transition-transform duration-300 transform ${
                    settings.smoothStreamingEnabled
                      ? 'translate-x-5'
                      : 'translate-x-0.5'
                  } top-0.5 left-0`}></span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Characters Per Frame Slider */}
              <div className="bg-gray-50 dark:bg-gray-800/40 p-3 rounded-lg">
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('Speed (characters per frame)')}
                  <span className="text-xs font-medium ml-2 px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full">
                    {settings.charsPerFrame}
                  </span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={settings.charsPerFrame}
                  onChange={(e) =>
                    updateSettings({ charsPerFrame: parseInt(e.target.value) })
                  }
                  className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${
                    settings.smoothStreamingEnabled
                      ? 'bg-gray-300 dark:bg-gray-600'
                      : 'bg-gray-200 dark:bg-gray-700 opacity-50'
                  }`}
                  disabled={!settings.smoothStreamingEnabled}
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex justify-between">
                  <span>{t('Slower')}</span>
                  <span>{t('Faster')}</span>
                </div>
              </div>

              {/* Frame Delay Slider */}
              <div className="bg-gray-50 dark:bg-gray-800/40 p-3 rounded-lg">
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('Delay between frames (ms)')}
                  <span className="text-xs font-medium ml-2 px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full">
                    {settings.frameDelay}ms
                  </span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={settings.frameDelay}
                  onChange={(e) =>
                    updateSettings({ frameDelay: parseInt(e.target.value) })
                  }
                  className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${
                    settings.smoothStreamingEnabled
                      ? 'bg-gray-300 dark:bg-gray-600'
                      : 'bg-gray-200 dark:bg-gray-700 opacity-50'
                  }`}
                  disabled={!settings.smoothStreamingEnabled}
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex justify-between">
                  <span>{t('Faster')}</span>
                  <span>{t('Slower')}</span>
                </div>
              </div>
            </div>
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
