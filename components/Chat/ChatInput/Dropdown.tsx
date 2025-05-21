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
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hasCameraSupport, setHasCameraSupport] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const filterInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkCameraSupport = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const hasCamera = devices.some(
            (device) => device.kind === 'videoinput',
          );
          // console.log('Camera support detected:', hasCamera, devices);
          setHasCameraSupport(hasCamera);
        } else {
          console.error('MediaDevices API not supported');
          setHasCameraSupport(false);
        }
      } catch (error) {
        console.error('Error checking camera support:', error);
        setHasCameraSupport(false);
      }
    };

    checkCameraSupport();
  }, []);

  const closeDropdown = () => {
    setIsOpen(false);
    setFilterQuery('');
    setSelectedIndex(0);
  }

  const { t } = useTranslation('chat');

  const chatInputImageRef = useRef<{ openFilePicker: () => void }>(null);

  // Define menu items
  const menuItems: MenuItem[] = [
    {
      id: 'search',
      icon: <IconSearch size={18} className="mr-3 text-blue-500" />,
      label: t('chatFeaturesDropdownSearchModal'),
      tooltip: 'Web Search',
      onClick: () => {
        setIsSearchOpen(true);
        closeDropdown();
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
        closeDropdown();
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
        closeDropdown();
      },
      category: 'media',
    },
    {
      id: 'image',
      icon: <ImageIcon size={18} className="mr-3 text-amber-500" />,
      label: t('chatFeaturesDropdownImageModal'),
      tooltip: 'Upload Image',
      onClick: () => {
        closeDropdown();
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
        closeDropdown();
      },
      category: 'transform',
    },
    ...(hasCameraSupport ? [{
      id: 'camera',
      icon: <IconCamera size={18} className="mr-3 text-red-500" />,
      label: t('Camera'),
      tooltip: 'Capture Image',
      onClick: () => {
        onCameraClick();
        closeDropdown();
      },
      category: 'media' as 'web' | 'media' | 'transform',
    }] : []),
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

  const flattenedItems = filteredItems;

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex((prevIndex) =>
          prevIndex < flattenedItems.length - 1 ? prevIndex + 1 : 0
        );
        break;

      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex((prevIndex) =>
          prevIndex > 0 ? prevIndex - 1 : flattenedItems.length - 1
        );
        break;

      case 'Enter':
        event.preventDefault();
        if (flattenedItems[selectedIndex]) {
          flattenedItems[selectedIndex].onClick();
        }
        break;

      case 'Escape':
        event.preventDefault();
        if (filterQuery) {
          setFilterQuery('');
          setSelectedIndex(0);
        } else {
          closeDropdown();
          setSearchConfig((prev) => ({ ...prev, isOpen: false }));
          setIsTranscribeOpen(false);
          setIsTranslateOpen(false);
          setIsImageOpen(false);
        }
        break;

      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
          filterInputRef.current?.focus();
        }
        break;
    }
  };

  // Group menu items by category
  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  // Logic to handle clicks outside the Dropdown Menu
  useOutsideClick(dropdownRef, () => closeDropdown(), isOpen);

  // Reset selected index when filtered items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filterQuery]);

  // Focus on search input when dropdown opens
  useEffect(() => {
    if (isOpen && filterInputRef.current) {
      setTimeout(() => {
        filterInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  return (
    <div className="relative">
      {/* Toggle Dropdown Button */}
      <div className="group">
        <button
          onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            setIsOpen(!isOpen);
          }}
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
          className="absolute ml-12 left-40 bottom-full mb-2 transform -translate-x-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 w-64 outline-none overflow-hidden transition-all duration-200 ease-in-out"
          tabIndex={-1}
          role="menu"
          onKeyDown={handleKeyDown}
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
                aria-label="Search features"
                role="searchbox"
              />
              <IconSearch className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500" size={16} />
              {filterQuery && (
                <button
                  onClick={() => setFilterQuery('')}
                  className="absolute right-3 top-2.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="Clear search"
                >
                  <IconX size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto custom-scrollbar">
            {Object.entries(groupedItems).length > 0 ? (
              Object.entries(groupedItems).map(([category, items]) => (
                <div key={category} className="px-1 py-1" role="group" aria-label={category}>
                  <h3 className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </h3>
                  {items.map((item) => {
                    const itemIndex = flattenedItems.findIndex((i) => i.id === item.id);
                    const isSelected = itemIndex === selectedIndex;

                    return (
                      <div key={item.id} className="group relative">
                        <button
                          className={`flex items-center px-3 py-2.5 w-full text-left rounded-md text-gray-800 dark:text-gray-200 transition-colors duration-150 ${
                            isSelected
                              ? 'bg-gray-100 dark:bg-gray-700'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                          onClick={item.onClick}
                          role="menuitem"
                          aria-selected={isSelected}
                          tabIndex={isSelected ? 0 : -1}
                        >
                          {item.icon}
                          <span>{item.label}</span>
                        </button>
                        <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-black text-white text-xs py-1 px-2 rounded shadow-md text-nowrap z-20">
                          {item.tooltip}
                        </div>
                      </div>
                    );
                  })}
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
          hasCameraSupport={hasCameraSupport}
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
