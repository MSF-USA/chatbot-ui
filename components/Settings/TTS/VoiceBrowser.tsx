'use client';

import {
  IconGenderFemale,
  IconGenderMale,
  IconLanguage,
  IconVolume,
} from '@tabler/icons-react';
import { FC, useCallback, useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';

import { VoiceInfo } from '@/types/tts';

import {
  TTS_LANGUAGES,
  getLanguageInfo,
  getVoicesForLocale,
} from '@/lib/data/ttsVoices';

interface VoiceBrowserProps {
  /** Currently selected voice name */
  selectedVoice: string;
  /** Callback when a voice is selected */
  onSelectVoice: (voiceName: string) => void;
  /** Current app locale for default selection */
  appLocale?: string;
}

/**
 * Voice browser component for selecting TTS voices.
 * Provides a two-level selection: Language -> Voice.
 */
export const VoiceBrowser: FC<VoiceBrowserProps> = ({
  selectedVoice,
  onSelectVoice,
  appLocale = 'en',
}) => {
  const t = useTranslations();

  // Extract locale from selected voice (e.g., "en-US" from "en-US-AriaNeural")
  const getLocaleFromVoice = useCallback((voiceName: string): string => {
    const match = voiceName.match(/^([a-z]{2}-[A-Z]{2})/);
    return match ? match[1] : 'en-US';
  }, []);

  // Determine initial locale based on selected voice or app locale
  const initialLocale = useMemo(() => {
    if (selectedVoice) {
      return getLocaleFromVoice(selectedVoice);
    }
    // Map app locale to TTS locale
    const localeMap: Record<string, string> = {
      en: 'en-US',
      es: 'es-ES',
      fr: 'fr-FR',
      de: 'de-DE',
      it: 'it-IT',
      pt: 'pt-BR',
      zh: 'zh-CN',
      ja: 'ja-JP',
      ko: 'ko-KR',
      ar: 'ar-SA',
    };
    return localeMap[appLocale] || 'en-US';
  }, [selectedVoice, appLocale, getLocaleFromVoice]);

  const [selectedLocale, setSelectedLocale] = useState(initialLocale);

  // Get voices for the selected locale
  const voices = useMemo(
    () => getVoicesForLocale(selectedLocale),
    [selectedLocale],
  );

  // Get language info for display
  const languageInfo = useMemo(
    () => getLanguageInfo(selectedLocale),
    [selectedLocale],
  );

  // Handle locale change
  const handleLocaleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newLocale = e.target.value;
      setSelectedLocale(newLocale);

      // Auto-select first voice of new locale if current voice is from different locale
      const newVoices = getVoicesForLocale(newLocale);
      if (newVoices.length > 0) {
        const currentLocale = getLocaleFromVoice(selectedVoice);
        if (currentLocale !== newLocale) {
          onSelectVoice(newVoices[0].name);
        }
      }
    },
    [selectedVoice, onSelectVoice, getLocaleFromVoice],
  );

  // Get gender icon
  const getGenderIcon = (gender: VoiceInfo['gender']) => {
    switch (gender) {
      case 'Female':
        return (
          <IconGenderFemale size={14} className="text-pink-500 flex-shrink-0" />
        );
      case 'Male':
        return (
          <IconGenderMale size={14} className="text-blue-500 flex-shrink-0" />
        );
      default:
        return null;
    }
  };

  // Get voice type badge color
  const getTypeBadgeClass = (type: VoiceInfo['type']) => {
    switch (type) {
      case 'Multilingual':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case 'DragonHD':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
      case 'Turbo':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-4">
      {/* Language Selector */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-black dark:text-neutral-200 mb-2">
          <IconLanguage size={16} />
          {t('settings.tts.language')}
        </label>
        <select
          value={selectedLocale}
          onChange={handleLocaleChange}
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
        >
          {TTS_LANGUAGES.map((lang) => (
            <option key={lang.locale} value={lang.locale}>
              {lang.displayName} ({lang.nativeName})
            </option>
          ))}
        </select>
      </div>

      {/* Voice Selector */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-black dark:text-neutral-200 mb-2">
          <IconVolume size={16} />
          {t('settings.tts.voice')}
        </label>

        {/* Voice List */}
        <div className="max-h-48 overflow-y-auto rounded-lg border border-neutral-200 dark:border-neutral-600">
          {voices.length === 0 ? (
            <div className="p-3 text-sm text-gray-500 dark:text-gray-400 text-center">
              {t('settings.tts.noVoicesAvailable')}
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
              {voices.map((voice) => (
                <button
                  key={voice.name}
                  onClick={() => onSelectVoice(voice.name)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                    selectedVoice === voice.name
                      ? 'bg-neutral-100 dark:bg-neutral-700'
                      : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                  }`}
                >
                  {/* Gender Icon */}
                  {getGenderIcon(voice.gender)}

                  {/* Voice Name */}
                  <span className="flex-1 text-sm text-neutral-900 dark:text-neutral-100">
                    {voice.displayName}
                  </span>

                  {/* Type Badge */}
                  {voice.type !== 'Neural' && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${getTypeBadgeClass(voice.type)}`}
                    >
                      {voice.type}
                    </span>
                  )}

                  {/* Selected Indicator */}
                  {selectedVoice === voice.name && (
                    <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Voice Info */}
        {selectedVoice && languageInfo && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {t('settings.tts.selectedVoice')}: {selectedVoice}
          </p>
        )}
      </div>
    </div>
  );
};
