import React, { Dispatch, SetStateAction, useState, useRef, useEffect } from 'react';
import {
  IconCirclePlus,
  IconSearch,
  IconLink,
  IconLanguage,
  IconFileMusic,
} from '@tabler/icons-react';
import ChatInputSearch from '@/components/Chat/ChatInput/ChatInputSearch';
import ChatInputUrl from '@/components/Chat/ChatInput/ChatInputUrl';
import ChatInputTranscribe from '@/components/Chat/ChatInput/ChatInputTranscribe';
import ChatInputTranslate from '@/components/Chat/ChatInput/ChatInputTranslate';
import {
  ChatInputSubmitTypes,
  FileMessageContent,
  FilePreview,
  ImageMessageContent,
} from '@/types/chat';

interface DropdownProps {
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

const Dropdown: React.FC<DropdownProps> = ({
                                             setFileFieldValue,
                                             onFileUpload,
                                             setFilePreviews,
                                             setTextFieldValue,
                                             setImageFieldValue,
                                             setUploadProgress,
                                             setSubmitType,
                                             handleSend,
                                           }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUrlOpen, setIsUrlOpen] = useState(false);
  const [isTranscribeOpen, setIsTranscribeOpen] = useState(false);
  const [isTranslateOpen, setIsTranslateOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      setIsSearchOpen(false);
      setIsUrlOpen(false);
      setIsTranscribeOpen(false);
      setIsTranslateOpen(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      dropdownRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <div className="relative" onKeyDown={handleKeyDown}>
      {/* Toggle Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Toggle dropdown menu"
        className="py-2 focus:outline-none"
      >
        <IconCirclePlus size={24} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute left-40 bottom-full mb-2 transform -translate-x-full bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded shadow-lg z-10 w-64"
          tabIndex={-1}
          role="menu"
        >
          {/* Dropdown Description */}
          <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
            These are extra, specialized features
          </div>

          {/* Search Item */}
          <button
            className="flex items-center px-4 py-2 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none"
            onClick={() => {
              setIsSearchOpen(true);
              setIsOpen(false);
            }}
            role="menuitem"
          >
            <IconSearch size={18} className="mr-2" />
            <span>Search</span>
          </button>

          {/* Add URL Item */}
          <button
            className="flex items-center px-4 py-2 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none"
            onClick={() => {
              setIsUrlOpen(true);
              setIsOpen(false);
            }}
            role="menuitem"
          >
            <IconLink size={18} className="mr-2" />
            <span>Add URL</span>
          </button>

          {/* Transcribe Item */}
          <button
            className="flex items-center px-4 py-2 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none"
            onClick={() => {
              setIsTranscribeOpen(true);
              setIsOpen(false);
            }}
            role="menuitem"
          >
            <IconFileMusic size={18} className="mr-2" />
            <span>Transcribe</span>
          </button>

          {/* Translate Item */}
          <button
            className="flex items-center px-4 py-2 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none"
            onClick={() => {
              setIsTranslateOpen(true);
              setIsOpen(false);
            }}
            role="menuitem"
          >
            <IconLanguage size={18} className="mr-2" />
            <span>Translate</span>
          </button>
        </div>
      )}

      {/* Chat Input Search Modal */}
      {isSearchOpen && (
        <ChatInputSearch
          onFileUpload={onFileUpload}
          setSubmitType={setSubmitType}
          setFilePreviews={setFilePreviews}
          setFileFieldValue={setFileFieldValue}
          setImageFieldValue={setImageFieldValue}
          setUploadProgress={setUploadProgress}
          setTextFieldValue={setTextFieldValue}
          handleSend={handleSend}
          setParentModalIsOpen={setIsSearchOpen}
          simulateClick={true} // Added this prop
        />
      )}

      {/* Chat Input URL Modal */}
      {isUrlOpen && (
        <ChatInputUrl
          onFileUpload={onFileUpload}
          setSubmitType={setSubmitType}
          setFilePreviews={setFilePreviews}
          setFileFieldValue={setFileFieldValue}
          setImageFieldValue={setImageFieldValue}
          setUploadProgress={setUploadProgress}
          setTextFieldValue={setTextFieldValue}
          handleSend={handleSend}
          setParentModalIsOpen={setIsUrlOpen}
          simulateClick={true} // Added this prop
        />
      )}

      {/* Chat Input Transcribe Modal */}
      {isTranscribeOpen && (
        <ChatInputTranscribe
          setTextFieldValue={setTextFieldValue}
          setFileFieldValue={setFileFieldValue}
          setImageFieldValue={setImageFieldValue}
          setUploadProgress={setUploadProgress}
          onFileUpload={onFileUpload}
          setSubmitType={setSubmitType}
          setFilePreviews={setFilePreviews}
          setParentModalIsOpen={setIsTranscribeOpen}
          simulateClick={true}
        />
      )}

      {/* Chat Input Translate Modal */}
      {isTranslateOpen && (
        <ChatInputTranslate
          setTextFieldValue={setTextFieldValue}
          handleSend={handleSend}
          setParentModalIsOpen={setIsTranslateOpen}
          simulateClick={true}
        />
      )}
    </div>
  );
};

export default Dropdown;
