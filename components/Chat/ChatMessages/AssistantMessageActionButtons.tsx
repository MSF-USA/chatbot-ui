import {
  IconCheck,
  IconCopy,
  IconLoader2,
  IconSettings,
  IconVolume,
  IconVolumeOff,
  IconLanguage,
} from '@tabler/icons-react';
import { FC, MouseEvent, useState } from 'react';
import { getSupportedLocales, getAutonym } from '@/utils/app/locales';

interface AssistantMessageActionButtonsProps {
  messageCopied: boolean;
  copyOnClick: (event: MouseEvent<any>) => void;
  isGeneratingAudio: boolean;
  audioUrl: string | null;
  handleTTS: () => void;
  handleCloseAudio: () => void;
  messageIsStreaming: boolean;
  showStreamingSettings: boolean;
  setShowStreamingSettings: (show: boolean) => void;
  onTranslate: (targetLocale: string) => void;
  isTranslating: boolean;
}

export const AssistantMessageActionButtons: FC<AssistantMessageActionButtonsProps> = ({
  messageCopied,
  copyOnClick,
  isGeneratingAudio,
  audioUrl,
  handleTTS,
  handleCloseAudio,
  messageIsStreaming,
  showStreamingSettings,
  setShowStreamingSettings,
  onTranslate,
  isTranslating,
}) => {
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const supportedLocales = getSupportedLocales();

  return (
    <div className="flex justify-end items-center mt-3 sm:mt-4">
      <div className="bg-gray-100 dark:bg-gray-800 rounded-full p-1 flex items-center shadow-sm border border-gray-200 dark:border-gray-700 transition-all hover:shadow-md">
        {/* Copy button */}
        <div className="relative group">
          <button
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
              messageCopied 
                ? 'bg-green-500 text-white dark:bg-green-600 scale-105'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:scale-105'
            }`}
            onClick={copyOnClick}
            aria-label={messageCopied ? "Copied" : "Copy message"}
          >
            {messageCopied ? (
              <IconCheck size={18} />
            ) : (
              <IconCopy size={18} />
            )}
          </button>
          <span className="sr-only">
            {messageCopied ? "Copied!" : "Copy message"}
          </span>
        </div>

        {/* Streaming Settings button */}
        <div className="relative group ml-1">
          <button
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
              showStreamingSettings
                ? 'bg-blue-500 text-white dark:bg-blue-600 scale-105'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:scale-105'
            }`}
            onClick={() => setShowStreamingSettings(!showStreamingSettings)}
            aria-label="Text streaming settings"
          >
            <IconSettings size={18} className={showStreamingSettings ? 'animate-spin-slow' : ''} />
          </button>
          <span className="sr-only">
            Streaming settings
          </span>
        </div>

        {/* Listen button */}
        <div className="relative group ml-1">
          <button
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
              audioUrl
                ? 'bg-blue-500 text-white dark:bg-blue-600 scale-105'
                : isGeneratingAudio
                  ? 'bg-gray-300 text-gray-500 dark:bg-gray-600 dark:text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:scale-105'
            }`}
            onClick={audioUrl ? handleCloseAudio : handleTTS}
            disabled={isGeneratingAudio || messageIsStreaming}
            aria-label={audioUrl ? "Stop audio" : isGeneratingAudio ? "Generating audio..." : "Listen"}
          >
            {isGeneratingAudio ? (
              <IconLoader2 size={18} className="animate-spin" />
            ) : audioUrl ? (
              <IconVolumeOff size={18} className="animate-pulse" />
            ) : (
              <IconVolume size={18} />
            )}
          </button>
          <span className="sr-only">
            {audioUrl ? "Stop audio" : isGeneratingAudio ? "Generating audio..." : "Listen"}
          </span>
        </div>

        {/* Translate button */}
        <div className="relative group ml-1">
          <button
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
              showLanguageSelector
                ? 'bg-blue-500 text-white dark:bg-blue-600 scale-105'
                : isTranslating
                  ? 'bg-gray-300 text-gray-500 dark:bg-gray-600 dark:text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:scale-105'
            }`}
            onClick={() => setShowLanguageSelector(!showLanguageSelector)}
            disabled={isTranslating || messageIsStreaming}
            aria-label={isTranslating ? "Translating..." : "Translate"}
          >
            {isTranslating ? (
              <IconLoader2 size={18} className="animate-spin" />
            ) : (
              <IconLanguage size={18} />
            )}
          </button>
          <span className="sr-only">
            {isTranslating ? "Translating..." : "Translate"}
          </span>

          {/* Language selector dropdown */}
          {showLanguageSelector && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
              <div className="py-1">
                {supportedLocales.map((locale) => (
                  <button
                    key={locale}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => {
                      onTranslate(locale);
                      setShowLanguageSelector(false);
                    }}
                  >
                    {getAutonym(locale)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssistantMessageActionButtons;
