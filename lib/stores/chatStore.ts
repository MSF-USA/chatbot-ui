import { create } from 'zustand';
import { Message } from '@/types/chat';
import { Citation } from '@/types/rag';

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
  requestStop: () => void;
  resetStop: () => void;
  resetChat: () => void;
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
}));
