import {
  IconCheck,
  IconCopy,
  IconLanguage,
  IconLoader2,
  IconSearch,
  IconSettings,
  IconVolume,
  IconVolumeOff,
} from '@tabler/icons-react';
import {
  FC,
  KeyboardEvent,
  MouseEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

import { getAutonym, getSupportedLocales } from '@/utils/app/locales';

interface AssistantMessageActionButtonsProps {
  messageCopied: boolean;
  copyOnClick: () => void;
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

export const AssistantMessageActionButtons: FC<
  AssistantMessageActionButtonsProps
> = ({
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const supportedLocales = getSupportedLocales();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter locales based on search query
  const filteredLocales = supportedLocales.filter((locale) => {
    const autonym = getAutonym(locale);
    return (
      locale.toLowerCase().includes(searchQuery.toLowerCase()) ||
      autonym.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!showLanguageSelector) return;

    switch (e.key) {
      case 'Escape':
        if (searchQuery?.length > 0) {
          setSearchQuery('');
        } else {
          setShowLanguageSelector(false);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredLocales.length - 1 ? prev + 1 : prev,
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        if (selectedIndex >= 0 && selectedIndex < filteredLocales.length) {
          onTranslate(filteredLocales[selectedIndex]);
          setShowLanguageSelector(false);
        }
        break;
    }
  };

  // Focus search input when dropdown opens
  useEffect(() => {
    if (showLanguageSelector && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showLanguageSelector]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowLanguageSelector(false);
      }
    };

    if (showLanguageSelector) {
      document.addEventListener('mousedown', handleClickOutside as any);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside as any);
    };
  }, [showLanguageSelector]);

  // Reset search and selection when dropdown closes
  useEffect(() => {
    if (!showLanguageSelector) {
      setSearchQuery('');
      setSelectedIndex(-1);
    }
  }, [showLanguageSelector]);

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
            aria-label={messageCopied ? 'Copied' : 'Copy message'}
          >
            {messageCopied ? <IconCheck size={18} /> : <IconCopy size={18} />}
          </button>
          <span className="sr-only">
            {messageCopied ? 'Copied!' : 'Copy message'}
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
            <IconSettings
              size={18}
              className={showStreamingSettings ? 'animate-spin-slow' : ''}
            />
          </button>
          <span className="sr-only">Streaming settings</span>
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
            aria-label={isTranslating ? 'Translating...' : 'Translate'}
          >
            {isTranslating ? (
              <IconLoader2 size={18} className="animate-spin" />
            ) : (
              <IconLanguage size={18} />
            )}
          </button>
          <span className="sr-only">
            {isTranslating ? 'Translating...' : 'Translate'}
          </span>

          {/* Language selector dropdown */}
          {showLanguageSelector && (
            <div
              ref={dropdownRef}
              className="absolute right-0 bottom-full mb-2 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 max-h-80 overflow-hidden flex flex-col"
              onKeyDown={handleKeyDown}
            >
              {/* Search input */}
              <div className="p-2 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IconSearch size={16} className="text-gray-400" />
                  </div>
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Search languages..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSelectedIndex(-1);
                    }}
                  />
                </div>
              </div>

              {/* Language list */}
              <div className="overflow-y-auto">
                {filteredLocales.length > 0 ? (
                  <div className="py-1">
                    {filteredLocales.map((locale, index) => (
                      <button
                        key={locale}
                        className={`w-full text-left px-4 py-2 text-sm ${
                          index === selectedIndex
                            ? 'bg-blue-500 text-white dark:bg-blue-600'
                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                        onClick={() => {
                          onTranslate(locale);
                          setShowLanguageSelector(false);
                        }}
                        onMouseEnter={() => setSelectedIndex(index)}
                      >
                        <span className="font-medium">
                          {getAutonym(locale)}
                        </span>
                        <span className="ml-2 text-xs opacity-70">
                          {locale}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                    No languages found
                  </div>
                )}
              </div>
            </div>
          )}
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
            aria-label={
              audioUrl
                ? 'Stop audio'
                : isGeneratingAudio
                ? 'Generating audio...'
                : 'Listen'
            }
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
            {audioUrl
              ? 'Stop audio'
              : isGeneratingAudio
              ? 'Generating audio...'
              : 'Listen'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AssistantMessageActionButtons;
