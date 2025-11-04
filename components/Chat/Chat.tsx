'use client';

import { IconX } from '@tabler/icons-react';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useChat } from '@/client/hooks/chat/useChat';
import { useConversations } from '@/client/hooks/conversation/useConversations';
import { useSettings } from '@/client/hooks/settings/useSettings';
import { useAutoDismissError } from '@/client/hooks/ui/useAutoDismissError';
import { useModalState } from '@/client/hooks/ui/useModalSync';
import { useUI } from '@/client/hooks/ui/useUI';

import {
  canInitializeConversation,
  createDefaultConversation,
  shouldCreateDefaultConversation,
} from '@/lib/utils/app/conversationInit';
import {
  scrollToBottom,
  shouldShowScrollButton,
} from '@/lib/utils/app/scrolling';

import { AgentType } from '@/types/agent';
import { Message } from '@/types/chat';
import { OpenAIModelID, OpenAIModels } from '@/types/openai';
import { SearchMode } from '@/types/searchMode';

import { PromptModal } from '@/components/Prompts/PromptModal';

import { ChatInput } from './ChatInput';
import { ChatTopbar } from './ChatTopbar';
import { EmptyState } from './EmptyState/EmptyState';
import { SuggestedPrompts } from './EmptyState/SuggestedPrompts';
import { LoadingScreen } from './LoadingScreen';
import { MemoizedChatMessage } from './MemoizedChatMessage';
import { ModelSelect } from './ModelSelect';

import { useConversationStore } from '@/client/stores/conversationStore';

interface ChatProps {
  mobileModelSelectOpen?: boolean;
  onMobileModelSelectChange?: (open: boolean) => void;
}

/**
 * Main chat component
 */
export function Chat({
  mobileModelSelectOpen,
  onMobileModelSelectChange,
}: ChatProps = {}) {
  const t = useTranslations();
  const { data: session, status } = useSession();
  const {
    selectedConversation,
    updateConversation,
    conversations,
    addConversation,
    selectConversation,
    isLoaded,
  } = useConversations();
  const {
    isStreaming,
    streamingContent,
    streamingConversationId,
    error,
    sendMessage,
    citations,
    clearError,
    loadingMessage,
  } = useChat();
  const { isSettingsOpen, setIsSettingsOpen, toggleChatbar, showChatbar } =
    useUI();
  const { models, defaultModelId, systemPrompt, temperature, addPrompt } =
    useSettings();

  const [showScrollDownButton, setShowScrollDownButton] = useState(false);
  const [transcriptionStatus, setTranscriptionStatus] = useState<string | null>(
    null,
  );
  const [isSavePromptModalOpen, setIsSavePromptModalOpen] = useState(false);
  const [savePromptContent, setSavePromptContent] = useState('');
  const [savePromptName, setSavePromptName] = useState('');
  const [savePromptDescription, setSavePromptDescription] = useState('');
  const hasInitializedRef = useRef(false);
  const previousMessageCountRef = useRef<number>(0);
  const wasStreamingRef = useRef(false);
  const scrollPositionBeforeStreamEndRef = useRef<number | null>(null);

  const [isModelSelectOpen, setIsModelSelectOpen] = useModalState(
    mobileModelSelectOpen,
    false,
    onMobileModelSelectChange,
  );

  // Close modal on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModelSelectOpen) {
        setIsModelSelectOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModelSelectOpen]);

  useAutoDismissError(error, clearError, 10000);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stopConversationRef = useRef<boolean>(false);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const isInitialRenderRef = useRef(true);

  // Create default conversation if none exists
  useEffect(() => {
    // Only run initialization once
    if (hasInitializedRef.current) return;

    if (!canInitializeConversation(isLoaded, models.length > 0)) return;

    hasInitializedRef.current = true;

    if (shouldCreateDefaultConversation(conversations)) {
      const newConversation = createDefaultConversation(
        models,
        defaultModelId,
        systemPrompt || '',
        temperature || 0.5,
      );
      addConversation(newConversation);
    } else if (!selectedConversation) {
      // If conversations exist but none is selected, select the first one
      selectConversation(conversations[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, models.length]);

  // Reset scroll state when conversation changes
  useEffect(() => {
    isInitialRenderRef.current = true;
    previousMessageCountRef.current = 0;
    wasStreamingRef.current = false;
    scrollPositionBeforeStreamEndRef.current = null;
  }, [selectedConversation?.id]);

  // Capture scroll position when streaming ends
  useEffect(() => {
    if (!isStreaming && wasStreamingRef.current && chatContainerRef.current) {
      // Streaming just ended - capture current scroll position
      scrollPositionBeforeStreamEndRef.current =
        chatContainerRef.current.scrollTop;
      console.log(
        '[Scroll] Captured scroll position at stream end:',
        scrollPositionBeforeStreamEndRef.current,
      );
    }
  }, [isStreaming]);

  // Smooth scroll to bottom on new messages (but not when streaming just finished)
  useEffect(() => {
    const messages = selectedConversation?.messages || [];
    const currentMessageCount = messages.length;
    const previousCount = previousMessageCountRef.current;

    // Detect if streaming just completed (was true last render, false now)
    const streamingJustCompleted =
      wasStreamingRef.current === true && !isStreaming;

    // Only scroll to bottom when:
    // 1. Messages are added
    // 2. We're not currently streaming
    // 3. Streaming didn't just complete (to prevent scroll jump when message is saved)
    if (
      currentMessageCount > previousCount &&
      !isStreaming &&
      !streamingJustCompleted &&
      chatContainerRef.current
    ) {
      console.log('[Scroll] Auto-scrolling to bottom for new message');
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTo({
            top: chatContainerRef.current.scrollHeight,
            behavior: 'smooth',
          });
        }
      }, 0);
    } else if (
      streamingJustCompleted &&
      scrollPositionBeforeStreamEndRef.current !== null
    ) {
      // Restore the exact scroll position from before streaming ended
      console.log(
        '[Scroll] Restoring scroll position after streaming:',
        scrollPositionBeforeStreamEndRef.current,
      );
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop =
          scrollPositionBeforeStreamEndRef.current;
      }
      scrollPositionBeforeStreamEndRef.current = null;
    }

    // Update refs AFTER checking
    previousMessageCountRef.current = currentMessageCount;
    wasStreamingRef.current = isStreaming;
    isInitialRenderRef.current = false;
  }, [selectedConversation?.messages, isStreaming]);

  // Track if we should auto-scroll during streaming
  const shouldAutoScrollRef = useRef(true);

  // When streaming starts, assume we want to follow it
  useEffect(() => {
    if (isStreaming) {
      shouldAutoScrollRef.current = true;
    }
  }, [isStreaming]);

  // Detect manual scroll during streaming
  useEffect(() => {
    const handleScrollDuringStream = () => {
      if (isStreaming && chatContainerRef.current) {
        const container = chatContainerRef.current;
        const distanceFromBottom =
          container.scrollHeight - container.scrollTop - container.clientHeight;

        // If user manually scrolls up more than 200px, stop auto-scrolling and show button
        if (distanceFromBottom > 200) {
          shouldAutoScrollRef.current = false;
          setShowScrollDownButton(true);
          console.log(
            '[Scroll] User scrolled away during streaming, stopping auto-scroll',
          );
        }
      }
    };

    const container = chatContainerRef.current;
    if (container) {
      container.addEventListener('wheel', handleScrollDuringStream, {
        passive: true,
      });
      container.addEventListener('touchmove', handleScrollDuringStream, {
        passive: true,
      });
      return () => {
        container.removeEventListener('wheel', handleScrollDuringStream);
        container.removeEventListener('touchmove', handleScrollDuringStream);
      };
    }
  }, [isStreaming]);

  // Smooth auto-scroll during streaming - runs continuously
  useEffect(() => {
    if (!isStreaming || !shouldAutoScrollRef.current) {
      return;
    }

    let animationFrameId: number;

    const smoothScroll = () => {
      const container = chatContainerRef.current;
      if (!container || !shouldAutoScrollRef.current || !isStreaming) return;

      const targetScroll = container.scrollHeight - container.clientHeight;
      const currentScroll = container.scrollTop;
      const diff = targetScroll - currentScroll;

      // Smooth scroll with easing - always keep animating while streaming
      if (Math.abs(diff) > 0.5) {
        container.scrollTop = currentScroll + diff * 0.2; // Slightly faster ease
      } else {
        container.scrollTop = targetScroll;
      }

      // Keep animation loop running while streaming
      animationFrameId = requestAnimationFrame(smoothScroll);
    };

    animationFrameId = requestAnimationFrame(smoothScroll);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isStreaming]); // Only depend on isStreaming, not content

  // Handle scroll detection for scroll-down button
  useEffect(() => {
    const handleScroll = () => {
      const container = chatContainerRef.current;
      if (!container) return;

      const isAtBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        100;

      // Show button if not at bottom and there's content
      const hasContent =
        (selectedConversation?.messages?.length || 0) > 0 || !!streamingContent;
      setShowScrollDownButton(!isAtBottom && hasContent);
    };

    const container = chatContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      // Don't check initial state immediately - let scroll events handle it
      // This prevents the button from flashing when new messages are added
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [selectedConversation?.messages, streamingContent]);

  const handleClearAll = () => {
    const state = useConversationStore.getState();
    const currentConversation = state.conversations.find(
      (c) => c.id === state.selectedConversationId,
    );

    if (
      currentConversation &&
      window.confirm('Are you sure you want to clear this conversation?')
    ) {
      updateConversation(currentConversation.id, {
        messages: [],
      });
    }
  };

  const handleOpenSavePromptModal = (content: string) => {
    setSavePromptContent(content);
    const timestamp = new Date().toLocaleString();
    setSavePromptName(`Saved prompt - ${timestamp}`);
    setSavePromptDescription('Saved from message');
    setIsSavePromptModalOpen(true);
  };

  const handleSavePrompt = (
    name: string,
    description: string,
    content: string,
  ) => {
    const defaultModel =
      models.find((m) => m.id === defaultModelId) || models[0];

    const newPrompt = {
      id: `prompt-${Date.now()}`,
      name: name || 'Untitled prompt',
      description: description,
      content: content,
      model: defaultModel,
      folderId: null,
    };

    addPrompt(newPrompt);
    setIsSavePromptModalOpen(false);

    // Reset fields
    setSavePromptName('');
    setSavePromptDescription('');
    setSavePromptContent('');
  };

  const handleEditMessage = (editedMessage: Message) => {
    const state = useConversationStore.getState();
    const currentConversation = state.conversations.find(
      (c) => c.id === state.selectedConversationId,
    );

    if (!currentConversation) return;

    const updatedMessages = currentConversation.messages.map((msg, idx) =>
      idx === currentConversation.messages.indexOf(editedMessage)
        ? editedMessage
        : msg,
    );

    updateConversation(currentConversation.id, {
      messages: updatedMessages,
    });
  };

  const handleSend = useCallback(
    (message: Message, searchMode?: SearchMode) => {
      // Get the latest conversation state at send time to avoid stale closures
      const state = useConversationStore.getState();
      const currentConversation = state.conversations.find(
        (c) => c.id === state.selectedConversationId,
      );

      if (!currentConversation) return;

      // Add user message to conversation
      const updatedMessages = [...currentConversation.messages, message];

      // Update just the messages field
      updateConversation(currentConversation.id, { messages: updatedMessages });

      // Send to API with updated conversation (includes user message and latest model)
      const updatedConversation = {
        ...currentConversation,
        messages: updatedMessages,
      };
      sendMessage?.(message, updatedConversation, searchMode);
    },
    [updateConversation, sendMessage],
  );

  const handleSelectPrompt = useCallback(
    (prompt: string) => {
      handleSend({
        role: 'user',
        content: prompt,
        messageType: 'text',
      });
    },
    [handleSend],
  );

  const handleScrollDown = () => {
    scrollToBottom(messagesEndRef, 'smooth');
  };

  const handleRegenerate = () => {
    // Get the latest conversation state to avoid stale closures
    const state = useConversationStore.getState();
    const currentConversation = state.conversations.find(
      (c) => c.id === state.selectedConversationId,
    );

    if (!currentConversation || currentConversation.messages.length === 0)
      return;

    // Get the last user message
    const lastUserMessageIndex = currentConversation.messages.findLastIndex(
      (m) => m.role === 'user',
    );
    if (lastUserMessageIndex === -1) return;

    // Remove messages after the last user message and resend
    const messagesUpToLastUser = currentConversation.messages.slice(
      0,
      lastUserMessageIndex + 1,
    );
    updateConversation(currentConversation.id, {
      messages: messagesUpToLastUser,
    });

    // Resend the last user message with the latest model
    const lastUserMessage = currentConversation.messages[lastUserMessageIndex];
    sendMessage?.(lastUserMessage, {
      ...currentConversation,
      messages: messagesUpToLastUser,
    });
  };

  const messages = selectedConversation?.messages || [];
  const hasMessages =
    messages.length > 0 ||
    (isStreaming && streamingConversationId === selectedConversation?.id);

  // Show loading screen until session and data are fully loaded
  // This prevents UI flickering during initialization
  if (status === 'loading' || !isLoaded || models.length === 0) {
    return <LoadingScreen />;
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-x-hidden bg-white dark:bg-[#212121] transition-all">
      {/* Header - Hidden on mobile, shown on desktop */}
      <div className="hidden md:block">
        <ChatTopbar
          botInfo={null}
          selectedModelName={
            selectedConversation?.model?.name ||
            models.find((m) => m.id === defaultModelId)?.name ||
            'GPT-4o'
          }
          selectedModelProvider={
            OpenAIModels[selectedConversation?.model?.id as OpenAIModelID]
              ?.provider ||
            models.find((m) => m.id === defaultModelId)?.provider
          }
          showSettings={isSettingsOpen}
          onSettingsClick={() => setIsSettingsOpen(!isSettingsOpen)}
          onModelClick={() => setIsModelSelectOpen(true)}
          onClearAll={handleClearAll}
          hasMessages={hasMessages}
          isAgent={selectedConversation?.model?.isAgent === true}
          showChatbar={showChatbar}
        />
      </div>

      {/* Empty state with centered input */}
      {!hasMessages ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <div className="w-full flex flex-col items-center justify-center gap-6 -translate-y-12">
            {/* Logo and Heading */}
            <EmptyState
              userName={
                session?.user?.givenName ||
                session?.user?.displayName?.split(' ')[0]
              }
            />

            {/* Centered Chat Input */}
            <div className="w-full max-w-3xl relative z-50">
              <ChatInput
                onSend={handleSend}
                onRegenerate={handleRegenerate}
                onScrollDownClick={handleScrollDown}
                stopConversationRef={stopConversationRef}
                textareaRef={textareaRef}
                showScrollDownButton={false}
                showDisclaimer={false}
                onTranscriptionStatusChange={setTranscriptionStatus}
              />
            </div>

            {/* Suggested Prompts below input */}
            <div className="relative z-10">
              <SuggestedPrompts onSelectPrompt={handleSelectPrompt} />
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Messages */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl pb-4">
              {messages.map((message, index) => {
                const isLastMessage = index === messages.length - 1;

                return isLastMessage ? (
                  <div key={index} ref={lastMessageRef} className="mb-2">
                    <MemoizedChatMessage
                      message={message}
                      messageIndex={index}
                      onEdit={handleEditMessage}
                      onQuestionClick={handleSelectPrompt}
                      onRegenerate={handleRegenerate}
                      onSaveAsPrompt={handleOpenSavePromptModal}
                    />
                  </div>
                ) : (
                  <div key={index} className="mb-2">
                    <MemoizedChatMessage
                      message={message}
                      messageIndex={index}
                      onEdit={handleEditMessage}
                      onQuestionClick={handleSelectPrompt}
                      onRegenerate={handleRegenerate}
                      onSaveAsPrompt={handleOpenSavePromptModal}
                    />
                  </div>
                );
              })}
              {/* Show transcription status indicator */}
              {transcriptionStatus && (
                <div className="relative flex p-4 text-base md:py-6 lg:px-0 w-full">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-blue-500 dark:bg-blue-400 rounded-full animate-breathing"></div>
                    <span
                      className="text-sm bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600 dark:from-gray-400 dark:via-gray-300 dark:to-gray-400 bg-clip-text text-transparent animate-shimmer"
                      style={{
                        backgroundSize: '200% 100%',
                      }}
                    >
                      {transcriptionStatus}
                    </span>
                  </div>
                </div>
              )}
              {/* Show streaming message or loading indicator */}
              {isStreaming &&
                streamingConversationId === selectedConversation?.id && (
                  <>
                    {streamingContent ? (
                      <MemoizedChatMessage
                        message={{
                          role: 'assistant',
                          content: streamingContent,
                          messageType: 'text',
                          citations,
                        }}
                        messageIndex={messages.length}
                        onEdit={() => {}}
                        onQuestionClick={handleSelectPrompt}
                      />
                    ) : (
                      <div className="relative flex p-4 text-base md:py-6 lg:px-0 w-full">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 bg-gray-500 dark:bg-gray-400 rounded-full animate-breathing flex-shrink-0"></div>
                          <div
                            className="text-sm bg-gradient-to-r from-gray-500 via-gray-400 to-gray-500 dark:from-gray-400 dark:via-gray-300 dark:to-gray-400 bg-clip-text text-transparent animate-shimmer"
                            style={{
                              backgroundSize: '200% 100%',
                            }}
                          >
                            {loadingMessage || 'Thinking...'}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="absolute bottom-[160px] left-0 right-0 mx-auto w-full max-w-3xl px-4 py-2">
              <div className="rounded-lg bg-red-100 p-4 text-red-800 dark:bg-red-900 dark:text-red-200 flex items-start justify-between">
                <span className="flex-1">{error}</span>
                <button
                  onClick={clearError}
                  className="ml-4 text-red-800 dark:text-red-200 hover:text-red-600 dark:hover:text-red-100 transition-colors flex-shrink-0"
                  aria-label="Dismiss error"
                >
                  <IconX size={20} />
                </button>
              </div>
            </div>
          )}

          {/* Chat Input - Bottom position */}
          <ChatInput
            onSend={handleSend}
            onRegenerate={handleRegenerate}
            onScrollDownClick={handleScrollDown}
            stopConversationRef={stopConversationRef}
            textareaRef={textareaRef}
            showScrollDownButton={showScrollDownButton}
            onTranscriptionStatusChange={setTranscriptionStatus}
          />
        </>
      )}

      {/* Model Selection Modal */}
      {isModelSelectOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-[150] animate-fade-in-fast"
          onClick={() => setIsModelSelectOpen(false)}
        >
          <div
            className="max-w-4xl w-full max-h-[90vh] overflow-y-auto mx-4 rounded-lg bg-white dark:bg-[#212121] p-6 shadow-xl animate-modal-in"
            onClick={(e) => e.stopPropagation()}
          >
            <ModelSelect onClose={() => setIsModelSelectOpen(false)} />
          </div>
        </div>
      )}

      {/* Save Prompt Modal */}
      <PromptModal
        isOpen={isSavePromptModalOpen}
        onClose={() => setIsSavePromptModalOpen(false)}
        onSave={handleSavePrompt}
        initialName={savePromptName}
        initialDescription={savePromptDescription}
        initialContent={savePromptContent}
        title={t('Save as prompt')}
      />
    </div>
  );
}
