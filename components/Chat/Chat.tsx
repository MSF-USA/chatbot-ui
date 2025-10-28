'use client';

import { IconX } from '@tabler/icons-react';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useChat } from '@/lib/hooks/chat/useChat';
import { useConversations } from '@/lib/hooks/conversation/useConversations';
import { useSettings } from '@/lib/hooks/settings/useSettings';
import { useUI } from '@/lib/hooks/ui/useUI';

import { AgentType } from '@/types/agent';
import { Message } from '@/types/chat';
import { OpenAIModelID, OpenAIModels } from '@/types/openai';

import { PromptModal } from '@/components/Prompts/PromptModal';

import { ChatInput } from './ChatInput';
import { ChatTopbar } from './ChatTopbar';
import { EmptyState } from './EmptyState/EmptyState';
import { SuggestedPrompts } from './EmptyState/SuggestedPrompts';
import { LoadingScreen } from './LoadingScreen';
import { MemoizedChatMessage } from './MemoizedChatMessage';
import { ModelSelect } from './ModelSelect';

import { useConversationStore } from '@/lib/stores/conversationStore';
import { v4 as uuidv4 } from 'uuid';

interface ChatProps {
  mobileModelSelectOpen?: boolean;
  onMobileModelSelectChange?: (open: boolean) => void;
}

/**
 * Main chat component - migrated to use Zustand stores
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
  const [filePreviews, setFilePreviews] = useState<any[]>([]);
  const [isModelSelectOpen, setIsModelSelectOpen] = useState(false);
  const [transcriptionStatus, setTranscriptionStatus] = useState<string | null>(
    null,
  );
  const [isSavePromptModalOpen, setIsSavePromptModalOpen] = useState(false);
  const [savePromptContent, setSavePromptContent] = useState('');
  const [savePromptName, setSavePromptName] = useState('');
  const [savePromptDescription, setSavePromptDescription] = useState('');
  const hasInitializedRef = useRef(false);

  // Sync with mobile header model select state
  // Note: isModelSelectOpen is intentionally excluded from deps to prevent render loop
  // This effect should only run when the EXTERNAL prop (mobileModelSelectOpen) changes,
  // not when our internal state (isModelSelectOpen) changes, since we're setting it here
  useEffect(() => {
    if (
      mobileModelSelectOpen !== undefined &&
      mobileModelSelectOpen !== isModelSelectOpen
    ) {
      setIsModelSelectOpen(mobileModelSelectOpen);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobileModelSelectOpen]);

  // Notify parent when modal state changes (for mobile header sync)
  // Note: mobileModelSelectOpen is intentionally excluded from deps to prevent excessive notifications
  // We only want to notify the parent when OUR internal state changes, not when the prop changes
  // (since the prop changing already triggers the sync effect above)
  useEffect(() => {
    if (
      onMobileModelSelectChange &&
      mobileModelSelectOpen !== undefined &&
      isModelSelectOpen !== mobileModelSelectOpen
    ) {
      onMobileModelSelectChange(isModelSelectOpen);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModelSelectOpen, onMobileModelSelectChange]);

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

  // Auto-dismiss error after 10 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 10000); // 10 seconds

      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stopConversationRef = useRef<boolean>(false);

  // Create default conversation if none exists - runs once after data is loaded
  useEffect(() => {
    // Only run initialization once
    if (hasInitializedRef.current) return;

    // Wait for conversations to load from localStorage
    if (!isLoaded) return;

    // Wait for models to load
    if (models.length === 0) return;

    // Mark as initialized to prevent multiple runs
    hasInitializedRef.current = true;

    // If no conversations exist, create one
    if (conversations.length === 0) {
      const defaultModel =
        models.find((m) => m.id === defaultModelId) || models[0];

      // Enable agent mode by default if the model has agentId
      const modelWithAgent =
        defaultModel?.id === 'gpt-4o' && defaultModel.agentId
          ? {
              ...defaultModel,
              agentEnabled: true,
              agentId: defaultModel.agentId,
            }
          : defaultModel;

      const newConversation = {
        id: uuidv4(),
        name: 'New Conversation',
        messages: [],
        model: modelWithAgent,
        prompt: systemPrompt || '',
        temperature: temperature || 0.5,
        folderId: null,
      };
      addConversation(newConversation);
    } else if (!selectedConversation) {
      // If conversations exist but none is selected, select the first one
      selectConversation(conversations[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, models.length]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedConversation?.messages, streamingContent]);

  // Handle scroll detection for scroll-down button
  useEffect(() => {
    const handleScroll = () => {
      if (chatContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } =
          chatContainerRef.current;
        const isScrolledUp = scrollHeight - scrollTop - clientHeight > 100;
        setShowScrollDownButton(isScrolledUp);
      }
    };

    const container = chatContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

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
    (
      message: Message,
      forceStandardChat?: boolean,
      forcedAgentType?: AgentType,
    ) => {
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
      sendMessage?.(
        message,
        updatedConversation,
        forceStandardChat,
        forcedAgentType,
      );
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
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
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
          agentEnabled={selectedConversation?.model?.agentEnabled || false}
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
                filePreviews={filePreviews}
                setFilePreviews={setFilePreviews}
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
          <div ref={chatContainerRef} className="flex-1 overflow-auto">
            <div className="mx-auto max-w-3xl pb-[100px]">
              {messages.map((message, index) => (
                <MemoizedChatMessage
                  key={index}
                  message={message}
                  messageIndex={index}
                  onEdit={handleEditMessage}
                  onQuestionClick={handleSelectPrompt}
                  onRegenerate={handleRegenerate}
                  onSaveAsPrompt={handleOpenSavePromptModal}
                />
              ))}
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
            filePreviews={filePreviews}
            setFilePreviews={setFilePreviews}
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
