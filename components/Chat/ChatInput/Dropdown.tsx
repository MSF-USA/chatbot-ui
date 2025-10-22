import {
  IconCamera,
  IconCirclePlus,
  IconFile,
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

import { useTranslations } from 'next-intl';

import { useDropdownKeyboardNav } from '@/lib/hooks/useDropdownKeyboardNav';
import useEnhancedOutsideClick from '@/lib/hooks/useEnhancedOutsideClick';

import {
  ChatInputSubmitTypes,
  FileFieldValue,
  FilePreview,
  Message,
} from '@/types/chat';

import ChatInputImage from '@/components/Chat/ChatInput/ChatInputImage';
import ChatInputImageCapture from '@/components/Chat/ChatInput/ChatInputImageCapture';
import ChatInputSearch from '@/components/Chat/ChatInput/ChatInputSearch';
import ChatInputTranscribe from '@/components/Chat/ChatInput/ChatInputTranscribe';
import ChatInputTranslate from '@/components/Chat/ChatInput/ChatInputTranslate';
import ImageIcon from '@/components/Icons/image';

import { DropdownCategoryGroup } from './DropdownCategoryGroup';
import { MenuItem } from './DropdownMenuItem';
import { DropdownSearchInput } from './DropdownSearchInput';

interface DropdownProps {
  onFileUpload: (
    event: React.ChangeEvent<any> | File[] | FileList,
    setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>,
    setFilePreviews: Dispatch<SetStateAction<FilePreview[]>>,
    setFileFieldValue: Dispatch<SetStateAction<FileFieldValue>>,
    setImageFieldValue: Dispatch<SetStateAction<FileFieldValue>>,
    setUploadProgress: Dispatch<SetStateAction<{ [key: string]: number }>>,
  ) => Promise<void>;
  setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>;
  setFilePreviews: Dispatch<SetStateAction<FilePreview[]>>;
  setFileFieldValue: Dispatch<SetStateAction<FileFieldValue>>;
  setImageFieldValue: Dispatch<SetStateAction<FileFieldValue>>;
  setUploadProgress: Dispatch<SetStateAction<{ [key: string]: number }>>;
  setTextFieldValue: Dispatch<SetStateAction<string>>;
  handleSend: () => void;
  textFieldValue: string;
  onCameraClick: () => void;
  // New props for agent-based web search
  onSend?: (message: Message, forceStandardChat?: boolean) => void;
  setRequestStatusMessage?: Dispatch<SetStateAction<string | null>>;
  setProgress?: Dispatch<SetStateAction<number | null>>;
  stopConversationRef?: { current: boolean };
  apiKey?: string;
  systemPrompt?: string;
  temperature?: number;
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
  onSend,
  setRequestStatusMessage,
  setProgress,
  stopConversationRef,
  apiKey,
  systemPrompt,
  temperature,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

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
    setIsClosing(true);
    // Wait for slide-down animation to complete before removing from DOM
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      setFilterQuery('');
      setSelectedIndex(0);
    }, 200); // Match animation duration
  };

  const t = useTranslations();

  const chatInputImageRef = useRef<{ openFilePicker: () => void }>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Define menu items
  const menuItems: MenuItem[] = [
    {
      id: 'search',
      icon: <IconSearch size={18} className="mr-3 text-blue-500" />,
      label: 'Web Search',
      tooltip: 'Web Search',
      onClick: () => {
        setSearchConfig((prev) => ({ ...prev, isOpen: true }));
        closeDropdown();
      },
      category: 'web',
    },
    {
      id: 'transcribe',
      icon: <IconFileMusic size={18} className="mr-3 text-purple-500" />,
      label: 'Transcribe Audio',
      tooltip: 'Transcribe Audio',
      onClick: () => {
        setIsTranscribeOpen(true);
        closeDropdown();
      },
      category: 'media',
    },
    {
      id: 'image',
      icon: <ImageIcon className="mr-3 text-amber-500" />,
      label: 'Upload Image',
      tooltip: 'Upload Image',
      onClick: () => {
        closeDropdown();
        chatInputImageRef.current?.openFilePicker();
      },
      category: 'media',
    },
    {
      id: 'file',
      icon: <IconFile size={18} className="mr-3 text-green-500" />,
      label: 'Upload File',
      tooltip: 'Upload File',
      onClick: () => {
        closeDropdown();
        fileInputRef.current?.click();
      },
      category: 'media',
    },
    {
      id: 'translate',
      icon: <IconLanguage size={18} className="mr-3 text-teal-500" />,
      label: 'Translate Text',
      tooltip: 'Translate Text',
      onClick: () => {
        setIsTranslateOpen(true);
        closeDropdown();
      },
      category: 'transform',
    },
    ...(hasCameraSupport
      ? [
          {
            id: 'camera',
            icon: <IconCamera size={18} className="mr-3 text-red-500" />,
            label: 'Camera',
            tooltip: 'Capture Image',
            onClick: () => {
              onCameraClick();
              closeDropdown();
            },
            category: 'media' as 'web' | 'media' | 'transform',
          },
        ]
      : []),
  ];

  // Filter menu items based on search query
  const filteredItems = filterQuery
    ? menuItems.filter(
        (item) =>
          item.label.toLowerCase().includes(filterQuery.toLowerCase()) ||
          item.tooltip.toLowerCase().includes(filterQuery.toLowerCase()) ||
          item.category.toLowerCase().includes(filterQuery.toLowerCase()),
      )
    : menuItems;

  const flattenedItems = filteredItems;

  // Use keyboard navigation hook
  const { handleKeyDown } = useDropdownKeyboardNav({
    isOpen,
    items: flattenedItems,
    selectedIndex,
    setSelectedIndex,
    filterQuery,
    setFilterQuery,
    closeDropdown,
    filterInputRef,
    onCloseModals: () => {
      setSearchConfig((prev) => ({ ...prev, isOpen: false }));
      setIsTranscribeOpen(false);
      setIsTranslateOpen(false);
      setIsImageOpen(false);
    },
  });

  // Group menu items by category
  const groupedItems = filteredItems.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, MenuItem[]>,
  );

  // Logic to handle clicks outside the Dropdown Menu
  useEnhancedOutsideClick(dropdownRef, closeDropdown, isOpen, true);

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
            if (isOpen) {
              closeDropdown();
            } else {
              setIsOpen(true);
            }
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
          className={`absolute bottom-full mb-2 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-[9999] w-64 outline-none overflow-hidden ${
            isClosing ? 'animate-slide-down' : 'animate-slide-up'
          }`}
          tabIndex={-1}
          role="menu"
          onKeyDown={handleKeyDown}
        >
          <DropdownSearchInput
            value={filterQuery}
            onChange={setFilterQuery}
            onClear={() => setFilterQuery('')}
            inputRef={filterInputRef}
          />

          <div className="max-h-80 overflow-y-auto custom-scrollbar">
            {Object.entries(groupedItems).length > 0 ? (
              Object.entries(groupedItems).map(([category, items]) => (
                <DropdownCategoryGroup
                  key={category}
                  category={category}
                  items={items}
                  flattenedItems={flattenedItems}
                  selectedIndex={selectedIndex}
                />
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
        onSend={onSend}
        setRequestStatusMessage={setRequestStatusMessage}
        setProgress={setProgress}
        stopConversationRef={stopConversationRef}
        apiKey={apiKey}
        systemPrompt={systemPrompt}
        temperature={temperature}
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

      {/* Hidden file input for file uploads */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={(e) =>
          onFileUpload(
            e,
            setSubmitType,
            setFilePreviews,
            setFileFieldValue,
            setImageFieldValue,
            setUploadProgress,
          )
        }
        className="hidden"
        multiple
      />
    </div>
  );
};

export default Dropdown;
