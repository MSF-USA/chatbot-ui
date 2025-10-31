import { ToolRouterService } from '@/lib/services/chat/ToolRouterService';

import { Message, ToolRouterRequest } from '@/types/chat';
import { OpenAIModel, OpenAIModelID, OpenAIModels } from '@/types/openai';

import { OpenAI } from 'openai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock OpenAI client
vi.mock('openai');

describe('ToolRouterService', () => {
  let service: ToolRouterService;
  let mockClient: OpenAI;
  let routerModel: OpenAIModel;

  beforeEach(() => {
    vi.clearAllMocks();

    routerModel = OpenAIModels[OpenAIModelID.GPT_4_1];

    // Create mock OpenAI client
    mockClient = {
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    } as any;

    service = new ToolRouterService(mockClient, routerModel);
  });

  describe('determineTool', () => {
    it('should determine web search is needed for current events question', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'What are the latest developments in AI?',
          messageType: 'text',
        },
      ];

      const request: ToolRouterRequest = {
        messages,
        currentMessage: 'What are the latest developments in AI?',
      };

      // Mock OpenAI response
      vi.mocked(mockClient.chat.completions.create).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                tools: ['web_search'],
                searchQuery: 'latest AI developments 2024',
                reasoning:
                  'User is asking about recent/current AI developments',
              }),
            },
          },
        ],
      } as any);

      const result = await service.determineTool(request);

      expect(result.tools).toEqual(['web_search']);
      expect(result.searchQuery).toBe('latest AI developments 2024');
      expect(result.reasoning).toBeTruthy();

      // Verify OpenAI was called with correct params
      expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: routerModel.id,
          temperature: 0.1,
          response_format: { type: 'json_object' },
          max_tokens: 500,
        }),
      );
    });

    it('should determine NO web search needed for general knowledge question', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'Explain how binary search works',
          messageType: 'text',
        },
      ];

      const request: ToolRouterRequest = {
        messages,
        currentMessage: 'Explain how binary search works',
      };

      // Mock OpenAI response
      vi.mocked(mockClient.chat.completions.create).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                tools: [],
                reasoning:
                  'General algorithm explanation, no current info needed',
              }),
            },
          },
        ],
      } as any);

      const result = await service.determineTool(request);

      expect(result.tools).toEqual([]);
      expect(result.searchQuery).toBeUndefined();
    });

    it('should determine web search needed for "latest version" question', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'What is the latest TypeScript version?',
          messageType: 'text',
        },
      ];

      const request: ToolRouterRequest = {
        messages,
        currentMessage: 'What is the latest TypeScript version?',
      };

      // Mock OpenAI response
      vi.mocked(mockClient.chat.completions.create).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                tools: ['web_search'],
                searchQuery: 'latest TypeScript version 2024',
                reasoning: 'User needs current version info',
              }),
            },
          },
        ],
      } as any);

      const result = await service.determineTool(request);

      expect(result.tools).toEqual(['web_search']);
      expect(result.searchQuery).toContain('TypeScript');
      expect(result.searchQuery).toContain('version');
    });

    it('should determine web search needed for news/current events', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'What happened in tech today?',
          messageType: 'text',
        },
      ];

      const request: ToolRouterRequest = {
        messages,
        currentMessage: 'What happened in tech today?',
      };

      // Mock OpenAI response
      vi.mocked(mockClient.chat.completions.create).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                tools: ['web_search'],
                searchQuery: 'tech news today',
                reasoning: 'Current events question requires web search',
              }),
            },
          },
        ],
      } as any);

      const result = await service.determineTool(request);

      expect(result.tools).toEqual(['web_search']);
      expect(result.searchQuery).toBeTruthy();
    });

    it('should NOT determine web search for coding help', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'How do I create a React component?',
          messageType: 'text',
        },
      ];

      const request: ToolRouterRequest = {
        messages,
        currentMessage: 'How do I create a React component?',
      };

      // Mock OpenAI response
      vi.mocked(mockClient.chat.completions.create).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                tools: [],
                reasoning: 'General programming question, no web search needed',
              }),
            },
          },
        ],
      } as any);

      const result = await service.determineTool(request);

      expect(result.tools).toEqual([]);
    });

    it('should handle conversation context (multiple messages)', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'Tell me about TypeScript',
          messageType: 'text',
        },
        {
          role: 'assistant',
          content: 'TypeScript is a typed superset of JavaScript...',
          messageType: undefined,
        },
        {
          role: 'user',
          content: 'What is the latest version?',
          messageType: 'text',
        },
      ];

      const request: ToolRouterRequest = {
        messages,
        currentMessage: 'What is the latest version?',
      };

      // Mock OpenAI response
      vi.mocked(mockClient.chat.completions.create).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                tools: ['web_search'],
                searchQuery: 'latest TypeScript version 2024',
                reasoning:
                  'Follow-up question about latest version based on context',
              }),
            },
          },
        ],
      } as any);

      const result = await service.determineTool(request);

      expect(result.tools).toEqual(['web_search']);
      expect(result.searchQuery).toContain('TypeScript');

      // Verify last 3 messages were used (should include all 3)
      const callArgs = vi.mocked(mockClient.chat.completions.create).mock
        .calls[0][0];
      const userMessage = callArgs.messages.find((m: any) => m.role === 'user');
      expect(userMessage.content).toContain('Tell me about TypeScript');
      expect(userMessage.content).toContain('What is the latest version?');
    });

    it('should handle malformed JSON response gracefully', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'Test question',
          messageType: 'text',
        },
      ];

      const request: ToolRouterRequest = {
        messages,
        currentMessage: 'Test question',
      };

      // Mock OpenAI response with invalid JSON
      vi.mocked(mockClient.chat.completions.create).mockResolvedValue({
        choices: [
          {
            message: {
              content: 'not valid json',
            },
          },
        ],
      } as any);

      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = await service.determineTool(request);

      // Should return empty tools array on error
      expect(result.tools).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle empty response content gracefully', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'Test question',
          messageType: 'text',
        },
      ];

      const request: ToolRouterRequest = {
        messages,
        currentMessage: 'Test question',
      };

      // Mock OpenAI response with no content
      vi.mocked(mockClient.chat.completions.create).mockResolvedValue({
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      } as any);

      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {});

      const result = await service.determineTool(request);

      // Should return empty tools array
      expect(result.tools).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should handle OpenAI API errors gracefully', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'Test question',
          messageType: 'text',
        },
      ];

      const request: ToolRouterRequest = {
        messages,
        currentMessage: 'Test question',
      };

      // Mock OpenAI API error
      vi.mocked(mockClient.chat.completions.create).mockRejectedValue(
        new Error('API Error'),
      );

      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = await service.determineTool(request);

      // Should return empty tools array on error
      expect(result.tools).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should use low temperature (0.1) for consistent routing', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'Test question',
          messageType: 'text',
        },
      ];

      const request: ToolRouterRequest = {
        messages,
        currentMessage: 'Test question',
      };

      // Mock OpenAI response
      vi.mocked(mockClient.chat.completions.create).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                tools: [],
                reasoning: 'No tools needed',
              }),
            },
          },
        ],
      } as any);

      await service.determineTool(request);

      // Verify low temperature
      expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.1,
        }),
      );
    });

    it('should include system prompt with tool determination guidelines', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'Test question',
          messageType: 'text',
        },
      ];

      const request: ToolRouterRequest = {
        messages,
        currentMessage: 'Test question',
      };

      // Mock OpenAI response
      vi.mocked(mockClient.chat.completions.create).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                tools: [],
                reasoning: 'No tools needed',
              }),
            },
          },
        ],
      } as any);

      await service.determineTool(request);

      // Verify system prompt is included
      const callArgs = vi.mocked(mockClient.chat.completions.create).mock
        .calls[0][0];
      const systemMessage = callArgs.messages.find(
        (m: any) => m.role === 'system',
      );
      expect(systemMessage).toBeDefined();
      expect(systemMessage.content).toContain('tool router');
      expect(systemMessage.content).toContain('web_search');
    });
  });
});
