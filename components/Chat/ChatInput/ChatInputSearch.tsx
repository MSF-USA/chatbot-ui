import {
  IconBrandBing,
  IconChevronDown,
  IconChevronUp,
  IconLink,
  IconSearch,
} from '@tabler/icons-react';
import React, {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useTranslation } from 'next-i18next';

import {
  ChatInputSubmitTypes,
  FileMessageContent,
  FilePreview,
  ImageMessageContent,
} from '@/types/chat';

import HomeContext from '@/pages/api/home/home.context';

import BetaBadge from '@/components/Beta/Badge';

import crypto from 'crypto';
import useCloseOnOutsideAndEscape from '@/hooks/useCloseOnOutsideAndEscape';

interface ChatInputSearchProps {
  isOpen: boolean; // Directly controls visibility
  onClose: () => void; // Callback to tell parent to close
  onFileUpload: (
    event: React.ChangeEvent<any> | File[] | FileList,
    setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>,
    setFilePreviews: Dispatch<SetStateAction<FilePreview[]>>,
    setFileFieldValue: Dispatch<
      SetStateAction<
        | FileMessageContent
        | FileMessageContent[]
        | ImageMessageContent
        | ImageMessageContent[]
        | null
      >
    >,
    setImageFieldValue: Dispatch<
      SetStateAction<
        ImageMessageContent | ImageMessageContent[] | null | undefined
      >
    >,
    setUploadProgress: Dispatch<SetStateAction<{ [key: string]: number }>>,
  ) => Promise<void>;
  setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>;
  setFilePreviews: Dispatch<SetStateAction<FilePreview[]>>;
  setFileFieldValue: Dispatch<
    SetStateAction<
      | FileMessageContent
      | FileMessageContent[]
      | ImageMessageContent
      | ImageMessageContent[]
      | null
    >
  >;
  setImageFieldValue: Dispatch<
    SetStateAction<
      ImageMessageContent | ImageMessageContent[] | null | undefined
    >
  >;
  setUploadProgress: Dispatch<SetStateAction<{ [key: string]: number }>>;
  setTextFieldValue: Dispatch<SetStateAction<string>>;
  handleSend: () => void;
  initialMode?: 'search' | 'url';
}

const ChatInputSearch = ({
  isOpen,
  onClose,
  onFileUpload,
  setSubmitType,
  setFilePreviews,
  setFileFieldValue,
  setImageFieldValue,
  setUploadProgress,
  setTextFieldValue,
  handleSend,
  initialMode = 'search',
}: ChatInputSearchProps) => {
  const modalRef = useCloseOnOutsideAndEscape(true, () => onClose());
  // const modalRef = useRef();
  const { t } = useTranslation('chat');
  const {
    state: { user },
  } = useContext(HomeContext);

  const [mode, setMode] = useState<'search' | 'url'>(initialMode);

  // URL Mode States
  const [urlInput, setUrlInput] = useState('');
  const [urlQuestionInput, setUrlQuestionInput] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlStatusMessage, setUrlStatusMessage] = useState<string | null>(null);
  const [isUrlSubmitting, setIsUrlSubmitting] = useState<boolean>(false);

  // Search Mode States
  const [searchInput, setSearchInput] = useState('');
  const [searchQuestionInput, setSearchQuestionInput] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchStatusMessage, setSearchStatusMessage] = useState<string | null>(
    null,
  );
  const [isSearchSubmitting, setIsSearchSubmitting] = useState<boolean>(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [shouldOptimizeInput, setShouldOptimizeInput] = useState<boolean>(true);
  const [mkt, setMkt] = useState<string>('');
  const [safeSearch, setSafeSearch] = useState<string>('Moderate');
  const [count, setCount] = useState<number | null>(5);
  const [offset, setOffset] = useState<number>(0);

  // Common States
  const [autoSubmit, setAutoSubmit] = useState<boolean>(true);
  const [isReadyToSend, setIsReadyToSend] = useState<boolean>(false);

  const urlInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Reset mode if initialMode changes (e.g., modal re-opened with different mode by parent)
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    // Auto-populate question input when mode/primary input changes
    if (isOpen) {
      // Only if modal is intended to be open
      if (mode === 'url' && !urlQuestionInput && urlInput) {
        setUrlQuestionInput(t('defaultWebPullerQuestion'));
      } else if (mode === 'search' && !searchQuestionInput && searchInput) {
        setSearchQuestionInput(t('webSearchModalDefaultQuestion'));
      }
    }
  }, [
    urlInput,
    searchInput,
    mode,
    t,
    urlQuestionInput,
    searchQuestionInput,
    isOpen,
  ]);


  // Focus input when modal opens or mode changes
  useEffect(() => {
    if (isOpen) {
      if (mode === 'url' && urlInputRef.current) {
        urlInputRef.current.focus();
      } else if (mode === 'search' && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
  }, [isOpen, mode]);

  // Handle sending the message after successful operation if autoSubmit is true
  useEffect(() => {
    if (isReadyToSend) {
      setIsReadyToSend(false);
      handleSend();
      onClose(); // Close modal after sending
    }
  }, [isReadyToSend, handleSend, onClose]);

  const handleUrlSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUrlError(null);
    setUrlStatusMessage(t('webPullerPullingStatusMessage'));
    setIsUrlSubmitting(true);

    try {
      const response = await fetch('/api/v2/web/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput }),
      });
      if (!response.ok)
        throw new Error(
          t('errorFailedToFetchUrl') || 'Failed to fetch the URL content',
        );
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const content = data.content;
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      const blob = new Blob([content], { type: 'text/plain' });
      const urlHostname = new URL(urlInput).hostname;
      const fileName = `web-pull-${urlHostname}_${hash}.txt`;
      const file = new File([blob], fileName, { type: 'text/plain' });

      setUrlStatusMessage(t('webPullerHandlingContentStatusMessage'));
      await onFileUpload(
        [file],
        setSubmitType,
        setFilePreviews,
        setFileFieldValue,
        setImageFieldValue,
        setUploadProgress,
      );
      setTextFieldValue(
        `${urlQuestionInput || t('defaultWebPullerQuestion')}\n\n${t(
          'webPullerCitationPrompt',
        )}: ${urlInput}\n\n${t('webPullerReferencePrompt')}`,
      );
      if (autoSubmit) setIsReadyToSend(true);
      else onClose();

      setUrlInput('');
      setUrlQuestionInput('');
    } catch (error: any) {
      console.error(error);
      setUrlError(
        error.message ||
          t('errorOccurredFetchingUrl') ||
          'An error occurred while fetching the URL content',
      );
    } finally {
      setUrlStatusMessage(null);
      setIsUrlSubmitting(false);
    }
  };

  const handleSearchSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setSearchError(null);
    setIsSearchSubmitting(true);
    let adjustedCount = count ?? 5;
    adjustedCount = Math.min(Math.max(adjustedCount, 1), 15);

    try {
      let optimizedQuery = searchInput;
      let optimizedQuestion =
        searchQuestionInput || t('webSearchModalDefaultQuestion');

      if (shouldOptimizeInput && searchInput) {
        // ensure searchInput is not empty for optimization
        setSearchStatusMessage(t('webSearchModalOptimizingStatusMessage'));
        try {
          const optimizeResponse = await fetch('/api/v2/web/search/structure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: searchInput,
              user,
              modelId: 'gpt-4o',
            }),
          });
          if (optimizeResponse.ok) {
            const optimizeData = await optimizeResponse.json();
            optimizedQuery = optimizeData.optimizedQuery;
            optimizedQuestion = optimizeData.optimizedQuestion;
            setSearchInput(optimizedQuery);
            setSearchQuestionInput(optimizedQuestion);
          } else {
            console.warn(
              'Failed to optimize query:',
              optimizeResponse.statusText,
            );
          }
        } catch (optError) {
          console.warn('Error optimizing query:', optError);
        }
      }

      setSearchStatusMessage(t('webSearchModalSearchingStatusMessage'));
      const queryParams = new URLSearchParams({
        q: optimizedQuery,
        mkt,
        safeSearch,
        count: adjustedCount.toString(),
        offset: offset.toString(),
      }).toString();

      const response = await fetch(`/api/v2/web/search?${queryParams}`);
      if (!response.ok)
        throw new Error(
          t('errorFailedToFetchSearchResults') ||
            'Failed to fetch search results',
        );
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const content = data.content;
      setSearchStatusMessage(t('webSearchModalHandlingContentStatusMessage'));
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      const blob = new Blob([content], { type: 'text/plain' });
      const fileName = `search-${optimizedQuery
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')}_${hash}.txt`;
      const file = new File([blob], fileName, { type: 'text/plain' });

      await onFileUpload(
        [file],
        setSubmitType,
        setFilePreviews,
        setFileFieldValue,
        setImageFieldValue,
        setUploadProgress,
      );
      setTextFieldValue(
        `${optimizedQuestion}\n\n${t(
          'webSearchModalPromptUserContext',
        )}:\n\n\`\`\`user-request\n${optimizedQuery}\n\`\`\`\n\n${t(
          'webSearchModalPromptCitation',
        )}`,
      );
      if (autoSubmit) setIsReadyToSend(true);
      else onClose();
      setSearchInput('');
      setSearchQuestionInput('');
    } catch (error: any) {
      console.error(error);
      setSearchError(
        error.message ||
          t('errorOccurredFetchingSearchResults') ||
          'An error occurred while fetching search results',
      );
    } finally {
      setSearchStatusMessage(null);
      setIsSearchSubmitting(false);
    }
  };

  const isSubmitting = isUrlSubmitting || isSearchSubmitting;

  if (!isOpen) {
    return null; // Don't render anything if not open
  }

  return (
    <div
            ref={modalRef}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="search-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-xl mx-2 shadow-xl"
      >
        <div className="relative">
          <div className="absolute -top-4 -left-4">
            <BetaBadge />
          </div>
          <div className="mb-4 flex justify-center border-b border-gray-300 dark:border-gray-600">
            <button
              onClick={() => setMode('search')}
              disabled={isSubmitting}
              className={`px-4 py-2 font-medium ${
                mode === 'search'
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
              aria-pressed={mode === 'search'}
            >
              {t('webSearchModalTitle')}
            </button>
            <button
              onClick={() => setMode('url')}
              disabled={isSubmitting}
              className={`px-4 py-2 font-medium ${
                mode === 'url'
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
              aria-pressed={mode === 'url'}
            >
              {t('chatUrlInputTitle')}
            </button>
            <button
              onClick={onClose}
              className="absolute -top-4 -right-4 p-1 bg-gray-200 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
              aria-label={t('closeModalAriaLabel') || 'Close modal'}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {mode === 'url' && (
            <form onSubmit={handleUrlSubmit} className={'mt-1'}>
              <div className="space-y-4 py-4">
                <div className="flex flex-col">
                  <em className="text-sm text-gray-500 dark:text-gray-400 mb-2 ml-1">
                    {t('webUrlInputDescription')}
                  </em>
                  <div className="flex items-center gap-4">
                    <input
                      ref={urlInputRef}
                      id="url-input"
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://example.com"
                      required
                      disabled={isSubmitting}
                      className="col-span-3 mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                    />
                  </div>
                </div>
                <div className="flex flex-col">
                  <em className="text-sm text-gray-500 dark:text-gray-400 mb-1 ml-1">
                    {t('webUrlQuestionDescription')}
                  </em>
                  <div className="flex items-center gap-4">
                    <input
                      id="url-question-input"
                      type="text"
                      value={urlQuestionInput}
                      onChange={(e) => setUrlQuestionInput(e.target.value)}
                      placeholder={t('defaultWebPullerQuestion')}
                      disabled={isSubmitting}
                      className="col-span-3 mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                    />
                  </div>
                </div>
                {urlError && (
                  <p className="text-red-500 text-sm mt-2 col-span-4 text-center">
                    {urlError}
                  </p>
                )}
                {urlStatusMessage && !isUrlSubmitting && (
                  <p className="text-gray-500 text-sm mt-2 col-span-4 text-center animate-pulse">
                    {urlStatusMessage}
                  </p>
                )}
              </div>
              <div className="flex items-center">
                <input
                  id="auto-submit-url"
                  type="checkbox"
                  checked={autoSubmit}
                  onChange={(e) => setAutoSubmit(e.target.checked)}
                  disabled={isSubmitting}
                  className="h-4 w-4 mr-2"
                />
                <label
                  htmlFor="auto-submit-url"
                  className="text-sm text-gray-700 dark:text-gray-200"
                >
                  {t('autoSubmitButton')}
                </label>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-4 py-2 mt-4 text-black text-base font-medium border rounded-md shadow border-neutral-500 text-neutral-900 hover:bg-neutral-100 focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-white dark:hover:bg-neutral-300 flex items-center justify-center"
              >
                <IconLink className="mr-2 h-4 w-4" />
                {autoSubmit ? t('submitButton') : t('generatePromptButton')}
              </button>
            </form>
          )}

          {mode === 'search' && (
            <form onSubmit={handleSearchSubmit} className={'mt-1'}>
              <div className="space-y-4 py-4">
                <div className="flex flex-col">
                  <em className="text-sm text-gray-500 dark:text-gray-400 mb-2 ml-1">
                    {t('webSearchInputDescription')}
                  </em>
                  <div className="flex items-center">
                    <div className="relative w-full">
                      <IconBrandBing className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        id="search-term"
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder={t('searchQueryPlaceholder')}
                        required
                        disabled={isSubmitting}
                        title={t('searchQueryPlaceholder')}
                        ref={searchInputRef}
                        className="w-full pl-10 pr-2 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="auto-submit-search"
                      type="checkbox"
                      checked={autoSubmit}
                      onChange={(e) => setAutoSubmit(e.target.checked)}
                      disabled={isSubmitting}
                      title={
                        t('autoSubmitTooltip') ||
                        'Automatically submit the question after search'
                      }
                      className="h-4 w-4 mr-2"
                    />
                    <label
                      htmlFor="auto-submit-search"
                      className="text-sm text-gray-700 dark:text-gray-200"
                    >
                      {t('autoSubmitButton')}
                    </label>
                  </div>
                  <button
                    type="button"
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-500 flex items-center"
                    onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                    disabled={isSubmitting}
                    aria-expanded={isAdvancedOpen}
                    aria-controls="advanced-options-search"
                  >
                    {t('advancedOptionsButton')}
                    {isAdvancedOpen ? (
                      <IconChevronUp className="ml-2 h-4 w-4" />
                    ) : (
                      <IconChevronDown className="ml-2 h-4 w-4" />
                    )}
                  </button>
                </div>

                {isAdvancedOpen && (
                  <div
                    id="advanced-options-search"
                    className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4"
                  >
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label
                        htmlFor="optimize-input"
                        className="text-right text-sm font-medium text-gray-700 dark:text-gray-200"
                      >
                        {t('webSearchModalOptimizeLabel')}
                      </label>
                      <input
                        id="optimize-input"
                        type="checkbox"
                        checked={shouldOptimizeInput}
                        onChange={(e) =>
                          setShouldOptimizeInput(e.target.checked)
                        }
                        disabled={isSubmitting}
                        title={
                          t('optimizeQueryTooltip') ||
                          'Do you want us to use AI to generate a more targeted set of queries to answer your question?'
                        }
                        className="h-4 w-4"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label
                        htmlFor="search-question-input"
                        className="text-right text-sm font-medium text-gray-700 dark:text-gray-200"
                      >
                        {t('webPullerQuestionLabel')}
                      </label>
                      <input
                        id="search-question-input"
                        type="text"
                        value={searchQuestionInput}
                        onChange={(e) => setSearchQuestionInput(e.target.value)}
                        placeholder={t('webSearchModalQuestionPlaceholder')}
                        disabled={isSubmitting}
                        title={
                          t('processPagesTooltip') ||
                          'Enter what you want the AI to do to process the pages it finds'
                        }
                        className="col-span-3 mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label
                        htmlFor="market"
                        className="text-right text-sm font-medium text-gray-700 dark:text-gray-200"
                      >
                        {t('webSearchModalMarketLabel')}
                      </label>
                      <select
                        id="market"
                        value={mkt}
                        onChange={(e) => setMkt(e.target.value)}
                        disabled={isSubmitting}
                        title={t('selectMarketTooltip') || 'Select the market'}
                        className="col-span-3 mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">
                          {t('marketOptionAny') || 'Any'}
                        </option>
                        <option value="ar">
                          {t('marketOptionAr') || 'Arabic (General)'}
                        </option>
                        <option value="en">
                          {t('marketOptionEn') || 'English (General)'}
                        </option>
                        <option value="en-US">
                          {t('marketOptionEnUs') || 'English (United States)'}
                        </option>
                        <option value="en-GB">
                          {t('marketOptionEnGb') || 'English (United Kingdom)'}
                        </option>
                        <option value="fr-FR">
                          {t('marketOptionFrFr') || 'French (France)'}
                        </option>
                        <option value="es">
                          {t('marketOptionEs') || 'Spanish (General)'}
                        </option>
                        <option value="es-ES">
                          {t('marketOptionEsEs') || 'Spanish (Spain)'}
                        </option>
                        <option value="de-DE">
                          {t('marketOptionDeDe') || 'German (Germany)'}
                        </option>
                      </select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label
                        htmlFor="safe-search"
                        className="text-right text-sm font-medium text-gray-700 dark:text-gray-200"
                      >
                        {t('webSearchModalSafeSearchLabel')}
                      </label>
                      <select
                        id="safe-search"
                        value={safeSearch}
                        onChange={(e) => setSafeSearch(e.target.value)}
                        disabled={isSubmitting}
                        title={
                          t('selectSafeSearchTooltip') ||
                          'Select the safe search level'
                        }
                        className="col-span-3 mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="Off">{t('safeSearchOptionOff')}</option>
                        <option value="Moderate">
                          {t('safeSearchOptionModerate')}
                        </option>
                        <option value="Strict">
                          {t('safeSearchOptionStrict')}
                        </option>
                      </select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label
                        htmlFor="count"
                        className="text-right text-sm font-medium text-gray-700 dark:text-gray-200"
                      >
                        {t('webSearchModalResultsLabel')}
                      </label>
                      <input
                        id="count"
                        type="number"
                        min="1"
                        max="15"
                        value={count === null ? '' : count}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCount(val === '' ? null : parseInt(val, 10));
                        }}
                        onBlur={() => {
                          if (count !== null) {
                            const adjusted = Math.max(1, Math.min(count, 15));
                            if (adjusted !== count) setCount(adjusted);
                          } else {
                            setCount(5);
                          }
                        }}
                        disabled={isSubmitting}
                        title={
                          t('numResultsTooltip') ||
                          'Enter the number of results (1-15)'
                        }
                        className="col-span-3 mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                      />
                    </div>
                  </div>
                )}
                {searchError && (
                  <p
                    className="text-red-500 text-sm mt-2 text-center"
                    role="alert"
                  >
                    {searchError}
                  </p>
                )}
                {searchStatusMessage && !isSearchSubmitting && (
                  <p
                    className="text-gray-500 text-sm mt-2 animate-pulse text-center"
                    aria-live="polite"
                  >
                    {searchStatusMessage}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-4 py-2 mt-4 text-black text-base font-medium border rounded-md shadow border-neutral-500 text-neutral-900 hover:bg-neutral-100 focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-white dark:hover:bg-neutral-300 flex items-center justify-center"
              >
                <IconSearch className="mr-2 h-4 w-4" />
                {autoSubmit ? t('submitButton') : t('generatePromptButton')}
              </button>
            </form>
          )}

          {isSubmitting && (
            <div
              className="absolute inset-0 bg-white bg-opacity-75 dark:bg-gray-800 dark:bg-opacity-75 flex flex-col items-center justify-center"
              aria-live="assertive"
            >
              <svg
                className="animate-spin h-8 w-8 text-blue-600 dark:text-blue-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                role="img"
                aria-label={t('loadingAriaLabel') || 'Loading'}
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              {(mode === 'url' ? urlStatusMessage : searchStatusMessage) && (
                <p className="mt-2 text-gray-700 dark:text-gray-200">
                  {mode === 'url' ? urlStatusMessage : searchStatusMessage}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInputSearch;
