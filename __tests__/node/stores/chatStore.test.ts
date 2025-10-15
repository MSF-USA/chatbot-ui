import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useChatStore } from '@/lib/stores/chatStore';
import { Message, MessageType, Conversation } from '@/types/chat';
import { Citation } from '@/types/rag';

// Mock external dependencies
vi.mock('@/lib/services/chat/frontendChatService', () => ({
  makeRequest: vi.fn(),
}));

vi.mock('@/lib/stores/conversationStore', () => ({
  useConversationStore: {
    getState: vi.fn(),
  },
}));

vi.mock('@/lib/stores/settingsStore', () => ({
  useSettingsStore: {
    getState: vi.fn(),
  },
}));

vi.mock('@/lib/utils/app/citation', () => ({
  extractCitationsFromContent: vi.fn(),
}));

import { makeRequest } from '@/lib/services/chat/frontendChatService';
import { useConversationStore } from '@/lib/stores/conversationStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { extractCitationsFromContent } from '@/lib/utils/app/citation';

describe('chatStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useChatStore.setState({
      currentMessage: undefined,
      isStreaming: false,
      streamingContent: '',
      citations: [],
      error: null,
      stopRequested: false,
    });

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('has correct initial state', () => {
      const state = useChatStore.getState();

      expect(state.currentMessage).toBeUndefined();
      expect(state.isStreaming).toBe(false);
      expect(state.streamingContent).toBe('');
      expect(state.citations).toEqual([]);
      expect(state.error).toBeNull();
      expect(state.stopRequested).toBe(false);
    });
  });

  describe('setCurrentMessage', () => {
    it('sets current message', () => {
      const message: Message = {
        role: 'user',
        content: 'Hello',
        messageType: undefined,
      };

      useChatStore.getState().setCurrentMessage(message);

      expect(useChatStore.getState().currentMessage).toEqual(message);
    });

    it('clears current message when set to undefined', () => {
      const message: Message = {
        role: 'user',
        content: 'Hello',
        messageType: undefined,
      };

      useChatStore.getState().setCurrentMessage(message);
      expect(useChatStore.getState().currentMessage).toEqual(message);

      useChatStore.getState().setCurrentMessage(undefined);
      expect(useChatStore.getState().currentMessage).toBeUndefined();
    });

    it('updates current message', () => {
      const message1: Message = {
        role: 'user',
        content: 'First',
        messageType: undefined,
      };
      const message2: Message = {
        role: 'assistant',
        content: 'Second',
        messageType: undefined,
      };

      useChatStore.getState().setCurrentMessage(message1);
      expect(useChatStore.getState().currentMessage).toEqual(message1);

      useChatStore.getState().setCurrentMessage(message2);
      expect(useChatStore.getState().currentMessage).toEqual(message2);
    });
  });

  describe('setIsStreaming', () => {
    it('sets streaming to true', () => {
      useChatStore.getState().setIsStreaming(true);

      expect(useChatStore.getState().isStreaming).toBe(true);
    });

    it('sets streaming to false', () => {
      useChatStore.getState().setIsStreaming(true);
      useChatStore.getState().setIsStreaming(false);

      expect(useChatStore.getState().isStreaming).toBe(false);
    });
  });

  describe('setStreamingContent', () => {
    it('sets streaming content', () => {
      useChatStore.getState().setStreamingContent('Hello world');

      expect(useChatStore.getState().streamingContent).toBe('Hello world');
    });

    it('replaces existing streaming content', () => {
      useChatStore.getState().setStreamingContent('First');
      useChatStore.getState().setStreamingContent('Second');

      expect(useChatStore.getState().streamingContent).toBe('Second');
    });

    it('can set empty string', () => {
      useChatStore.getState().setStreamingContent('Content');
      useChatStore.getState().setStreamingContent('');

      expect(useChatStore.getState().streamingContent).toBe('');
    });
  });

  describe('appendStreamingContent', () => {
    it('appends to empty streaming content', () => {
      useChatStore.getState().appendStreamingContent('Hello');

      expect(useChatStore.getState().streamingContent).toBe('Hello');
    });

    it('appends to existing streaming content', () => {
      useChatStore.getState().setStreamingContent('Hello');
      useChatStore.getState().appendStreamingContent(' world');

      expect(useChatStore.getState().streamingContent).toBe('Hello world');
    });

    it('appends multiple times', () => {
      useChatStore.getState().appendStreamingContent('Hello');
      useChatStore.getState().appendStreamingContent(' ');
      useChatStore.getState().appendStreamingContent('world');

      expect(useChatStore.getState().streamingContent).toBe('Hello world');
    });

    it('handles empty strings', () => {
      useChatStore.getState().setStreamingContent('Hello');
      useChatStore.getState().appendStreamingContent('');

      expect(useChatStore.getState().streamingContent).toBe('Hello');
    });
  });

  describe('setCitations', () => {
    it('sets citations', () => {
      const citations: Citation[] = [
        {
          title: 'Test Citation',
          url: 'https://example.com',
          date: '2024-01-01',
          number: 1,
        },
      ];

      useChatStore.getState().setCitations(citations);

      expect(useChatStore.getState().citations).toEqual(citations);
    });

    it('replaces existing citations', () => {
      const citations1: Citation[] = [
        { title: 'First', url: 'https://example.com', date: '2024-01-01', number: 1 },
      ];
      const citations2: Citation[] = [
        { title: 'Second', url: 'https://example2.com', date: '2024-01-02', number: 2 },
      ];

      useChatStore.getState().setCitations(citations1);
      useChatStore.getState().setCitations(citations2);

      expect(useChatStore.getState().citations).toEqual(citations2);
    });

    it('can set empty array', () => {
      const citations: Citation[] = [
        { title: 'Test', url: 'https://example.com', date: '2024-01-01', number: 1 },
      ];

      useChatStore.getState().setCitations(citations);
      useChatStore.getState().setCitations([]);

      expect(useChatStore.getState().citations).toEqual([]);
    });
  });

  describe('setError', () => {
    it('sets error message', () => {
      useChatStore.getState().setError('Something went wrong');

      expect(useChatStore.getState().error).toBe('Something went wrong');
    });

    it('clears error with null', () => {
      useChatStore.getState().setError('Error');
      useChatStore.getState().setError(null);

      expect(useChatStore.getState().error).toBeNull();
    });

    it('replaces existing error', () => {
      useChatStore.getState().setError('First error');
      useChatStore.getState().setError('Second error');

      expect(useChatStore.getState().error).toBe('Second error');
    });
  });

  describe('requestStop', () => {
    it('sets stopRequested to true', () => {
      useChatStore.getState().requestStop();

      expect(useChatStore.getState().stopRequested).toBe(true);
    });

    it('can be called multiple times', () => {
      useChatStore.getState().requestStop();
      useChatStore.getState().requestStop();

      expect(useChatStore.getState().stopRequested).toBe(true);
    });
  });

  describe('resetStop', () => {
    it('sets stopRequested to false', () => {
      useChatStore.getState().requestStop();
      useChatStore.getState().resetStop();

      expect(useChatStore.getState().stopRequested).toBe(false);
    });

    it('can be called when already false', () => {
      useChatStore.getState().resetStop();

      expect(useChatStore.getState().stopRequested).toBe(false);
    });
  });

  describe('resetChat', () => {
    it('resets all state to initial values', () => {
      // Set all state to non-initial values
      useChatStore.setState({
        currentMessage: { role: 'user', content: 'Test', messageType: undefined },
        isStreaming: true,
        streamingContent: 'Content',
        citations: [{ title: 'Test', url: 'https://example.com', date: '2024-01-01', number: 1 }],
        error: 'Error',
        stopRequested: true,
      });

      useChatStore.getState().resetChat();

      const state = useChatStore.getState();
      expect(state.currentMessage).toBeUndefined();
      expect(state.isStreaming).toBe(false);
      expect(state.streamingContent).toBe('');
      expect(state.citations).toEqual([]);
      expect(state.error).toBeNull();
      expect(state.stopRequested).toBe(false);
    });

    it('can be called on already reset state', () => {
      useChatStore.getState().resetChat();

      const state = useChatStore.getState();
      expect(state.currentMessage).toBeUndefined();
      expect(state.isStreaming).toBe(false);
      expect(state.streamingContent).toBe('');
      expect(state.citations).toEqual([]);
      expect(state.error).toBeNull();
      expect(state.stopRequested).toBe(false);
    });
  });

  describe('sendMessage', () => {
    const createMockConversation = (): Conversation => ({
      id: 'conv-1',
      name: 'Test Conversation',
      messages: [{ role: 'user', content: 'Hello', messageType: undefined }],
      model: { id: 'gpt-4', name: 'GPT-4', maxLength: 4000, tokenLimit: 4000 },
      prompt: '',
      temperature: 0.7,
      folderId: null,
    });

    const createMockMessage = (): Message => ({
      role: 'user',
      content: 'Test message',
      messageType: undefined,
    });

    beforeEach(() => {
      // Mock settings store
      vi.mocked(useSettingsStore.getState).mockReturnValue({
        systemPrompt: 'You are a helpful assistant',
        temperature: 0.7,
      } as any);

      // Mock conversation store
      vi.mocked(useConversationStore.getState).mockReturnValue({
        updateConversation: vi.fn(),
      } as any);

      // Mock citation extraction (default: no citations)
      vi.mocked(extractCitationsFromContent).mockReturnValue({
        text: 'Response text',
        citations: [],
        extractionMethod: 'test',
      });
    });

    it('sets streaming state at start', async () => {
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('Hello') })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      };

      vi.mocked(makeRequest).mockResolvedValue({
        response: {
          body: { getReader: () => mockReader },
        } as any,
        hasComplexContent: false,
      });

      const message = createMockMessage();
      const conversation = createMockConversation();

      const promise = useChatStore.getState().sendMessage(message, conversation);

      // Check state is set immediately
      expect(useChatStore.getState().isStreaming).toBe(true);
      expect(useChatStore.getState().streamingContent).toBe('');
      expect(useChatStore.getState().error).toBeNull();
      expect(useChatStore.getState().citations).toEqual([]);

      await promise;
    });

    it('handles streaming response chunks', async () => {
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('Hello') })
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(' world') })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      };

      vi.mocked(makeRequest).mockResolvedValue({
        response: {
          body: { getReader: () => mockReader },
        } as any,
        hasComplexContent: false,
      });

      vi.mocked(extractCitationsFromContent).mockReturnValue({
        text: 'Hello world',
        citations: [],
        extractionMethod: 'test',
      });

      const message = createMockMessage();
      const conversation = createMockConversation();

      await useChatStore.getState().sendMessage(message, conversation);

      expect(useChatStore.getState().isStreaming).toBe(false);
    });

    it('updates conversation with assistant message', async () => {
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('Response') })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      };

      vi.mocked(makeRequest).mockResolvedValue({
        response: {
          body: { getReader: () => mockReader },
        } as any,
        hasComplexContent: false,
      });

      vi.mocked(extractCitationsFromContent).mockReturnValue({
        text: 'Response',
        citations: [],
        extractionMethod: 'test',
      });

      const updateConversation = vi.fn();
      vi.mocked(useConversationStore.getState).mockReturnValue({
        updateConversation,
      } as any);

      const message = createMockMessage();
      const conversation = createMockConversation();

      await useChatStore.getState().sendMessage(message, conversation);

      expect(updateConversation).toHaveBeenCalledWith('conv-1', expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'assistant',
            content: 'Response',
          }),
        ]),
      }));
    });

    it('auto-names conversation from first user message', async () => {
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('Response') })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      };

      vi.mocked(makeRequest).mockResolvedValue({
        response: {
          body: { getReader: () => mockReader },
        } as any,
        hasComplexContent: false,
      });

      vi.mocked(extractCitationsFromContent).mockReturnValue({
        text: 'Response',
        citations: [],
        extractionMethod: 'test',
      });

      const updateConversation = vi.fn();
      vi.mocked(useConversationStore.getState).mockReturnValue({
        updateConversation,
      } as any);

      const message = createMockMessage();
      const conversation: Conversation = {
        ...createMockConversation(),
        name: 'New Conversation',
        messages: [{ role: 'user', content: 'What is the weather?', messageType: undefined }],
      };

      await useChatStore.getState().sendMessage(message, conversation);

      expect(updateConversation).toHaveBeenCalledWith('conv-1', expect.objectContaining({
        name: 'What is the weather?',
      }));
    });

    it('truncates long conversation names', async () => {
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('Response') })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      };

      vi.mocked(makeRequest).mockResolvedValue({
        response: {
          body: { getReader: () => mockReader },
        } as any,
        hasComplexContent: false,
      });

      vi.mocked(extractCitationsFromContent).mockReturnValue({
        text: 'Response',
        citations: [],
        extractionMethod: 'test',
      });

      const updateConversation = vi.fn();
      vi.mocked(useConversationStore.getState).mockReturnValue({
        updateConversation,
      } as any);

      const longMessage = 'a'.repeat(100);
      const conversation: Conversation = {
        ...createMockConversation(),
        name: 'New Conversation',
        messages: [{ role: 'user', content: longMessage, messageType: undefined }],
      };

      await useChatStore.getState().sendMessage(createMockMessage(), conversation);

      expect(updateConversation).toHaveBeenCalledWith('conv-1', expect.objectContaining({
        name: 'a'.repeat(50) + '...',
      }));
    });

    it('handles error and sets error state', async () => {
      vi.mocked(makeRequest).mockRejectedValue(new Error('Network error'));

      const message = createMockMessage();
      const conversation = createMockConversation();

      await useChatStore.getState().sendMessage(message, conversation);

      expect(useChatStore.getState().error).toBe('Network error');
      expect(useChatStore.getState().isStreaming).toBe(false);
      expect(useChatStore.getState().streamingContent).toBe('');
    });

    it('handles missing response body', async () => {
      vi.mocked(makeRequest).mockResolvedValue({
        response: {} as any,
        hasComplexContent: false,
      });

      const message = createMockMessage();
      const conversation = createMockConversation();

      await useChatStore.getState().sendMessage(message, conversation);

      expect(useChatStore.getState().error).toBe('No response body');
    });

    it('resets streaming state after completion', async () => {
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('Response') })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      };

      vi.mocked(makeRequest).mockResolvedValue({
        response: {
          body: { getReader: () => mockReader },
        } as any,
        hasComplexContent: false,
      });

      vi.mocked(extractCitationsFromContent).mockReturnValue({
        text: 'Response',
        citations: [],
        extractionMethod: 'test',
      });

      const message = createMockMessage();
      const conversation = createMockConversation();

      await useChatStore.getState().sendMessage(message, conversation);

      expect(useChatStore.getState().isStreaming).toBe(false);
      expect(useChatStore.getState().streamingContent).toBe('');
    });

    it('extracts citations from legacy format', async () => {
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('Response text') })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      };

      vi.mocked(makeRequest).mockResolvedValue({
        response: {
          body: { getReader: () => mockReader },
        } as any,
        hasComplexContent: false,
      });

      const mockCitations: Citation[] = [
        { title: 'Source', url: 'https://example.com', date: '2024-01-01', number: 1 },
      ];

      vi.mocked(extractCitationsFromContent).mockReturnValue({
        text: 'Response text',
        citations: mockCitations,
        extractionMethod: 'test',
      });

      const message = createMockMessage();
      const conversation = createMockConversation();

      await useChatStore.getState().sendMessage(message, conversation);

      const updateConversation = vi.mocked(useConversationStore.getState).mock.results[0].value.updateConversation;
      expect(updateConversation).toHaveBeenCalledWith('conv-1', expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            citations: mockCitations,
          }),
        ]),
      }));
    });
  });

  describe('State Isolation', () => {
    it('state changes do not affect other tests', () => {
      useChatStore.getState().setStreamingContent('Test');
      useChatStore.getState().setIsStreaming(true);

      // Reset for next test
      useChatStore.getState().resetChat();

      expect(useChatStore.getState().streamingContent).toBe('');
      expect(useChatStore.getState().isStreaming).toBe(false);
    });
  });
});
