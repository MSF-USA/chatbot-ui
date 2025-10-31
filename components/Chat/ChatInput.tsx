import {
  IconArrowDown,
  IconRepeat,
  IconSearch,
  IconVolume,
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
import { useDropzone } from 'react-dropzone';

import { useTranslations } from 'next-intl';

import { useChat } from '@/lib/hooks/chat/useChat';
import { useConversations } from '@/lib/hooks/conversation/useConversations';
import { useSettings } from '@/lib/hooks/settings/useSettings';
import { useTones } from '@/lib/hooks/settings/useTones';
import { usePromptSelection } from '@/lib/hooks/ui/usePromptSelection';
import { useUploadState } from '@/lib/hooks/ui/useUploadState';

import { FILE_SIZE_LIMITS } from '@/lib/utils/app/const';
import { buildMessageContent } from '@/lib/utils/chat/contentBuilder';
import {
  shouldPreventSubmission,
  validateMessageSubmission,
} from '@/lib/utils/chat/validation';
import { parseVariables, replaceVariables } from '@/lib/utils/chat/variables';
import { isMobileDevice } from '@/lib/utils/device/detection';

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
  showDisclaimer = true,
  onTranscriptionStatusChange,
}: Props) => {
  const t = useTranslations();

  // Zustand hooks
  const { selectedConversation, folders } = useConversations();
  const { isStreaming, setIsStreaming } = useChat();
  const { prompts } = useSettings();
  const { tones } = useTones();

  // Upload state management
  const {
    filePreviews,
    setFilePreviews,
    fileFieldValue,
    setFileFieldValue,
    imageFieldValue,
    setImageFieldValue,
    uploadProgress,
    setUploadProgress,
    submitType,
    setSubmitType,
    handleFileUpload,
  } = useUploadState();

  const [textFieldValue, setTextFieldValue] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isMultiline, setIsMultiline] = useState<boolean>(false);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [variables, setVariables] = useState<string[]>([]);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [selectedPromptForModal, setSelectedPromptForModal] =
    useState<Prompt | null>(null);
  const [placeholderText, setPlaceholderText] = useState('');
  const [transcriptionStatus, setTranscriptionStatus] = useState<string | null>(
    null,
  );
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [webSearchMode, setWebSearchMode] = useState<boolean>(false);
  const [selectedToneId, setSelectedToneId] = useState<string | null>(null);
  const [usedPromptId, setUsedPromptId] = useState<string | null>(null);
  const [usedPromptVariables, setUsedPromptVariables] = useState<{
    [key: string]: string;
  } | null>(null);

  const cameraRef = useRef<ChatInputImageCaptureRef>(null);

  const {
    showPromptList,
    setShowPromptList,
    activePromptIndex,
    setActivePromptIndex,
    promptInputValue,
    filteredPrompts,
    promptListRef,
    handlePromptSelect: handlePromptSelectFromHook,
    handleKeyDownPromptList,
    handleInitModal,
    updatePromptListVisibilityCallback,
    findAndSelectMatchingPrompt,
  } = usePromptSelection({
    prompts,
    onPromptSelect: (prompt, parsedVariables, hasVariables) => {
      setVariables(parsedVariables);

      if (hasVariables) {
        setSelectedPromptForModal(prompt);
        setIsModalVisible(true);
      } else {
        setTextFieldValue((prevContent) => {
          const updatedContent = prevContent?.replace(/\/\w*$/, prompt.content);
          return updatedContent;
        });
        updatePromptListVisibilityCallback(prompt.content);
      }
    },
    onResetInputState: () => {
      if (submitType !== 'text') {
        setSubmitType('text');
      }
      if (filePreviews.length > 0) {
        setFilePreviews([]);
      }
    },
  });

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
    updatePromptListVisibilityCallback(value);
  };

  const buildContent = () =>
    buildMessageContent(
      submitType,
      textFieldValue,
      imageFieldValue,
      fileFieldValue,
    );

  const handleSend = () => {
    if (isStreaming) {
      if (filePreviews.length > 0) {
        setFilePreviews([]);
      }
      return;
    }

    const validation = validateMessageSubmission(
      textFieldValue,
      filePreviews,
      uploadProgress,
    );

    if (!validation.valid) {
      alert(t(validation.error || 'Cannot send message'));
      return;
    }

    console.log('[ChatInput handleSend] submitType:', submitType);
    console.log('[ChatInput handleSend] filePreviews:', filePreviews);
    console.log('[ChatInput handleSend] fileFieldValue:', fileFieldValue);

    const content = buildContent();

    console.log(
      '[ChatInput handleSend] built content:',
      JSON.stringify(content).substring(0, 200),
    );

    // If web search mode is active, force the web search agent
    const forcedAgentType = webSearchMode ? AgentType.WEB_SEARCH : undefined;

    onSend(
      {
        role: 'user',
        content,
        messageType: submitType ?? 'text',
        toneId: selectedToneId,
        promptId: usedPromptId,
        promptVariables: usedPromptVariables || undefined,
      },
      undefined,
      forcedAgentType,
    );

    setTextFieldValue('');
    setImageFieldValue(null);
    setFileFieldValue(null);
    setSubmitType('text');
    setUsedPromptId(null); // Reset after sending
    setUsedPromptVariables(null); // Reset after sending

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

  const isMobile = isMobileDevice;

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

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showPromptList) {
      handleKeyDownPromptList(e);
    } else {
      handleKeyDownInput(e.key, e);
    }
  };

  const handleSubmit = (
    updatedVariables: string[],
    variableMap: { [key: string]: string },
  ) => {
    if (!selectedPromptForModal) return;

    const contentWithVariables = replaceVariables(
      selectedPromptForModal.content,
      variables,
      updatedVariables,
    );

    // Replace the /prompt text in the input with the filled-in content
    const newContent = textFieldValue?.replace(/\/\w*$/, contentWithVariables);
    setTextFieldValue(newContent);

    // Track which prompt was used and the variable values
    setUsedPromptId(selectedPromptForModal.id);
    setUsedPromptVariables(variableMap);

    setFilePreviews([]);
    setSelectedPromptForModal(null);

    if (textareaRef?.current) {
      textareaRef.current.focus();
    }
  };

  useEffect(() => {
    if (textareaRef && textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      textareaRef.current.style.height = `${textareaRef.current?.scrollHeight}px`;
      textareaRef.current.style.overflow = `${
        textareaRef?.current?.scrollHeight > 400 ? 'auto' : 'hidden'
      }`;

      // Check if textarea is multiline - single line is typically ~44px or less
      // Only consider it multiline if scrollHeight exceeds 60px to avoid false positives
      setIsMultiline(textareaRef.current.scrollHeight > 60);
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

  // Clear file attachments when switching conversations
  useEffect(() => {
    setFilePreviews([]);
    setFileFieldValue(null);
    setImageFieldValue(null);
    setUploadProgress({});
    setSubmitType('text');
  }, [selectedConversation?.id, setFilePreviews]);

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

  // File upload handler
  const handleFiles = (files: FileList | File[]) => {
    const filesArray = Array.from(files);

    if (filesArray.length > 0) {
      handleFileUpload(filesArray);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFiles,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
        '.xlsx',
      ],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        ['.pptx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'audio/*': ['.mp3', '.wav', '.m4a', '.webm'],
      'video/*': ['.mp4', '.webm'],
    },
    maxSize: FILE_SIZE_LIMITS.AUDIO_VIDEO_MAX_BYTES,
    maxFiles: 5,
    noClick: true, // Don't trigger file picker on click
    noKeyboard: true, // Don't trigger on keyboard
  });

  const preventSubmission = (): boolean =>
    shouldPreventSubmission(
      isTranscribing,
      isStreaming,
      filePreviews,
      uploadProgress,
    );

  return (
    <div
      {...getRootProps()}
      className={`bg-white dark:bg-[#212121] transition-colors ${isDragActive ? 'bg-blue-50 dark:bg-blue-900/30 border-t border-blue-300 dark:border-blue-700' : ''}`}
    >
      <input {...getInputProps()} />
      {isDragActive && (
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
              className={`relative flex w-full flex-col rounded-full border border-gray-300 bg-white dark:border-0 dark:bg-[#40414F] dark:text-white focus-within:outline-none focus-within:ring-0 z-0 transition-all duration-200 ${webSearchMode || selectedToneId ? 'min-h-[80px] !rounded-3xl' : ''} ${isMultiline && !webSearchMode && !selectedToneId ? '!rounded-2xl' : ''}`}
            >
              <textarea
                ref={textareaRef}
                className={`m-0 w-full resize-none border-0 bg-transparent p-0 pr-24 text-black dark:bg-transparent dark:text-white focus:outline-none focus:ring-0 focus:border-0 ${
                  webSearchMode || selectedToneId
                    ? 'pt-3 pb-[88px] pl-3'
                    : 'py-3.5 pl-10 md:py-3 md:pl-10'
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
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                disabled={preventSubmission()}
              />

              {/* Bottom row with all buttons and search badge */}
              <div
                className={`absolute left-2 flex items-center gap-2 z-[10001] transition-all duration-200 ${
                  webSearchMode || selectedToneId || isMultiline
                    ? 'bottom-2'
                    : 'top-1/2 transform -translate-y-1/2'
                }`}
              >
                <ChatDropdown
                  onFileUpload={handleFileUpload}
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
                  selectedToneId={selectedToneId}
                  setSelectedToneId={setSelectedToneId}
                  tones={tones}
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

                {selectedToneId && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium border border-gray-300 dark:border-gray-600">
                    <IconVolume className="w-5 h-5 text-purple-500" />
                    <span>
                      {tones.find((t) => t.id === selectedToneId)?.name ||
                        'Tone'}
                    </span>
                    <button
                      onClick={() => setSelectedToneId(null)}
                      className="ml-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full p-0.5 transition-colors"
                      aria-label="Remove tone"
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
                className={`absolute right-2.5 flex items-center gap-2 z-[10001] transition-all duration-200 ${
                  webSearchMode || selectedToneId || isMultiline
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
                  preventSubmission={preventSubmission}
                />
              </div>

              <div
                className={`absolute bottom-20 left-1/2 -translate-x-1/2 md:bottom-4 md:left-auto md:right-3 md:translate-x-0 transition-all duration-200 ease-in-out ${
                  showScrollDownButton && !isFocused
                    ? 'opacity-100 scale-100 pointer-events-auto'
                    : 'opacity-0 scale-90 pointer-events-none'
                }`}
              >
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-300 text-gray-800 shadow-md hover:shadow-lg focus:outline-none dark:bg-gray-700 dark:text-neutral-200 transition-shadow"
                  onClick={(e) => {
                    onScrollDownClick();
                    e.currentTarget.blur(); // Remove focus after click
                  }}
                  aria-label="Scroll to bottom"
                >
                  <IconArrowDown size={18} />
                </button>
              </div>

              {showPromptList && filteredPrompts.length > 0 && (
                <div className="absolute bottom-12 w-full">
                  <PromptList
                    activePromptIndex={activePromptIndex}
                    prompts={filteredPrompts}
                    onSelect={handleInitModal}
                    onMouseOver={setActivePromptIndex}
                    promptListRef={promptListRef}
                    folders={folders}
                  />
                </div>
              )}
            </div>
          </div>

          {isModalVisible && selectedPromptForModal && (
            <VariableModal
              prompt={selectedPromptForModal}
              variables={variables}
              onSubmit={handleSubmit}
              onClose={() => {
                setIsModalVisible(false);
                setSelectedPromptForModal(null);
              }}
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
