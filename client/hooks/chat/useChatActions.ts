import { useCallback } from 'react';

import { Message } from '@/types/chat';
import { SearchMode } from '@/types/searchMode';

import { useConversationStore } from '@/client/stores/conversationStore';

interface UseChatActionsProps {
  updateConversation: (id: string, updates: any) => void;
  sendMessage?: (
    message: Message,
    conversation: any,
    searchMode?: SearchMode,
  ) => void;
}

/**
 * Custom hook to handle all chat message and conversation actions
 * Manages sending, editing, clearing, and regenerating messages
 */
export function useChatActions({
  updateConversation,
  sendMessage,
}: UseChatActionsProps) {
  const handleClearAll = useCallback(() => {
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
  }, [updateConversation]);

  const handleEditMessage = useCallback(
    (editedMessage: Message) => {
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
    },
    [updateConversation],
  );

  const handleSend = useCallback(
    (message: Message, searchMode?: SearchMode) => {
      const state = useConversationStore.getState();
      const currentConversation = state.conversations.find(
        (c) => c.id === state.selectedConversationId,
      );

      if (!currentConversation) return;

      const updatedMessages = [...currentConversation.messages, message];

      updateConversation(currentConversation.id, { messages: updatedMessages });

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

  const handleRegenerate = useCallback(() => {
    const state = useConversationStore.getState();
    const currentConversation = state.conversations.find(
      (c) => c.id === state.selectedConversationId,
    );

    if (!currentConversation || currentConversation.messages.length === 0)
      return;

    const lastUserMessageIndex = currentConversation.messages.findLastIndex(
      (m) => m.role === 'user',
    );
    if (lastUserMessageIndex === -1) return;

    const messagesUpToLastUser = currentConversation.messages.slice(
      0,
      lastUserMessageIndex + 1,
    );
    updateConversation(currentConversation.id, {
      messages: messagesUpToLastUser,
    });

    const lastUserMessage = currentConversation.messages[lastUserMessageIndex];
    sendMessage?.(lastUserMessage, {
      ...currentConversation,
      messages: messagesUpToLastUser,
    });
  }, [updateConversation, sendMessage]);

  return {
    handleClearAll,
    handleEditMessage,
    handleSend,
    handleSelectPrompt,
    handleRegenerate,
  };
}
