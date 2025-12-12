'use client';

import {
  IconCopy,
  IconDownload,
  IconLanguage,
  IconLoader2,
} from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';

import { translateText } from '@/lib/services/translation/translationService';

import {
  TranscriptTranslationEntry,
  TranscriptTranslationState,
} from '@/types/translation';

import { VersionNavigation } from '@/components/Chat/ChatMessages/VersionNavigation';
import { CitationStreamdown } from '@/components/Markdown/CitationStreamdown';
import { StreamdownWithCodeButtons } from '@/components/Markdown/StreamdownWithCodeButtons';

interface TranscriptViewerProps {
  filename: string;
  transcript: string;
  processedContent?: string;
}

/**
 * Component for displaying audio/video transcripts with copy/download/translate functionality.
 * Translations are handled in-place with version navigation (arrows) rather than creating new messages.
 */
export const TranscriptViewer: React.FC<TranscriptViewerProps> = ({
  filename,
  transcript,
  processedContent,
}) => {
  const t = useTranslations();
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  // Translation state with version navigation
  const [translationState, setTranslationState] =
    useState<TranscriptTranslationState>({
      currentIndex: 0, // 0 = original
      translations: [],
      isTranslating: false,
      error: null,
    });

  const languages = [
    { value: 'en', label: t('languageEnglish'), autonym: 'English' },
    { value: 'es', label: t('languageSpanish'), autonym: 'Español' },
    { value: 'fr', label: t('languageFrench'), autonym: 'Français' },
    { value: 'de', label: t('languageGerman'), autonym: 'Deutsch' },
    { value: 'nl', label: t('languageDutch'), autonym: 'Nederlands' },
    { value: 'it', label: t('languageItalian'), autonym: 'Italiano' },
    { value: 'pt', label: t('languagePortuguese'), autonym: 'Português' },
    { value: 'ru', label: t('languageRussian'), autonym: 'Русский' },
    { value: 'zh', label: t('languageChinese'), autonym: '中文' },
    { value: 'ja', label: t('languageJapanese'), autonym: '日本語' },
    { value: 'ko', label: t('languageKorean'), autonym: '한국어' },
    { value: 'ar', label: t('languageArabic'), autonym: 'العربية' },
    { value: 'hi', label: t('languageHindi'), autonym: 'हिन्दी' },
  ].sort((a, b) => a.label.localeCompare(b.label));

  // Get language autonym from locale code
  const getAutonym = useCallback(
    (locale: string): string => {
      const lang = languages.find((l) => l.value === locale);
      return lang?.autonym || locale;
    },
    [languages],
  );

  // Determine currently displayed transcript
  const displayedTranscript = useMemo(() => {
    if (translationState.currentIndex === 0) {
      return transcript;
    }
    const translation =
      translationState.translations[translationState.currentIndex - 1];
    return translation?.translatedText || transcript;
  }, [
    transcript,
    translationState.currentIndex,
    translationState.translations,
  ]);

  // Get current view label (Original or language name)
  const currentViewLabel = useMemo(() => {
    if (translationState.currentIndex === 0) {
      return processedContent ? 'Original Transcript' : 'Transcript';
    }
    const translation =
      translationState.translations[translationState.currentIndex - 1];
    return translation?.localeName || 'Translation';
  }, [
    processedContent,
    translationState.currentIndex,
    translationState.translations,
  ]);

  // Total versions = 1 (original) + number of translations
  const totalVersions = 1 + translationState.translations.length;

  // Handle translation request
  const handleTranslate = useCallback(async () => {
    const targetLocale = selectedLanguage;
    const localeName = getAutonym(targetLocale);

    // Check if already translated to this language
    const existingIndex = translationState.translations.findIndex(
      (t) => t.locale === targetLocale,
    );
    if (existingIndex !== -1) {
      // Already cached, just switch to it
      setTranslationState((prev) => ({
        ...prev,
        currentIndex: existingIndex + 1,
      }));
      setShowLanguageSelector(false);
      return;
    }

    // Start translation
    setTranslationState((prev) => ({
      ...prev,
      isTranslating: true,
      error: null,
    }));
    setShowLanguageSelector(false);

    try {
      const response = await translateText({
        sourceText: transcript,
        targetLocale,
      });

      if (response.success && response.data) {
        const newTranslation: TranscriptTranslationEntry = {
          locale: targetLocale,
          localeName,
          translatedText: response.data.translatedText,
          cachedAt: Date.now(),
        };

        setTranslationState((prev) => ({
          ...prev,
          translations: [...prev.translations, newTranslation],
          currentIndex: prev.translations.length + 1, // Point to new translation
          isTranslating: false,
        }));
      } else {
        throw new Error(response.error || 'Translation failed');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Translation failed';
      setTranslationState((prev) => ({
        ...prev,
        isTranslating: false,
        error: errorMessage,
      }));
      // Auto-clear error after 3 seconds
      setTimeout(() => {
        setTranslationState((prev) => ({ ...prev, error: null }));
      }, 3000);
    }
  }, [selectedLanguage, getAutonym, transcript, translationState.translations]);

  // Navigation handlers
  const handlePreviousVersion = useCallback(() => {
    setTranslationState((prev) => ({
      ...prev,
      currentIndex: Math.max(0, prev.currentIndex - 1),
    }));
  }, []);

  const handleNextVersion = useCallback(() => {
    setTranslationState((prev) => ({
      ...prev,
      currentIndex: Math.min(prev.translations.length, prev.currentIndex + 1),
    }));
  }, []);

  // Copy uses currently displayed transcript
  const handleCopy = async () => {
    await navigator.clipboard.writeText(displayedTranscript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download uses currently displayed transcript
  const handleDownload = () => {
    const suffix =
      translationState.currentIndex > 0
        ? `_${translationState.translations[translationState.currentIndex - 1]?.locale || 'translated'}`
        : '';
    const blob = new Blob([displayedTranscript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename.replace(/\.(mp3|mp4|mpeg|mpga|m4a|wav|webm)$/i, '')}_transcript${suffix}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Format transcript with line breaks at sentence boundaries
  const formattedTranscript = displayedTranscript
    .replace(/([.!?])\s+/g, '$1\n\n')
    .trim();

  return (
    <div className="transcript-viewer my-4">
      {/* Header */}
      <div className="mb-3">
        {processedContent ? (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Transcription of{' '}
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {filename}
            </span>
          </div>
        ) : (
          <div className="text-base font-medium text-gray-900 dark:text-gray-100">
            Transcription of {filename}
          </div>
        )}
      </div>

      {/* Processed Content (if provided) */}
      {processedContent && (
        <div className="mb-4 prose dark:prose-invert max-w-none">
          <StreamdownWithCodeButtons>
            <CitationStreamdown
              citations={[]}
              isAnimating={false}
              controls={true}
              shikiTheme={['github-light', 'github-dark']}
            >
              {processedContent}
            </CitationStreamdown>
          </StreamdownWithCodeButtons>
        </div>
      )}

      {/* Transcript Box */}
      <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600">
          <div className="flex items-center gap-2">
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
              {currentViewLabel}
            </div>
            {/* Version navigation */}
            {totalVersions > 1 && (
              <VersionNavigation
                currentVersion={translationState.currentIndex + 1}
                totalVersions={totalVersions}
                onPrevious={handlePreviousVersion}
                onNext={handleNextVersion}
              />
            )}
            {/* Translation loading indicator */}
            {translationState.isTranslating && (
              <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                <IconLoader2 size={14} className="animate-spin" />
                <span>Translating...</span>
              </div>
            )}
            {/* Error display */}
            {translationState.error && (
              <div className="text-xs text-red-600 dark:text-red-400">
                {translationState.error}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
              title={t('common.copyToClipboard')}
            >
              <IconCopy size={14} />
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
              title={t('chat.downloadTranscript')}
            >
              <IconDownload size={14} />
              Download
            </button>
            <div className="relative">
              {!showLanguageSelector ? (
                <button
                  onClick={() => setShowLanguageSelector(true)}
                  disabled={translationState.isTranslating}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('chat.translateTranscript')}
                >
                  <IconLanguage size={14} />
                  Translate
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="px-2 py-1 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {languages.map((language) => (
                      <option key={language.value} value={language.value}>
                        {language.autonym}
                        {translationState.translations.some(
                          (t) => t.locale === language.value,
                        )
                          ? ' ✓'
                          : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleTranslate}
                    className="px-2.5 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded transition-colors"
                  >
                    Go
                  </button>
                  <button
                    onClick={() => setShowLanguageSelector(false)}
                    className="px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            {processedContent && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="ml-2 px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
              >
                {expanded ? 'Collapse' : 'Expand'}
              </button>
            )}
          </div>
        </div>

        {/* Transcript Content */}
        {(!processedContent || expanded) && (
          <div
            className={`p-4 font-mono text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap overflow-y-auto ${
              processedContent ? 'max-h-96' : 'max-h-[600px]'
            }`}
          >
            {formattedTranscript}
          </div>
        )}

        {/* Collapsed state hint */}
        {processedContent && !expanded && (
          <div className="p-3 text-center text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
            Click &ldquo;Expand&rdquo; to view the original transcript
          </div>
        )}
      </div>
    </div>
  );
};
