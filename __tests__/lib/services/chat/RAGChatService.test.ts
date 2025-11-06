import { RAGChatService } from '@/lib/services/chat/RAGChatService';
import { RAGService } from '@/lib/services/ragService';
import { ChatLogger } from '@/lib/services/shared';

import { Bot } from '@/types/bots';
import { Message } from '@/types/chat';
import { OpenAIModel, OpenAIModelID, OpenAIModels } from '@/types/openai';

import { AzureOpenAI } from 'openai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('RAGChatService', () => {
  let service: RAGChatService;
  let mockRagService: RAGService;
  let mockLogger: ChatLogger;
  let mockAzureClient: AzureOpenAI;

  const testUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    displayName: 'Test User',
  };

  const testBot: Bot = {
    id: 'bot-123',
    name: 'Test Bot',
    description: 'Test bot description',
    prompt: 'You are a helpful assistant.',
    icon: {} as any,
    color: 'blue',
  };

  const testBots: Bot[] = [testBot];

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock Azure client
    mockAzureClient = {} as AzureOpenAI;

    // Create mock logger
    mockLogger = {
      logChatCompletion: vi.fn().mockResolvedValue(undefined),
      logError: vi.fn().mockResolvedValue(undefined),
    } as any;

    // Create mock RAG service
    mockRagService = {
      augmentMessages: vi.fn(),
    } as any;

    // Create service instance
    service = new RAGChatService(mockRagService, mockLogger, mockAzureClient);
  });

  describe('handleChat', () => {
    it('should handle RAG chat request successfully (non-streaming)', async () => {
      const model = OpenAIModels[OpenAIModelID.GPT_5];
      const messages: Message[] = [
        {
          role: 'user',
          content: 'What is TypeScript?',
          messageType: undefined,
        },
      ];

      // Mock RAG service response
      const mockCompletion = {
        choices: [
          {
            message: {
              content: 'TypeScript is a superset of JavaScript...',
              role: 'assistant',
            },
          },
        ],
      };
      vi.mocked(mockRagService.augmentMessages).mockResolvedValue(
        mockCompletion as any,
      );

      // Execute
      const response = await service.handleChat({
        messages,
        model,
        user: testUser,
        botId: testBot.id,
        bots: testBots,
        stream: false,
      });

      // Verify RAG service was called
      expect(mockRagService.augmentMessages).toHaveBeenCalledWith(
        messages,
        testBot.id,
        testBots,
        model.id,
        false,
        testUser,
      );

      // Verify response
      expect(response).toBeInstanceOf(Response);
      const responseData = await response.json();
      expect(responseData.text).toBe(
        'TypeScript is a superset of JavaScript...',
      );
    });

    it('should handle streaming RAG chat request successfully', async () => {
      const model = OpenAIModels[OpenAIModelID.GPT_5];
      const messages: Message[] = [
        { role: 'user', content: 'Explain RAG', messageType: undefined },
      ];

      // Mock streaming response
      const mockStream = new ReadableStream();
      vi.mocked(mockRagService.augmentMessages).mockResolvedValue(
        mockStream as any,
      );

      // Execute
      const response = await service.handleChat({
        messages,
        model,
        user: testUser,
        botId: testBot.id,
        bots: testBots,
        stream: true,
      });

      // Verify RAG service was called with streaming
      expect(mockRagService.augmentMessages).toHaveBeenCalledWith(
        messages,
        testBot.id,
        testBots,
        model.id,
        true,
        testUser,
      );

      // Verify response
      expect(response).toBeInstanceOf(Response);
      expect(response.headers.get('Content-Type')).toBe(
        'text/plain; charset=utf-8',
      );
      expect(response.headers.get('Cache-Control')).toBe('no-cache');
      expect(response.body).toBe(mockStream);
    });

    it('should throw error when bot is not found', async () => {
      const model = OpenAIModels[OpenAIModelID.GPT_5];
      const messages: Message[] = [
        { role: 'user', content: 'Hello', messageType: undefined },
      ];

      // Execute with non-existent bot ID
      await expect(
        service.handleChat({
          messages,
          model,
          user: testUser,
          botId: 'non-existent-bot',
          bots: testBots,
          stream: false,
        }),
      ).rejects.toThrow('Bot not found: non-existent-bot');

      // Verify error was logged
      expect(mockLogger.logError).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Error),
        model.id,
        messages.length,
        1,
        testUser,
        'non-existent-bot',
      );

      // Verify RAG service was NOT called
      expect(mockRagService.augmentMessages).not.toHaveBeenCalled();
    });

    it('should handle errors from RAG service', async () => {
      const model = OpenAIModels[OpenAIModelID.GPT_5];
      const messages: Message[] = [
        { role: 'user', content: 'Hello', messageType: undefined },
      ];
      const error = new Error('RAG service failed');

      // Mock RAG service to throw error
      vi.mocked(mockRagService.augmentMessages).mockRejectedValue(error);

      // Execute and expect error
      await expect(
        service.handleChat({
          messages,
          model,
          user: testUser,
          botId: testBot.id,
          bots: testBots,
          stream: false,
        }),
      ).rejects.toThrow('RAG service failed');

      // Verify error was logged
      expect(mockLogger.logError).toHaveBeenCalledWith(
        expect.any(Number),
        error,
        model.id,
        messages.length,
        1,
        testUser,
        testBot.id,
      );
    });

    it('should use default stream value of true when not specified', async () => {
      const model = OpenAIModels[OpenAIModelID.GPT_5];
      const messages: Message[] = [
        { role: 'user', content: 'Hello', messageType: undefined },
      ];

      // Mock streaming response
      const mockStream = new ReadableStream();
      vi.mocked(mockRagService.augmentMessages).mockResolvedValue(
        mockStream as any,
      );

      // Execute without specifying stream
      await service.handleChat({
        messages,
        model,
        user: testUser,
        botId: testBot.id,
        bots: testBots,
        // stream not specified - should default to true
      });

      // Verify RAG service was called with stream = true
      expect(mockRagService.augmentMessages).toHaveBeenCalledWith(
        messages,
        testBot.id,
        testBots,
        model.id,
        true, // default
        testUser,
      );
    });

    it('should select correct bot from multiple bots', async () => {
      const model = OpenAIModels[OpenAIModelID.GPT_5];
      const messages: Message[] = [
        { role: 'user', content: 'Hello', messageType: undefined },
      ];

      const bot1: Bot = {
        id: 'bot-1',
        name: 'Bot 1',
        description: 'First bot',
        prompt: 'Prompt 1',
        icon: {} as any,
        color: 'blue',
      };

      const bot2: Bot = {
        id: 'bot-2',
        name: 'Bot 2',
        description: 'Second bot',
        prompt: 'Prompt 2',
        icon: {} as any,
        color: 'green',
      };

      const multipleBots = [bot1, bot2];

      // Mock RAG service response
      vi.mocked(mockRagService.augmentMessages).mockResolvedValue({
        choices: [{ message: { content: 'Response', role: 'assistant' } }],
      } as any);

      // Execute with bot2
      await service.handleChat({
        messages,
        model,
        user: testUser,
        botId: 'bot-2',
        bots: multipleBots,
        stream: false,
      });

      // Verify RAG service was called with correct bot ID
      expect(mockRagService.augmentMessages).toHaveBeenCalledWith(
        messages,
        'bot-2',
        multipleBots,
        model.id,
        false,
        testUser,
      );
    });

    it('should pass model ID to RAG service', async () => {
      const model = OpenAIModels[OpenAIModelID.GROK_3];
      const messages: Message[] = [
        { role: 'user', content: 'Hello', messageType: undefined },
      ];

      // Mock RAG service response
      vi.mocked(mockRagService.augmentMessages).mockResolvedValue({
        choices: [{ message: { content: 'Response', role: 'assistant' } }],
      } as any);

      // Execute
      await service.handleChat({
        messages,
        model,
        user: testUser,
        botId: testBot.id,
        bots: testBots,
        stream: false,
      });

      // Verify RAG service was called with correct model ID
      expect(mockRagService.augmentMessages).toHaveBeenCalledWith(
        messages,
        testBot.id,
        testBots,
        'grok-3', // Should pass model.id
        false,
        testUser,
      );
    });

    it('should handle empty response content gracefully', async () => {
      const model = OpenAIModels[OpenAIModelID.GPT_5];
      const messages: Message[] = [
        { role: 'user', content: 'Hello', messageType: undefined },
      ];

      // Mock RAG service response with no content
      vi.mocked(mockRagService.augmentMessages).mockResolvedValue({
        choices: [],
      } as any);

      // Execute
      const response = await service.handleChat({
        messages,
        model,
        user: testUser,
        botId: testBot.id,
        bots: testBots,
        stream: false,
      });

      // Verify response
      expect(response).toBeInstanceOf(Response);
      const responseData = await response.json();
      expect(responseData.text).toBeUndefined();
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete RAG workflow', async () => {
      const model = OpenAIModels[OpenAIModelID.GPT_5];
      const messages: Message[] = [
        {
          role: 'user',
          content: 'What is in the knowledge base about TypeScript?',
          messageType: undefined,
        },
      ];

      // Mock RAG service to simulate knowledge base augmentation
      const mockCompletion = {
        choices: [
          {
            message: {
              content: 'Based on the knowledge base, TypeScript is...',
              role: 'assistant',
            },
          },
        ],
      };
      vi.mocked(mockRagService.augmentMessages).mockResolvedValue(
        mockCompletion as any,
      );

      // Execute
      const response = await service.handleChat({
        messages,
        model,
        user: testUser,
        botId: testBot.id,
        bots: testBots,
        stream: false,
      });

      // Verify complete workflow
      expect(mockRagService.augmentMessages).toHaveBeenCalledWith(
        messages,
        testBot.id,
        testBots,
        model.id,
        false,
        testUser,
      );

      const responseData = await response.json();
      expect(responseData.text).toContain('Based on the knowledge base');
    });

    it('should handle RAG with conversation history', async () => {
      const model = OpenAIModels[OpenAIModelID.GPT_5];
      const messages: Message[] = [
        {
          role: 'user',
          content: 'What is TypeScript?',
          messageType: undefined,
        },
        {
          role: 'assistant',
          content: 'TypeScript is a typed superset of JavaScript.',
          messageType: undefined,
        },
        {
          role: 'user',
          content: 'Can you tell me more about its features?',
          messageType: undefined,
        },
      ];

      // Mock RAG service response
      vi.mocked(mockRagService.augmentMessages).mockResolvedValue({
        choices: [
          {
            message: {
              content: 'TypeScript features include...',
              role: 'assistant',
            },
          },
        ],
      } as any);

      // Execute
      await service.handleChat({
        messages,
        model,
        user: testUser,
        botId: testBot.id,
        bots: testBots,
        stream: false,
      });

      // Verify all messages were passed to RAG service
      expect(mockRagService.augmentMessages).toHaveBeenCalledWith(
        messages,
        testBot.id,
        testBots,
        model.id,
        false,
        testUser,
      );
    });

    it('should handle different bot configurations', async () => {
      const model = OpenAIModels[OpenAIModelID.GPT_5];
      const messages: Message[] = [
        { role: 'user', content: 'Hello', messageType: undefined },
      ];

      const specializedBot: Bot = {
        id: 'specialized-bot',
        name: 'Specialized Bot',
        description: 'Specialized for technical queries',
        prompt: 'You are a technical expert.',
        icon: {} as any,
        color: 'purple',
      };

      // Mock RAG service response
      vi.mocked(mockRagService.augmentMessages).mockResolvedValue({
        choices: [
          { message: { content: 'Technical response', role: 'assistant' } },
        ],
      } as any);

      // Execute with specialized bot
      await service.handleChat({
        messages,
        model,
        user: testUser,
        botId: specializedBot.id,
        bots: [specializedBot],
        stream: false,
      });

      // Verify specialized bot was used
      expect(mockRagService.augmentMessages).toHaveBeenCalledWith(
        messages,
        specializedBot.id,
        [specializedBot],
        model.id,
        false,
        testUser,
      );
    });
  });
});
