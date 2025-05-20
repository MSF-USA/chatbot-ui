import { IconArrowDown, IconRepeat } from '@tabler/icons-react';
import {
  Dispatch,
  KeyboardEvent,
  MutableRefObject,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useTranslation } from 'next-i18next';

import {
  ChatInputSubmitTypes,
  FileMessageContent,
  FilePreview,
  getChatMessageContent,
  ImageMessageContent,
  Message,
  MessageType,
  TextMessageContent
} from '@/types/chat';
import {Plugin} from '@/types/plugin';
import {Prompt} from '@/types/prompt';

import HomeContext from '@/pages/api/home/home.context';
import {PromptList} from './PromptList';
import {VariableModal} from './VariableModal';
import ChatInputImage from "@/components/Chat/ChatInput/ChatInputImage";
import ChatInputFile from "@/components/Chat/ChatInput/ChatInputFile";
import {onFileUpload} from "@/components/Chat/ChatInputEventHandlers/file-upload";
import ChatFileUploadPreviews from "@/components/Chat/ChatInput/ChatFileUploadPreviews";
import ChatInputImageCapture, { ChatInputImageCaptureRef } from "@/components/Chat/ChatInput/ChatInputImageCapture";
import ChatInputVoiceCapture from "@/components/Chat/ChatInput/ChatInputVoiceCapture";
import ChatInputSubmitButton from "@/components/Chat/ChatInput/ChatInputSubmitButton";
import ChatInputTranslate from "@/components/Chat/ChatInput/ChatInputTranslate";
import ChatDropdown from "@/components/Chat/ChatInput/Dropdown";
import ChatInputTranscribe from "@/components/Chat/ChatInput/ChatInputTranscribe";

interface Props {
  onSend: (message: Message, plugin: Plugin | null) => void;
  onRegenerate: () => void;
  onScrollDownClick: () => void;
  stopConversationRef: MutableRefObject<boolean>;
  textareaRef: MutableRefObject<HTMLTextAreaElement | null>;
  showScrollDownButton: boolean;
  setFilePreviews: Dispatch<SetStateAction<FilePreview[]>>;
  filePreviews: FilePreview[];
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
}: Props) => {
  const { t } = useTranslation('chat');

  const {
    state: { selectedConversation, messageIsStreaming, prompts },

    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const [textFieldValue, setTextFieldValue] = useState<string>("");
  const [imageFieldValue, setImageFieldValue] = useState<ImageMessageContent | ImageMessageContent[] | null>()
  const [fileFieldValue, setFileFieldValue] = useState<FileMessageContent | FileMessageContent[] | ImageMessageContent | ImageMessageContent[] | null>(null)
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [showPromptList, setShowPromptList] = useState<boolean>(false);
  const [activePromptIndex, setActivePromptIndex] = useState<number>(0);
  const [promptInputValue, setPromptInputValue] = useState<string>('');
  const [variables, setVariables] = useState<string[]>([]);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [showPluginSelect, setShowPluginSelect] = useState<boolean>(false);
  const [plugin, setPlugin] = useState<Plugin | null>(null);
  const [submitType, setSubmitType] = useState<ChatInputSubmitTypes>('text');
  const [placeholderText, setPlaceholderText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);



  const promptListRef = useRef<HTMLUListElement | null>(null);
  const cameraRef = useRef<ChatInputImageCaptureRef>(null);

  const filteredPrompts: Prompt[] = prompts.filter((prompt) =>
    prompt.name.toLowerCase().includes(promptInputValue.toLowerCase()),
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value: string = e.target.value;
    const maxLength: number | undefined = selectedConversation?.model?.maxLength;

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
    const wrapInArray = (value: any) => Array.isArray(value) ? value : [value];

    if (submitType === 'text') {
      return textFieldValue;
    } else if (submitType === 'image') {
      const imageContents = imageFieldValue ? [...wrapInArray(imageFieldValue), ...wrapInArray(fileFieldValue)] : (fileFieldValue ? [...wrapInArray(fileFieldValue)] : []);
      return [
        ...imageContents,
        { type: "text", text: textFieldValue } as TextMessageContent
      ];
    } else if (submitType === 'file' || submitType == 'multi-file') {
      const fileContents = fileFieldValue ? wrapInArray(fileFieldValue) : [];
      return [
        ...fileContents,
        { type: "text", text: textFieldValue } as TextMessageContent
      ];
    } else {
      throw new Error(`Invalid submit type for message: ${submitType}`);
    }
  }

  const handleSend = () => {
    if (messageIsStreaming) {
      if (filePreviews.length > 0) {
        setFilePreviews([]);
      }
      return;
    }
    const content: string | TextMessageContent | (TextMessageContent | FileMessageContent)[] | (TextMessageContent | ImageMessageContent)[] = buildContent()

    if (!textFieldValue) {
      alert(t('Please enter a message'));
      return;
    }

    onSend({
      role: 'user', content, messageType: submitType ?? 'text'
    }, plugin);
    setTextFieldValue('')
    setImageFieldValue(null)
    setFileFieldValue(null)
    setPlugin(null);
    setSubmitType('text')

    if (filePreviews.length > 0) {
      setFilePreviews([]);
    }

    if (window.innerWidth < 640 && textareaRef?.current) {
      textareaRef.current.blur();
    }

  };

  const handleStopConversation = () => {
    stopConversationRef.current = true;
    setTimeout(() => {
      stopConversationRef.current = false;
    }, 1000);
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

  const handleKeyDownInput = (key: string, event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (key === 'Enter' && !isTyping && !isMobile() && !event.shiftKey && !event.ctrlKey) {
      event.preventDefault();
      handleSend();
      if (submitType !== 'text') {
        setSubmitType('text');
      }
      if (filePreviews.length > 0) {
        setFilePreviews([]);
      }
    } else if (event.key === '/' && event.metaKey && submitType === "text") {
      event.preventDefault();
      setShowPluginSelect(!showPluginSelect);
    }
  }

  const handleKeyDownPromptList = (event: KeyboardEvent<HTMLTextAreaElement>) => {
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
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showPromptList) {
      handleKeyDownPromptList(e)
    } else {
      // Handle cases when showPromptList is false
      handleKeyDownInput(e.key, e)
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
    const newContent = textFieldValue?.replace(/{{(.*?)}}/g, (match, variable) => {
      const index = variables.indexOf(variable);
      return updatedVariables[index];
    });
    setTextFieldValue(newContent);

    setFilePreviews([])

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
    const isMobile = window.innerWidth < 600;
    const fullPlaceholder = t('chatInputPlaceholderFull') || '';
    const trimmedPlaceholder = isMobile ? t('chatInputPlaceholder') : fullPlaceholder;
    setPlaceholderText(trimmedPlaceholder);
  }, [t]);

  const handleFiles = (files: FileList | File[]) => {
    const filesArray = Array.from(files);

    if (filesArray.length > 0) {
      onFileUpload(
        filesArray,
        setSubmitType,
        setFilePreviews,
        setFileFieldValue,
        setImageFieldValue,
        setUploadProgress
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
    return isTranscribing || messageIsStreaming;
  }

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`bg-white dark:bg-[#212121] border-t border-gray-200 dark:border-gray-700 dark:border-opacity-50 transition-colors ${isDragOver ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700' : ''}`}
    >
      {isDragOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-blue-50/70 dark:bg-blue-900/30 backdrop-blur-sm z-10 pointer-events-none">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg text-center">
            <div className="text-blue-500 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {filePreviews.length > 0 && (
        <div className="px-4 py-2 max-h-52 overflow-y-auto">
          <div className="w-full flex justify-center items-center space-x-2">
            <ChatFileUploadPreviews
              filePreviews={filePreviews}
              setFilePreviews={setFilePreviews}
              setSubmitType={setSubmitType}
            />
          </div>
        </div>
      )}

      <div className={'flex justify-center'}>
        {!messageIsStreaming &&
          !filePreviews.length &&
          selectedConversation &&
          selectedConversation.messages.length > 0 && (
            <button
              className="max-h-52 overflow-y-auto flex items-center gap-3 mb-1 rounded border border-neutral-200 bg-white py-2 px-4 text-black hover:opacity-50 dark:border-neutral-600 dark:bg-[#212121] dark:text-white md:mb-1 md:mt-2"
              onClick={onRegenerate}
            >
              <IconRepeat size={16}/> {t('Regenerate response')}
            </button>
          )}
      </div>

      <div className="sticky bottom-0 items-center bg-white dark:bg-[#212121]">

        <div className="flex justify-center items-center space-x-2 px-2 md:px-4">

          <ChatInputFile
            onFileUpload={onFileUpload}
            setSubmitType={setSubmitType}
            setFilePreviews={setFilePreviews}
            setFileFieldValue={setFileFieldValue}
            setImageFieldValue={setImageFieldValue}
            setUploadProgress={setUploadProgress}
          />

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
          />

          <div
            className="relative mx-2 max-w-[900px] flex w-full flex-grow flex-col rounded-md border border-black/10 bg-white shadow-[0_0_10px_rgba(0,0,0,0.10)] dark:border-gray-900/50 dark:bg-[#40414F] dark:text-white dark:shadow-[0_0_15px_rgba(0,0,0,0.10)] sm:mx-4"
          >
            <div className="absolute left-2 top-3">
              <ChatInputVoiceCapture
                setTextFieldValue={setTextFieldValue}
                setIsTranscribing={setIsTranscribing}
              />
            </div>

            <textarea
              ref={textareaRef}
              className={"m-0 w-full resize-none border-0 bg-transparent p-0 py-2 pr-8 pl-10 text-black dark:bg-transparent dark:text-white md:py-3 md:pl-10 lg:" + (isTranscribing ? ' animate-pulse' : '')}
              style={{
                resize: 'none',
                bottom: `${textareaRef?.current?.scrollHeight}px`,
                maxHeight: '400px',
                overflow: `${
                  textareaRef.current && textareaRef.current.scrollHeight > 400
                    ? 'auto'
                    : 'hidden'
                }`,
              }}
              placeholder={isTranscribing ? t("transcribingChatPlaceholder") : placeholderText}
              value={
                textFieldValue
              }
              rows={1}
              onCompositionStart={() => setIsTyping(true)}
              onCompositionEnd={() => setIsTyping(false)}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              disabled={preventSubmission()}
            />

            <div
              className="absolute right-2 top-2 rounded-sm p-1 text-neutral-800 opacity-60 hover:bg-neutral-200 hover:text-neutral-900 dark:bg-opacity-50 dark:text-neutral-100 dark:hover:text-neutral-200"
            >
              <ChatInputSubmitButton
                   messageIsStreaming={messageIsStreaming}
                   isTranscribing={isTranscribing}
                   handleSend={handleSend}
                   handleStopConversation={handleStopConversation}
                   preventSubmission={preventSubmission}
                 />
            </div>

            {showScrollDownButton && (
              <div className="absolute bottom-12 right-0 lg:bottom-0 lg:-right-10">
                <button
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-300 text-gray-800 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-neutral-200"
                  onClick={onScrollDownClick}
                >
                  <IconArrowDown size={18}/>
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
      <div
        className="px-3 pt-2 pb-3 text-center items-center text-[12px] text-black/50 dark:text-white/50 md:px-4 md:pt-3 md:pb-6">
        {t(
          "chatDisclaimer",
        )}
      </div>
    </div>
  );
};
