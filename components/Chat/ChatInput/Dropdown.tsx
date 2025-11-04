import {
  IconCamera,
  IconCirclePlus,
  IconFile,
  IconFileMusic,
  IconLanguage,
  IconLink,
  IconPaperclip,
  IconSearch,
  IconVolume,
  IconWorld,
} from '@tabler/icons-react';
import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { useTranslations } from 'next-intl';

import { useDropdownKeyboardNav } from '@/client/hooks/ui/useDropdownKeyboardNav';
import useEnhancedOutsideClick from '@/client/hooks/ui/useEnhancedOutsideClick';

import {
  ChatInputSubmitTypes,
  FileFieldValue,
  FilePreview,
  Message,
} from '@/types/chat';
import { SearchMode } from '@/types/searchMode';
import { Tone } from '@/types/tone';

import ChatInputImage from '@/components/Chat/ChatInput/ChatInputImage';
import ChatInputImageCapture from '@/components/Chat/ChatInput/ChatInputImageCapture';
import ChatInputTranslate from '@/components/Chat/ChatInput/ChatInputTranslate';
import ImageIcon from '@/components/Icons/image';

import { DropdownMenuItem, MenuItem } from './DropdownMenuItem';

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
  openDownward?: boolean;
  searchMode: SearchMode;
  setSearchMode: Dispatch<SetStateAction<SearchMode>>;
  setTranscriptionStatus: Dispatch<SetStateAction<string | null>>;
  selectedToneId: string | null;
  setSelectedToneId: Dispatch<SetStateAction<string | null>>;
  tones: Tone[];
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
  openDownward = false,
  searchMode,
  setSearchMode,
  setTranscriptionStatus,
  selectedToneId,
  setSelectedToneId,
  tones,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isTranslateOpen, setIsTranslateOpen] = useState(false);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [isToneOpen, setIsToneOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [hasCameraSupport, setHasCameraSupport] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkCameraSupport = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const hasCamera = devices.some(
            (device) => device.kind === 'videoinput',
          );
          // console.log('Camera support detected:', hasCamera, devices);
          setTimeout(() => {
            setHasCameraSupport(hasCamera);
          }, 0);
        } else {
          console.error('MediaDevices API not supported');
          setTimeout(() => {
            setHasCameraSupport(false);
          }, 0);
        }
      } catch (error) {
        console.error('Error checking camera support:', error);
        setTimeout(() => {
          setHasCameraSupport(false);
        }, 0);
      }
    };

    checkCameraSupport();
  }, []);

  const closeDropdown = useCallback(() => {
    setIsClosing(true);
    // Wait for slide-down animation to complete before removing from DOM
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      setSelectedIndex(-1);
    }, 200); // Match animation duration
  }, []);

  const t = useTranslations();

  const chatInputImageRef = useRef<{ openFilePicker: () => void }>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handler for file attach that doesn't access ref during render
  const handleAttachClick = useCallback(() => {
    closeDropdown();
    fileInputRef.current?.click();
  }, [closeDropdown]);

  // Helper function to toggle search mode (always sets to ALWAYS when enabled)
  const toggleSearchMode = useCallback(() => {
    if (searchMode === SearchMode.OFF) {
      setSearchMode(SearchMode.ALWAYS);
    } else {
      setSearchMode(SearchMode.OFF);
    }
  }, [searchMode, setSearchMode]);

  // Define menu items - memoized to avoid ref access issues during render
  const menuItems: MenuItem[] = useMemo(
    () => [
      {
        id: 'search',
        icon: <IconWorld size={18} className="text-blue-500 flex-shrink-0" />,
        label: searchMode !== SearchMode.OFF ? '✓ Web Search' : 'Web Search',
        infoTooltip:
          'Enable web search for every message.\n\nProvides up-to-date information using real-time Bing web access.',
        onClick: () => {
          toggleSearchMode();
          closeDropdown();
        },
        category: 'web',
      },
      {
        id: 'tone',
        icon: (
          <IconVolume
            size={18}
            className={`flex-shrink-0 ${tones.length === 0 ? 'text-gray-400' : 'text-purple-500'}`}
          />
        ),
        label: selectedToneId
          ? `✓ Tone: ${tones.find((t) => t.id === selectedToneId)?.name || 'Selected'}`
          : 'Tone',
        infoTooltip:
          tones.length === 0
            ? 'No tones available.\n\nCreate tones in Quick Actions to control writing style, formality, and personality.'
            : 'Apply a custom voice profile to your messages.\n\nSelect a tone to control writing style, formality, and personality.\n\nStays active until changed or removed.',
        onClick: () => {
          setIsToneOpen(true);
          closeDropdown();
        },
        category: 'web',
        disabled: tones.length === 0,
      },
      {
        id: 'attach',
        icon: (
          <IconPaperclip
            size={18}
            className="text-gray-700 dark:text-gray-300 flex-shrink-0"
          />
        ),
        label: 'Attach files',
        infoTooltip:
          'Supported formats:\n\n• Images: JPEG, PNG, GIF (5MB max)\n• Documents: PDF, DOCX, XLSX, PPTX, TXT, MD (10MB max)\n\nUpload up to 5 files at once.\n\nImages and documents work with web search mode.\n\nNote: For audio/video transcription, use the "Transcribe Audio/Video" option below.',
        onClick: handleAttachClick,
        category: 'media',
      },
      {
        id: 'translate',
        icon: (
          <IconLanguage size={18} className="text-teal-500 flex-shrink-0" />
        ),
        label: 'Translate Text',
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
              icon: (
                <IconCamera size={18} className="text-red-500 flex-shrink-0" />
              ),
              label: 'Camera',
              onClick: () => {
                onCameraClick();
                closeDropdown();
              },
              category: 'media' as 'web' | 'media' | 'transform',
            },
          ]
        : []),
    ],
    [
      searchMode,
      selectedToneId,
      tones,
      hasCameraSupport,
      closeDropdown,
      setSearchMode,
      setIsToneOpen,
      setIsTranslateOpen,
      onCameraClick,
      handleAttachClick,
      toggleSearchMode,
    ],
  );

  // Use keyboard navigation hook
  const { handleKeyDown } = useDropdownKeyboardNav({
    isOpen,
    items: menuItems,
    selectedIndex,
    setSelectedIndex,
    closeDropdown,
    onCloseModals: () => {
      setIsTranslateOpen(false);
      setIsImageOpen(false);
      setIsToneOpen(false);
    },
  });

  // Logic to handle clicks outside the Dropdown Menu
  useEnhancedOutsideClick(dropdownRef, closeDropdown, isOpen, true);

  return (
    <div className="relative">
      {/* Toggle Dropdown Button */}
      <div className="group">
        <button
          onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
            event.preventDefault();
            event.stopPropagation();
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
          <IconCirclePlus className="w-7 h-7 md:w-6 md:h-6 mr-2 text-black dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors duration-200" />
          <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-black text-white text-xs py-1 px-2 rounded shadow-md">
            Expand Actions
          </div>
        </button>
      </div>

      {/* Enhanced Dropdown Menu */}
      {isOpen && !isClosing && (
        <div
          ref={dropdownRef}
          className={`absolute ${openDownward ? 'top-full mt-2 z-[10000]' : 'bottom-full mb-2 z-[9999]'} left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg w-64 outline-none overflow-hidden ${
            openDownward ? 'animate-slide-down-reverse' : 'animate-slide-up'
          }`}
          tabIndex={-1}
          role="menu"
          onKeyDown={handleKeyDown}
        >
          <div className="max-h-80 overflow-y-auto custom-scrollbar p-1">
            {/* eslint-disable-next-line react-hooks/refs */}
            {menuItems.map((item, index) => (
              <DropdownMenuItem
                key={item.id}
                item={item}
                isSelected={index === selectedIndex}
              />
            ))}
          </div>
        </div>
      )}

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

      {/* Tone Selector Modal */}
      {isToneOpen &&
        typeof window !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setIsToneOpen(false)}
          >
            <div
              className="relative w-full max-w-md bg-white dark:bg-[#212121] rounded-xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Select Tone
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Choose a voice profile for your messages
                </p>
              </div>

              <div className="max-h-96 overflow-y-auto p-4">
                <button
                  onClick={() => {
                    setSelectedToneId(null);
                    setIsToneOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all mb-2 ${
                    !selectedToneId
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="font-medium text-gray-900 dark:text-white">
                    No Tone (Default)
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Use default writing style
                  </div>
                </button>

                {tones.map((tone) => (
                  <button
                    key={tone.id}
                    onClick={() => {
                      setSelectedToneId(tone.id);
                      setIsToneOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all mb-2 ${
                      selectedToneId === tone.id
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      <IconVolume size={16} className="text-purple-500" />
                      {tone.name}
                    </div>
                    {tone.description && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {tone.description}
                      </div>
                    )}
                    {tone.tags && tone.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {tone.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                ))}

                {tones.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <IconVolume size={48} className="mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No tones created yet</p>
                    <p className="text-xs mt-1">
                      Create tones in Quick Actions
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
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

      {/* Hidden file input for images and documents only (audio/video uses separate transcription button) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md"
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
