import { Transition } from '@headlessui/react';
import { IconInfoCircle, IconSettings } from '@tabler/icons-react';
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
import { createAgenticFrontendService, AgenticChatResult } from '@/services/agenticFrontendService';

import { extractCitationsFromContent } from '@/utils/app/citation';
import { OPENAI_API_HOST_TYPE } from '@/utils/app/const';
import {
  generateTitleFromAPI,
  saveConversation,
  saveConversations,
  setConversationTitle,
} from '@/utils/app/conversation';
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
import { Citation } from '@/types/rag';

import HomeContext from '@/pages/api/home/home.context';

import lightTextLogo from '../../public/international_logo_black.png';
import darkTextLogo from '../../public/international_logo_white.png';
import { TemperatureSlider } from '../Settings/Temperature';
import Spinner from '../Spinner';
import { ChatInput } from './ChatInput';
import { ChatLoader } from './ChatLoader';
import { ChatTopbar } from './ChatTopbar';
import { ErrorMessageDiv } from './ErrorMessageDiv';
import { MemoizedChatMessage } from './MemoizedChatMessage';
import { ModelSelect } from './ModelSelect';
import { suggestedPrompts } from './prompts';

import { debounce } from '@tanstack/virtual-core';

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
      user,
      lightMode,
      agentSettings,
      agentRoutingEnabled,
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
  const [requestStatusSecondLine, setRequestStatusSecondLine] = useState<
    string | null
  >(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [currentAgentResult, setCurrentAgentResult] = useState<AgenticChatResult | null>(null);

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

  /**
   * Determine if we should use agentic routing for this message
   */
  const shouldUseAgenticRouting = useCallback((message: Message): boolean => {
    // Check if agentic routing is enabled globally
    if (!agentRoutingEnabled || !agentSettings.enabled) {
      return false;
    }

    // Check if user has any agents enabled
    if (agentSettings.enabledAgentTypes.length === 0) {
      return false;
    }

    // Skip agentic routing for complex content (files, images)
    if (Array.isArray(message.content) && message.content.length > 1) {
      return false;
    }

    // Skip if there's already a bot selected (RAG/specialized bots)
    if (selectedConversation?.bot) {
      return false;
    }

    return true;
  }, [agentRoutingEnabled, agentSettings, selectedConversation]);

  useEffect(() => {
    updateBotInfo();
  }, [selectedConversation, updateBotInfo]);

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
    let extractedCitations: Citation[] = [];
    let processedEnhancedResponse = false;

    const checkStopInterval = setInterval(() => {
      if (stopConversationRef.current) {
        console.log('Stop detected in handleNormalChatBackendStreaming');
        done = true;
        clearInterval(checkStopInterval);
      }
    }, 100);

    while (!done) {
      // Check if a stop was requested before reading more data
      if (stopConversationRef.current) {
        console.log('Stop detected in streaming loop - breaking');
        break;
      }

      try {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;

        if (stopConversationRef.current) {
          break;
        }

        if (value) {
          const chunkValue = decoder.decode(value);
          
          // Check if this is a complete JSON response from enhanced service
          let isEnhancedResponse = false;
          let enhancedData = null;
          
          // Try to parse the chunk as JSON (enhanced service response)
          try {
            enhancedData = JSON.parse(chunkValue);
            if (enhancedData && enhancedData.success && enhancedData.data && enhancedData.data.text) {
              isEnhancedResponse = true;
              processedEnhancedResponse = true;
              // Extract the text content from the enhanced response
              text = enhancedData.data.text;
              
              // Handle enhanced sources if available
              if (enhancedData.data.sources && enhancedData.data.sources.length > 0) {
                extractedCitations = enhancedData.data.sources.map((source: any, index: number) => ({
                  id: `enhanced_${index}`,
                  title: source.title || source.name || `Source ${index + 1}`,
                  url: source.url || source.link || '',
                  text: source.snippet || source.content || source.text || '',
                  page_number: source.page || null,
                  source_type: source.type || 'web',
                }));
              }
              
              console.log('Enhanced service response detected:', {
                processingTime: enhancedData.data.processingTime,
                usedFallback: enhancedData.data.usedFallback,
                sourcesCount: enhancedData.data.sources?.length || 0,
              });
            }
          } catch (e) {
            // Not JSON, continue with standard streaming
            isEnhancedResponse = false;
          }

          if (!isEnhancedResponse) {
            // Standard streaming behavior - accumulate chunks
            text += chunkValue;
          }

          if (stopConversationRef.current) {
            break;
          }

          // Extract citations (skip if enhanced response already processed them)
          if (!isEnhancedResponse) {
            const {
              text: cleanedText,
              citations,
              extractionMethod,
            } = extractCitationsFromContent(text);

            if (citations.length > 0) {
              // Use the clean text and extracted citations
              text = cleanedText;
              extractedCitations = citations;
              console.log(
                `Extracted ${citations.length} citations using ${extractionMethod} format`,
              );
            }
          }

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
                  citations:
                    extractedCitations.length > 0
                      ? [...extractedCitations]
                      : [],
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
                citations:
                  extractedCitations.length > 0
                    ? [...extractedCitations]
                    : updatedConversationCopy.messages[
                        updatedConversationCopy.messages.length - 1
                      ].citations || [],
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
      } catch (error) {
        console.error('Error in stream processing:', error);
        clearInterval(checkStopInterval);
        break;
      }
    }

    clearInterval(checkStopInterval);

    // Final check for citations after stream completes (skip for enhanced responses)
    if (extractedCitations.length === 0 && !processedEnhancedResponse) {
      const {
        text: cleanedText,
        citations,
        extractionMethod,
      } = extractCitationsFromContent(text);

      if (citations.length > 0) {
        text = cleanedText;
        extractedCitations = citations;
        console.log(
          `Final extraction - ${citations.length} citations using ${extractionMethod} format`,
        );

        // If we found citations in the final check, update the conversation again
        const updatedMessages = [
          ...updatedConversationCopy.messages.slice(0, -1),
          {
            ...updatedConversationCopy.messages[
              updatedConversationCopy.messages.length - 1
            ],
            content: text,
            citations: [...extractedCitations],
          },
        ];
        updatedConversationCopy = {
          ...updatedConversationCopy,
          messages: updatedMessages,
        };

        // Update state one last time
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
    async (message: Message, deleteCount = 0, plugin: Plugin | null = null, forceStandardChat?: boolean) => {
      if (selectedConversation) {
        stopConversationRef.current = false;

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
          // Sets up a manual check for the stop button being pressed
          const abortCheckInterval = setInterval(() => {
            if (stopConversationRef.current) {
              console.log('Stop requested - updating UI state');
              homeDispatch({ field: 'loading', value: false });
              homeDispatch({ field: 'messageIsStreaming', value: false });
              setRequestStatusMessage(null);
              setRequestStatusSecondLine(null);
              stopConversationRef.current = false;
              clearInterval(abortCheckInterval);
            }
          }, 100);

          // Clean up interval after 60 seconds as a safety measure
          setTimeout(() => clearInterval(abortCheckInterval), 60000);

          // Determine if we should use agentic routing
          const useAgenticRouting = forceStandardChat ? false : shouldUseAgenticRouting(message);
          console.log('[Chat] Using agentic routing:', useAgenticRouting, '(forceStandardChat:', forceStandardChat, ')');

          let requestResult: any;
          
          if (useAgenticRouting) {
            // Use agentic frontend service
            const agenticService = createAgenticFrontendService({
              agentSettings,
              enableDebugLogging: true,
              intentAnalysisTimeout: 5000,
              agentExecutionTimeout: 30000,
            });

            requestResult = await agenticService.handleRequest(
              plugin,
              setRequestStatusMessage,
              updatedConversation,
              apiKey,
              pluginKeys,
              systemPrompt,
              temperature,
              true,
              setProgress,
              stopConversationRef,
              setRequestStatusSecondLine,
            );

            // Store agent result for potential UI indicators
            setCurrentAgentResult(requestResult);
          } else {
            // Use standard makeRequest
            requestResult = await makeRequest(
              plugin,
              setRequestStatusMessage,
              updatedConversation,
              apiKey,
              pluginKeys,
              systemPrompt,
              temperature,
              true,
              setProgress,
              stopConversationRef,
              forceStandardChat,
              agentSettings,
            );

            // Clear any previous agent results
            setCurrentAgentResult(null);
          }

          const { controller, body, response, hasComplexContent, setOnAbort } = requestResult;

          clearInterval(abortCheckInterval);

          // Set up the abort handler to reset UI state when the conversation is stopped
          setOnAbort?.(() => {
            homeDispatch({ field: 'loading', value: false });
            homeDispatch({ field: 'messageIsStreaming', value: false });
            setRequestStatusMessage(null);
            setRequestStatusSecondLine(null);
            stopConversationRef.current = false;
          });

          if (hasComplexContent) {
            // Handle complex content case
            console.log('Message contains complex content');
            // Add your logic here
          }

          if (!response.ok) {
            homeDispatch({ field: 'loading', value: false });
            homeDispatch({ field: 'messageIsStreaming', value: false });
            setRequestStatusMessage(null);
            setRequestStatusSecondLine(null);
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
            setRequestStatusMessage(null);
            setRequestStatusSecondLine(null);
            return;
          }
          if (!plugin) {
            // Set initial title based on first message
            if (updatedConversation.messages.length === 1) {
              // Use the utility function to set the initial title
              updatedConversation = await setConversationTitle(
                updatedConversation,
                message,
                user,
              );
            }
            homeDispatch({ field: 'loading', value: false });
            setRequestStatusMessage(null);
            setRequestStatusSecondLine(null);

            // TODO: Either force everything through streaming or implement a
            //    non-streaming version of this as well
            const streaming = true;
            if (streaming) {
              const stream = new ReadableStream({
                start(controller) {
                  const reader = data.getReader();

                  function push() {
                    // Check if stop was requested before reading more data
                    if (stopConversationRef.current) {
                      console.log(
                        'Stopping stream in ReadableStream - user requested stop',
                      );
                      controller.close();
                      return;
                    }

                    reader.read().then(({ done, value }: { done: boolean; value: Uint8Array }) => {
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
              let updatedConversations = await handleNormalChatBackendStreaming(
                stream,
                controller,
                updatedConversation,
                selectedConversation,
                conversations,
              );

              // Try to update the title using the API after we have a response
              const currentConversation = updatedConversations.find(
                (conv) => conv.id === selectedConversation.id,
              );

              if (currentConversation) {
                // Check if there's at least one response message
                const hasResponseMessage = currentConversation.messages.some(
                  (msg) => msg.role === 'assistant',
                );

                if (hasResponseMessage) {
                  // Try to generate a better title using the API
                  const generatedTitle = await generateTitleFromAPI(
                    currentConversation,
                    user,
                  );

                  if (generatedTitle) {
                    // Update the title in the conversation
                    const updatedWithTitle = {
                      ...currentConversation,
                      name: generatedTitle,
                    };

                    // Update the conversation in the list
                    updatedConversations = updatedConversations.map((conv) =>
                      conv.id === selectedConversation.id
                        ? updatedWithTitle
                        : conv,
                    );
                  }
                }
              }

              homeDispatch({
                field: 'conversations',
                value: updatedConversations,
              });
              saveConversations(updatedConversations);
              homeDispatch({ field: 'messageIsStreaming', value: false });
            } else {
              const reader = data.getReader();
              let updatedConversations = await handleNormalChatBackendStreaming(
                data,
                controller,
                updatedConversation,
                selectedConversation,
                conversations,
              );

              // Try to update the title using the API after we have a response
              const currentConversation = updatedConversations.find(
                (conv) => conv.id === selectedConversation.id,
              );

              if (currentConversation) {
                // Check if there's at least one response message
                const hasResponseMessage = currentConversation.messages.some(
                  (msg) => msg.role === 'assistant',
                );

                if (hasResponseMessage) {
                  // Try to generate a better title using the API
                  const generatedTitle = await generateTitleFromAPI(
                    currentConversation,
                    user,
                  );

                  if (generatedTitle) {
                    // Update the title in the conversation
                    const updatedWithTitle = {
                      ...currentConversation,
                      name: generatedTitle,
                    };

                    // Update the conversation in the list
                    updatedConversations = updatedConversations.map((conv) =>
                      conv.id === selectedConversation.id
                        ? updatedWithTitle
                        : conv,
                    );
                  }
                }
              }

              homeDispatch({
                field: 'conversations',
                value: updatedConversations,
              });
              saveConversations(updatedConversations);
              homeDispatch({ field: 'messageIsStreaming', value: false });
              setRequestStatusMessage(null);
              setRequestStatusSecondLine(null);
            }
          } else {
            throw new Error('Plugins not currently supported.');
          }
        } catch (error: unknown) {
          homeDispatch({ field: 'loading', value: false });
          homeDispatch({ field: 'messageIsStreaming', value: false });
          setRequestStatusMessage(null);
          setRequestStatusSecondLine(null);

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
      generateTitleFromAPI,
      setConversationTitle,
      handleNormalChatBackendStreaming,
      homeDispatch,
      pluginKeys,
      selectedConversation,
      systemPrompt,
      temperature,
      user,
      shouldUseAgenticRouting,
      agentSettings,
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

  const [image, setImage] = useState(true);

  useEffect(() => {
    setRandomPrompts(getRandomPrompts(3));
  }, []);

  return (
    <div className="flex flex-col h-full w-full overflow-x-hidden bg-white dark:bg-[#212121]">
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
                {models.length > 0 && (
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
                      {/* Topbar w/o content */}
                      <ChatTopbar
                        botInfo={botInfo}
                        selectedModelName={selectedConversation?.model?.name}
                        showSettings={showSettings}
                        onSettingsClick={handleSettings}
                        userEmail={user?.mail}
                      />

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
                            <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />
                            <div
                              ref={modalRef}
                              className="relative p-6 bg-white dark:bg-[#212121] rounded-lg shadow-lg z-10 max-w-lg"
                            >
                              <div className="flex justify-between items-center mb-5 text-black dark:text-white">
                                {t('modelSelectionDialogue')}
                                <ModelSelect />
                              </div>
                              <div className="text-black dark:text-white">
                                {t('Temperature')}
                              </div>
                              <TemperatureSlider
                                temperature={selectedConversation.temperature}
                                onChangeTemperature={(temperature) =>
                                  handleUpdateConversation(
                                    selectedConversation,
                                    {
                                      key: 'temperature',
                                      value: temperature,
                                    },
                                  )
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
                          <Spinner size="16px" className="mx-auto" />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <div className="flex flex-row justify-center items-end">
                            {!showSettings && (
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
                                      src={
                                        lightMode === 'light'
                                          ? lightTextLogo
                                          : darkTextLogo
                                      }
                                      alt="MSF Logo"
                                      style={{
                                        maxWidth: '150px',
                                        maxHeight: '150px',
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
                <ChatTopbar
                  botInfo={botInfo}
                  selectedModelName={selectedConversation?.model?.name}
                  showSettings={showSettings}
                  onSettingsClick={handleSettings}
                  onClearAll={onClearAll}
                  userEmail={user?.mail}
                  hasMessages={true}
                />
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
                      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />
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
                    requestStatusSecondLine={requestStatusSecondLine}
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
            onSend={(message, plugin, forceStandardChat) => {
              setCurrentMessage(message);
              handleSend(message, 0, plugin, forceStandardChat);
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
            setRequestStatusMessage={setRequestStatusMessage}
            setProgress={setProgress}
            apiKey={apiKey}
            pluginKeys={pluginKeys}
            systemPrompt={systemPrompt}
            temperature={temperature}
          />
        </>
      )}
    </div>
  );
});
Chat.displayName = 'Chat';
