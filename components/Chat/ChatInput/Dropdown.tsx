import {
  IconCamera,
  IconCirclePlus,
  IconFileMusic,
  IconLanguage,
  IconLink,
  IconSearch,
} from '@tabler/icons-react';
import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useTranslation } from 'next-i18next';

import useOutsideClick from '@/hooks/useOutsideClick';

import {
  ChatInputSubmitTypes,
  FileMessageContent,
  FilePreview,
  ImageMessageContent,
} from '@/types/chat';

import ChatInputImage from '@/components/Chat/ChatInput/ChatInputImage';
import ChatInputImageCapture from '@/components/Chat/ChatInput/ChatInputImageCapture';
import ChatInputSearch from '@/components/Chat/ChatInput/ChatInputSearch';
import ChatInputTranscribe from '@/components/Chat/ChatInput/ChatInputTranscribe';
import ChatInputTranslate from '@/components/Chat/ChatInput/ChatInputTranslate';

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
  textFieldValue: string;
  onCameraClick: () => void;
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
  textFieldValue,
  onCameraClick,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const [SearchConfig, setSearchConfig] = useState<{
    isOpen: boolean;
    mode: 'search' | 'url';
  }>({
    isOpen: false,
    mode: 'search',
  });

  const [isTranscribeOpen, setIsTranscribeOpen] = useState(false);
  const [isTranslateOpen, setIsTranslateOpen] = useState(false);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { t } = useTranslation('chat');

  const chatInputImageRef = useRef<{ openFilePicker: () => void }>(null);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      setSearchConfig((prev) => ({ ...prev, isOpen: false }));
      setIsTranscribeOpen(false);
      setIsTranslateOpen(false);
      setIsImageOpen(false);
    }
  };

  {/* Logic to handle clicks outside the Dropdown Menu */}
  useOutsideClick(dropdownRef, () => setIsOpen(false), isOpen);

  useEffect(() => {
    if (isOpen) {
      dropdownRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <div className="relative" onKeyDown={handleKeyDown}>
      {/* Toggle Dropdown Button */}
      <div className="group">
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-haspopup="true"
          aria-expanded={isOpen}
          aria-label="Toggle dropdown menu"
          className="focus:outline-none flex"
        >
          <IconCirclePlus className="w-6 h-6 mr-2 text-black dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700" />
          <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-black text-white text-xs py-1 px-2 rounded shadow-md">
            Expand Actions
          </div>
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute ml-2 left-40 bottom-full mb-2 transform -translate-x-full bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded shadow-lg z-10 w-fit outline-none"
          tabIndex={-1}
          role="menu"
        >
          {/* Dropdown Description */}
          {/*<div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">*/}
          {/*  These are extra, specialized features*/}
          {/*</div>*/}

          {/* Web Section */}
          <div className="border-gray-200 dark:border-gray-700">
            {/* Search Item */}
            <div className="group">
              <button
                className="flex items-center px-4 py-2 w-full hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none"
                onClick={() => {
                  setSearchConfig({ isOpen: true, mode: 'search' });
                  setIsOpen(false);
                }}
                role="menuitem"
              >
                <IconSearch
                  size={18}
                  className="mr-2 text-black dark:text-white"
                />
                <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-black text-white text-xs py-1 px-2 rounded shadow-md text-nowrap">
                  Web Search
                </div>
                <span className="text-black dark:text-white">
                  {t('chatFeaturesDropdownSearchModal')}
                </span>
              </button>
            </div>
          </div>
          <div className="border-gray-200 dark:border-gray-700">
            {/* Transcribe Item */}
            <button
              className="flex items-center px-4 py-2 w-full hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none  text-black dark:text-white"
              onClick={() => {
                setIsTranscribeOpen(true);
                setIsOpen(false);
              }}
              role="menuitem"
            >
              <IconFileMusic size={18} className="mr-2" />
              <span>{t('chatFeaturesDropdownTranscribeModal')}</span>
            </button>

            {/* Images Item */}
            <div className="group">
              <button
                className="flex items-center px-4 py-2 w-full hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none"
                onClick={() => {
                  chatInputImageRef.current?.openFilePicker();
                }}
                role="menuitem"
              >
                <ChatInputImage
                  setSubmitType={setSubmitType}
                  prompt={textFieldValue}
                  setFilePreviews={setFilePreviews}
                  setFileFieldValue={setFileFieldValue}
                  setUploadProgress={setUploadProgress}
                  setParentModalIsOpen={setIsImageOpen}
                  simulateClick={false}
                  labelText={t('chatFeaturesDropdownImageModal')}
                />
              </button>
              <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-black text-white text-xs py-1 px-2 rounded shadow-md text-nowrap">
                Upload Image
              </div>
            </div>
          </div>

          {/* Compose Section */}
          {/*<div className="border-t border-gray-200 dark:border-gray-700">*/}
          {/*  <div className="px-4 py-2 text-sm text-center font-semibold text-gray-700 dark:text-gray-300 opacity-60">*/}
          {/*    Compose*/}
          {/*  </div>*/}

          {/*</div>*/}

          {/* Transform Section */}
          <div className="border-gray-200 dark:border-gray-700">
            {/* Translate Item */}
            <div className="group">
              <button
                className="flex items-center px-4 py-2 w-full hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none"
                onClick={() => {
                  setIsTranslateOpen(true);
                  setIsOpen(false);
                }}
                role="menuitem"
              >
                <IconLanguage
                  size={18}
                  className="mr-2 text-black dark:text-white"
                />
                <span className="text-black dark:text-white">
                  {t('chatFeaturesDropdownTranslateModal')}
                </span>
              </button>
              <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-black text-white text-xs py-1 px-2 rounded shadow-md text-nowrap">
                Translate Text
              </div>
            </div>
            {/* Camera Item */}
            <div className="group">
              <button
                className="flex items-center px-4 py-2 w-full hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none"
                onClick={() => {
                  onCameraClick();
                  setIsOpen(false);
                }}
                role="menuitem"
              >
                <IconCamera
                  size={18}
                  className="mr-2 text-black dark:text-white"
                />
                <span className="text-black dark:text-white">
                  {t('Camera')}
                </span>
              </button>
              <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-black text-white text-xs py-1 px-2 rounded shadow-md text-nowrap">
                Capture Image
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search/URL Modal */}
      <ChatInputSearch
        isOpen={SearchConfig.isOpen}
        onClose={() => setSearchConfig((prev) => ({ ...prev, isOpen: false }))}
        initialMode={SearchConfig.mode}
        onFileUpload={onFileUpload}
        setSubmitType={setSubmitType}
        setFilePreviews={setFilePreviews}
        setFileFieldValue={setFileFieldValue}
        setImageFieldValue={setImageFieldValue}
        setUploadProgress={setUploadProgress}
        setTextFieldValue={setTextFieldValue}
        handleSend={handleSend}
      />

      {/* Chat Input Image Capture Modal */}
      {isImageOpen && (
        <ChatInputImageCapture
          setFilePreviews={setFilePreviews}
          setSubmitType={setSubmitType}
          prompt={textFieldValue}
          setImageFieldValue={setFileFieldValue}
          setUploadProgress={setUploadProgress}
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
          defaultText={textFieldValue}
          setTextFieldValue={setTextFieldValue}
          handleSend={handleSend}
          setParentModalIsOpen={setIsTranslateOpen}
          simulateClick={true}
        />
      )}

      {/* Chat Input Image Component */}
    </div>
  );
};

export default Dropdown;
