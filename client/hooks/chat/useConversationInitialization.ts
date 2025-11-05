import { useEffect, useRef } from 'react';

import {
  canInitializeConversation,
  createDefaultConversation,
  shouldCreateDefaultConversation,
} from '@/lib/utils/app/conversationInit';

import { Conversation } from '@/types/chat';
import { OpenAIModel } from '@/types/openai';

interface UseConversationInitializationProps {
  isLoaded: boolean;
  models: OpenAIModel[];
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  defaultModelId?: string;
  systemPrompt?: string;
  temperature?: number;
  addConversation: (conversation: Conversation) => void;
  selectConversation: (id: string) => void;
}

/**
 * Custom hook to handle conversation initialization
 * Creates default conversation if none exists or selects first conversation
 */
export function useConversationInitialization({
  isLoaded,
  models,
  conversations,
  selectedConversation,
  defaultModelId,
  systemPrompt,
  temperature,
  addConversation,
  selectConversation,
}: UseConversationInitializationProps) {
  const hasInitializedRef = useRef(false);

  useEffect(() => {
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
      selectConversation(conversations[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, models.length]);
}
