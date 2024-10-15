import React, {
  useState,
  useRef,
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
} from 'react';
import HomeContext from '@/pages/api/home/home.context';
import { userAuthorizedForFileUploads } from '@/utils/app/userAuth';
import {
  ChatInputSubmitTypes,
  FilePreview,
  FileMessageContent,
  ImageMessageContent,
} from '@/types/chat';
import { IconLink, IconChevronUp, IconChevronDown } from '@tabler/icons-react';
import crypto from 'crypto';
import BetaBadge from '@/components/Beta/Badge';

interface ChatInputUrlProps {
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

const ChatInputUrl = ({
                        onFileUpload,
                        setSubmitType,
                        setFilePreviews,
                        setFileFieldValue,
                        setImageFieldValue,
                        setUploadProgress,
                        setTextFieldValue,
                        handleSend,
                      }: ChatInputUrlProps) => {
  const [isModalOpen, setModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [questionInput, setQuestionInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [autoSubmit, setAutoSubmit] = useState<boolean>(true);
  const [isReadyToSend, setIsReadyToSend] = useState<boolean>(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null); // Added this line
  const {
    state: { user },
  } = useContext(HomeContext);

  useEffect(() => {
    if (!questionInput) {
      setQuestionInput(`Please summarize the content from this webpage.`);
    }
  }, [urlInput]);

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
    if (isModalOpen && urlInputRef.current) {
      urlInputRef.current.focus(); // Focus the input when modal opens
    }
  }, [isModalOpen]); // Re-run when isModalOpen changes

  useEffect(() => {
    if (isReadyToSend) {
      setIsReadyToSend(false);
      handleSend();
    }
  }, [isReadyToSend, handleSend]);

  if (!userAuthorizedForFileUploads(user)) return null;

  const handleUrlSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setStatusMessage('Pulling content from URL...');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/v2/web/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch the URL content');
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const content = data.content;
      const hash = crypto.createHash('sha256').update(content).digest('hex');

      // Create a File object from the content
      const blob = new Blob([content], { type: 'text/plain' });
      const fileName = `${hash}.txt`;
      const file = new File([blob], fileName, { type: 'text/plain' });

      setStatusMessage('Handling content...');

      // Call onFileUpload with the File as an array
      await onFileUpload(
        [file],
        setSubmitType,
        setFilePreviews,
        setFileFieldValue,
        setImageFieldValue,
        setUploadProgress,
      );

      // Set the question in the text field with formatting
      setTextFieldValue(
        questionInput +
        `
    
Cite any claims you make from the text and reference the URL: ${urlInput}

Also reference the title, apparent source, author(s), and publication date where available and relevant.`,
      );

      // Close the modal and reset the input
      setModalOpen(false);
      setUrlInput('');
      setQuestionInput('');

      // If auto-submit is enabled, send the message
      if (autoSubmit) {
        setIsReadyToSend(true);
      }
    } catch (error: any) {
      console.error(error);
      setError(
        error.message || 'An error occurred while fetching the URL content',
      );
    } finally {
      setStatusMessage(null);
      setIsSubmitting(false);
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
        <IconLink className="text-black dark:text-white rounded h-5 w-5 hover:bg-gray-200 dark:hover:bg-gray-700" />
        <span className="sr-only">Add document from URL</span>
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            ref={modalRef}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 w-1/4 shadow-xl relative"
          >
            <h2 className="text-xl font-bold mb-1 text-gray-900 dark:text-white">
              Enter URL
            </h2>
            <BetaBadge />
            <form onSubmit={handleUrlSubmit} className={'mt-3'}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label
                    htmlFor="url-input"
                    className="text-right text-sm font-medium text-gray-700 dark:text-gray-200"
                  >
                    URL
                  </label>
                  <input
                    ref={urlInputRef} // Set the ref here
                    id="url-input"
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com"
                    required
                    disabled={isSubmitting}
                    className="col-span-3 mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md
                             text-gray-900 dark:text-white bg-white dark:bg-gray-700"
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
                    disabled={isSubmitting}
                    className="col-span-3 mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md
                             text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  />
                </div>
                {/* Advanced options can be added here */}
                {isAdvancedOpen && (
                  <>
                    {/* Add any advanced options here */}
                  </>
                )}
                <div className="flex items-center mt-4">
                  <input
                    id="auto-submit"
                    type="checkbox"
                    checked={autoSubmit}
                    onChange={(e) => setAutoSubmit(e.target.checked)}
                    disabled={isSubmitting}
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
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md
                             hover:bg-gray-300 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md
                             hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 flex items-center"
                >
                  <IconLink className="mr-2 h-4 w-4" />
                  {autoSubmit ? 'Submit' : 'Generate prompt'}
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
      )}
    </>
  );
};

export default ChatInputUrl;
