import { Transition } from '@headlessui/react';
import {
  IconClearAll,
  IconExternalLink,
  IconInfoCircle,
  IconSettings,
} from '@tabler/icons-react';
import {
  MutableRefObject,
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import toast from 'react-hot-toast';

import { useTranslation } from 'next-i18next';
import Image from 'next/image';

import { makeRequest } from '@/services/frontendChatServices';

import { getEndpoint } from '@/utils/app/api';
import {
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_TEMPERATURE,
  DEFAULT_USE_KNOWLEDGE_BASE,
} from '@/utils/app/const';
import { OPENAI_API_HOST_TYPE } from '@/utils/app/const';
import { saveConversation, saveConversations } from '@/utils/app/conversation';
import { throttle } from '@/utils/data/throttle';

import { getBotById } from '@/types/bots';
import {
  ChatBody,
  Conversation,
  FileMessageContent,
  FilePreview,
  Message,
  MessageType,
  TextMessageContent,
} from '@/types/chat';
import { Plugin } from '@/types/plugin';

import HomeContext from '@/pages/api/home/home.context';

import logo from '../../public/msf_logo2.png';
import { TemperatureSlider } from '../Settings/Temperature';
import Spinner from '../Spinner';
import { ChatInput } from './ChatInput';
import { ChatLoader } from './ChatLoader';
import { ErrorMessageDiv } from './ErrorMessageDiv';
import { MemoizedChatMessage } from './MemoizedChatMessage';
import { ModelSelect } from './ModelSelect';
import { suggestedPrompts } from './prompts';

import { debounce } from '@tanstack/virtual-core';
import Typewriter from 'typewriter-effect';

interface Props {
  stopConversationRef: MutableRefObject<boolean>;
}

const getRandomPrompts = (
  num: number,
): { title: string; prompt: string; icon: React.ElementType | null }[] => {
  const shuffled = [...suggestedPrompts].sort(() => 0.5 - Math.random());
  const randomPrompts = shuffled.slice(0, num);

  return randomPrompts;
};

export const Chat = memo(({ stopConversationRef }: Props) => {
  const { t } = useTranslation('chat');

  const {
    state: {
      selectedConversation,
      conversations,
      models,
      apiKey,
      serverSideApiKeyIsSet,
      messageIsStreaming,
      modelError,
      loading,
      prompts,
      temperature,
      systemPrompt,
      runTypeWriterIntroSetting,
    },
    handleUpdateConversation,
    dispatch: homeDispatch,
  } = useContext(HomeContext);
  let {
    state: { pluginKeys },
  } = useContext(HomeContext);
  if (typeof pluginKeys === 'string') {
    pluginKeys = JSON.parse(pluginKeys);
  }

  const email = process.env.NEXT_PUBLIC_EMAIL;

  const [currentMessage, setCurrentMessage] = useState<Message>();
  const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showScrollDownButton, setShowScrollDownButton] =
    useState<boolean>(false);
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);
  const [randomPrompts, setRandomPrompts] = useState<
    { title: string; prompt: string; icon: React.ElementType | null }[]
  >([]);
  const [botInfo, setBotInfo] = useState<{
    id: string;
    name: string;
    color: string;
  } | null>(null);
  const [requestStatusMessage, setRequestStatusMessage] = useState<
    string | null
  >(null);
  const [progress, setProgress] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const updateConversationFromUserInput = (
    userMessage: Message,
    selectedConversation: Conversation,
    deleteCount: number | null,
  ): Conversation => {
    let updatedConversation: Conversation;
    if (deleteCount) {
      const updatedMessages = [...selectedConversation.messages];
      for (let i = 0; i < deleteCount; i++) {
        updatedMessages.pop();
      }
      updatedConversation = {
        ...selectedConversation,
        messages: [...updatedMessages, userMessage],
      };
    } else {
      updatedConversation = {
        ...selectedConversation,
        messages: [...selectedConversation.messages, userMessage],
      };
    }

    return updatedConversation;
  };

  const updateBotInfo = useCallback(() => {
    if (selectedConversation?.bot) {
      const bot = getBotById(selectedConversation.bot);
      if (bot) {
        setBotInfo({ id: bot.id, name: bot.name, color: bot.color });
      } else {
        setBotInfo(null);
      }
    } else {
      setBotInfo(null);
    }
  }, [selectedConversation]);

  useEffect(() => {
    updateBotInfo();
  }, [selectedConversation, updateBotInfo]);

  const setConversationTitle = (
    updatedConversation: Conversation,
    message: Message,
  ): Conversation => {
    // TODO: Add generated title option with these as fallback, similar to how other LLM frontends work
    let title = '';
    if (typeof message.content === 'string') {
      title = message.content.substring(0, 30);
    } else if (Array.isArray(message.content)) {
      const contentTypes = message.content.map((section) => section.type);
      if (contentTypes.includes('image_url')) {
        title = 'Image Chat';
      } else if (contentTypes.includes('file_url')) {
        const fileSection = (
          message.content as (FileMessageContent | TextMessageContent)[]
        ).find(
          (section) => (section as FileMessageContent).originalFilename,
        ) as FileMessageContent;
        title = fileSection?.originalFilename
          ? `File: ${fileSection.originalFilename.substring(0, 20)}`
          : 'File Chat';
      } else {
        const textSection = (
          message.content as (TextMessageContent | any)[]
        ).find(
          (section) => (section as TextMessageContent).type === 'text',
        ) as TextMessageContent;
        title = textSection?.text
          ? textSection.text.substring(0, 30)
          : 'New Chat';
      }
    } else if ((message.content as TextMessageContent)?.type === 'text') {
      title = (message.content as TextMessageContent).text.substring(0, 30);
    } else {
      title = 'New Chat';
    }

    title = title.trim().length > 0 ? title : 'New Chat';
    title = title.length > 30 ? title.substring(0, 30) + '...' : title;

    return {
      ...updatedConversation,
      name: title,
    };
  };

  const debouncedUpdateConversation = useCallback(
    debounce(
      window,
      (content: string, updateConversation: CallableFunction) => {
        updateConversation(content);
      },
      100,
    ),
    [],
  );

  const handleNormalChatBackendStreaming = async (
    data: ReadableStream,
    controller: AbortController,
    updatedConversation: Conversation,
    selectedConversation: Conversation,
    originalConversations: Conversation[],
  ) => {
    const reader = data.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let text = '';
    let updatedConversationCopy = { ...updatedConversation };

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;

      if (value) {
        const chunkValue = decoder.decode(value);
        text += chunkValue;

        if (
          updatedConversationCopy.messages.length === 0 ||
          updatedConversationCopy.messages[
            updatedConversationCopy.messages.length - 1
          ].role !== 'assistant'
        ) {
          // If there's no assistant message, create a new one
          updatedConversationCopy = {
            ...updatedConversationCopy,
            messages: [
              ...updatedConversationCopy.messages,
              {
                role: 'assistant',
                content: text,
                messageType: MessageType.TEXT,
              },
            ],
          };
        } else {
          // Update the existing assistant message
          const updatedMessages = [
            ...updatedConversationCopy.messages.slice(0, -1),
            {
              ...updatedConversationCopy.messages[
                updatedConversationCopy.messages.length - 1
              ],
              content: text,
            },
          ];
          updatedConversationCopy = {
            ...updatedConversationCopy,
            messages: updatedMessages,
          };
        }

        // Update the state to trigger a re-render
        homeDispatch({
          field: 'selectedConversation',
          value: updatedConversationCopy,
        });
      }
    }

    saveConversation(updatedConversationCopy);

    const updatedConversations: Conversation[] = originalConversations.map(
      (conversation) => {
        if (conversation.id === selectedConversation.id) {
          return updatedConversationCopy;
        }
        return conversation;
      },
    );
    if (updatedConversations.length === 0) {
      updatedConversations.push(updatedConversationCopy);
    }

    return updatedConversations;
  };

  const handleSend = useCallback(
    async (message: Message, deleteCount = 0, plugin: Plugin | null = null) => {
      if (selectedConversation) {
        let updatedConversation: Conversation = updateConversationFromUserInput(
          message,
          selectedConversation,
          deleteCount,
        );

        homeDispatch({
          field: 'selectedConversation',
          value: updatedConversation,
        });
        homeDispatch({ field: 'loading', value: true });
        homeDispatch({ field: 'messageIsStreaming', value: true });

        try {
          const { controller, body, response, hasComplexContent } =
            await makeRequest(
              plugin,
              setRequestStatusMessage,
              updatedConversation,
              apiKey,
              pluginKeys,
              systemPrompt,
              temperature,
              true,
              setProgress,
            );

          if (hasComplexContent) {
            // Handle complex content case
            console.log('Message contains complex content');
            // Add your logic here
          }

          if (!response.ok) {
            homeDispatch({ field: 'loading', value: false });
            homeDispatch({ field: 'messageIsStreaming', value: false });
            let errorResp: any;
            try {
              errorResp = await response.json();
            } catch (errorResponsePullError) {
              errorResp = {};
            }
            toast.error(
              response.statusText ?? errorResp.error ?? 'Response failed',
            );
            return;
          }
          const data = response.body;

          if (!data) {
            homeDispatch({ field: 'loading', value: false });
            homeDispatch({ field: 'messageIsStreaming', value: false });
            return;
          }
          if (!plugin) {
            if (updatedConversation.messages.length === 1) {
              updatedConversation = setConversationTitle(
                updatedConversation,
                message,
              );
            }
            homeDispatch({ field: 'loading', value: false });

            // TODO: Either force everything through streaming or implement a
            //    non-streaming version of this as well
            const streaming = true;
            if (streaming) {
              const stream = new ReadableStream({
                start(controller) {
                  const reader = data.getReader();

                  function push() {
                    reader.read().then(({ done, value }) => {
                      if (done) {
                        controller.close();
                        return;
                      }
                      controller.enqueue(value);
                      push();
                    });
                  }

                  push();
                },
              });
              const updatedConversations =
                await handleNormalChatBackendStreaming(
                  stream,
                  controller,
                  updatedConversation,
                  selectedConversation,
                  conversations,
                );

              homeDispatch({
                field: 'conversations',
                value: updatedConversations,
              });
              saveConversations(updatedConversations);
              homeDispatch({ field: 'messageIsStreaming', value: false });
            } else {
              const reader = data.getReader();
              const updatedConversations =
                await handleNormalChatBackendStreaming(
                  data,
                  controller,
                  updatedConversation,
                  selectedConversation,
                  conversations,
                );

              homeDispatch({
                field: 'conversations',
                value: updatedConversations,
              });
              saveConversations(updatedConversations);
              homeDispatch({ field: 'messageIsStreaming', value: false });
            }
          } else {
            throw new Error('Plugins not currently supported.');
          }
        } catch (error: unknown) {
          homeDispatch({ field: 'loading', value: false });
          homeDispatch({ field: 'messageIsStreaming', value: false });

          if (error instanceof Error) {
            if (error.message === 'Request timed out') {
              toast.error('Request timed out. Please try again.');
            } else {
              toast.error(`Error: ${error.message}`);
            }
          } else {
            toast.error('An unknown error occurred');
          }

          console.error('Error in handleSend:', error);
        }
      }
    },
    [
      apiKey,
      conversations,
      pluginKeys,
      selectedConversation,
      stopConversationRef,
    ],
  );

  const scrollToBottom = useCallback(() => {
    if (autoScrollEnabled) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      textareaRef.current?.focus();
    }
  }, [autoScrollEnabled]);

  useEffect(() => {
    if (autoScrollEnabled) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedConversation, autoScrollEnabled]);

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        chatContainerRef.current;
      const bottomTolerance = 35;

      if (scrollTop + clientHeight < scrollHeight - bottomTolerance) {
        setAutoScrollEnabled(false);
        setShowScrollDownButton(true);
      } else {
        setAutoScrollEnabled(true);
        setShowScrollDownButton(false);
      }
    }
  };

  const handleScrollDown = () => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  };

  const handleSettings = () => {
    setShowSettings(!showSettings);
  };

  const onClearAll = () => {
    if (
      confirm(
        // @ts-ignore
        t<string>('Are you sure you want to clear all messages?') as string,
      ) &&
      selectedConversation
    ) {
      handleUpdateConversation(selectedConversation, {
        key: 'messages',
        value: [],
      });
    }
  };

  const scrollDown = () => {
    if (autoScrollEnabled) {
      messagesEndRef.current?.scrollIntoView(true);
    }
  };
  const throttledScrollDown = throttle(scrollDown, 250);

  const handleClickOutside = (event: any) => {
    if (modalRef.current && !modalRef.current.contains(event.target)) {
      setShowSettings(false);
    }
  };

  useEffect(() => {
    throttledScrollDown();
    selectedConversation &&
      setCurrentMessage(
        selectedConversation.messages[selectedConversation.messages.length - 2],
      );
  }, [selectedConversation, throttledScrollDown]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setAutoScrollEnabled(entry.isIntersecting);
        if (entry.isIntersecting) {
          textareaRef.current?.focus();
        }
      },
      {
        root: null,
        threshold: 0.5,
      },
    );
    const messagesEndElement = messagesEndRef.current;
    if (messagesEndElement) {
      observer.observe(messagesEndElement);
    }
    return () => {
      if (messagesEndElement) {
        observer.unobserve(messagesEndElement);
      }
    };
  }, [messagesEndRef]);
  const showSplash =
    !(apiKey || serverSideApiKeyIsSet) && OPENAI_API_HOST_TYPE !== 'apim';

  const [image, setImage] = useState(false);
  const [runTypewriter, setRunTypewriter] = useState(false);

  useEffect(() => {
    if (!image) {
      if (runTypeWriterIntroSetting) {
        setRunTypewriter(true);
      } else {
        setImage(true);
      }
    } else {
      setRunTypewriter(false);
    }
  }, []);

  useEffect(() => {
    setRandomPrompts(getRandomPrompts(3));
  }, []);

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-[#212121]">
      {showSplash ? (
        <div className="mx-auto flex h-full flex-col justify-center space-y-6 sm:w-[600px]">
          <div className="text-center text-4xl font-bold text-black dark:text-white">
            {t('welcomeMessage')}
          </div>
          <div className="text-center text-lg text-black dark:text-white">
            <div className="mb-8">{`MSF AI Assistant is an open source clone of OpenAI's ChatGPT UI.`}</div>
            <div className="mb-2 font-bold">
              Important: MSF AI Assistant is 100% unaffiliated with OpenAI.
            </div>
          </div>
          <div className="text-center text-gray-500 dark:text-gray-400">
            <div className="mb-2">
              MSF AI Assistant allows you to plug in your API key to use this UI
              with their API.
            </div>
            <div className="mb-2">
              It is <span className="italic">only</span> used to communicate
              with their API.
            </div>
            <div className="mb-2">
              {t(
                'Please set your OpenAI API key in the bottom left of the sidebar.',
              )}
            </div>
            <div>
              {t("If you don't have an OpenAI API key, you can get one here: ")}
              <a
                href="https://platform.openai.com/account/api-keys"
                target="_blank"
                rel="noreferrer"
                className="text-blue-500 hover:underline"
              >
                openai.com
              </a>
            </div>
          </div>
        </div>
      ) : modelError ? (
        <ErrorMessageDiv error={modelError} />
      ) : (
        <>
          <div
            className="flex-1 overflow-auto"
            ref={chatContainerRef}
            onScroll={handleScroll}
          >
            {selectedConversation?.messages?.length === 0 ? (
              <>
                {models.length > 0 && !runTypewriter && (
                  <Transition
                    appear={true}
                    show={image}
                    enter="transition-opacity duration-1000"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="transition-opacity duration-300"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <div>
                      <div
                        className="fixed top-0 left-0 right-0 z-10 flex items-center justify-center relative border border-b-neutral-300 bg-neutral-100 py-2 px-4 text-sm text-neutral-500 dark:border-none dark:bg-[#2F2F2F] dark:text-neutral-200"
                      >
                        {/* Center Content */}
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center">
                          {botInfo && (
                            <>
                              <span className="font-semibold" style={{color: botInfo.color}}>
                                {botInfo.name} Bot
                              </span>
                              <span className="mx-2 text-white dark:text-white">|</span>
                            </>
                          )}
                          <span>
                            {t('Model')}: {selectedConversation?.model?.name}
                          </span>
                        </div>

                        {/* Settings Button */}
                        <button
                            className="ml-2 cursor-pointer hover:opacity-50"
                            onClick={handleSettings}
                        >
                          <IconSettings
                            size={18}
                            className={`${
                                showSettings ? 'text-[#D7211E]' : 'text-black dark:text-white'
                            }`}
                          />
                        </button>
                      </div>

                        {/* Right-Side Content */}
                        <div className="absolute right-0 flex items-center pr-4">
                          <a
                            href={`mailto:${email}`}
                            className="flex items-center text-black/50 dark:text-white/50 text-[12px]"
                          >
                            <IconExternalLink
                              size={16}
                              className="mr-1 text-black dark:text-white/50"
                            />
                            {t('sendFeedback')}
                          </a>
                        </div>
                      </div>

                      {showSettings && (
                        <Transition
                          appear={true}
                          show={showSettings}
                          enter="transition-opacity duration-500"
                          enterFrom="opacity-0"
                          enterTo="opacity-100"
                          leave="transition-opacity duration-300"
                          leaveFrom="opacity-100"
                          leaveTo="opacity-0"
                        >
                          <div
                            className="fixed inset-0 z-50 flex items-center justify-center"
                            onClick={handleClickOutside}
                          >
                            <div className="fixed inset-0 bg-black opacity-50"/>
                            <div
                              ref={modalRef}
                              className="relative p-6 bg-white dark:bg-[#212121] rounded-lg shadow-lg z-10 max-w-lg"
                            >
                              <div className="flex justify-between items-center mb-5 text-black dark:text-white">
                                {t('modelSelectionDialogue')}
                                <ModelSelect />
                              </div>
                              <div className="text-black dark:text-white">{t('Temperature')}</div>
                              <TemperatureSlider
                                temperature={selectedConversation.temperature}
                                onChangeTemperature={(temperature) =>
                                  handleUpdateConversation(selectedConversation, {
                                      key: 'temperature',
                                      value: temperature,
                                    })
                                }
                              />
                            </div>
                          </div>
                        </Transition>
                      )}
                    </div>
                  </Transition>
                )}
                <div className="flex h-[88%] items-center justify-center">
                  <div className="mx-auto flex flex-col px-3">
                    <div className="text-center text-3xl font-thin text-gray-800 dark:text-gray-100">
                      {models.length === 0 ? (
                        <div>
                          <Spinner size="16px" className="mx-auto"/>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <div className="flex flex-row justify-center items-end">
                            {runTypewriter && (
                              <Typewriter
                                options={{
                                  loop: false,
                                  cursor: '',
                                  delay: 50,
                                  deleteSpeed: 1,
                                }}
                                onInit={(typewriter) => {
                                  typewriter
                                    .typeString(t('appName'))
                                    .pauseFor(1200)
                                    .deleteAll()
                                    .callFunction(() => {
                                      setImage(true);
                                      setRunTypewriter(false);
                                    })
                                    .start();
                                }}
                              />
                            )}
                            {image && !showSettings && (
                              <Transition
                                appear={true}
                                show={image}
                                enter="transition-opacity duration-1000"
                                enterFrom="opacity-0"
                                enterTo="opacity-100"
                              leave="transition-opacity duration-300"
                              leaveFrom="opacity-100"
                                leaveTo="opacity-0"
                              >
                                <div className="flex-shrink-0 flex flex-col items-center">
                                  <div className="ml-2 group relative flex flex-row">
                                    <Image
                                      src={logo}
                                      alt="MSF Logo"
                                      style={{
                                        maxWidth: '75px',
                                        maxHeight: '75px',
                                      }}
                                    />
                                    <IconInfoCircle
                                      size={20}
                                      className="text-black dark:text-white"
                                    />
                                    <span className="tooltip absolute bg-gray-700 text-white text-center py-2 px-3 w-[255px] rounded-lg text-sm bottom-full left-1/2 transform -translate-x-1/2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-300">
                                      Type question below to get started.
                                      <br />
                                      <br />
                                      Individual chat settings can be modified
                                      with top banner gear icon.
                                      <br />
                                      <br />
                                      Default settings can be modified in bottom
                                      left settings menu.
                                    </span>
                                  </div>
                                </div>
                              </Transition>
                            )}
                          </div>
                          <div className="mt-8 flex justify-center w-full">
                            <div className="hidden sm:flex space-x-5">
                              {randomPrompts.map((prompt, index) => (
                                <button
                                  key={index}
                                  className="bg-transparent text-black dark:text-white border border-[#E0E0E0] dark:border-[#444444] rounded-md px-2 py-1 text-sm hover:bg-[#F9F9F9] dark:hover:bg-[#2F2F2F] dark:hover:text-white transition"
                                  onClick={() =>
                                    handleSend({
                                      role: 'user',
                                      content: prompt.prompt,
                                      messageType: 'text',
                                    })
                                  }
                                  style={{
                                    width: '200px',
                                    height: '100px',
                                    textAlign: 'start',
                                    whiteSpace: 'normal',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'start',
                                    justifyContent: 'center',
                                    padding: '30px',
                                  }}
                                >
                                  {prompt.icon && (
                                    <div className="flex flex-col items-start">
                                      <prompt.icon className="h-5 w-5 mb-2" />
                                      <div>
                                        <span>{prompt.title}</span>
                                      </div>
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="sticky top-0 z-10 flex justify-center border border-b-neutral-300 bg-neutral-100 py-2 text-sm text-neutral-500 dark:border-none dark:bg-[#2F2F2F] dark:text-neutral-200">
                  <div className="flex items-center">
                    {botInfo && (
                      <>
                        <span
                          className="font-semibold"
                          style={{ color: botInfo.color }}
                        >
                          {botInfo.name} Bot
                        </span>
                        <span className="mx-2 text-white dark:text-white">
                          |
                        </span>
                      </>
                    )}
                    <span>
                      {t('Model')}: {selectedConversation?.model?.name}
                    </span>
                  </div>
                  <button
                    className="ml-2 cursor-pointer hover:opacity-50"
                    onClick={handleSettings}
                  >
                    <IconSettings
                      size={18}
                      className={`${
                        showSettings
                          ? 'text-[#D7211E]'
                          : 'text-black dark:text-white'
                      }`}
                    />
                  </button>
                  <button
                    className="ml-2 cursor-pointer hover:opacity-50"
                    onClick={onClearAll}
                  >
                    <IconClearAll
                      size={18}
                      className="text-black dark:text-white"
                    />
                  </button>
                  <div className="absolute right-0">
                    <a
                      href={`mailto:${email}`}
                      className="flex flex-row mr-2 text-black/50 dark:text-white/50 text-[12px]"
                    >
                      <IconExternalLink
                        size={16}
                        className={'mr-1 text-black dark:text-white/50'}
                      />
                      {t('sendFeedback')}
                    </a>
                  </div>
                </div>
                {showSettings && (
                  <Transition
                    appear={true}
                    show={showSettings}
                    enter="transition-opacity duration-500"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="transition-opacity duration-300"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <div
                      className="fixed inset-0 z-50 flex items-center justify-center"
                      onClick={handleClickOutside}
                    >
                      <div className="fixed inset-0 bg-black opacity-50" />
                      <div
                        ref={modalRef}
                        className="relative p-6 bg-white dark:bg-[#212121] rounded-lg shadow-lg z-10 max-w-lg"
                      >
                        <div className="flex justify-between items-center mb-5 text-black dark:text-white">
                          {t('AI Model Selection:')}
                          <ModelSelect />
                        </div>
                        <div className="text-black dark:text-white">
                          {selectedConversation ? t('Temperature') : ''}
                        </div>
                        {selectedConversation ? (
                          <TemperatureSlider
                            temperature={selectedConversation?.temperature}
                            onChangeTemperature={(temperature) =>
                              handleUpdateConversation(selectedConversation, {
                                key: 'temperature',
                                value: temperature,
                              })
                            }
                          />
                        ) : (
                          <></>
                        )}
                      </div>
                    </div>
                  </Transition>
                )}

                {selectedConversation?.messages.map((message, index) => (
                  <MemoizedChatMessage
                    key={`conversation-message-${index}`}
                    message={message}
                    messageIndex={index}
                    onEdit={(editedMessage) => {
                      setCurrentMessage(editedMessage);
                      // discard edited message and the ones that come after then resend
                      handleSend(
                        editedMessage,
                        selectedConversation?.messages.length - index,
                      );
                    }}
                  />
                ))}

                {loading && (
                  <ChatLoader
                    requestStatusMessage={requestStatusMessage}
                    progress={progress}
                  />
                )}

                <div
                  className="h-[2px] bg-white dark:bg-[#212121]"
                  ref={messagesEndRef}
                />
              </>
            )}
          </div>

          <ChatInput
            stopConversationRef={stopConversationRef}
            textareaRef={textareaRef}
            onSend={(message, plugin) => {
              setCurrentMessage(message);
              handleSend(message, 0, plugin);
            }}
            onScrollDownClick={handleScrollDown}
            onRegenerate={() => {
              if (currentMessage) {
                handleSend(currentMessage, 2, null);
              }
            }}
            showScrollDownButton={showScrollDownButton}
            setFilePreviews={setFilePreviews}
            filePreviews={filePreviews}
          />
        </>
      )}
    </div>
  );
});
Chat.displayName = 'Chat';
