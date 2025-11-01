import { AgentChatService } from '@/lib/services/chat/AgentChatService';
import { WebSearchTool } from '@/lib/services/chat/tools/WebSearchTool';

import { OpenAIModel, OpenAIModelID, OpenAIModels } from '@/types/openai';

import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('WebSearchTool', () => {
  let tool: WebSearchTool;
  let mockAgentChatService: AgentChatService;

  const testUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  const testModel: OpenAIModel = OpenAIModels[OpenAIModelID.GPT_4_1];

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock agent chat service
    mockAgentChatService = {
      executeWebSearchTool: vi.fn(),
    } as any;

    tool = new WebSearchTool(mockAgentChatService);
  });

  describe('metadata', () => {
    it('should have correct tool type', () => {
      expect(tool.type).toBe('web_search');
    });

    it('should have descriptive name', () => {
      expect(tool.name).toBe('Web Search');
    });

    it('should have description', () => {
      expect(tool.description.toLowerCase()).toContain('web');
      expect(tool.description.toLowerCase()).toContain('search');
    });
  });

  describe('execute', () => {
    it('should execute web search successfully', async () => {
      const searchQuery = 'latest TypeScript features';
      const mockResults = {
        text: 'TypeScript 5.3 released with... [search results]',
        citations: [],
      };

      vi.mocked(mockAgentChatService.executeWebSearchTool).mockResolvedValue(
        mockResults,
      );

      const result = await tool.execute({
        searchQuery,
        model: testModel,
        user: testUser,
      });

      expect(result).toEqual(mockResults);
      expect(mockAgentChatService.executeWebSearchTool).toHaveBeenCalledWith({
        searchQuery,
        model: testModel,
        user: testUser,
      });
    });

    it('should pass search query to agent service', async () => {
      const searchQuery = 'artificial intelligence news 2024';

      vi.mocked(mockAgentChatService.executeWebSearchTool).mockResolvedValue({
        text: 'AI news results...',
        citations: [],
      });

      await tool.execute({
        searchQuery,
        model: testModel,
        user: testUser,
      });

      expect(mockAgentChatService.executeWebSearchTool).toHaveBeenCalledWith(
        expect.objectContaining({
          searchQuery,
        }),
      );
    });

    it('should pass model to agent service', async () => {
      vi.mocked(mockAgentChatService.executeWebSearchTool).mockResolvedValue({
        text: 'Search results...',
        citations: [],
      });

      await tool.execute({
        searchQuery: 'test query',
        model: testModel,
        user: testUser,
      });

      expect(mockAgentChatService.executeWebSearchTool).toHaveBeenCalledWith(
        expect.objectContaining({
          model: testModel,
        }),
      );
    });

    it('should pass user to agent service', async () => {
      vi.mocked(mockAgentChatService.executeWebSearchTool).mockResolvedValue({
        text: 'Search results...',
        citations: [],
      });

      await tool.execute({
        searchQuery: 'test query',
        model: testModel,
        user: testUser,
      });

      expect(mockAgentChatService.executeWebSearchTool).toHaveBeenCalledWith(
        expect.objectContaining({
          user: testUser,
        }),
      );
    });

    it('should return search results', async () => {
      const expectedResults = {
        text: `Web Search Results:
1. TypeScript 5.3 Released - Official Blog
   TypeScript 5.3 brings new features including...

2. What's New in TypeScript - Microsoft Docs
   Latest features and improvements...`,
        citations: [
          {
            number: 1,
            title: 'TypeScript 5.3 Released - Official Blog',
            url: 'https://example.com/ts-5.3',
            date: '',
          },
        ],
      };

      vi.mocked(mockAgentChatService.executeWebSearchTool).mockResolvedValue(
        expectedResults,
      );

      const result = await tool.execute({
        searchQuery: 'TypeScript latest features',
        model: testModel,
        user: testUser,
      });

      expect(result).toEqual(expectedResults);
    });

    it('should handle agent service errors gracefully', async () => {
      vi.mocked(mockAgentChatService.executeWebSearchTool).mockRejectedValue(
        new Error('Agent service failed'),
      );

      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = await tool.execute({
        searchQuery: 'test query',
        model: testModel,
        user: testUser,
      });

      // Should return empty result on error (fail gracefully)
      expect(result).toEqual({ text: '', citations: [] });
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle empty search results', async () => {
      vi.mocked(mockAgentChatService.executeWebSearchTool).mockResolvedValue({
        text: '',
        citations: [],
      });

      const result = await tool.execute({
        searchQuery: 'test query',
        model: testModel,
        user: testUser,
      });

      expect(result).toEqual({ text: '', citations: [] });
    });

    it('should log search execution', async () => {
      const consoleLogSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      vi.mocked(mockAgentChatService.executeWebSearchTool).mockResolvedValue({
        text: 'Results...',
        citations: [],
      });

      await tool.execute({
        searchQuery: 'test query',
        model: testModel,
        user: testUser,
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Executing search'),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Search completed'),
      );

      consoleLogSpy.mockRestore();
    });

    it('should handle different query types', async () => {
      const queries = [
        'latest AI developments',
        'weather in New York',
        'stock price AAPL',
        'news today',
        'TypeScript version 5.3',
      ];

      for (const query of queries) {
        vi.mocked(mockAgentChatService.executeWebSearchTool).mockResolvedValue({
          text: `Results for: ${query}`,
          citations: [],
        });

        const result = await tool.execute({
          searchQuery: query,
          model: testModel,
          user: testUser,
        });

        expect(result.text).toContain(query);
      }
    });
  });
});
