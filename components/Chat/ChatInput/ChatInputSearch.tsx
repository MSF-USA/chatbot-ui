import React, {
  useState,
  useRef,
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
import { IconSearch } from '@tabler/icons-react';
import crypto from 'crypto';

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
  const [searchInput, setSearchInput] = useState('');
  const [questionInput, setQuestionInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isReadyToSend, setIsReadyToSend] = useState<boolean>(false);
  const [autoSubmit, setAutoSubmit] = useState<boolean>(true);
  const modalRef = useRef<HTMLDivElement>(null);
  const {
    state: { user },
  } = useContext(HomeContext);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setModalOpen(false);
      }
    };

    if (isModalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isModalOpen]);

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
    try {
      const response = await fetch(`/api/v2/web/search?q=${encodeURIComponent(searchInput)}`);
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
      setTextFieldValue(questionInput + `

Make all analyses relevant to the user request:

\`\`\`user-request
${searchInput}
\`\`\`

Put citations throughout your response. At the end of your response provide citations with titles and links to the original sources.`);

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
    }
  };

  return (
    <>
      <button
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
          event.preventDefault();
          setModalOpen(true);
        }}
      >
        <IconSearch className="text-black dark:text-white rounded h-5 w-5 hover:bg-gray-200 dark:hover:bg-gray-700" />
        <span className="sr-only">Add document from search</span>
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            ref={modalRef}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 shadow-xl"
          >
            <h2 className="text-xl font-bold mb-1 text-gray-900 dark:text-white">
              Search and Ask
            </h2>
            <form onSubmit={handleSearchSubmit} className={'mt-3'}>
              <div className="mb-4">
                <label
                  htmlFor="search-term"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-200"
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
                  className="mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                />
              </div>
              <div className="mb-4">
                <label
                  htmlFor="question-input"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  Question
                </label>
                <input
                  id="question-input"
                  type="text"
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  placeholder="Enter your question"
                  className="mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                />
              </div>
              {error && (
                <p className="text-red-500 text-sm mt-2">{error}</p>
              )}
              {statusMessage && (
                <p className="text-gray-500 text-sm mt-2 animate-pulse">
                  {statusMessage}
                </p>
              )}
              {/* Auto-submit toggle */}
              <div className="flex items-center mt-4">
                <input
                  id="auto-submit"
                  type="checkbox"
                  checked={autoSubmit}
                  onChange={(e) => setAutoSubmit(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded"
                />
                <label
                  htmlFor="auto-submit"
                  className="ml-2 block text-sm text-gray-700 dark:text-gray-200"
                >
                  Auto-submit question
                </label>
              </div>
              <div className="mt-4 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatInputSearch;
