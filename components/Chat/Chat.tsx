'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useConversations } from '@/lib/hooks/conversation/useConversations';
import { useChat } from '@/lib/hooks/chat/useChat';
import { useUI } from '@/lib/hooks/ui/useUI';
import { useSettings } from '@/lib/hooks/settings/useSettings';
import { ChatTopbar } from './ChatTopbar';
import { MemoizedChatMessage } from './MemoizedChatMessage';
import { ChatInput } from './ChatInput';
import { Message } from '@/types/chat';
import { EmptyState } from './EmptyState/EmptyState';
import { v4 as uuidv4 } from 'uuid';

/**
 * Main chat component - migrated to use Zustand stores
 */
export function Chat() {
  const { selectedConversation, updateConversation, conversations, addConversation, selectConversation } = useConversations();
  const { isStreaming, streamingContent, error, sendMessage, citations } = useChat();
  const { isSettingsOpen, setIsSettingsOpen, toggleChatbar } = useUI();
  const { models, defaultModelId, systemPrompt, temperature } = useSettings();

  const [showScrollDownButton, setShowScrollDownButton] = useState(false);
  const [filePreviews, setFilePreviews] = useState<any[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stopConversationRef = useRef<boolean>(false);

  // Create default conversation if none exists
  useEffect(() => {
    if (conversations.length === 0 && models.length > 0) {
      const defaultModel = models.find((m) => m.id === defaultModelId) || models[0];
      const newConversation = {
        id: uuidv4(),
        name: 'New Conversation',
        messages: [],
        model: defaultModel,
        prompt: systemPrompt || '',
        temperature: temperature || 0.5,
        folderId: null,
      };
      addConversation(newConversation);
    } else if (!selectedConversation && conversations.length > 0) {
      selectConversation(conversations[0].id);
    }
  }, [conversations, models, selectedConversation, defaultModelId, systemPrompt, temperature, addConversation, selectConversation]);

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
    const updatedConversation = {
      ...selectedConversation,
      messages: updatedMessages,
    };

    updateConversation(selectedConversation.id, updatedConversation);

    // Send to API with updated conversation (includes user message)
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

  return (
    <div className="relative flex h-full w-full flex-col overflow-x-hidden bg-white dark:bg-[#212121]">
      {/* Header */}
      <ChatTopbar
        botInfo={null}
        selectedModelName={selectedConversation?.model?.name}
        showSettings={isSettingsOpen}
        onSettingsClick={() => setIsSettingsOpen(!isSettingsOpen)}
        onClearAll={handleClearAll}
        hasMessages={hasMessages}
        agentEnabled={false}
      />

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
              />
            ))}
            {/* Show streaming message */}
            {isStreaming && streamingContent && (
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
    </div>
  );
}
