import React, {
  useState,
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useRef,
} from 'react';
import HomeContext from '@/pages/api/home/home.context';
import {
  ChatInputSubmitTypes,
  FilePreview,
  FileMessageContent,
  ImageMessageContent,
} from '@/types/chat';
import crypto from 'crypto';
import {
  IconSearch,
  IconChevronUp,
  IconChevronDown,
} from '@tabler/icons-react';
import BetaBadge from '@/components/Beta/Badge';
import {useTranslation} from "next-i18next";

interface ChatInputSearchProps {
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
    SetStateAction<ImageMessageContent | ImageMessageContent[] | null | undefined>
  >;
  setUploadProgress: Dispatch<SetStateAction<{ [key: string]: number }>>;
  setTextFieldValue: Dispatch<SetStateAction<string>>;
  handleSend: () => void;
  setParentModalIsOpen: Dispatch<SetStateAction<boolean>>;
  simulateClick: boolean;
}

const ChatInputSearch = ({
                           onFileUpload,
                           setSubmitType,
                           setFilePreviews,
                           setFileFieldValue,
                           setImageFieldValue,
                           setUploadProgress,
                           setTextFieldValue,
                           handleSend,
    setParentModalIsOpen,
  simulateClick,
                         }: ChatInputSearchProps) => {
  const { t } = useTranslation('chat');

  const [isModalOpen, setModalOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [questionInput, setQuestionInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isReadyToSend, setIsReadyToSend] = useState<boolean>(false);
  const [autoSubmit, setAutoSubmit] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [shouldOptimizeInput, setShouldOptimizeInput] = useState<boolean>(true);
  const {
    state: { user },
  } = useContext(HomeContext);

  const [mkt, setMkt] = useState<string>('');
  const [safeSearch, setSafeSearch] = useState<string>('Moderate');
  const [count, setCount] = useState<number | null>(5);
  const [offset, setOffset] = useState<number>(0);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const openModalButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!questionInput) {
      setQuestionInput(t('webSearchModalDefaultQuestion'));
    }
  }, [searchInput]);

  // Automatically focus on search input when modal opens
  useEffect(() => {
    if (isModalOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isModalOpen]);

  // Handle sending the message if auto-submit is enabled
  useEffect(() => {
    if (isReadyToSend) {
      setIsReadyToSend(false);
      handleSend();
      setParentModalIsOpen(false);
    }
  }, [isReadyToSend, handleSend]);

  useEffect(() => {
    if (simulateClick && openModalButtonRef.current) {
      openModalButtonRef.current.click();
    }
  }, [simulateClick]);

  const handleSearchSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true); // Start submission

    let adjustedCount = count ?? 5;
    adjustedCount = Math.min(adjustedCount, 15);

    try {
      let optimizedQuery = searchInput;
      let optimizedQuestion = questionInput;

      if (shouldOptimizeInput) {
        setStatusMessage(t('webSearchModalOptimizingStatusMessage'));
        // Call the new route to get optimized query and question

        try {
          const optimizeResponse = await fetch('/api/v2/web/search/structure', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
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
            setQuestionInput(optimizedQuestion);
          } else {
            console.error('Failed to optimize query:', optimizeResponse.statusText);
          }
        } catch (error) {
          console.error('Error optimizing query:', error);
        }
      } else {
        optimizedQuery = searchInput;
        optimizedQuestion = questionInput;
      }

      setStatusMessage(t('webSearchModalSearchingStatusMessage'));

      const queryParams = new URLSearchParams({
        q: optimizedQuery,
        mkt,
        safeSearch,
        count: adjustedCount.toString(),
        offset: offset.toString(),
      }).toString();

      const response = await fetch(`/api/v2/web/search?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch search results');
      }
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const content = data.content;

      setStatusMessage(t('webSearchModalHandlingContentStatusMessage'));

      // Generate a unique hash for the content
      const hash = crypto.createHash('sha256').update(content).digest('hex');

      // Create a File object from the content
      const blob = new Blob([content], { type: 'text/plain' });
      const fileName = `search-${optimizedQuery.toLowerCase().replace(/[^a-z]/g, '-')}_${hash}.txt`;
      const file = new File([blob], fileName, { type: 'text/plain' });

      // Call onFileUpload with the File as an array
      await onFileUpload(
        [file],
        setSubmitType,
        setFilePreviews,
        setFileFieldValue,
        setImageFieldValue,
        setUploadProgress,
      );

      // Set the question in the text field with formatting and relevance context
      setTextFieldValue(
        optimizedQuestion +
        `
                
${t('webSearchModalPromptUserContext')}:

\`\`\`user-request
${optimizedQuery}
\`\`\`

${t('webSearchModalPromptCitation')}`,
      );

      // Close the modal and reset the inputs
      setModalOpen(false);
      setSearchInput('');
      setQuestionInput('');

      // If auto-submit is enabled, send the message
      if (autoSubmit) {
        setIsReadyToSend(true);
      }
    } catch (error: any) {
      console.error(error);
      setError(
        error.message || 'An error occurred while fetching search results',
      );
    } finally {
      setStatusMessage(null);
      setIsSubmitting(false); // End submission
    }
  };

  return (
    <>
      <button
        style={{display: 'none'}}
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
          event.preventDefault();
          setModalOpen(true);
        }}
        ref={openModalButtonRef}
        disabled={isSubmitting} // Disable when submitting
        aria-label="Add document from search"
      >
        <IconSearch className="text-black dark:text-white rounded h-5 w-5 hover:bg-gray-200 dark:hover:bg-gray-700" />
        <span className="sr-only">Add document from search</span>
      </button>

      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div
            className="fixed inset-0 w-full h-full bg-black opacity-40"
            onClick={() => {
              setModalOpen(false);
              setParentModalIsOpen(false);
            }}
          ></div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-2 shadow-xl relative">
          <div className="relative">
                <button
                  onClick={() => {
                    setModalOpen(false);
                    setParentModalIsOpen(false);
                  }}
                  className="absolute -top-5 -right-5 text-gray-600 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
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
                  <span className="sr-only">Close modal</span>
                </button>
                <div className="flex justify-between items-center mb-4">
                <BetaBadge />
                  <div className="flex-1 text-center mr-9">
                    <h2
                      id="modal-title"
                      className="text-xl font-bold text-gray-900 dark:text-white"
                    >
                      {t('webSearchModalTitle')}
                    </h2>
                  </div>
                </div>
              <form onSubmit={handleSearchSubmit}>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="relative w-full">
                      <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        id="search-term"
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder={t("searchQueryPlaceholder")}
                        required
                        disabled={isSubmitting} // Disable when submitting
                        title={t("searchQueryPlaceholder")}
                        ref={searchInputRef}
                        className="w-full pl-10 pr-2 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        id="auto-submit"
                        type="checkbox"
                        checked={autoSubmit}
                        onChange={(e) => setAutoSubmit(e.target.checked)}
                        disabled={isSubmitting}
                        title="Automatically submit the question after search"
                        className="h-4 w-4"
                      />
                      <label
                        htmlFor="auto-submit"
                        className="ml-2 text-sm text-gray-700 dark:text-gray-200"
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
                      aria-controls="advanced-options"
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
                    <div id="advanced-options" className="space-y-4">
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
                          onChange={(e) => setShouldOptimizeInput(!shouldOptimizeInput)}
                          disabled={isSubmitting}
                          title="Do you want us to use AI to generate a more targeted set of queries to answer your question?"
                          className="col-span-3 mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <label
                          htmlFor="question-input"
                          className="text-right text-sm font-medium text-gray-700 dark:text-gray-200"
                        >
                          {t('webPullerQuestionLabel')}
                        </label>
                        <input
                          id="question-input"
                          type="text"
                          value={questionInput}
                          onChange={(e) => setQuestionInput(e.target.value)}
                          placeholder="Enter your question"
                          disabled={isSubmitting}
                          title="Enter what you want the AI to do to process the pages it finds"
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
                          title="Select the market"
                          className="col-span-3 mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="">Any</option>
                          <option value="ar">Arabic (General)</option>
                          <option value="en">English (General)</option>
                          <option value="en-US">English (United States)</option>
                          <option value="en-GB">English (United Kingdom)</option>
                          <option value="fr-FR">French (France)</option>
                          <option value="es">Spanish (General)</option>
                          <option value="es-ES">Spanish (Spain)</option>
                          <option value="de-DE">German (Germany)</option>
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
                          title="Select the safe search level"
                          className="col-span-3 mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="Off">{t('safeSearchOptionOff')}</option>
                          <option value="Moderate">{t('safeSearchOptionModerate')}</option>
                          <option value="Strict">{t('safeSearchOptionStrict')}</option>
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
                          // @ts-ignore
                          value={count}
                          onChange={(e) => {
                            const value = e.target.value;

                            if (value === '') {
                              setCount(null);
                            } else {
                              const numValue = parseInt(value, 10);
                              if (!isNaN(numValue)) {
                                setCount(numValue);
                              }
                            }
                          }}
                          onBlur={() => {
                            if (count !== null) {
                              const adjustedCount = Math.max(1, Math.min(count, 15));
                              if (adjustedCount !== count) {
                                setCount(adjustedCount);
                              }
                            } else if (!count) {
                              setCount(5);
                            }
                          }}
                          disabled={isSubmitting}
                          title="Enter the number of results you want it to process"
                          className="col-span-3 mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                        />
                      </div>
                    </div>
                  )}
                  {error && (
                    <p className="text-red-500 text-sm mt-2" role="alert">
                      {error}
                    </p>
                  )}
                  {statusMessage && !isSubmitting && (
                    <p
                      className="text-gray-500 text-sm mt-2 animate-pulse"
                      aria-live="polite"
                    >
                      {statusMessage}
                    </p>
                  )}
                </div>
                <div className="relative">
                  <div className="p-1"/>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full px-4 py-2 mt-4 text-black text-base font-medium border rounded-md shadow border-neutral-500 text-neutral-900 hover:bg-neutral-100 focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-white dark:hover:bg-neutral-300 flex items-center justify-center"
                  >
                    <IconSearch className="mr-2 h-4 w-4" />
                    {autoSubmit ? t('submitButton') : t('generatePromptButton')}
                  </button>
                </div>
              </form>

              {/* Overlay when submitting */}
              {isSubmitting && (
                <div
                  className="absolute inset-0 bg-white bg-opacity-75 dark:bg-gray-800 dark:bg-opacity-75 flex flex-col items-center justify-center"
                  aria-live="polite"
                >
                  <svg
                    className="animate-spin h-8 w-8 text-blue-600 dark:text-blue-400"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    role="img"
                    aria-label="Loading"
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
                  {statusMessage && (
                    <p
                      className="mt-2 text-gray-700 dark:text-gray-200"
                      aria-live="polite"
                    >
                      {statusMessage}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatInputSearch;
