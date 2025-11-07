'use client';

import toast from 'react-hot-toast';

import { Message, MessageType } from '@/types/chat';

import { useChatStore } from '@/client/stores/chatStore';
import { useCodeEditorStore } from '@/client/stores/codeEditorStore';
import { useConversationStore } from '@/client/stores/conversationStore';

/**
 * Hook to send code from editor back to chat for collaborative coding
 */
export function useCodeToChat() {
  const { modifiedCode, fileName, language } = useCodeEditorStore();
  const { selectedConversation, updateConversation } = useConversationStore();
  const { sendMessage } = useChatStore();

  const sendCodeToChat = async (prompt: string = '') => {
    if (!selectedConversation) {
      toast.error('No conversation selected');
      return;
    }

    if (!modifiedCode) {
      toast.error('No code to send');
      return;
    }

    // Format code as markdown code block
    const codeBlock = `\`\`\`${language}\n${modifiedCode}\n\`\`\``;

    // Build message content with prompt + code
    const messageContent = prompt.trim()
      ? `${prompt}\n\n${codeBlock}`
      : `Here's my updated code:\n\n${codeBlock}`;

    // Create user message
    const userMessage: Message = {
      role: 'user',
      content: messageContent,
      messageType: MessageType.TEXT,
    };

    // Update conversation with user message first
    const updatedMessages = [...selectedConversation.messages, userMessage];
    updateConversation(selectedConversation.id, {
      messages: updatedMessages,
    });

    // Create updated conversation for sending
    const conversationForSend = {
      ...selectedConversation,
      messages: updatedMessages,
    };

    try {
      // Send message to AI
      await sendMessage(userMessage, conversationForSend);
    } catch (error) {
      console.error('Failed to send code to chat:', error);
      toast.error('Failed to send code to chat');
    }
  };

  return {
    sendCodeToChat,
    canSendCode: !!modifiedCode && !!selectedConversation,
  };
}
