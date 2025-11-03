import { Conversation, Message, MessageType } from '@/types/chat';
import { OpenAIModelID, OpenAIModels } from '@/types/openai';

import { useChatStore } from '@/client/stores/chatStore';
import { useConversationStore } from '@/client/stores/conversationStore';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Integration tests for mid-conversation model switching
 * Ensures models can be switched seamlessly during active conversations
 */
describe('Mid-Conversation Model Switching', () => {
  beforeEach(() => {
    // Reset stores
    useChatStore.setState({
      currentMessage: undefined,
      isStreaming: false,
      streamingContent: '',
      streamingConversationId: null,
      citations: [],
      error: null,
      stopRequested: false,
      loadingMessage: null,
    });

    useConversationStore.setState({
      conversations: [],
      selectedConversationId: null,
      folders: [],
      searchTerm: '',
      isLoaded: true,
    });

    // Mock global fetch
    global.fetch = vi.fn();
  });

  describe('Basic Model Switching', () => {
    it('preserves conversation history when switching models', () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello', messageType: MessageType.TEXT },
        {
          role: 'assistant',
          content: 'Hi there!',
          messageType: MessageType.TEXT,
        },
        {
          role: 'user',
          content: 'How are you?',
          messageType: MessageType.TEXT,
        },
        {
          role: 'assistant',
          content: 'I am doing well!',
          messageType: MessageType.TEXT,
        },
      ];

      const conversation: Conversation = {
        id: 'conv-1',
        name: 'Test Conversation',
        messages: [...messages],
        model: OpenAIModels[OpenAIModelID.GPT_4_1],
        prompt: '',
        temperature: 0.7,
        folderId: null,
      };

      useConversationStore.getState().addConversation(conversation);

      // Switch to GPT-5
      useConversationStore.getState().updateConversation('conv-1', {
        model: OpenAIModels[OpenAIModelID.GPT_5],
      });

      const updated = useConversationStore.getState().conversations[0];

      // Messages should be preserved
      expect(updated.messages).toHaveLength(4);
      expect(updated.messages).toEqual(messages);

      // Model should be updated
      expect(updated.model.id).toBe(OpenAIModelID.GPT_5);
    });

    it('maintains conversation settings during model switch', () => {
      const conversation: Conversation = {
        id: 'conv-1',
        name: 'Test Conversation',
        messages: [
          { role: 'user', content: 'Test', messageType: MessageType.TEXT },
        ],
        model: OpenAIModels[OpenAIModelID.GPT_4_1],
        prompt: 'You are a helpful assistant',
        temperature: 0.9,
        folderId: 'folder-1',
        bot: 'bot-123',
        threadId: 'thread-abc',
      };

      useConversationStore.getState().addConversation(conversation);

      // Switch model
      useConversationStore.getState().updateConversation('conv-1', {
        model: OpenAIModels[OpenAIModelID.GPT_5],
      });

      const updated = useConversationStore.getState().conversations[0];

      // All settings should be preserved
      expect(updated.prompt).toBe('You are a helpful assistant');
      expect(updated.temperature).toBe(0.9);
      expect(updated.folderId).toBe('folder-1');
      expect(updated.bot).toBe('bot-123');
      expect(updated.threadId).toBe('thread-abc');
    });

    it('updates updatedAt timestamp when switching models', () => {
      const conversation: Conversation = {
        id: 'conv-1',
        name: 'Test',
        messages: [],
        model: OpenAIModels[OpenAIModelID.GPT_4_1],
        prompt: '',
        temperature: 0.7,
        folderId: null,
      };

      useConversationStore.getState().addConversation(conversation);

      const before = Date.now();

      // Switch model
      useConversationStore.getState().updateConversation('conv-1', {
        model: OpenAIModels[OpenAIModelID.GPT_5],
      });

      const after = Date.now();
      const updated = useConversationStore.getState().conversations[0];

      expect(updated.updatedAt).toBeDefined();
      const updatedTime = new Date(updated.updatedAt!).getTime();
      expect(updatedTime).toBeGreaterThanOrEqual(before);
      expect(updatedTime).toBeLessThanOrEqual(after);
    });
  });

  describe('Routing After Model Switch', () => {
    it('routes to search mode after switching to search-enabled model', async () => {
      // Start with standard model
      const conversation: Conversation = {
        id: 'conv-1',
        name: 'Test',
        messages: [
          { role: 'user', content: 'Hello', messageType: MessageType.TEXT },
          { role: 'assistant', content: 'Hi!', messageType: MessageType.TEXT },
        ],
        model: OpenAIModels[OpenAIModelID.GROK_3],
        prompt: '',
        temperature: 0.7,
        folderId: null,
      };

      useConversationStore.getState().addConversation(conversation);

      // Mock response
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('Response'));
          controller.close();
        },
      });

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        body: mockStream,
      } as any);

      // Switch to search-enabled model
      useConversationStore.getState().updateConversation('conv-1', {
        model: OpenAIModels[OpenAIModelID.GPT_5], // Has searchModeEnabled
      });

      const updated = useConversationStore.getState().conversations[0];

      // Send new message
      await useChatStore.getState().sendMessage(
        {
          role: 'user',
          content: 'What is the weather?',
          messageType: MessageType.TEXT,
        },
        updated,
      );

      // Should route to tool-aware endpoint
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/chat/tool-aware',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('routes to agent mode after switching to agent model', async () => {
      // Start with standard model
      const conversation: Conversation = {
        id: 'conv-1',
        name: 'Test',
        messages: [
          { role: 'user', content: 'Hello', messageType: MessageType.TEXT },
        ],
        model: OpenAIModels[OpenAIModelID.GROK_3],
        prompt: '',
        temperature: 0.7,
        folderId: null,
      };

      useConversationStore.getState().addConversation(conversation);

      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('Agent response'));
          controller.close();
        },
      });

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        body: mockStream,
      } as any);

      // Switch to agent model
      useConversationStore.getState().updateConversation('conv-1', {
        model: {
          ...OpenAIModels[OpenAIModelID.GPT_4_1],
          azureAgentMode: true,
          agentId: 'agent-123',
        },
      });

      const updated = useConversationStore.getState().conversations[0];

      // Send new message
      await useChatStore
        .getState()
        .sendMessage(
          { role: 'user', content: 'Test', messageType: MessageType.TEXT },
          updated,
        );

      // Should route to agent endpoint
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/chat/agent',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('routes to standard after switching from search to standard model', async () => {
      // Start with search model
      const conversation: Conversation = {
        id: 'conv-1',
        name: 'Test',
        messages: [
          {
            role: 'user',
            content: 'Previous message',
            messageType: MessageType.TEXT,
          },
        ],
        model: OpenAIModels[OpenAIModelID.GPT_5], // Search enabled
        prompt: '',
        temperature: 0.7,
        folderId: null,
      };

      useConversationStore.getState().addConversation(conversation);

      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('Standard response'));
          controller.close();
        },
      });

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        body: mockStream,
      } as any);

      // Switch to standard model (no search mode)
      useConversationStore.getState().updateConversation('conv-1', {
        model: {
          ...OpenAIModels[OpenAIModelID.DEEPSEEK_V3_1],
          searchModeEnabled: false,
        },
      });

      const updated = useConversationStore.getState().conversations[0];

      // Send new message
      await useChatStore
        .getState()
        .sendMessage(
          { role: 'user', content: 'Test', messageType: MessageType.TEXT },
          updated,
        );

      // Should route to standard endpoint
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/chat/standard',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('Model Type Transitions', () => {
    it('handles standard -> search -> agent -> standard cycle', () => {
      const conversation: Conversation = {
        id: 'conv-1',
        name: 'Test',
        messages: [
          { role: 'user', content: 'Message 1', messageType: MessageType.TEXT },
          {
            role: 'assistant',
            content: 'Response 1',
            messageType: MessageType.TEXT,
          },
        ],
        model: OpenAIModels[OpenAIModelID.GROK_3],
        prompt: '',
        temperature: 0.7,
        folderId: null,
      };

      useConversationStore.getState().addConversation(conversation);

      // Standard -> Search
      useConversationStore.getState().updateConversation('conv-1', {
        model: OpenAIModels[OpenAIModelID.GPT_5],
      });

      let updated = useConversationStore.getState().conversations[0];
      expect(updated.model.id).toBe(OpenAIModelID.GPT_5);
      expect(updated.model.searchModeEnabled).toBe(true);
      expect(updated.messages).toHaveLength(2);

      // Search -> Agent
      useConversationStore.getState().updateConversation('conv-1', {
        model: {
          ...OpenAIModels[OpenAIModelID.GPT_4_1],
          azureAgentMode: true,
          agentId: 'agent-123',
        },
      });

      updated = useConversationStore.getState().conversations[0];
      expect(updated.model.azureAgentMode).toBe(true);
      expect(updated.model.agentId).toBe('agent-123');
      expect(updated.messages).toHaveLength(2);

      // Agent -> Standard
      useConversationStore.getState().updateConversation('conv-1', {
        model: OpenAIModels[OpenAIModelID.DEEPSEEK_V3_1],
      });

      updated = useConversationStore.getState().conversations[0];
      expect(updated.model.id).toBe(OpenAIModelID.DEEPSEEK_V3_1);
      expect(updated.model.azureAgentMode).toBeUndefined();
      expect(updated.messages).toHaveLength(2);
    });

    it('handles switching between reasoning models', () => {
      const conversation: Conversation = {
        id: 'conv-1',
        name: 'Test',
        messages: [
          {
            role: 'user',
            content: 'Complex problem',
            messageType: MessageType.TEXT,
          },
        ],
        model: OpenAIModels[OpenAIModelID.GPT_o3],
        prompt: '',
        temperature: 0.7,
        folderId: null,
        reasoningEffort: 'high',
      };

      useConversationStore.getState().addConversation(conversation);

      // Switch to DeepSeek R1
      useConversationStore.getState().updateConversation('conv-1', {
        model: OpenAIModels[OpenAIModelID.DEEPSEEK_R1],
        reasoningEffort: 'medium',
      });

      const updated = useConversationStore.getState().conversations[0];
      expect(updated.model.id).toBe(OpenAIModelID.DEEPSEEK_R1);
      expect(updated.reasoningEffort).toBe('medium');
      expect(updated.messages).toHaveLength(1);
    });
  });

  describe('Edge Cases', () => {
    it('handles switching models with empty conversation', () => {
      const conversation: Conversation = {
        id: 'conv-1',
        name: 'Empty Conversation',
        messages: [],
        model: OpenAIModels[OpenAIModelID.GPT_4_1],
        prompt: '',
        temperature: 0.7,
        folderId: null,
      };

      useConversationStore.getState().addConversation(conversation);

      // Switch model
      useConversationStore.getState().updateConversation('conv-1', {
        model: OpenAIModels[OpenAIModelID.GPT_5],
      });

      const updated = useConversationStore.getState().conversations[0];
      expect(updated.messages).toHaveLength(0);
      expect(updated.model.id).toBe(OpenAIModelID.GPT_5);
    });

    it('handles switching models with many messages', () => {
      const messages: Message[] = Array.from({ length: 100 }, (_, i) => ({
        role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
        content: `Message ${i}`,
        messageType: MessageType.TEXT,
      }));

      const conversation: Conversation = {
        id: 'conv-1',
        name: 'Long Conversation',
        messages: [...messages],
        model: OpenAIModels[OpenAIModelID.GPT_4_1],
        prompt: '',
        temperature: 0.7,
        folderId: null,
      };

      useConversationStore.getState().addConversation(conversation);

      // Switch model
      useConversationStore.getState().updateConversation('conv-1', {
        model: OpenAIModels[OpenAIModelID.GPT_5],
      });

      const updated = useConversationStore.getState().conversations[0];
      expect(updated.messages).toHaveLength(100);
      expect(updated.messages).toEqual(messages);
      expect(updated.model.id).toBe(OpenAIModelID.GPT_5);
    });

    it('handles switching to same model (no-op)', () => {
      const conversation: Conversation = {
        id: 'conv-1',
        name: 'Test',
        messages: [
          { role: 'user', content: 'Test', messageType: MessageType.TEXT },
        ],
        model: OpenAIModels[OpenAIModelID.GPT_5],
        prompt: '',
        temperature: 0.7,
        folderId: null,
      };

      useConversationStore.getState().addConversation(conversation);

      const before = useConversationStore.getState().conversations[0];

      // "Switch" to same model
      useConversationStore.getState().updateConversation('conv-1', {
        model: OpenAIModels[OpenAIModelID.GPT_5],
      });

      const after = useConversationStore.getState().conversations[0];

      // Messages should be unchanged
      expect(after.messages).toEqual(before.messages);
      expect(after.model.id).toBe(before.model.id);
    });

    it('handles multiple rapid model switches', () => {
      const conversation: Conversation = {
        id: 'conv-1',
        name: 'Test',
        messages: [
          { role: 'user', content: 'Test', messageType: MessageType.TEXT },
        ],
        model: OpenAIModels[OpenAIModelID.GPT_4_1],
        prompt: '',
        temperature: 0.7,
        folderId: null,
      };

      useConversationStore.getState().addConversation(conversation);

      // Rapid switches
      useConversationStore.getState().updateConversation('conv-1', {
        model: OpenAIModels[OpenAIModelID.GPT_5],
      });

      useConversationStore.getState().updateConversation('conv-1', {
        model: OpenAIModels[OpenAIModelID.GROK_3],
      });

      useConversationStore.getState().updateConversation('conv-1', {
        model: OpenAIModels[OpenAIModelID.DEEPSEEK_V3_1],
      });

      useConversationStore.getState().updateConversation('conv-1', {
        model: OpenAIModels[OpenAIModelID.GPT_5_MINI],
      });

      const updated = useConversationStore.getState().conversations[0];

      // Final model should be GPT_5_MINI
      expect(updated.model.id).toBe(OpenAIModelID.GPT_5_MINI);

      // Messages should be preserved
      expect(updated.messages).toHaveLength(1);
      expect(updated.messages[0].content).toBe('Test');
    });
  });

  describe('Model-Specific Features', () => {
    it('preserves citations when switching models', async () => {
      const conversation: Conversation = {
        id: 'conv-1',
        name: 'Test',
        messages: [
          {
            role: 'user',
            content: 'Search query',
            messageType: MessageType.TEXT,
          },
          {
            role: 'assistant',
            content: 'Result',
            messageType: MessageType.TEXT,
            citations: [
              {
                number: 1,
                url: 'https://example.com',
                title: 'Example',
                date: '2024-01-01',
              },
            ],
          },
        ],
        model: OpenAIModels[OpenAIModelID.GPT_5],
        prompt: '',
        temperature: 0.7,
        folderId: null,
      };

      useConversationStore.getState().addConversation(conversation);

      // Switch model
      useConversationStore.getState().updateConversation('conv-1', {
        model: OpenAIModels[OpenAIModelID.GPT_4_1],
      });

      const updated = useConversationStore.getState().conversations[0];

      // Citations should be preserved in messages
      expect(updated.messages[1].citations).toBeDefined();
      expect(updated.messages[1].citations).toHaveLength(1);
      expect(updated.messages[1].citations![0].url).toBe('https://example.com');
    });

    it('handles switching from model with transcript to model without', () => {
      const conversation: Conversation = {
        id: 'conv-1',
        name: 'Test',
        messages: [
          {
            role: 'user',
            content: 'Audio message',
            messageType: MessageType.TEXT,
          },
          {
            role: 'assistant',
            content: 'Response',
            messageType: MessageType.TEXT,
            transcript: {
              transcript: 'Transcribed text',
              filename: 'audio.mp3',
            },
          },
        ],
        model: OpenAIModels[OpenAIModelID.GPT_4_1],
        prompt: '',
        temperature: 0.7,
        folderId: null,
      };

      useConversationStore.getState().addConversation(conversation);

      // Switch model
      useConversationStore.getState().updateConversation('conv-1', {
        model: OpenAIModels[OpenAIModelID.GPT_5],
      });

      const updated = useConversationStore.getState().conversations[0];

      // Transcript should be preserved
      expect(updated.messages[1].transcript).toBeDefined();
      expect(updated.messages[1].transcript!.transcript).toBe(
        'Transcribed text',
      );
    });

    it('allows updating model-specific parameters during switch', () => {
      const conversation: Conversation = {
        id: 'conv-1',
        name: 'Test',
        messages: [],
        model: OpenAIModels[OpenAIModelID.GPT_o3],
        prompt: '',
        temperature: 0.7,
        folderId: null,
        reasoningEffort: 'low',
        verbosity: 'low',
      };

      useConversationStore.getState().addConversation(conversation);

      // Switch model and update parameters
      useConversationStore.getState().updateConversation('conv-1', {
        model: OpenAIModels[OpenAIModelID.GPT_5],
        reasoningEffort: 'high',
        verbosity: 'high',
      });

      const updated = useConversationStore.getState().conversations[0];

      expect(updated.model.id).toBe(OpenAIModelID.GPT_5);
      expect(updated.reasoningEffort).toBe('high');
      expect(updated.verbosity).toBe('high');
    });
  });

  describe('Conversation State Integrity', () => {
    it('maintains conversation name during model switch', () => {
      const conversation: Conversation = {
        id: 'conv-1',
        name: 'Important Discussion',
        messages: [
          { role: 'user', content: 'Test', messageType: MessageType.TEXT },
        ],
        model: OpenAIModels[OpenAIModelID.GPT_4_1],
        prompt: '',
        temperature: 0.7,
        folderId: null,
      };

      useConversationStore.getState().addConversation(conversation);

      useConversationStore.getState().updateConversation('conv-1', {
        model: OpenAIModels[OpenAIModelID.GPT_5],
      });

      const updated = useConversationStore.getState().conversations[0];
      expect(updated.name).toBe('Important Discussion');
    });

    it('maintains folder assignment during model switch', () => {
      const conversation: Conversation = {
        id: 'conv-1',
        name: 'Test',
        messages: [],
        model: OpenAIModels[OpenAIModelID.GPT_4_1],
        prompt: '',
        temperature: 0.7,
        folderId: 'work-folder',
      };

      useConversationStore.getState().addConversation(conversation);

      useConversationStore.getState().updateConversation('conv-1', {
        model: OpenAIModels[OpenAIModelID.GPT_5],
      });

      const updated = useConversationStore.getState().conversations[0];
      expect(updated.folderId).toBe('work-folder');
    });

    it('does not affect other conversations when switching model', () => {
      const conv1: Conversation = {
        id: 'conv-1',
        name: 'Conversation 1',
        messages: [
          { role: 'user', content: 'Test 1', messageType: MessageType.TEXT },
        ],
        model: OpenAIModels[OpenAIModelID.GPT_4_1],
        prompt: '',
        temperature: 0.7,
        folderId: null,
      };

      const conv2: Conversation = {
        id: 'conv-2',
        name: 'Conversation 2',
        messages: [
          { role: 'user', content: 'Test 2', messageType: MessageType.TEXT },
        ],
        model: OpenAIModels[OpenAIModelID.GROK_3],
        prompt: '',
        temperature: 0.5,
        folderId: null,
      };

      useConversationStore.getState().setConversations([conv1, conv2]);

      // Switch model in conv1
      useConversationStore.getState().updateConversation('conv-1', {
        model: OpenAIModels[OpenAIModelID.GPT_5],
      });

      const conversations = useConversationStore.getState().conversations;

      // conv1 should be updated
      expect(conversations[0].model.id).toBe(OpenAIModelID.GPT_5);

      // conv2 should be unchanged
      expect(conversations[1].model.id).toBe(OpenAIModelID.GROK_3);
      expect(conversations[1].temperature).toBe(0.5);
      expect(conversations[1].messages[0].content).toBe('Test 2');
    });
  });
});
