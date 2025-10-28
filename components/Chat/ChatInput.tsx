import {
  IconArrowDown,
  IconRepeat,
  IconSearch,
  IconWorld,
} from '@tabler/icons-react';
import {
  Dispatch,
  KeyboardEvent,
  MutableRefObject,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useTranslations } from 'next-intl';

import { useChat } from '@/lib/hooks/chat/useChat';
import { useConversations } from '@/lib/hooks/conversation/useConversations';
import { useSettings } from '@/lib/hooks/settings/useSettings';

import { AgentType } from '@/types/agent';
import {
  ChatInputSubmitTypes,
  FileFieldValue,
  FileMessageContent,
  FilePreview,
  ImageFieldValue,
  ImageMessageContent,
  Message,
  MessageType,
  TextMessageContent,
  getChatMessageContent,
} from '@/types/chat';
import { Prompt } from '@/types/prompt';

import ChatFileUploadPreviews from '@/components/Chat/ChatInput/ChatFileUploadPreviews';
import ChatInputFile from '@/components/Chat/ChatInput/ChatInputFile';
import ChatInputImage from '@/components/Chat/ChatInput/ChatInputImage';
import ChatInputImageCapture, {
  ChatInputImageCaptureRef,
} from '@/components/Chat/ChatInput/ChatInputImageCapture';
import ChatInputSubmitButton from '@/components/Chat/ChatInput/ChatInputSubmitButton';
import ChatInputTranscribe from '@/components/Chat/ChatInput/ChatInputTranscribe';
import ChatInputTranslate from '@/components/Chat/ChatInput/ChatInputTranslate';
import ChatInputVoiceCapture from '@/components/Chat/ChatInput/ChatInputVoiceCapture';
import ChatDropdown from '@/components/Chat/ChatInput/Dropdown';
import { onFileUpload } from '@/components/Chat/ChatInputEventHandlers/file-upload';

import { PromptList } from './ChatInput/PromptList';
import { VariableModal } from './ChatInput/VariableModal';

interface Props {
  onSend: (
    message: Message,
    forceStandardChat?: boolean,
    forcedAgentType?: AgentType,
  ) => void;
  onRegenerate: () => void;
  onScrollDownClick: () => void;
  stopConversationRef: MutableRefObject<boolean>;
  textareaRef: MutableRefObject<HTMLTextAreaElement | null>;
  showScrollDownButton: boolean;
  setFilePreviews: Dispatch<SetStateAction<FilePreview[]>>;
  filePreviews: FilePreview[];
  showDisclaimer?: boolean;
  onTranscriptionStatusChange?: (status: string | null) => void;
}

export const ChatInput = ({
  onSend,
  onRegenerate,
  onScrollDownClick,
  stopConversationRef,
  textareaRef,
  showScrollDownButton,
  filePreviews,
  setFilePreviews,
  showDisclaimer = true,
  onTranscriptionStatusChange,
}: Props) => {
  const t = useTranslations();

  // Zustand hooks
  const { selectedConversation } = useConversations();
  const { isStreaming, setIsStreaming } = useChat();
  const { prompts } = useSettings();

  const [textFieldValue, setTextFieldValue] = useState<string>('');
  const [imageFieldValue, setImageFieldValue] = useState<FileFieldValue>(null);
  const [fileFieldValue, setFileFieldValue] = useState<FileFieldValue>(null);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [showPromptList, setShowPromptList] = useState<boolean>(false);
  const [activePromptIndex, setActivePromptIndex] = useState<number>(0);
  const [promptInputValue, setPromptInputValue] = useState<string>('');
  const [variables, setVariables] = useState<string[]>([]);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [submitType, setSubmitType] = useState<ChatInputSubmitTypes>('text');
  const [placeholderText, setPlaceholderText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [transcriptionStatus, setTranscriptionStatus] = useState<string | null>(
    null,
  );
  const [uploadProgress, setUploadProgress] = useState<{
    [key: string]: number;
  }>({});
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [webSearchMode, setWebSearchMode] = useState<boolean>(false);

  const promptListRef = useRef<HTMLUListElement | null>(null);
  const cameraRef = useRef<ChatInputImageCaptureRef>(null);

  const filteredPrompts: Prompt[] = prompts.filter((prompt) =>
    prompt.name.toLowerCase().includes(promptInputValue.toLowerCase()),
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value: string = e.target.value;
    const maxLength: number | undefined =
      selectedConversation?.model?.maxLength;

    if (maxLength && value.length > maxLength) {
      alert(
        t(
          `Message limit is {{maxLength}} characters. You have entered {{valueLength}} characters.`,
          { maxLength, valueLength: value.length },
        ),
      );
      return;
    }

    setTextFieldValue(value);
    updatePromptListVisibility(value);
  };

  const buildContent = () => {
    const wrapInArray = (value: any) =>
      Array.isArray(value) ? value : [value];

    if (submitType === 'text') {
      return textFieldValue;
    } else if (submitType === 'image') {
      const imageContents = imageFieldValue
        ? [...wrapInArray(imageFieldValue), ...wrapInArray(fileFieldValue)]
        : fileFieldValue
          ? [...wrapInArray(fileFieldValue)]
          : [];
      return [
        ...imageContents,
        { type: 'text', text: textFieldValue } as TextMessageContent,
      ];
    } else if (submitType === 'file' || submitType == 'multi-file') {
      const fileContents = fileFieldValue ? wrapInArray(fileFieldValue) : [];
      // Only include text content if text is not empty (for audio/video transcription without instructions)
      const textContent = textFieldValue.trim()
        ? [{ type: 'text', text: textFieldValue } as TextMessageContent]
        : [];
      return [...fileContents, ...textContent];
    } else {
      throw new Error(`Invalid submit type for message: ${submitType}`);
    }
  };

  const handleSend = () => {
    if (isStreaming) {
      if (filePreviews.length > 0) {
        setFilePreviews([]);
      }
      return;
    }

    // Check if files are still uploading
    const isUploading = Object.values(uploadProgress).some(
      (progress) => progress < 100,
    );
    if (isUploading) {
      alert(t('Please wait for files to finish uploading'));
      return;
    }

    console.log('[ChatInput handleSend] submitType:', submitType);
    console.log('[ChatInput handleSend] filePreviews:', filePreviews);
    console.log('[ChatInput handleSend] fileFieldValue:', fileFieldValue);

    const content:
      | string
      | TextMessageContent
      | (TextMessageContent | FileMessageContent)[]
      | (TextMessageContent | ImageMessageContent)[] = buildContent();

    console.log(
      '[ChatInput handleSend] built content:',
      JSON.stringify(content).substring(0, 200),
    );

    // Allow empty text if files are attached (e.g., audio/video transcription without instructions)
    const hasFiles = filePreviews.length > 0;
    if (!textFieldValue && !hasFiles) {
      alert(t('Please enter a message'));
      return;
    }

    // If web search mode is active, force the web search agent
    const forcedAgentType = webSearchMode ? AgentType.WEB_SEARCH : undefined;

    onSend(
      {
        role: 'user',
        content,
        messageType: submitType ?? 'text',
      },
      undefined,
      forcedAgentType,
    );

    setTextFieldValue('');
    setImageFieldValue(null);
    setFileFieldValue(null);
    setSubmitType('text');

    if (filePreviews.length > 0) {
      setFilePreviews([]);
    }

    if (window.innerWidth < 640 && textareaRef?.current) {
      textareaRef.current.blur();
    }
  };

  const handleStopConversation = () => {
    stopConversationRef.current = true;
    setIsStreaming(false);
  };

  const isMobile = () => {
    const userAgent =
      typeof window.navigator === 'undefined' ? '' : navigator.userAgent;
    const mobileRegex =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;
    return mobileRegex.test(userAgent);
  };

  const handleInitModal = () => {
    const selectedPrompt = filteredPrompts[activePromptIndex];
    if (selectedPrompt) {
      setTextFieldValue((prevTextFieldValue) => {
        const newContent = prevTextFieldValue?.replace(
          /\/\w*$/,
          selectedPrompt.content,
        );
        return newContent;
      });
      handlePromptSelect(selectedPrompt);
    }
    setShowPromptList(false);
  };

  const handleKeyDownInput = (
    key: string,
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (
      key === 'Enter' &&
      !isTyping &&
      !isMobile() &&
      !event.shiftKey &&
      !event.ctrlKey
    ) {
      event.preventDefault();
      handleSend();
      if (submitType !== 'text') {
        setSubmitType('text');
      }
      if (filePreviews.length > 0) {
        setFilePreviews([]);
      }
    }
  };

  const handleKeyDownPromptList = (
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActivePromptIndex((prevIndex) =>
          prevIndex < prompts.length - 1 ? prevIndex + 1 : prevIndex,
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActivePromptIndex((prevIndex) =>
          prevIndex > 0 ? prevIndex - 1 : prevIndex,
        );
        break;
      case 'Tab':
        event.preventDefault();
        setActivePromptIndex((prevIndex) =>
          prevIndex < prompts.length - 1 ? prevIndex + 1 : 0,
        );
        break;
      case 'Enter':
        event.preventDefault();
        handleInitModal();
        if (submitType !== 'text') {
          setSubmitType('text');
        }
        if (filePreviews.length > 0) {
          setFilePreviews([]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        setShowPromptList(false);
        break;
      default:
        setActivePromptIndex(0);
        break;
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showPromptList) {
      handleKeyDownPromptList(e);
    } else {
      // Handle cases when showPromptList is false
      handleKeyDownInput(e.key, e);
    }
  };

  const parseVariables = (content: string) => {
    const regex = /{{(.*?)}}/g;
    const foundVariables = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      foundVariables.push(match[1]);
    }

    return foundVariables;
  };

  const updatePromptListVisibility = useCallback((text: string) => {
    const match = /\/\w*$/.exec(text);

    if (match) {
      setShowPromptList(true);
      setPromptInputValue(match[0].slice(1));
    } else {
      setShowPromptList(false);
      setPromptInputValue('');
    }
  }, []);

  const handlePromptSelect = (prompt: Prompt) => {
    const parsedVariables = parseVariables(prompt.content);
    setVariables(parsedVariables);

    if (parsedVariables.length > 0) {
      setIsModalVisible(true);
    } else {
      setTextFieldValue((prevContent) => {
        const updatedContent = prevContent?.replace(/\/\w*$/, prompt.content);
        return updatedContent;
      });
      updatePromptListVisibility(prompt.content);
    }
  };

  const handleSubmit = (updatedVariables: string[]) => {
    const newContent = textFieldValue?.replace(
      /{{(.*?)}}/g,
      (match, variable) => {
        const index = variables.indexOf(variable);
        return updatedVariables[index];
      },
    );
    setTextFieldValue(newContent);

    setFilePreviews([]);

    if (textareaRef?.current) {
      textareaRef.current.focus();
    }
  };

  useEffect(() => {
    if (promptListRef.current) {
      promptListRef.current.scrollTop = activePromptIndex * 30;
    }
  }, [activePromptIndex]);

  useEffect(() => {
    if (textareaRef && textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      textareaRef.current.style.height = `${textareaRef.current?.scrollHeight}px`;
      textareaRef.current.style.overflow = `${
        textareaRef?.current?.scrollHeight > 400 ? 'auto' : 'hidden'
      }`;
    }
  }, [textFieldValue, textareaRef]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        promptListRef.current &&
        !promptListRef.current.contains(e.target as Node)
      ) {
        setShowPromptList(false);
      }
    };

    window.addEventListener('click', handleOutsideClick);

    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    setPlaceholderText('Ask Anything');
  }, [t]);

  // Update placeholder when audio/video files are attached
  const hasAudioVideoFiles = filePreviews.some(
    (preview) =>
      preview.type.startsWith('audio/') || preview.type.startsWith('video/'),
  );
  const audioVideoPlaceholder = hasAudioVideoFiles
    ? 'Optional: add instructions (e.g., translate, summarize)...'
    : placeholderText;

  // Notify parent when transcription status changes
  useEffect(() => {
    onTranscriptionStatusChange?.(transcriptionStatus);
  }, [transcriptionStatus, onTranscriptionStatusChange]);

  // Auto-disable web search when audio/video files are attached (they need transcription)
  // Images and documents can work with web search mode
  useEffect(() => {
    if (hasAudioVideoFiles && webSearchMode) {
      setWebSearchMode(false);
      console.log(
        'Web search auto-disabled: audio/video files need transcription',
      );
    }
  }, [hasAudioVideoFiles, webSearchMode, setWebSearchMode]);

  const handleFiles = (files: FileList | File[]) => {
    const filesArray = Array.from(files);

    if (filesArray.length > 0) {
      onFileUpload(
        filesArray,
        setSubmitType,
        setFilePreviews,
        setFileFieldValue,
        setImageFieldValue,
        setUploadProgress,
      );
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = e.dataTransfer.files;
      handleFiles(files);
      try {
        e.dataTransfer.clearData();
      } catch (err: any) {
        // e.target.value = ""
      }
    }
  };

  const preventSubmission = (): boolean => {
    return isTranscribing || isStreaming;
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`bg-white dark:bg-[#212121] transition-colors ${isDragOver ? 'bg-blue-50 dark:bg-blue-900/30 border-t border-blue-300 dark:border-blue-700' : ''}`}
    >
      {isDragOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-blue-50/70 dark:bg-blue-900/30 backdrop-blur-sm z-10 pointer-events-none">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg text-center">
            <div className="text-blue-500 mb-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                />
              </svg>
            </div>
          </div>
        </div>
      )}

      {filePreviews.length > 0 && (
        <div className="max-h-52 overflow-y-auto">
          <ChatFileUploadPreviews
            filePreviews={filePreviews}
            setFilePreviews={setFilePreviews}
            setSubmitType={setSubmitType}
            uploadProgress={uploadProgress}
          />
        </div>
      )}

      <div className="sticky bottom-0 items-center bg-white dark:bg-[#212121] pt-4">
        <div className="flex justify-center items-center space-x-2 px-2 md:px-4">
          <ChatInputImageCapture
            ref={cameraRef}
            setSubmitType={setSubmitType}
            prompt={textFieldValue}
            setFilePreviews={setFilePreviews}
            setImageFieldValue={setFileFieldValue}
            setUploadProgress={setUploadProgress}
            visible={false}
            hasCameraSupport={true}
          />

          <div className="relative mx-2 max-w-[900px] w-full flex-grow sm:mx-4">
            <div
              className={`relative flex w-full flex-col rounded-3xl border border-gray-300 bg-white dark:border-0 dark:bg-[#40414F] dark:text-white focus-within:outline-none focus-within:ring-0 z-0 transition-[min-height] duration-200 ${webSearchMode ? 'min-h-[120px]' : ''}`}
            >
              <textarea
                ref={textareaRef}
                className={`m-0 w-full resize-none border-0 bg-transparent p-0 pr-24 text-black dark:bg-transparent dark:text-white focus:outline-none focus:ring-0 focus:border-0 ${
                  webSearchMode
                    ? 'pt-3 pb-[88px] pl-3'
                    : 'py-2 pl-10 md:py-3 md:pl-10'
                }`}
                style={{
                  resize: 'none',
                  bottom: `${textareaRef?.current?.scrollHeight}px`,
                  maxHeight: '400px',
                  overflow: `${
                    textareaRef.current &&
                    textareaRef.current.scrollHeight > 400
                      ? 'auto'
                      : 'hidden'
                  }`,
                }}
                placeholder={
                  isTranscribing
                    ? t('transcribingChatPlaceholder')
                    : webSearchMode
                      ? 'Search the web'
                      : audioVideoPlaceholder
                }
                value={textFieldValue}
                rows={1}
                onCompositionStart={() => setIsTyping(true)}
                onCompositionEnd={() => setIsTyping(false)}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                disabled={preventSubmission()}
              />

              {/* Bottom row with all buttons and search badge */}
              <div
                className={`absolute left-2 flex items-center gap-2 z-[10001] transition-all duration-200 ${
                  webSearchMode
                    ? 'bottom-2'
                    : 'top-1/2 transform -translate-y-1/2'
                }`}
              >
                <ChatDropdown
                  onFileUpload={onFileUpload}
                  setSubmitType={setSubmitType}
                  setFilePreviews={setFilePreviews}
                  setFileFieldValue={setFileFieldValue}
                  setImageFieldValue={setImageFieldValue}
                  setUploadProgress={setUploadProgress}
                  setTextFieldValue={setTextFieldValue}
                  handleSend={handleSend}
                  textFieldValue={textFieldValue}
                  onCameraClick={() => {
                    cameraRef.current?.triggerCamera();
                  }}
                  openDownward={!showDisclaimer}
                  webSearchMode={webSearchMode}
                  setWebSearchMode={setWebSearchMode}
                  setTranscriptionStatus={setTranscriptionStatus}
                />

                {webSearchMode && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium border border-gray-300 dark:border-gray-600">
                    <IconWorld className="w-5 h-5 text-blue-500" />
                    <span>Search</span>
                    <button
                      onClick={() => setWebSearchMode(false)}
                      className="ml-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full p-0.5 transition-colors"
                      aria-label="Disable web search"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              <div
                className={`absolute right-1.5 flex items-center gap-3 z-[10001] transition-all duration-200 ${
                  webSearchMode
                    ? 'bottom-2'
                    : 'top-1/2 transform -translate-y-1/2'
                }`}
              >
                <ChatInputVoiceCapture
                  setTextFieldValue={setTextFieldValue}
                  setIsTranscribing={setIsTranscribing}
                />
                <ChatInputSubmitButton
                  isStreaming={isStreaming}
                  isTranscribing={isTranscribing}
                  handleSend={handleSend}
                  handleStopConversation={handleStopConversation}
                  preventSubmission={
                    preventSubmission ||
                    Object.values(uploadProgress).some((p) => p < 100)
                  }
                />
              </div>

              {showScrollDownButton && (
                <div className="absolute bottom-12 right-0 lg:bottom-0 lg:-right-10">
                  <button
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-300 text-gray-800 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-neutral-200"
                    onClick={onScrollDownClick}
                  >
                    <IconArrowDown size={18} />
                  </button>
                </div>
              )}

              {showPromptList && filteredPrompts.length > 0 && (
                <div className="absolute bottom-12 w-full">
                  <PromptList
                    activePromptIndex={activePromptIndex}
                    prompts={filteredPrompts}
                    onSelect={handleInitModal}
                    onMouseOver={setActivePromptIndex}
                    promptListRef={promptListRef}
                  />
                </div>
              )}
            </div>
          </div>

          {isModalVisible && (
            <VariableModal
              prompt={filteredPrompts[activePromptIndex]}
              variables={variables}
              onSubmit={handleSubmit}
              onClose={() => setIsModalVisible(false)}
            />
          )}
        </div>
      </div>
      {showDisclaimer && (
        <div className="px-3 pt-1 pb-3 text-center items-center text-[12px] text-black/50 dark:text-white/50 md:px-4 md:pt-1 md:pb-3">
          {t('chatDisclaimer')}
        </div>
      )}
    </div>
  );
};
