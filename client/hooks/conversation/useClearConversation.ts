import { useCallback } from 'react';

import { useTranslations } from 'next-intl';

import { useConversationStore } from '@/client/stores/conversationStore';

/**
 * Hook that provides a function to clear the current conversation.
 * Handles confirmation dialog and resets both messages and conversation name.
 *
 * @returns Object containing clearConversation function
 */
export function useClearConversation() {
  const t = useTranslations();
  const updateConversation = useConversationStore((s) => s.updateConversation);
  const selectedConversationId = useConversationStore(
    (s) => s.selectedConversationId,
  );
  const conversations = useConversationStore((s) => s.conversations);

  const clearConversation = useCallback(() => {
    const conversation = conversations.find(
      (c) => c.id === selectedConversationId,
    );

    if (conversation && window.confirm(t('chat.clearConversationConfirm'))) {
      updateConversation(conversation.id, {
        messages: [],
        name: '',
      });
    }
  }, [conversations, selectedConversationId, updateConversation, t]);

  return { clearConversation };
}
