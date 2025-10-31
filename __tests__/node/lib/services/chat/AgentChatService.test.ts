import { AIFoundryAgentHandler } from '@/lib/services/chat/AIFoundryAgentHandler';
import { AgentChatService } from '@/lib/services/chat/AgentChatService';
import { ChatLogger } from '@/lib/services/shared';

import { Message } from '@/types/chat';
import { OpenAIModel, OpenAIModelID, OpenAIModels } from '@/types/openai';

import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('AgentChatService', () => {
  let service: AgentChatService;
  let mockAgentHandler: AIFoundryAgentHandler;
  let mockLogger: ChatLogger;

  const testUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  const testAgentModel: OpenAIModel = {
    id: 'agent-model-123',
    name: 'Test Agent',
    displayName: 'Test Agent Model',
    maxLength: 128000,
    tokenLimit: 16000,
    provider: 'azure-openai',
    agentId: 'asst_test123',
    isAgent: true,
  } as any;

  const testNonAgentModel = OpenAIModels[OpenAIModelID.GPT_5];

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock logger
    mockLogger = {
      logChatCompletion: vi.fn().mockResolvedValue(undefined),
      logError: vi.fn().mockResolvedValue(undefined),
    } as any;

    // Create mock agent handler
    mockAgentHandler = {
      handleAgentChat: vi.fn(),
    } as any;

    // Create service instance
    service = new AgentChatService(mockAgentHandler, mockLogger);
  });

  describe('handleChat', () => {
    it('should handle agent chat request successfully', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Search for the latest TypeScript news' },
      ];

      // Mock agent handler response
      const mockResponse = new Response('Agent response', {
        headers: { 'Content-Type': 'text/plain' },
      });
      vi.mocked(mockAgentHandler.handleAgentChat).mockResolvedValue(
        mockResponse,
      );

      // Execute
      const response = await service.handleChat({
        messages,
        model: testAgentModel,
        user: testUser,
        temperature: 0.7,
      });

      // Verify agent handler was called
      expect(mockAgentHandler.handleAgentChat).toHaveBeenCalledWith(
        testAgentModel.id,
        expect.objectContaining({ agentId: 'asst_test123' }),
        messages,
        0.7,
        testUser,
        undefined,
        undefined,
      );

      // Verify response
      expect(response).toBe(mockResponse);
    });

    it('should throw error when model does not have agentId', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Hello' }];

      // Execute with non-agent model
      await expect(
        service.handleChat({
          messages,
          model: testNonAgentModel,
          user: testUser,
        }),
      ).rejects.toThrow(/does not have an agentId configured/);

      // Verify error was logged
      expect(mockLogger.logError).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Error),
        testNonAgentModel.id,
        messages.length,
        1,
        testUser,
        undefined,
      );

      // Verify agent handler was NOT called
      expect(mockAgentHandler.handleAgentChat).not.toHaveBeenCalled();
    });

    it('should use default temperature of 1 when not specified', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Hello' }];

      // Mock agent handler response
      const mockResponse = new Response('Response', {
        headers: { 'Content-Type': 'text/plain' },
      });
      vi.mocked(mockAgentHandler.handleAgentChat).mockResolvedValue(
        mockResponse,
      );

      // Execute without temperature
      await service.handleChat({
        messages,
        model: testAgentModel,
        user: testUser,
        // temperature not specified
      });

      // Verify default temperature was used
      expect(mockAgentHandler.handleAgentChat).toHaveBeenCalledWith(
        testAgentModel.id,
        expect.any(Object),
        messages,
        1, // default
        testUser,
        undefined,
        undefined,
      );
    });

    it('should pass botId to agent handler', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Hello' }];
      const botId = 'bot-123';

      // Mock agent handler response
      const mockResponse = new Response('Response', {
        headers: { 'Content-Type': 'text/plain' },
      });
      vi.mocked(mockAgentHandler.handleAgentChat).mockResolvedValue(
        mockResponse,
      );

      // Execute with botId
      await service.handleChat({
        messages,
        model: testAgentModel,
        user: testUser,
        botId,
      });

      // Verify botId was passed
      expect(mockAgentHandler.handleAgentChat).toHaveBeenCalledWith(
        testAgentModel.id,
        expect.any(Object),
        messages,
        1,
        testUser,
        botId,
        undefined,
      );
    });

    it('should pass threadId to agent handler for continuing conversation', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Continue the conversation' },
      ];
      const threadId = 'thread-123';

      // Mock agent handler response
      const mockResponse = new Response('Response', {
        headers: { 'Content-Type': 'text/plain' },
      });
      vi.mocked(mockAgentHandler.handleAgentChat).mockResolvedValue(
        mockResponse,
      );

      // Execute with threadId
      await service.handleChat({
        messages,
        model: testAgentModel,
        user: testUser,
        threadId,
      });

      // Verify threadId was passed
      expect(mockAgentHandler.handleAgentChat).toHaveBeenCalledWith(
        testAgentModel.id,
        expect.any(Object),
        messages,
        1,
        testUser,
        undefined,
        threadId,
      );
    });

    it('should handle errors from agent handler', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Hello' }];
      const error = new Error('Agent handler failed');

      // Mock agent handler to throw error
      vi.mocked(mockAgentHandler.handleAgentChat).mockRejectedValue(error);

      // Execute and expect error
      await expect(
        service.handleChat({
          messages,
          model: testAgentModel,
          user: testUser,
        }),
      ).rejects.toThrow('Agent handler failed');

      // Verify error was logged
      expect(mockLogger.logError).toHaveBeenCalledWith(
        expect.any(Number),
        error,
        testAgentModel.id,
        messages.length,
        1,
        testUser,
        undefined,
      );
    });

    it('should use model displayName in logs when available', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Hello' }];

      // Mock console.log
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Mock agent handler response
      const mockResponse = new Response('Response', {
        headers: { 'Content-Type': 'text/plain' },
      });
      vi.mocked(mockAgentHandler.handleAgentChat).mockResolvedValue(
        mockResponse,
      );

      // Execute
      await service.handleChat({
        messages,
        model: testAgentModel,
        user: testUser,
      });

      // Verify displayName was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test Agent Model'),
      );

      consoleSpy.mockRestore();
    });

    it('should pass all request parameters correctly', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Search for TypeScript' },
      ];
      const botId = 'bot-456';
      const threadId = 'thread-789';
      const temperature = 0.8;

      // Mock agent handler response
      const mockResponse = new Response('Response', {
        headers: { 'Content-Type': 'text/plain' },
      });
      vi.mocked(mockAgentHandler.handleAgentChat).mockResolvedValue(
        mockResponse,
      );

      // Execute with all parameters
      await service.handleChat({
        messages,
        model: testAgentModel,
        user: testUser,
        temperature,
        botId,
        threadId,
      });

      // Verify all parameters were passed correctly
      expect(mockAgentHandler.handleAgentChat).toHaveBeenCalledWith(
        testAgentModel.id,
        expect.objectContaining({ agentId: 'asst_test123' }),
        messages,
        temperature,
        testUser,
        botId,
        threadId,
      );
    });
  });

  describe('isAgentModel', () => {
    it('should return true for models with agentId', () => {
      const result = service.isAgentModel(testAgentModel);
      expect(result).toBe(true);
    });

    it('should return false for models without agentId', () => {
      const result = service.isAgentModel(testNonAgentModel);
      expect(result).toBe(false);
    });

    it('should return false for models with falsy agentId', () => {
      const modelWithNullAgent = {
        ...testAgentModel,
        agentId: null,
      } as any;

      const result = service.isAgentModel(modelWithNullAgent);
      expect(result).toBe(false);
    });

    it('should return false for models with undefined agentId', () => {
      const modelWithoutAgent = {
        ...testAgentModel,
      } as any;
      delete modelWithoutAgent.agentId;

      const result = service.isAgentModel(modelWithoutAgent);
      expect(result).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete agent workflow with Bing grounding', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'What are the latest developments in AI?' },
      ];

      // Mock agent handler response with Bing grounding
      const mockResponse = new Response(
        'Based on the latest web search results, AI developments include...',
        {
          headers: { 'Content-Type': 'text/plain' },
        },
      );
      vi.mocked(mockAgentHandler.handleAgentChat).mockResolvedValue(
        mockResponse,
      );

      // Execute
      const response = await service.handleChat({
        messages,
        model: testAgentModel,
        user: testUser,
      });

      // Verify complete workflow
      expect(mockAgentHandler.handleAgentChat).toHaveBeenCalled();
      expect(response).toBe(mockResponse);
    });

    it('should handle multi-turn agent conversation with thread', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'What is TypeScript?' },
        {
          role: 'assistant',
          content: 'TypeScript is a typed superset of JavaScript.',
        },
        { role: 'user', content: 'Can you search for its latest version?' },
      ];
      const threadId = 'thread-existing';

      // Mock agent handler response
      const mockResponse = new Response(
        'Searching for latest TypeScript version...',
        {
          headers: { 'Content-Type': 'text/plain' },
        },
      );
      vi.mocked(mockAgentHandler.handleAgentChat).mockResolvedValue(
        mockResponse,
      );

      // Execute
      await service.handleChat({
        messages,
        model: testAgentModel,
        user: testUser,
        threadId,
      });

      // Verify thread ID was preserved
      expect(mockAgentHandler.handleAgentChat).toHaveBeenCalledWith(
        testAgentModel.id,
        expect.any(Object),
        messages,
        1,
        testUser,
        undefined,
        threadId,
      );
    });

    it('should handle agent with custom temperature', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Generate creative content' },
      ];
      const temperature = 1.5;

      // Mock agent handler response
      const mockResponse = new Response('Creative response...', {
        headers: { 'Content-Type': 'text/plain' },
      });
      vi.mocked(mockAgentHandler.handleAgentChat).mockResolvedValue(
        mockResponse,
      );

      // Execute
      await service.handleChat({
        messages,
        model: testAgentModel,
        user: testUser,
        temperature,
      });

      // Verify custom temperature was used
      expect(mockAgentHandler.handleAgentChat).toHaveBeenCalledWith(
        testAgentModel.id,
        expect.any(Object),
        messages,
        temperature,
        testUser,
        undefined,
        undefined,
      );
    });

    it('should handle agent with bot association', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Help with this task' },
      ];
      const botId = 'specialized-bot';

      // Mock agent handler response
      const mockResponse = new Response('Bot-specific response...', {
        headers: { 'Content-Type': 'text/plain' },
      });
      vi.mocked(mockAgentHandler.handleAgentChat).mockResolvedValue(
        mockResponse,
      );

      // Execute
      await service.handleChat({
        messages,
        model: testAgentModel,
        user: testUser,
        botId,
      });

      // Verify bot association
      expect(mockAgentHandler.handleAgentChat).toHaveBeenCalledWith(
        testAgentModel.id,
        expect.any(Object),
        messages,
        1,
        testUser,
        botId,
        undefined,
      );
    });
  });
});
