import { IconClearAll, IconSettings } from '@tabler/icons-react';
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
import Typewriter from 'typewriter-effect';
import { Transition } from '@headlessui/react'
import {DEFAULT_SYSTEM_PROMPT} from '@/utils/app/const';

import { useTranslation } from 'next-i18next';

import { getEndpoint } from '@/utils/app/api';
import {
  saveConversation,
  saveConversations,
  updateConversation,
} from '@/utils/app/conversation';
import { throttle } from '@/utils/data/throttle';

import { ChatBody, Conversation, Message } from '@/types/chat';
import { Plugin } from '@/types/plugin';

import HomeContext from '@/pages/api/home/home.context';

import Spinner from '../Spinner';
import { ChatInput } from './ChatInput';
import { ChatLoader } from './ChatLoader';
import { ErrorMessageDiv } from './ErrorMessageDiv';
import { ModelSelect } from './ModelSelect';
import { MemoizedChatMessage } from './MemoizedChatMessage';
import {OPENAI_API_HOST_TYPE} from "@/utils/app/const";
import Image from 'next/image'
import logo from '../../public/msf_logo2.png'
import { type } from 'os';
import { SystemPrompt } from '../Settings/SystemPrompt';

interface Props {
  stopConversationRef: MutableRefObject<boolean>;
}

export const Chat = memo(({ stopConversationRef }: Props) => {
  const { t } = useTranslation('chat');

  const {
    state: {
      user,
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
      systemPrompt
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

  const [currentMessage, setCurrentMessage] = useState<Message>();
  const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showScrollDownButton, setShowScrollDownButton] =
    useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const updateConversationFromUserInput = (
      userMessage: Message,
      selectedConversation: Conversation,
      deleteCount: number | null
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

    return updatedConversation
  }


  const makeRequest = async (
      plugin: Plugin | null, updatedConversation: Conversation
  ) => {
    const chatBody: ChatBody = {
      model: updatedConversation.model,
      messages: updatedConversation.messages.slice(-6),
      key: apiKey,
      prompt: systemPrompt || DEFAULT_SYSTEM_PROMPT,
      temperature: temperature,
    };
    const endpoint = getEndpoint(plugin);
    let body;
    if (!plugin) {
      body = JSON.stringify(chatBody);
    } else {
      body = JSON.stringify({
        ...chatBody,
        googleAPIKey: pluginKeys
            .find((key) => key.pluginId === 'google-search')
            ?.requiredKeys.find((key) => key.key === 'GOOGLE_API_KEY')?.value,
        googleCSEId: pluginKeys
            .find((key) => key.pluginId === 'google-search')
            ?.requiredKeys.find((key) => key.key === 'GOOGLE_CSE_ID')?.value,
      });
    }
    const controller = new AbortController();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body,
    });

    return {
      controller,
      body,
      response
    }
  }

  const setConversationTitle = (updatedConversation: Conversation, message: Message) : Conversation  => {
    const {content} = message;
    const customName =
        content.length > 30 ? content.substring(0, 30) + '...' : content;
    updatedConversation = {
      ...updatedConversation,
      name: customName,
    };

    return updatedConversation;
  }

  const handleGoogleResponse = async (
      response: Response, updatedConversation: Conversation,
      selectedConversation: Conversation,
      conversations: Conversation[] = []
  ) => {
    let content;

    const {answer} = await response.json();
    content = answer;
    const updatedMessages: Message[] = [
      ...updatedConversation.messages,
      { role: 'assistant', content: content },
    ];
    updatedConversation = {
      ...updatedConversation,
      messages: updatedMessages,
    };
    homeDispatch({
      field: 'selectedConversation',
      value: updatedConversation,
    });
    saveConversation(updatedConversation);
    const updatedConversations: Conversation[] = conversations.map(
        (conversation) => {
          if (conversation.id === selectedConversation.id) {
            return updatedConversation;
          }
          return conversation;
        },
    );
    if (updatedConversations.length === 0) {
      updatedConversations.push(updatedConversation);
    }

    return updatedConversations
  }

  const handleNormalChatBackendStreaming = async (
      data: any,
      controller: AbortController,
      updatedConversation: Conversation,
      selectedConversation: Conversation,
      originalConversations: Conversation[]
  ) => {
    const reader = data.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let isFirst = true;
    let text = '';
    let updatedConversationCopy = { ...updatedConversation };
    let conversationsCopy = originalConversations.slice();

    const readerChunks = async function* () {
      let doneInt = 0
      while (true) {
        const { value, done } = await reader.read();
        yield value;

        // For whatever reason when done is set to true, there's still a chunk left
        //   This might be some Azure things, so maybe this breaks the openai direct
        //   streaming. Needs to be revisited
        if (done)
          doneInt = 1;

        if (doneInt === 1) break;
      }
    };

    for await (let value of readerChunks()) {
      if (stopConversationRef.current) {
        controller.abort();
        break;
      }
      const chunkValue = decoder.decode(value);
      text += chunkValue;
      if (isFirst) {
        isFirst = false;
        const updatedMessages: Message[] = [
          ...updatedConversationCopy.messages,
          { role: 'assistant', content: chunkValue },
        ];
        updatedConversationCopy = {
          ...updatedConversationCopy,
          messages: updatedMessages,
        };
        homeDispatch({
          field: 'selectedConversation',
          value: updatedConversationCopy,
        });
      } else {
        const updatedMessages: Message[] =
            updatedConversationCopy.messages.map((message, index) => {
              if (index === updatedConversationCopy.messages.length - 1) {
                return {
                  ...message,
                  content: text,
                };
              }
              return message;
            });
        updatedConversationCopy = {
          ...updatedConversationCopy,
          messages: updatedMessages,
        };
        homeDispatch({
          field: 'selectedConversation',
          value: updatedConversationCopy,
        });
      }
    }

    saveConversation(updatedConversationCopy);

    const updatedConversations : Conversation[] = conversations.map(
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
  }

  const handleSend = useCallback(
    async (message: Message, deleteCount = 0, plugin: Plugin | null = null) => {
      if (selectedConversation) {
        let updatedConversation: Conversation = updateConversationFromUserInput(
            message,
            selectedConversation,
            deleteCount
        );
        homeDispatch({
          field: 'selectedConversation',
          value: updatedConversation,
        });
        homeDispatch({ field: 'loading', value: true });
        homeDispatch({ field: 'messageIsStreaming', value: true });

        const {controller, body, response} = await makeRequest(plugin, updatedConversation);

        if (!response.ok) {
          homeDispatch({ field: 'loading', value: false });
          homeDispatch({ field: 'messageIsStreaming', value: false });
          toast.error(response.statusText);
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
            updatedConversation = setConversationTitle(updatedConversation, message);
          }
          homeDispatch({field: 'loading', value: false});

          // TODO: Either force everything through streaming or implement a
          //    non-streaming version of this as well
          const streaming = true;
          if (streaming) {
            const updatedConversations = await handleNormalChatBackendStreaming(
                data,
                controller,
                updatedConversation,
                selectedConversation,
                conversations
            );

            homeDispatch({field: 'conversations', value: updatedConversations});
            saveConversations(updatedConversations);
            homeDispatch({field: 'messageIsStreaming', value: false});
          } else {
            const reader = data.getReader()
            // const data = await response;
            // const body = await data.body;
            // const {answer} = data;
            const updatedConversations = await handleNormalChatBackendStreaming(
                data,
                controller,
                updatedConversation,
                selectedConversation,
                conversations
            );

            homeDispatch({field: 'conversations', value: updatedConversations});
            saveConversations(updatedConversations);
            homeDispatch({field: 'messageIsStreaming', value: false});


          }
        } else {
          if (updatedConversation.messages.length === 1) {
            updatedConversation = setConversationTitle(updatedConversation, message);
          }

          const updatedConversations = await handleGoogleResponse(
                response,
                updatedConversation,
                selectedConversation,
                conversations
          );
          homeDispatch({ field: 'conversations', value: updatedConversations });
          saveConversations(updatedConversations);
          homeDispatch({ field: 'loading', value: false });
          homeDispatch({ field: 'messageIsStreaming', value: false });
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

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        chatContainerRef.current;
      const bottomTolerance = 30;

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
      confirm(t<string>('Are you sure you want to clear all messages?')) &&
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

  // useEffect(() => {
  //   console.log('currentMessage', currentMessage);
  //   if (currentMessage) {
  //     handleSend(currentMessage);
  //     homeDispatch({ field: 'currentMessage', value: undefined });
  //   }
  // }, [currentMessage]);

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
  const showSplash = !(apiKey || serverSideApiKeyIsSet) && OPENAI_API_HOST_TYPE !== 'apim'

  const [image, setImage] = useState(false)
  const [runTypewriter, setRunTypewriter] = useState(false)

  useEffect(() => {
    if (!image) {
      console.log(image)
      setRunTypewriter(true);
    } else {
      console.log(image)
      setRunTypewriter(false)
    }
  }, []);

  return (
    <div className="relative flex-1 overflow-hidden bg-white dark:bg-[#212121]">
      {(showSplash) ? (
        <div className="mx-auto flex h-full w-[300px] flex-col justify-center space-y-6 sm:w-[600px]">
          <div className="text-center text-4xl font-bold text-black dark:text-white">
            Welcome to the MSF AI Assistant
          </div>
          <div className="text-center text-lg text-black dark:text-white">
            <div className="mb-8">{`MSF AI Assistant is an open source clone of OpenAI's ChatGPT UI.`}</div>
            <div className="mb-2 font-bold">
              Important: MSF AI Assistant is 100% unaffiliated with OpenAI.
            </div>
          </div>
          <div className="text-center text-gray-500 dark:text-gray-400">
            <div className="mb-2">
              MSF AI Assistant allows you to plug in your API key to use this UI with
              their API.
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
            className="max-h-full overflow-x-hidden"
            ref={chatContainerRef}
            onScroll={handleScroll}
          >
            {selectedConversation?.messages?.length === 0 ? (
              <>
              <div className="flex items-center justify-center h-screen">
                <div className="mx-auto flex flex-col space-y-5 md:space-y-10 px-3 pt-5 md:pt-12 sm:max-w-[600px]">
                  <div className="text-center text-3xl font-thin text-gray-800 dark:text-gray-100">
                    {models.length === 0 ? (
                      <div>
                        <Spinner size="16px" className="mx-auto" />
                      </div>
                    ) : (
                      <div className='flex flex-col items-center'>
                        <div className='flex flex-row justify-center items-end'>
                          {runTypewriter && (
                            <Typewriter
                              options={{
                                loop: false,
                                cursor: '',
                                delay: 50,
                                deleteSpeed: 1,
                              }}
                              onInit={(typewriter) => {
                                typewriter.typeString('MSF AI Assistant')
                                  .pauseFor(1200)
                                  .deleteAll()
                                  .callFunction(() => {
                                    setImage(true)
                                    setRunTypewriter(false)
                                  })
                                  .start();
                              }}
                            />
                          )}
                          {image && (
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
                          <div className='flex-shrink-0 my-1 flex flex-col items-center'>
                            <Image src={logo} alt="MSF Logo" style={{ maxWidth: '75px', maxHeight: '75px' }} />
                            <p className='text-xs text-gray-600 dark:text-gray-400 mt-4'>Type question below to get started</p>
                            {models.length > 0 && (
                            <div className='text-base'>
                              <ModelSelect />
                            </div>
                          )}
                          </div>
                          </Transition>
                          )}
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
                  {t('Model')}: {selectedConversation?.model?.name} | {t('Temp')}
                  : {temperature} |
                  <button
                    className="ml-2 cursor-pointer hover:opacity-50"
                    onClick={handleSettings}
                  >
                    <IconSettings size={18} className='text-black dark:text-white'/>
                  </button>
                  <button
                    className="ml-2 cursor-pointer hover:opacity-50"
                    onClick={onClearAll}
                  >
                    <IconClearAll size={18} className='text-black dark:text-white'/>
                  </button>
                </div>
                {showSettings && (
                  <div className="flex flex-col space-y-10 md:mx-auto md:max-w-xl md:gap-6 md:py-3 md:pt-6 lg:max-w-2xl lg:px-0 xl:max-w-3xl">
                    <div className="flex h-full flex-col space-y-4 md:rounded-lg">
                      <ModelSelect />
                    </div>
                  </div>
                )}

                {selectedConversation?.messages.map((message, index) => (
                  <MemoizedChatMessage
                    key={index}
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

                {loading && <ChatLoader />}

                <div
                  className="h-[162px] bg-white dark:bg-[#212121]"
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
          />
        </>
      )}
    </div>
  );
});
Chat.displayName = 'Chat';
