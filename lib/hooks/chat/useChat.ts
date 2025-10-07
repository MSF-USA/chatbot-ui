import { useChatStore } from '@/lib/stores/chatStore';

/**
 * Hook that manages active chat state (no persistence needed - ephemeral)
 */
export function useChat() {
  const store = useChatStore();

  return {
    // State
    currentMessage: store.currentMessage,
    isStreaming: store.isStreaming,
    streamingContent: store.streamingContent,
    citations: store.citations,
    error: store.error,
    stopRequested: store.stopRequested,

    // Actions
    setCurrentMessage: store.setCurrentMessage,
    setIsStreaming: store.setIsStreaming,
    setStreamingContent: store.setStreamingContent,
    appendStreamingContent: store.appendStreamingContent,
    setCitations: store.setCitations,
    setError: store.setError,
    requestStop: store.requestStop,
    resetStop: store.resetStop,
    resetChat: store.resetChat,
  };
}
