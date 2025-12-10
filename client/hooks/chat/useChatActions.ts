import { useCallback } from 'react';

import {
  entryToDisplayMessage,
  findPrecedingUserMessageIndex,
  flattenEntriesForAPI,
} from '@/lib/utils/chat/messageVersioning';

import {
  Message,
  MessageType,
  isAssistantMessageGroup,
  isLegacyMessage,
} from '@/types/chat';
import { SearchMode } from '@/types/searchMode';

import { useChatStore } from '@/client/stores/chatStore';
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

      // Find the message to edit by matching properties (excluding content)
      // The editedMessage is a copy of the original with changed content
      const messageIndex = currentConversation.messages.findIndex(
        (msg) =>
          msg.role === editedMessage.role &&
          msg.messageType === editedMessage.messageType &&
          // Match citations if present
          JSON.stringify(msg.citations) ===
            JSON.stringify(editedMessage.citations) &&
          // Match thinking if present
          msg.thinking === editedMessage.thinking &&
          // Match other metadata
          msg.error === editedMessage.error &&
          msg.toneId === editedMessage.toneId &&
          msg.promptId === editedMessage.promptId,
      );

      if (messageIndex === -1) return;

      const updatedMessages = currentConversation.messages.map((msg, idx) =>
        idx === messageIndex ? editedMessage : msg,
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
        messageType: MessageType.TEXT,
      });
    },
    [handleSend],
  );

  /**
   * Regenerates an assistant response, adding a new version instead of replacing.
   * @param messageIndex - Optional index of the assistant message to regenerate.
   *                       If not provided, regenerates the last assistant message.
   */
  const handleRegenerate = useCallback(
    (messageIndex?: number) => {
      const conversationState = useConversationStore.getState();
      const chatState = useChatStore.getState();
      const currentConversation = conversationState.conversations.find(
        (c) => c.id === conversationState.selectedConversationId,
      );

      if (!currentConversation || currentConversation.messages.length === 0)
        return;

      // Determine which assistant message to regenerate
      let targetIndex: number;
      let userMessageIndex: number;

      if (messageIndex !== undefined) {
        // Regenerating a specific assistant message
        targetIndex = messageIndex;
        userMessageIndex = findPrecedingUserMessageIndex(
          currentConversation.messages,
          messageIndex,
        );
      } else {
        // Regenerating the last assistant message
        targetIndex = currentConversation.messages.length - 1;
        // Find the last user message before the assistant message
        userMessageIndex = findPrecedingUserMessageIndex(
          currentConversation.messages,
          targetIndex,
        );
      }

      if (userMessageIndex === -1) return;

      // Verify the target is an assistant message group
      const targetEntry = currentConversation.messages[targetIndex];
      if (
        !isAssistantMessageGroup(targetEntry) &&
        !(isLegacyMessage(targetEntry) && targetEntry.role === 'assistant')
      ) {
        return;
      }

      // Get the user message to resend
      const userMessageEntry = currentConversation.messages[userMessageIndex];
      const userMessage = entryToDisplayMessage(userMessageEntry);

      // Set the regenerating index in chat store
      chatState.setRegeneratingIndex(targetIndex);

      // Create a flattened conversation snapshot for the API call
      // Only include messages up to and including the user message
      const messagesForAPI = flattenEntriesForAPI(
        currentConversation.messages.slice(0, userMessageIndex + 1),
      );

      const apiConversation = {
        ...currentConversation,
        messages: messagesForAPI,
      };

      sendMessage?.(userMessage, apiConversation, undefined);
    },
    [sendMessage],
  );

  return {
    handleClearAll,
    handleEditMessage,
    handleSend,
    handleSelectPrompt,
    handleRegenerate,
  };
}
