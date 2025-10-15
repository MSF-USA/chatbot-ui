import { create } from 'zustand';
import { Message, Conversation, MessageType } from '@/types/chat';
import { Citation } from '@/types/rag';
import { makeRequest } from '@/lib/services/chat/frontendChatService';
import { extractCitationsFromContent } from '@/lib/utils/app/citation';
import { useConversationStore } from './conversationStore';
import { useSettingsStore } from './settingsStore';

interface ChatStore {
  // State
  currentMessage: Message | undefined;
  isStreaming: boolean;
  streamingContent: string;
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
  sendMessage: (
    message: Message,
    conversation: Conversation
  ) => Promise<void>;
}

export const useChatStore = create<ChatStore>((set) => ({
  // Initial state
  currentMessage: undefined,
  isStreaming: false,
  streamingContent: '',
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
      citations: [],
      error: null,
      stopRequested: false,
    }),

  sendMessage: async (message, conversation) => {
    try {
      set({ isStreaming: true, streamingContent: '', error: null, citations: [] });

      // Get settings from settings store
      const settings = useSettingsStore.getState();
      const systemPrompt = settings.systemPrompt;
      const temperature = settings.temperature;

      // Make the API request
      const { response, hasComplexContent } = await makeRequest(
        () => {}, // setRequestStatusMessage - not needed for now
        conversation,
        '', // apiKey - not used, backend uses Azure AD authentication
        systemPrompt,
        temperature,
        true, // stream
        () => {}, // setProgress
        { current: false } // stopConversationRef - will wire up later
      );

      if (!response.body) {
        throw new Error('No response body');
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let text = '';
      let extractedCitations: Citation[] = [];
      let extractedThreadId: string | undefined;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value);
        text += chunk;

        // Extract metadata if present
        const metadataMatch = text.match(/\n\n<<<METADATA_START>>>(.*?)<<<METADATA_END>>>/s);
        if (metadataMatch) {
          const cleanedText = text.replace(/\n\n<<<METADATA_START>>>.*?<<<METADATA_END>>>/s, '');
          try {
            const metadata = JSON.parse(metadataMatch[1]);
            if (metadata.citations && metadata.citations.length > 0) {
              text = cleanedText;
              extractedCitations = metadata.citations;
            }
            if (metadata.threadId && !extractedThreadId) {
              extractedThreadId = metadata.threadId;
            }
          } catch (error) {
            // Silently ignore parsing errors during streaming
          }
        } else {
          // Fallback to legacy citation extraction
          const { text: cleanedText, citations } = extractCitationsFromContent(text);
          if (citations.length > 0) {
            text = cleanedText;
            extractedCitations = citations;
          }
        }

        // Update streaming content
        set({ streamingContent: text, citations: extractedCitations });
      }

      // Create assistant message
      const assistantMessage: Message = {
        role: 'assistant',
        content: text,
        messageType: MessageType.TEXT,
        citations: extractedCitations.length > 0 ? extractedCitations : undefined,
      };

      // Update conversation with assistant message
      const conversationStore = useConversationStore.getState();
      const updates: Partial<Conversation> = {
        messages: [...conversation.messages, assistantMessage],
        ...(extractedThreadId ? { threadId: extractedThreadId } : {}),
      };

      // Auto-name conversation from first user message if still "New Conversation"
      if (conversation.name === 'New Conversation' && conversation.messages.length > 0) {
        const firstUserMessage = conversation.messages.find(m => m.role === 'user');
        if (firstUserMessage && typeof firstUserMessage.content === 'string') {
          // Take first 50 characters or until first line break
          const content = firstUserMessage.content.split('\n')[0];
          const name = content.length > 50 ? content.substring(0, 50) + '...' : content;
          updates.name = name || 'New Conversation';
        }
      }

      conversationStore.updateConversation(conversation.id, updates);

      set({ isStreaming: false, streamingContent: '' });
    } catch (error) {
      console.error('sendMessage error:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to send message',
        isStreaming: false,
        streamingContent: ''
      });
    }
  },
}));
