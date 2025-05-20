import {
  IconCamera,
  IconCirclePlus,
  IconFileMusic,
  IconLanguage,
  IconLink,
  IconSearch,
  IconX,
} from '@tabler/icons-react';
import React, {
  Dispatch,
  SetStateAction,
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

import ChatInputImage from '@/components/Chat/ChatInput/ChatInputImage';
import ChatInputSearch from '@/components/Chat/ChatInput/ChatInputSearch';
import ChatInputTranscribe from '@/components/Chat/ChatInput/ChatInputTranscribe';
import ChatInputTranslate from '@/components/Chat/ChatInput/ChatInputTranslate';
import ChatInputUrl from '@/components/Chat/ChatInput/ChatInputUrl';
import ChatInputImageCapture from '@/components/Chat/ChatInput/ChatInputImageCapture';
import useOutsideClick from '@/hooks/useOutsideClick';
import ImageIcon from "@/components/Icons/image";

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

// Define the menu item structure
interface MenuItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  tooltip: string;
  onClick: () => void;
  category: 'web' | 'media' | 'transform';
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
  onCameraClick
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUrlOpen, setIsUrlOpen] = useState(false);
  const [isTranscribeOpen, setIsTranscribeOpen] = useState(false);
  const [isTranslateOpen, setIsTranslateOpen] = useState(false);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const filterInputRef = useRef<HTMLInputElement>(null);

  const { t } = useTranslation('chat');

  const chatInputImageRef = useRef<{ openFilePicker: () => void }>(null);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      setIsSearchOpen(false);
      setIsUrlOpen(false);
      setIsTranscribeOpen(false);
      setIsTranslateOpen(false);
      setIsImageOpen(false);
    }
  };

  // Define menu items
  const menuItems: MenuItem[] = [
    {
      id: 'search',
      icon: <IconSearch size={18} className="mr-3 text-blue-500" />,
      label: t('chatFeaturesDropdownSearchModal'),
      tooltip: 'Web Search',
      onClick: () => {
        setIsSearchOpen(true);
        setIsOpen(false);
      },
      category: 'web',
    },
    {
      id: 'url',
      icon: <IconLink size={18} className="mr-3 text-green-500" />,
      label: t('chatFeaturesDropdownURLModal'),
      tooltip: 'Analyze Webpage',
      onClick: () => {
        setIsUrlOpen(true);
        setIsOpen(false);
      },
      category: 'web',
    },
    {
      id: 'transcribe',
      icon: <IconFileMusic size={18} className="mr-3 text-purple-500" />,
      label: t('chatFeaturesDropdownTranscribeModal'),
      tooltip: 'Transcribe Audio',
      onClick: () => {
        setIsTranscribeOpen(true);
        setIsOpen(false);
      },
      category: 'media',
    },
    {
      id: 'image',
      icon: <ImageIcon size={18} className="mr-3 text-amber-500" />,
      label: t('chatFeaturesDropdownImageModal'),
      tooltip: 'Upload Image',
      onClick: () => {
        chatInputImageRef.current?.openFilePicker();
      },
      category: 'media',
    },
    {
      id: 'translate',
      icon: <IconLanguage size={18} className="mr-3 text-teal-500" />,
      label: t('chatFeaturesDropdownTranslateModal'),
      tooltip: 'Translate Text',
      onClick: () => {
        setIsTranslateOpen(true);
        setIsOpen(false);
      },
      category: 'transform',
    },
    {
      id: 'camera',
      icon: <IconCamera size={18} className="mr-3 text-red-500" />,
      label: t('Camera'),
      tooltip: 'Capture Image',
      onClick: () => {
        onCameraClick();
        setIsOpen(false);
      },
      category: 'media',
    },
  ];

  // Filter menu items based on search query
  const filteredItems = filterQuery
    ? menuItems.filter(
        item =>
          item.label.toLowerCase().includes(filterQuery.toLowerCase()) ||
          item.tooltip.toLowerCase().includes(filterQuery.toLowerCase()) ||
          item.category.toLowerCase().includes(filterQuery.toLowerCase())
      )
    : menuItems;

  // Group menu items by category
  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  // Logic to handle clicks outside the Dropdown Menu
  useOutsideClick(dropdownRef, () => setIsOpen(false), isOpen);

  // Focus on search input when dropdown opens
  useEffect(() => {
    if (isOpen && filterInputRef.current) {
      setTimeout(() => {
        filterInputRef.current?.focus();
      }, 100);
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
          <IconCirclePlus className="w-6 h-6 mr-2 text-black dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors duration-200" />
          <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-black text-white text-xs py-1 px-2 rounded shadow-md">
            Expand Actions
          </div>
        </button>
      </div>

      {/* Enhanced Dropdown Menu */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute ml-8 left-40 bottom-full mb-2 transform -translate-x-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 w-64 outline-none overflow-hidden transition-all duration-200 ease-in-out"
          tabIndex={-1}
          role="menu"
        >
          {/* Search/Filter Input */}
          <div className="sticky top-0 p-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="relative">
              <input
                ref={filterInputRef}
                type="text"
                placeholder="Search features..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="w-full px-3 py-2 pl-10 pr-8 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <IconSearch className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500" size={16} />
              {filterQuery && (
                <button
                  onClick={() => setFilterQuery('')}
                  className="absolute right-3 top-2.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <IconX size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto custom-scrollbar">
            {Object.entries(groupedItems).length > 0 ? (
              Object.entries(groupedItems).map(([category, items]) => (
                <div key={category} className="px-1 py-1">
                  <h3 className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </h3>
                  {items.map((item) => (
                    <div key={item.id} className="group relative">
                      <button
                        className="flex items-center px-3 py-2.5 w-full text-left rounded-md text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700 transition-colors duration-150"
                        onClick={item.onClick}
                        role="menuitem"
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </button>
                      <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-black text-white text-xs py-1 px-2 rounded shadow-md text-nowrap z-20">
                        {item.tooltip}
                      </div>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">
                No features match your search
              </div>
            )}
          </div>
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
          simulateClick={true}
        />
      )}

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
          simulateClick={true}
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

      {/* Chat Input Image Component (hidden) */}
      <ChatInputImage
        imageInputRef={chatInputImageRef}
        setSubmitType={setSubmitType}
        prompt={textFieldValue}
        setFilePreviews={setFilePreviews}
        setFileFieldValue={setFileFieldValue}
        setUploadProgress={setUploadProgress}
        setParentModalIsOpen={setIsImageOpen}
        simulateClick={false}
        labelText=""
      />
    </div>
  );
};

export default Dropdown;
