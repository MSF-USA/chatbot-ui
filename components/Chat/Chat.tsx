'use client';

import { useEffect, useRef } from 'react';
import { useConversations } from '@/lib/hooks/conversation/useConversations';
import { useChat } from '@/lib/hooks/chat/useChat';
import { useUI } from '@/lib/hooks/ui/useUI';
import { ChatTopbar } from './ChatTopbar';
import { MemoizedChatMessage } from './MemoizedChatMessage';
import { Message } from '@/types/chat';
import { EmptyState } from './EmptyState/EmptyState';

/**
 * Main chat component - migrated to use Zustand stores
 */
export function Chat() {
  const { selectedConversation, updateConversation } = useConversations();
  const { isStreaming, streamingContent, error } = useChat();
  const { isSettingsOpen, setIsSettingsOpen } = useUI();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedConversation?.messages, streamingContent]);

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

  const messages = selectedConversation?.messages || [];
  const hasMessages = messages.length > 0 || isStreaming;

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
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
        className="flex-1 overflow-y-auto"
      >
        {!hasMessages ? (
          <EmptyState />
        ) : (
          <div className="mx-auto max-w-3xl">
            {messages.map((message, index) => (
              <MemoizedChatMessage
                key={index}
                message={message}
                messageIndex={index}
                onEdit={handleEditMessage}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-auto w-full max-w-3xl px-4 py-2">
          <div className="rounded-lg bg-red-100 p-4 text-red-800 dark:bg-red-900 dark:text-red-200">
            {error}
          </div>
        </div>
      )}

      {/* Chat Input - TODO: Implement new ChatInput component */}
      <div className="border-t border-neutral-300 bg-white dark:border-neutral-700 dark:bg-[#2F2F2F]">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <div className="rounded-lg bg-neutral-100 p-4 text-center text-neutral-500 dark:bg-neutral-800">
            Chat input component - coming soon
          </div>
        </div>
      </div>
    </div>
  );
}
