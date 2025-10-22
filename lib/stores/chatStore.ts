import { makeRequest } from '@/lib/services/chat/frontendChatService';

import {
  createStreamDecoder,
  parseMetadataFromContent,
} from '@/lib/utils/app/metadata';

import { Conversation, Message, MessageType } from '@/types/chat';
import { Citation } from '@/types/rag';

import { useConversationStore } from './conversationStore';
import { useSettingsStore } from './settingsStore';

import { create } from 'zustand';

interface ChatStore {
  // State
  currentMessage: Message | undefined;
  isStreaming: boolean;
  streamingContent: string;
  streamingConversationId: string | null;
  citations: Citation[];
  error: string | null;
  stopRequested: boolean;

  // Actions
  setCurrentMessage: (message: Message | undefined) => void;
  setIsStreaming: (isStreaming: boolean) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (chunk: string) => void;
  setCitations: (citations: Citation[]) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  requestStop: () => void;
  resetStop: () => void;
  resetChat: () => void;
  sendMessage: (message: Message, conversation: Conversation) => Promise<void>;
}

export const useChatStore = create<ChatStore>((set) => ({
  // Initial state
  currentMessage: undefined,
  isStreaming: false,
  streamingContent: '',
  streamingConversationId: null,
  citations: [],
  error: null,
  stopRequested: false,

  // Actions
  setCurrentMessage: (message) => set({ currentMessage: message }),

  setIsStreaming: (isStreaming) => set({ isStreaming }),

  setStreamingContent: (content) => set({ streamingContent: content }),

  appendStreamingContent: (chunk) =>
    set((state) => ({
      streamingContent: state.streamingContent + chunk,
    })),

  setCitations: (citations) => set({ citations }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  requestStop: () => set({ stopRequested: true }),

  resetStop: () => set({ stopRequested: false }),

  resetChat: () =>
    set({
      currentMessage: undefined,
      isStreaming: false,
      streamingContent: '',
      streamingConversationId: null,
      citations: [],
      error: null,
      stopRequested: false,
    }),

  sendMessage: async (message, conversation) => {
    try {
      set({
        isStreaming: true,
        streamingContent: '',
        streamingConversationId: conversation.id,
        error: null,
        citations: [],
      });

      // Get settings from settings store
      const settings = useSettingsStore.getState();
      const systemPrompt = settings.systemPrompt;
      const temperature = settings.temperature;

      // Check if model supports streaming
      const modelSupportsStreaming = conversation.model.stream !== false;

      // Make the API request
      const { response, hasComplexContent } = await makeRequest(
        () => {}, // setRequestStatusMessage - not needed for now
        conversation,
        '', // apiKey - not used, backend uses Azure AD authentication
        systemPrompt,
        temperature,
        modelSupportsStreaming, // Only stream if model supports it
        () => {}, // setProgress
        { current: false }, // stopConversationRef - will wire up later
      );

      if (!response.body) {
        throw new Error('No response body');
      }

      let text = '';
      let extractedCitations: Citation[] = [];
      let extractedThreadId: string | undefined;

      // Handle non-streaming response (e.g., o3, grok-4-fast-reasoning, DeepSeek-R1)
      if (!modelSupportsStreaming) {
        const data = await response.json();
        const rawText = data.text || '';

        // Extract metadata using utility function
        const parsed = parseMetadataFromContent(rawText);
        text = parsed.content;
        extractedCitations = parsed.citations;
        extractedThreadId = parsed.threadId;

        // Update streaming content to show the response
        set({ streamingContent: text, citations: extractedCitations });
      }
      // Handle streaming response
      else {
        const reader = response.body.getReader();
        const decoder = createStreamDecoder();

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          const chunk = decoder.decode(value);
          text += chunk;

          // Extract metadata using utility function
          const parsed = parseMetadataFromContent(text);
          const displayText = parsed.content;

          // Update citations if found
          if (parsed.citations.length > 0) {
            extractedCitations = parsed.citations;
          }

          // Update threadId if found (only once)
          if (parsed.threadId && !extractedThreadId) {
            extractedThreadId = parsed.threadId;
          }

          // Update streaming content
          set({ streamingContent: displayText, citations: extractedCitations });

          // Update text for final message
          text = displayText;
        }
      }

      // Create assistant message
      const assistantMessage: Message = {
        role: 'assistant',
        content: text,
        messageType: MessageType.TEXT,
        citations:
          extractedCitations.length > 0 ? extractedCitations : undefined,
      };

      // Update conversation with assistant message
      const conversationStore = useConversationStore.getState();
      const updates: Partial<Conversation> = {
        messages: [...conversation.messages, assistantMessage],
        ...(extractedThreadId ? { threadId: extractedThreadId } : {}),
      };

      // Auto-name conversation from first user message if still "New Conversation"
      if (
        conversation.name === 'New Conversation' &&
        conversation.messages.length > 0
      ) {
        const firstUserMessage = conversation.messages.find(
          (m) => m.role === 'user',
        );
        if (firstUserMessage && typeof firstUserMessage.content === 'string') {
          // Take first 50 characters or until first line break
          const content = firstUserMessage.content.split('\n')[0];
          const name =
            content.length > 50 ? content.substring(0, 50) + '...' : content;
          updates.name = name || 'New Conversation';
        }
      }

      conversationStore.updateConversation(conversation.id, updates);

      set({
        isStreaming: false,
        streamingContent: '',
        streamingConversationId: null,
      });
    } catch (error) {
      console.error('sendMessage error:', error);
      set({
        error:
          error instanceof Error ? error.message : 'Failed to send message',
        isStreaming: false,
        streamingContent: '',
        streamingConversationId: null,
      });
    }
  },
}));
