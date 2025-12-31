'use client';

import { IconPlayerPlay, IconRefresh } from '@tabler/icons-react';
import { FC, useCallback, useState } from 'react';

import { useLocale, useTranslations } from 'next-intl';

import { useSettings } from '@/client/hooks/settings/useSettings';

import {
  DEFAULT_TTS_SETTINGS,
  OUTPUT_FORMAT_LABELS,
  TTSOutputFormat,
  TTSSettings,
  TTS_CONSTRAINTS,
} from '@/types/tts';

import { VoiceBrowser } from './VoiceBrowser';

import {
  getDefaultVoiceForLocale,
  getTTSLocaleForAppLocale,
} from '@/lib/data/ttsVoices';

interface TTSSettingsPanelProps {
  /** Current TTS settings (from local state) */
  settings: TTSSettings;
  /** Callback when settings change */
  onChange: (settings: Partial<TTSSettings>) => void;
}

/**
 * TTS Settings Panel component.
 * Provides controls for voice selection, rate, pitch, and audio quality.
 */
export const TTSSettingsPanel: FC<TTSSettingsPanelProps> = ({
  settings,
  onChange,
}) => {
  const t = useTranslations();
  const locale = useLocale();
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Get effective voice name (use default if not set)
  const effectiveVoiceName =
    settings.voiceName ||
    getDefaultVoiceForLocale(getTTSLocaleForAppLocale(locale))?.name ||
    'en-US-AriaNeural';

  // Handle voice selection
  const handleVoiceChange = useCallback(
    (voiceName: string) => {
      onChange({ voiceName });
    },
    [onChange],
  );

  // Handle rate change
  const handleRateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const rate = parseFloat(e.target.value);
      onChange({ rate });
    },
    [onChange],
  );

  // Handle pitch change
  const handlePitchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const pitch = parseInt(e.target.value, 10);
      onChange({ pitch });
    },
    [onChange],
  );

  // Handle output format change
  const handleFormatChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const outputFormat = e.target.value as TTSOutputFormat;
      onChange({ outputFormat });
    },
    [onChange],
  );

  // Reset to defaults
  const handleReset = useCallback(() => {
    onChange(DEFAULT_TTS_SETTINGS);
  }, [onChange]);

  // Preview current settings
  const handlePreview = useCallback(async () => {
    setIsPreviewLoading(true);
    setPreviewError(null);

    try {
      const previewText = t('settings.tts.previewText');

      const response = await fetch('/api/chat/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: previewText,
          voiceName: effectiveVoiceName,
          rate: settings.rate,
          pitch: settings.pitch,
          outputFormat: settings.outputFormat,
        }),
      });

      if (!response.ok) {
        throw new Error(t('settings.tts.previewFailed'));
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      audio.onended = () => {
        URL.revokeObjectURL(url);
      };

      await audio.play();
    } catch (error) {
      console.error('TTS preview error:', error);
      setPreviewError(
        error instanceof Error
          ? error.message
          : t('settings.tts.previewFailed'),
      );
    } finally {
      setIsPreviewLoading(false);
    }
  }, [effectiveVoiceName, settings, t]);

  // Format rate for display
  const formatRate = (rate: number): string => {
    return `${rate.toFixed(1)}x`;
  };

  // Format pitch for display
  const formatPitch = (pitch: number): string => {
    if (pitch === 0) return t('settings.tts.default');
    return pitch > 0 ? `+${pitch}%` : `${pitch}%`;
  };

  return (
    <div className="space-y-6">
      {/* Voice Browser */}
      <VoiceBrowser
        selectedVoice={effectiveVoiceName}
        onSelectVoice={handleVoiceChange}
        appLocale={locale}
      />

      {/* Speech Rate */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-black dark:text-neutral-200">
            {t('settings.tts.rate')}
          </label>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {formatRate(settings.rate)}
          </span>
        </div>
        <input
          type="range"
          min={TTS_CONSTRAINTS.rate.min}
          max={TTS_CONSTRAINTS.rate.max}
          step={TTS_CONSTRAINTS.rate.step}
          value={settings.rate}
          onChange={handleRateChange}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-neutral-600 dark:accent-neutral-400"
        />
        <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
          <span>{t('settings.tts.slower')}</span>
          <span>{t('settings.tts.faster')}</span>
        </div>
      </div>

      {/* Pitch */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-black dark:text-neutral-200">
            {t('settings.tts.pitch')}
          </label>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {formatPitch(settings.pitch)}
          </span>
        </div>
        <input
          type="range"
          min={TTS_CONSTRAINTS.pitch.min}
          max={TTS_CONSTRAINTS.pitch.max}
          step={TTS_CONSTRAINTS.pitch.step}
          value={settings.pitch}
          onChange={handlePitchChange}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-neutral-600 dark:accent-neutral-400"
        />
        <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
          <span>{t('settings.tts.lower')}</span>
          <span>{t('settings.tts.higher')}</span>
        </div>
      </div>

      {/* Audio Quality */}
      <div>
        <label className="text-sm font-medium text-black dark:text-neutral-200 mb-2 block">
          {t('settings.tts.quality')}
        </label>
        <select
          value={settings.outputFormat}
          onChange={handleFormatChange}
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
        >
          {(Object.keys(OUTPUT_FORMAT_LABELS) as TTSOutputFormat[]).map(
            (format) => (
              <option key={format} value={format}>
                {OUTPUT_FORMAT_LABELS[format]}
              </option>
            ),
          )}
        </select>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {t('settings.tts.qualityDescription')}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-2">
        {/* Preview Button */}
        <button
          onClick={handlePreview}
          disabled={isPreviewLoading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-lg hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600"
        >
          <IconPlayerPlay size={16} />
          {isPreviewLoading
            ? t('settings.tts.previewing')
            : t('settings.tts.preview')}
        </button>

        {/* Reset Button */}
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 focus:outline-none dark:text-gray-400 dark:hover:text-gray-200"
        >
          <IconRefresh size={16} />
          {t('settings.tts.reset')}
        </button>
      </div>

      {/* Preview Error */}
      {previewError && (
        <p className="text-sm text-red-600 dark:text-red-400">{previewError}</p>
      )}
    </div>
  );
};
