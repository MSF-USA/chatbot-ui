import { IconNews } from '@tabler/icons-react';

import { RAGService } from '@/services/ragService';

import { Bot } from '@/types/bots';
import { Message, MessageType } from '@/types/chat';
import { RAGResponse, SearchResult } from '@/types/rag';

import { AzureKeyCredential, SearchClient } from '@azure/search-documents';
import { AzureOpenAI } from 'openai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Azure Search Documents
vi.mock('@azure/search-documents', () => {
  return {
    SearchClient: vi.fn(),
    AzureKeyCredential: vi.fn(),
  };
});

describe('RAGService', () => {
  let ragService: RAGService;
  let mockSearchClient: any;
  let mockLoggingService: any;
  let mockOpenAIClient: any;

  const mockSearchResults = [
    {
      document: {
        title: 'Test Document 1',
        date: '2024-01-01',
        url: 'https://test.com/1',
        content: 'Test content 1',
      },
    },
    {
      document: {
        title: 'Test Document 2',
        date: '2024-01-02',
        url: 'https://test.com/2',
        content: 'Test content 2',
      },
    },
  ];

  const mockBot: Bot = {
    id: 'test-bot',
    name: 'Test Bot',
    description: 'Test bot description',
    icon: IconNews,
    color: '#000000',
    prompt: 'You are a test bot',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockSearchClient = {
      search: vi.fn().mockResolvedValue({
        results: mockSearchResults,
      }),
    };

    mockLoggingService = {
      logError: vi.fn(),
      logInfo: vi.fn(),
    };

    mockOpenAIClient = {
      chat: {
        completions: {
          create: vi.fn().mockImplementation(({ stream }) => {
            if (stream) {
              return {
                [Symbol.asyncIterator]: () => ({
                  next: async () => ({
                    done: true,
                    value: undefined,
                  }),
                }),
              };
            }
            return Promise.resolve({
              choices: [
                {
                  message: {
                    content: 'Test response [1] with citation [2]',
                  },
                },
              ],
            });
          }),
        },
      },
    };

    (SearchClient as any).mockImplementation(() => mockSearchClient);
    (AzureKeyCredential as any).mockImplementation((key: string) => ({ key }));

    ragService = new RAGService(
      'test-endpoint',
      'test-index',
      'test-api-key',
      mockLoggingService,
      mockOpenAIClient as AzureOpenAI,
    );
  });

  describe('extractQuery', () => {
    it('should extract text content from message', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'test message',
          messageType: MessageType.TEXT,
        },
      ];

      const result = ragService.extractQuery(messages);
      expect(result).toBe('test message');
    });

    it('should return empty string for non-string content', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: 'https://example.com/image.jpg',
                detail: 'auto',
              },
            },
          ],
          messageType: MessageType.IMAGE,
        },
      ];

      const result = ragService.extractQuery(messages);
      expect(result).toBe('');
    });

    it('should throw error if no user message found', () => {
      const messages: Message[] = [
        {
          role: 'assistant',
          content: 'response',
          messageType: MessageType.TEXT,
        },
      ];

      expect(() => ragService.extractQuery(messages)).toThrow(
        'No user message found',
      );
    });
  });

  describe('performSearch', () => {
    it('should perform search and return results with date range', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'test query',
          messageType: MessageType.TEXT,
        },
      ];

      const { searchDocs, searchMetadata } = await ragService.performSearch(
        messages,
        'test-bot',
        [mockBot],
      );

      expect(mockSearchClient.search).toHaveBeenCalledWith('test query', {
        select: ['content', 'title', 'date', 'url'],
        top: 10,
        queryType: 'simple',
      });
      expect(searchDocs).toHaveLength(2);
      expect(searchMetadata.dateRange).toEqual({
        newest: '2024-01-02',
        oldest: '2024-01-01',
      });
    });

    it('should throw error if bot not found', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'test query',
          messageType: MessageType.TEXT,
        },
      ];

      await expect(
        ragService.performSearch(messages, 'invalid-bot', [mockBot]),
      ).rejects.toThrow('Bot invalid-bot not found');
    });
  });

  describe('getCompletionMessages', () => {
    it('should format messages with context', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'test message',
          messageType: MessageType.TEXT,
        },
      ];

      const result = ragService.getCompletionMessages(
        messages,
        mockBot,
        mockSearchResults.map((r) => r.document),
      );

      expect(result).toHaveLength(1); // just the context message
      expect(result[0].role).toBe('user');
      expect(typeof result[0].content).toBe('string');
      expect(result[0].content as string).toContain('Question: test message');
    });
  });

  describe('augmentMessages', () => {
    it('should augment messages with search results when streaming is false', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'test query',
          messageType: MessageType.TEXT,
        },
      ];

      const result = await ragService.augmentMessages(
        messages,
        'test-bot',
        [mockBot],
        'test-model',
        false,
      );

      expect('answer' in result).toBe(true);
      const response = result as RAGResponse;
      expect(response.answer).toBe('Test response [1] with citation [2]');
      expect(response.sources_used).toHaveLength(2);
      expect(response.sources_date_range).toBeDefined();
    });

    it('should return stream when streaming is true', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'test query',
          messageType: MessageType.TEXT,
        },
      ];

      const result = await ragService.augmentMessages(
        messages,
        'test-bot',
        [mockBot],
        'test-model',
        true,
      );

      expect(Symbol.asyncIterator in result).toBe(true);
    });
  });

  describe('citation processing', () => {
    beforeEach(() => {
      ragService.searchDocs = mockSearchResults.map((r) => r.document);
    });

    it('should process citations correctly', () => {
      ragService.resetCitationTracking();
      const content = 'This is a test [1] with multiple citations [2]';
      const processed = ragService.processCitationsInContent(content);

      expect(processed).toHaveLength(2);
      expect(processed[0]).toMatchObject({
        title: 'Test Document 1',
        date: '2024-01-01',
        url: 'https://test.com/1',
        number: 1,
      });
    });

    it('should handle split citations across chunks', () => {
      ragService.resetCitationTracking();
      const chunk1 = ragService.processCitationInChunk('This is a test [');
      const chunk2 = ragService.processCitationInChunk('1]');
      const chunk3 = ragService.processCitationInChunk(' with citation');

      expect(chunk1 + chunk2 + chunk3).toBe('This is a test [1] with citation');
    });

    it('should ignore text in brackets that contains letters', () => {
      ragService.resetCitationTracking();
      const content = 'This is [not a citation] but this is [1]';
      const processed = ragService.processCitationInChunk(content);

      expect(processed).toBe('This is [not a citation] but this is [1]');
    });

    it('should reset citation tracking state', () => {
      ragService.resetCitationTracking();
      expect(ragService.getCurrentCitations()).toHaveLength(0);
    });
  });
});
