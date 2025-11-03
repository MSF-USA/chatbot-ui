import { ChatOrchestrator } from '@/lib/services/chat/ChatOrchestrator';

import { Message } from '@/types/chat';
import { OpenAIModelID, OpenAIModels } from '@/types/openai';

import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests for ChatOrchestrator - Privacy-focused routing system
 */
describe('ChatOrchestrator', () => {
  let orchestrator: ChatOrchestrator;
  let mockStandardChatService: any;
  let mockAgentChatService: any;
  let mockToolRouterService: any;
  let mockToolRegistry: any;
  let mockUser: any;

  beforeEach(() => {
    // Mock services
    mockStandardChatService = {
      handleChat: vi.fn(),
    };

    mockAgentChatService = {
      handleChat: vi.fn(),
      executeWebSearchTool: vi.fn(),
    };

    mockToolRouterService = {
      determineTool: vi.fn(),
    };

    mockToolRegistry = {
      getTool: vi.fn(),
      register: vi.fn(),
    };

    mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      displayName: 'Test User',
    };

    orchestrator = new ChatOrchestrator(
      mockStandardChatService,
      mockAgentChatService,
      mockToolRouterService,
      mockToolRegistry,
    );
  });

  describe('Privacy Mode OFF (minimizeAIFoundryUse: false)', () => {
    it('should route directly to AgentChatService', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'What is the weather today?',
          messageType: undefined,
        },
      ];
      const model = OpenAIModels[OpenAIModelID.GPT_5];

      const mockResponse = new Response('test response');
      vi.mocked(mockAgentChatService.handleChat).mockResolvedValue(
        mockResponse,
      );

      const result = await orchestrator.handleChat({
        messages,
        model,
        user: mockUser,
        minimizeAIFoundryUse: false,
        agentModel: model,
      });

      // Should call agent service directly
      expect(mockAgentChatService.handleChat).toHaveBeenCalledWith({
        messages,
        model,
        user: mockUser,
        temperature: undefined,
        botId: undefined,
      });

      // Should NOT call tool router
      expect(mockToolRouterService.determineTool).not.toHaveBeenCalled();

      expect(result).toBe(mockResponse);
    });

    it('should use agentModel parameter when provided', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello world', messageType: undefined },
      ];
      const model = OpenAIModels[OpenAIModelID.GPT_5];
      const agentModel = OpenAIModels[OpenAIModelID.GPT_4_1];

      const mockResponse = new Response('test response');
      vi.mocked(mockAgentChatService.handleChat).mockResolvedValue(
        mockResponse,
      );

      await orchestrator.handleChat({
        messages,
        model,
        user: mockUser,
        minimizeAIFoundryUse: false,
        agentModel,
      });

      // Should use agentModel instead of model
      expect(mockAgentChatService.handleChat).toHaveBeenCalledWith({
        messages,
        model: agentModel,
        user: mockUser,
        temperature: undefined,
        botId: undefined,
      });
    });
  });

  describe('Privacy Mode ON (minimizeAIFoundryUse: true)', () => {
    describe('No tools needed', () => {
      it('should use StandardChatService when no tools are needed', async () => {
        const messages: Message[] = [
          { role: 'user', content: 'What is 2 + 2?', messageType: undefined },
        ];
        const model = OpenAIModels[OpenAIModelID.GPT_5];

        // Tool router returns no tools
        vi.mocked(mockToolRouterService.determineTool).mockResolvedValue({
          tools: [],
          reasoning: 'Simple math, no tools needed',
        });

        const mockResponse = new Response('4');
        vi.mocked(mockStandardChatService.handleChat).mockResolvedValue(
          mockResponse,
        );

        const result = await orchestrator.handleChat({
          messages,
          model,
          user: mockUser,
          systemPrompt: 'You are a helpful assistant',
          minimizeAIFoundryUse: true,
        });

        // Should call tool router
        expect(mockToolRouterService.determineTool).toHaveBeenCalledWith({
          messages,
          currentMessage: 'What is 2 + 2?',
        });

        // Should call standard chat service
        expect(mockStandardChatService.handleChat).toHaveBeenCalledWith({
          messages,
          model,
          user: mockUser,
          systemPrompt: 'You are a helpful assistant',
          temperature: undefined,
          stream: undefined,
          botId: undefined,
          reasoningEffort: undefined,
          verbosity: undefined,
        });

        expect(result).toBe(mockResponse);
      });
    });

    describe('Web search tool needed', () => {
      it('should execute web search and enhance context', async () => {
        const messages: Message[] = [
          {
            role: 'user',
            content: 'What is the latest news?',
            messageType: undefined,
          },
        ];
        const model = OpenAIModels[OpenAIModelID.GPT_5];
        const agentModel = OpenAIModels[OpenAIModelID.GPT_4_1];

        // Tool router determines web search is needed
        vi.mocked(mockToolRouterService.determineTool).mockResolvedValue({
          tools: ['web_search'],
          searchQuery: 'latest news 2025',
          reasoning: 'User wants current news',
        });

        // Mock web search tool
        const mockWebSearchTool = {
          name: 'Web Search',
          type: 'web_search',
          execute: vi.fn().mockResolvedValue({
            text: 'Latest news: AI breakthroughs...',
            citations: [
              { number: 1, url: 'https://example.com/news', title: 'News' },
            ],
          }),
        };
        vi.mocked(mockToolRegistry.getTool).mockReturnValue(mockWebSearchTool);

        // Mock standard chat response (after tool execution)
        const mockResponseBody = new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('Here is the news...'));
            controller.close();
          },
        });
        const mockResponse = new Response(mockResponseBody);
        vi.mocked(mockStandardChatService.handleChat).mockResolvedValue(
          mockResponse,
        );

        const result = await orchestrator.handleChat({
          messages,
          model,
          user: mockUser,
          systemPrompt: 'You are helpful',
          minimizeAIFoundryUse: true,
          agentModel,
        });

        // Should call tool router
        expect(mockToolRouterService.determineTool).toHaveBeenCalled();

        // Should execute web search tool
        expect(mockWebSearchTool.execute).toHaveBeenCalledWith({
          searchQuery: 'latest news 2025',
          model: agentModel,
          user: mockUser,
        });

        // Should call standard chat with enhanced context
        expect(mockStandardChatService.handleChat).toHaveBeenCalled();
        const callArgs = mockStandardChatService.handleChat.mock.calls[0][0];

        // Should have added tool context messages
        expect(callArgs.messages.length).toBeGreaterThan(messages.length);

        // Should have system message with search results
        const systemMessages = callArgs.messages.filter(
          (m: Message) => m.role === 'system',
        );
        expect(systemMessages.length).toBeGreaterThan(0);
        expect(systemMessages[0].content).toContain('Web Search results');
        expect(systemMessages[0].content).toContain(
          'Latest news: AI breakthroughs...',
        );

        expect(result).toBeDefined();
      });

      it('should prepend action metadata for immediate feedback', async () => {
        const messages: Message[] = [
          {
            role: 'user',
            content: 'Search for TypeScript best practices',
            messageType: undefined,
          },
        ];
        const model = OpenAIModels[OpenAIModelID.GPT_5];
        const agentModel = OpenAIModels[OpenAIModelID.GPT_4_1];

        // Tool router determines web search
        vi.mocked(mockToolRouterService.determineTool).mockResolvedValue({
          tools: ['web_search'],
          searchQuery: 'TypeScript best practices 2025',
        });

        // Mock web search tool
        const mockWebSearchTool = {
          name: 'Web Search',
          type: 'web_search',
          execute: vi.fn().mockResolvedValue({
            text: 'TypeScript best practices include...',
            citations: [{ number: 1, url: 'https://ts.org', title: 'TS' }],
          }),
        };
        vi.mocked(mockToolRegistry.getTool).mockReturnValue(mockWebSearchTool);

        // Mock response with stream
        const originalStreamChunks = ['Here are the best practices...'];
        const mockResponseBody = new ReadableStream({
          start(controller) {
            originalStreamChunks.forEach((chunk) =>
              controller.enqueue(new TextEncoder().encode(chunk)),
            );
            controller.close();
          },
        });
        const mockResponse = new Response(mockResponseBody);
        vi.mocked(mockStandardChatService.handleChat).mockResolvedValue(
          mockResponse,
        );

        const result = await orchestrator.handleChat({
          messages,
          model,
          user: mockUser,
          minimizeAIFoundryUse: true,
          agentModel,
        });

        // Read the transformed stream
        const reader = result.body!.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullContent += decoder.decode(value, { stream: true });
        }

        // Should contain action metadata at the beginning
        expect(fullContent).toContain('<<<METADATA_START>>>');
        expect(fullContent).toContain('"action":"Searching the web..."');

        // Should contain citations at the end
        expect(fullContent).toContain('"citations"');
      });

      it('should handle tool execution errors gracefully', async () => {
        const messages: Message[] = [
          { role: 'user', content: 'Search news', messageType: undefined },
        ];
        const model = OpenAIModels[OpenAIModelID.GPT_5];

        // Tool router says search
        vi.mocked(mockToolRouterService.determineTool).mockResolvedValue({
          tools: ['web_search'],
          searchQuery: 'news',
        });

        // Mock tool that throws error
        const mockWebSearchTool = {
          name: 'Web Search',
          type: 'web_search',
          execute: vi.fn().mockRejectedValue(new Error('Search failed')),
        };
        vi.mocked(mockToolRegistry.getTool).mockReturnValue(mockWebSearchTool);

        // Should still complete with standard chat (no tool results)
        const mockResponse = new Response('I cannot search right now');
        vi.mocked(mockStandardChatService.handleChat).mockResolvedValue(
          mockResponse,
        );

        const result = await orchestrator.handleChat({
          messages,
          model,
          user: mockUser,
          minimizeAIFoundryUse: true,
          agentModel: model,
        });

        // Should have called standard chat despite error
        expect(mockStandardChatService.handleChat).toHaveBeenCalled();
        expect(result).toBe(mockResponse);
      });

      it('should skip web search if no agentModel provided', async () => {
        const messages: Message[] = [
          { role: 'user', content: 'Latest news', messageType: undefined },
        ];
        const model = OpenAIModels[OpenAIModelID.GPT_5];

        vi.mocked(mockToolRouterService.determineTool).mockResolvedValue({
          tools: ['web_search'],
          searchQuery: 'latest news',
        });

        const mockWebSearchTool = {
          name: 'Web Search',
          type: 'web_search',
          execute: vi.fn(),
        };
        vi.mocked(mockToolRegistry.getTool).mockReturnValue(mockWebSearchTool);

        const mockResponse = new Response('Cannot search');
        vi.mocked(mockStandardChatService.handleChat).mockResolvedValue(
          mockResponse,
        );

        // No agentModel provided
        await orchestrator.handleChat({
          messages,
          model,
          user: mockUser,
          minimizeAIFoundryUse: true,
          // agentModel: undefined
        });

        // Should NOT execute web search tool
        expect(mockWebSearchTool.execute).not.toHaveBeenCalled();

        // Should still call standard chat
        expect(mockStandardChatService.handleChat).toHaveBeenCalled();
      });
    });

    describe('Tool router errors', () => {
      it('should fallback to standard chat if tool router fails', async () => {
        const messages: Message[] = [
          { role: 'user', content: 'Hello', messageType: undefined },
        ];
        const model = OpenAIModels[OpenAIModelID.GPT_5];

        // Tool router returns empty tools on error (it catches errors internally)
        vi.mocked(mockToolRouterService.determineTool).mockResolvedValue({
          tools: [],
        });

        const mockResponse = new Response('Hello!');
        vi.mocked(mockStandardChatService.handleChat).mockResolvedValue(
          mockResponse,
        );

        const result = await orchestrator.handleChat({
          messages,
          model,
          user: mockUser,
          minimizeAIFoundryUse: true,
        });

        // Should use standard chat as fallback
        expect(mockStandardChatService.handleChat).toHaveBeenCalled();
        expect(result).toBe(mockResponse);
      });

      it('should handle tool router returning no tools array', async () => {
        const messages: Message[] = [
          { role: 'user', content: 'Test', messageType: undefined },
        ];
        const model = OpenAIModels[OpenAIModelID.GPT_5];

        // Tool router returns empty response
        vi.mocked(mockToolRouterService.determineTool).mockResolvedValue({
          tools: [],
        });

        const mockResponse = new Response('Response');
        vi.mocked(mockStandardChatService.handleChat).mockResolvedValue(
          mockResponse,
        );

        const result = await orchestrator.handleChat({
          messages,
          model,
          user: mockUser,
          minimizeAIFoundryUse: true,
        });

        expect(mockStandardChatService.handleChat).toHaveBeenCalled();
        expect(result).toBe(mockResponse);
      });
    });

    describe('Complex message content', () => {
      it('should extract text from array content', async () => {
        const messages: Message[] = [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'What is this image?' },
              {
                type: 'image_url',
                image_url: { url: 'data:...', detail: 'auto' },
              },
            ],
            messageType: 'text' as const,
          },
        ];
        const model = OpenAIModels[OpenAIModelID.GPT_5];

        vi.mocked(mockToolRouterService.determineTool).mockResolvedValue({
          tools: [],
        });

        const mockResponse = new Response('test');
        vi.mocked(mockStandardChatService.handleChat).mockResolvedValue(
          mockResponse,
        );

        await orchestrator.handleChat({
          messages,
          model,
          user: mockUser,
          minimizeAIFoundryUse: true,
        });

        // Should extract text content for tool router
        expect(mockToolRouterService.determineTool).toHaveBeenCalledWith({
          messages,
          currentMessage: 'What is this image?',
        });
      });

      it('should handle non-text content gracefully', async () => {
        const messages: Message[] = [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: 'data:...', detail: 'auto' },
              },
            ],
            messageType: 'image' as const,
          },
        ];
        const model = OpenAIModels[OpenAIModelID.GPT_5];

        vi.mocked(mockToolRouterService.determineTool).mockResolvedValue({
          tools: [],
        });

        const mockResponse = new Response('test');
        vi.mocked(mockStandardChatService.handleChat).mockResolvedValue(
          mockResponse,
        );

        await orchestrator.handleChat({
          messages,
          model,
          user: mockUser,
          minimizeAIFoundryUse: true,
        });

        // Should handle gracefully
        expect(mockToolRouterService.determineTool).toHaveBeenCalledWith({
          messages,
          currentMessage: '[non-text content]',
        });
      });
    });
  });
});
