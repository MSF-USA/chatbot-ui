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
import { IconLink } from "@tabler/icons-react";
import crypto from 'crypto';

interface ChatInputUrlProps {
  onFileUpload: (
    event: React.ChangeEvent<any>,
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
    setUploadProgress: Dispatch<SetStateAction<{ [key: string]: number }>>
  ) => void;
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
}

const ChatInputUrl = ({
                        onFileUpload,
                        setSubmitType,
                        setFilePreviews,
                        setFileFieldValue,
                        setImageFieldValue,
                        setUploadProgress,
                      }: ChatInputUrlProps) => {
  const [isModalOpen, setModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPulling, setIsPulling] = useState<boolean>(false);
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

  if (!userAuthorizedForFileUploads(user)) return null;

  const handleUrlSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsPulling(true)

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

      // Create a FileList-like object
      const fileList = {
        0: file,
        length: 1,
        item: (index: number) => index === 0 ? file : null,
      };

      // Call onFileUpload with the FileList-like object
      onFileUpload(
        // @ts-ignore
        fileList as FileList,
        setSubmitType,
        setFilePreviews,
        setFileFieldValue,
        setImageFieldValue,
        setUploadProgress
      );

      // Close the modal and reset the input
      setModalOpen(false);
      setUrlInput('');
    } catch (error: any) {
      console.error(error);
      setError(error.message || 'An error occurred while fetching the URL content');
    } finally {
      setIsPulling(false);
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
        <IconLink className="text-black dark:text-white rounded h-5 w-5 hover:bg-gray-200 dark:hover:bg-gray-700" />
        <span className="sr-only">Add document from URL</span>
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            ref={modalRef}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 shadow-xl"
          >
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              Enter URL
            </h2>
            <form onSubmit={handleUrlSubmit}>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com"
                required
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md
                           text-gray-900 dark:text-white bg-white dark:bg-gray-700"
              />
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
              {isPulling && <p className="text-gray-500 text-sm mt-2 animate-pulse">Attempting pull from url...</p>}
              <div className="mt-4 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md
                             hover:bg-gray-300 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md
                             hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
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

export default ChatInputUrl;
