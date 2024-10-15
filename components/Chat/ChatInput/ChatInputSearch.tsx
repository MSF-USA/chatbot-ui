import React, {
  useState,
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
} from 'react';
import HomeContext from '@/pages/api/home/home.context';
import {
  ChatInputSubmitTypes,
  FilePreview,
  FileMessageContent,
  ImageMessageContent,
} from '@/types/chat';
import crypto from 'crypto';
import { IconSearch, IconChevronUp, IconChevronDown } from '@tabler/icons-react';

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
      SetStateAction<ImageMessageContent | ImageMessageContent[] | null | undefined>
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
                         }: ChatInputSearchProps) => {
  const [isModalOpen, setModalOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [questionInput, setQuestionInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isReadyToSend, setIsReadyToSend] = useState<boolean>(false);
  const [autoSubmit, setAutoSubmit] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false); // New state
  const {
    state: { user },
  } = useContext(HomeContext);

  // New state variables for additional parameters
  const [mkt, setMkt] = useState<string>('');
  const [safeSearch, setSafeSearch] = useState<string>('Moderate');
  const [count, setCount] = useState<number>(5);
  const [offset, setOffset] = useState<number>(0);

  useEffect(() => {
    if (!questionInput) {
      setQuestionInput(`Please summarize the content you find`);
    }
  }, [searchInput]);

  // Handle sending the message if auto-submit is enabled
  useEffect(() => {
    if (isReadyToSend) {
      setIsReadyToSend(false);
      handleSend();
    }
  }, [isReadyToSend, handleSend]);

  const handleSearchSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setStatusMessage('Searching...');
    setIsSubmitting(true); // Start submission
    try {
      const queryParams = new URLSearchParams({
        q: searchInput,
        mkt,
        safeSearch,
        count: count.toString(),
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

      setStatusMessage('Handling content...');

      // Generate a unique hash for the content
      const hash = crypto.createHash('sha256').update(content).digest('hex');

      // Create a File object from the content
      const blob = new Blob([content], { type: 'text/plain' });
      const fileName = `${hash}.txt`;
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
        questionInput +
        `
      
Make all analyses relevant to the user request:

\`\`\`user-request
${searchInput}
\`\`\`

Put citations throughout your response. At the end of your response provide citations with titles and links to the original sources.`,
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
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
          event.preventDefault();
          setModalOpen(true);
        }}
        disabled={isSubmitting} // Disable when submitting
      >
        <IconSearch className="text-black dark:text-white rounded h-5 w-5 hover:bg-gray-200 dark:hover:bg-gray-700" />
        <span className="sr-only">Add document from search</span>
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 shadow-xl"
          >
            <div className="relative">
              <h2 className="text-xl font-bold mb-1 text-gray-900 dark:text-white">
                Web Search
              </h2>
              <form onSubmit={handleSearchSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label
                      htmlFor="search-term"
                      className="text-right text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      Search Term
                    </label>
                    <input
                      id="search-term"
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Enter your search query"
                      required
                      disabled={isSubmitting} // Disable when submitting
                      className="col-span-3 mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label
                      htmlFor="question-input"
                      className="text-right text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      Question
                    </label>
                    <input
                      id="question-input"
                      type="text"
                      value={questionInput}
                      onChange={(e) => setQuestionInput(e.target.value)}
                      placeholder="Enter your question"
                      disabled={isSubmitting} // Disable when submitting
                      className="col-span-3 mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                    />
                  </div>
                  <div className="flex items-center">
                    <button
                      type="button"
                      className="ml-auto text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-500 flex items-center"
                      onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                      disabled={isSubmitting} // Disable when submitting
                    >
                      Advanced Options
                      {isAdvancedOpen ? (
                        <IconChevronUp className="ml-2 h-4 w-4" />
                      ) : (
                        <IconChevronDown className="ml-2 h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {isAdvancedOpen && (
                    <>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <label
                          htmlFor="market"
                          className="text-right text-sm font-medium text-gray-700 dark:text-gray-200"
                        >
                          Market
                        </label>
                        <select
                          id="market"
                          value={mkt}
                          onChange={(e) => setMkt(e.target.value)}
                          disabled={isSubmitting} // Disable when submitting
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
                          Safe Search
                        </label>
                        <select
                          id="safe-search"
                          value={safeSearch}
                          onChange={(e) => setSafeSearch(e.target.value)}
                          disabled={isSubmitting} // Disable when submitting
                          className="col-span-3 mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="Off">Off</option>
                          <option value="Moderate">Moderate</option>
                          <option value="Strict">Strict</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <label
                          htmlFor="count"
                          className="text-right text-sm font-medium text-gray-700 dark:text-gray-200"
                        >
                          Number of Results
                        </label>
                        <input
                          id="count"
                          type="number"
                          min="1"
                          max="50"
                          value={count}
                          onChange={(e) => setCount(Number(e.target.value))}
                          disabled={isSubmitting} // Disable when submitting
                          className="col-span-3 mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <label
                          htmlFor="offset"
                          className="text-right text-sm font-medium text-gray-700 dark:text-gray-200"
                        >
                          Offset
                        </label>
                        <input
                          id="offset"
                          type="number"
                          min="0"
                          value={offset}
                          onChange={(e) => setOffset(Number(e.target.value))}
                          disabled={isSubmitting} // Disable when submitting
                          className="col-span-3 mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                        />
                      </div>
                    </>
                  )}
                  <div className="flex items-center mt-4">
                    <input
                      id="auto-submit"
                      type="checkbox"
                      checked={autoSubmit}
                      onChange={(e) => setAutoSubmit(e.target.checked)}
                      disabled={isSubmitting} // Disable when submitting
                      className="h-4 w-4"
                    />
                    <label
                      htmlFor="auto-submit"
                      className="ml-2 text-sm text-gray-700 dark:text-gray-200"
                    >
                      Auto-submit question
                    </label>
                  </div>
                  {error && (
                    <p className="text-red-500 text-sm mt-2">{error}</p>
                  )}
                  {statusMessage && !isSubmitting && (
                    <p className="text-gray-500 text-sm mt-2 animate-pulse">
                      {statusMessage}
                    </p>
                  )}
                </div>
                <div className="mt-4 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    disabled={isSubmitting} // Disable when submitting
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting} // Disable when submitting
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 flex items-center"
                  >
                    <IconSearch className="mr-2 h-4 w-4" />
                    Submit
                  </button>
                </div>
              </form>

              {/* Overlay when submitting */}
              {isSubmitting && (
                <div className="absolute inset-0 bg-white bg-opacity-75 dark:bg-gray-800 dark:bg-opacity-75 flex flex-col items-center justify-center">
                  <svg
                    className="animate-spin h-8 w-8 text-blue-600 dark:text-blue-400"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
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
                    <p className="mt-2 text-gray-700 dark:text-gray-200">
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
