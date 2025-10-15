'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useConversations } from '@/lib/hooks/conversation/useConversations';
import { useChat } from '@/lib/hooks/chat/useChat';
import { useUI } from '@/lib/hooks/ui/useUI';
import { useSettings } from '@/lib/hooks/settings/useSettings';
import { ChatTopbar } from './ChatTopbar';
import { MemoizedChatMessage } from './MemoizedChatMessage';
import { ChatInput } from './ChatInput';
import { ModelSelect } from './ModelSelect';
import { LoadingScreen } from './LoadingScreen';
import { Message } from '@/types/chat';
import { EmptyState } from './EmptyState/EmptyState';
import { v4 as uuidv4 } from 'uuid';

interface ChatProps {
  mobileModelSelectOpen?: boolean;
  onMobileModelSelectChange?: (open: boolean) => void;
}

/**
 * Main chat component - migrated to use Zustand stores
 */
export function Chat({ mobileModelSelectOpen, onMobileModelSelectChange }: ChatProps = {}) {
  const { data: session, status } = useSession();
  const { selectedConversation, updateConversation, conversations, addConversation, selectConversation, isLoaded } = useConversations();
  const { isStreaming, streamingContent, error, sendMessage, citations } = useChat();
  const { isSettingsOpen, setIsSettingsOpen, toggleChatbar, showChatbar } = useUI();
  const { models, defaultModelId, systemPrompt, temperature } = useSettings();

  const [showScrollDownButton, setShowScrollDownButton] = useState(false);
  const [filePreviews, setFilePreviews] = useState<any[]>([]);
  const [isModelSelectOpen, setIsModelSelectOpen] = useState(false);
  const hasInitializedRef = useRef(false);

  // Sync with mobile header model select state
  useEffect(() => {
    if (mobileModelSelectOpen !== undefined && mobileModelSelectOpen !== isModelSelectOpen) {
      setIsModelSelectOpen(mobileModelSelectOpen);
    }
  }, [mobileModelSelectOpen]);

  // Notify parent when modal state changes (for mobile header sync)
  useEffect(() => {
    if (onMobileModelSelectChange && mobileModelSelectOpen !== undefined) {
      onMobileModelSelectChange(isModelSelectOpen);
    }
  }, [isModelSelectOpen]);

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
      const defaultModel = models.find((m) => m.id === defaultModelId) || models[0];

      // Enable agent mode by default if the model has agentId
      const modelWithAgent = defaultModel?.id === 'gpt-4o' && defaultModel.agentId ? {
        ...defaultModel,
        agentEnabled: true,
        agentId: defaultModel.agentId
      } : defaultModel;

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
        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
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
    if (selectedConversation && window.confirm('Are you sure you want to clear this conversation?')) {
      updateConversation(selectedConversation.id, {
        ...selectedConversation,
        messages: [],
      });
    }
  };

  const handleEditMessage = (editedMessage: Message) => {
    if (!selectedConversation) return;

    const updatedMessages = selectedConversation.messages.map((msg, idx) =>
      idx === selectedConversation.messages.indexOf(editedMessage) ? editedMessage : msg
    );

    updateConversation(selectedConversation.id, {
      ...selectedConversation,
      messages: updatedMessages,
    });
  };

  const handleSend = useCallback((message: Message) => {
    if (!selectedConversation) return;

    // Add user message to conversation
    const updatedMessages = [...selectedConversation.messages, message];

    // Update just the messages field
    updateConversation(selectedConversation.id, { messages: updatedMessages });

    // Send to API with updated conversation (includes user message)
    const updatedConversation = {
      ...selectedConversation,
      messages: updatedMessages,
    };
    sendMessage?.(message, updatedConversation);
  }, [selectedConversation, updateConversation, sendMessage]);

  const handleSelectPrompt = useCallback((prompt: string) => {
    handleSend({
      role: 'user',
      content: prompt,
      messageType: 'text',
    });
  }, [handleSend]);

  const handleScrollDown = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleRegenerate = () => {
    if (!selectedConversation || selectedConversation.messages.length === 0) return;

    // Get the last user message
    const lastUserMessageIndex = selectedConversation.messages.findLastIndex(m => m.role === 'user');
    if (lastUserMessageIndex === -1) return;

    // Remove messages after the last user message and resend
    const messagesUpToLastUser = selectedConversation.messages.slice(0, lastUserMessageIndex + 1);
    updateConversation(selectedConversation.id, {
      ...selectedConversation,
      messages: messagesUpToLastUser,
    });

    // Resend the last user message
    const lastUserMessage = selectedConversation.messages[lastUserMessageIndex];
    sendMessage?.(lastUserMessage, { ...selectedConversation, messages: messagesUpToLastUser });
  };

  const messages = selectedConversation?.messages || [];
  const hasMessages = messages.length > 0 || isStreaming;

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
            models.find(m => m.id === defaultModelId)?.name ||
            'GPT-4o'
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

      {/* Messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-auto"
      >
        {!hasMessages ? (
          <EmptyState onSelectPrompt={handleSelectPrompt} />
        ) : (
          <div className="mx-auto max-w-3xl pb-[200px]">
            {messages.map((message, index) => (
              <MemoizedChatMessage
                key={index}
                message={message}
                messageIndex={index}
                onEdit={handleEditMessage}
                onRegenerate={handleRegenerate}
              />
            ))}
            {/* Show streaming message or loading indicator */}
            {isStreaming && (
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
                  />
                ) : (
                  <div className="relative flex p-4 text-base md:py-6 lg:px-0 w-full">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="absolute bottom-[160px] left-0 right-0 mx-auto w-full max-w-3xl px-4 py-2">
          <div className="rounded-lg bg-red-100 p-4 text-red-800 dark:bg-red-900 dark:text-red-200">
            {error}
          </div>
        </div>
      )}

      {/* Chat Input */}
      <ChatInput
        onSend={handleSend}
        onRegenerate={handleRegenerate}
        onScrollDownClick={handleScrollDown}
        stopConversationRef={stopConversationRef}
        textareaRef={textareaRef}
        showScrollDownButton={showScrollDownButton}
        filePreviews={filePreviews}
        setFilePreviews={setFilePreviews}
      />

      {/* Model Selection Modal */}
      {isModelSelectOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-[150]"
          onClick={() => setIsModelSelectOpen(false)}
        >
          <div
            className="max-w-4xl w-full max-h-[90vh] overflow-y-auto mx-4 rounded-lg bg-white dark:bg-[#212121] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <ModelSelect onClose={() => setIsModelSelectOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
