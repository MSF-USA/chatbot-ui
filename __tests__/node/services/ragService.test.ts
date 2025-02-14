import { IconNews } from '@tabler/icons-react';

import { Session } from 'next-auth';

import { RAGService } from '@/services/ragService';

import { Bot } from '@/types/bots';
import { Message, MessageType } from '@/types/chat';

import { AzureKeyCredential, SearchClient } from '@azure/search-documents';
import { AzureOpenAI } from 'openai';
import { ChatCompletion } from 'openai/resources';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Azure Search Documents
vi.mock('@azure/search-documents', () => {
  return {
    SearchClient: vi.fn(),
    AzureKeyCredential: vi.fn(),
  };
});

// Mock ReadableStream if it's not available in the test environment
if (typeof ReadableStream === 'undefined') {
  global.ReadableStream = class MockReadableStream {
    constructor() {
      return {
        getReader: () => ({
          read: async () => ({ done: true, value: undefined }),
        }),
      };
    }
  } as any;
}

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

  const mockUser = {
    id: 'test-user-id',
    givenName: 'Test',
    surname: 'User',
    displayName: 'Test User',
    jobTitle: 'Software Engineer',
    department: 'Engineering',
    mail: 'test.user@example.com',
    companyName: 'Test Company',
  } as Session['user'];

  beforeEach(() => {
    vi.clearAllMocks();

    mockSearchClient = {
      search: vi.fn().mockResolvedValue({
        results: mockSearchResults,
      }),
    };

    mockLoggingService = {
      logChatCompletion: vi.fn(),
      logError: vi.fn(),
      logFileError: vi.fn(),
      logSearch: vi.fn(),
      logSearchError: vi.fn(),
    };

    mockOpenAIClient = {
      chat: {
        completions: {
          create: vi.fn().mockImplementation(({ stream }) => {
            if (stream) {
              return new ReadableStream({
                start(controller) {
                  controller.enqueue({
                    choices: [{ delta: { content: 'Test content' } }],
                  });
                  controller.close();
                },
              });
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
        mockUser,
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

      expect(mockLoggingService.logSearch).toHaveBeenCalledWith(
        expect.any(Number),
        'test-bot',
        2,
        '2024-01-01',
        '2024-01-02',
        mockUser,
      );
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
        ragService.performSearch(messages, 'invalid-bot', [mockBot], mockUser),
      ).rejects.toThrow('Bot invalid-bot not found');

      expect(mockLoggingService.logSearchError).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Error),
        'invalid-bot',
        mockUser,
      );
    });

    it('should handle search errors and log them', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'test query',
          messageType: MessageType.TEXT,
        },
      ];

      const searchError = new Error('Search failed');
      mockSearchClient.search.mockRejectedValueOnce(searchError);

      await expect(
        ragService.performSearch(messages, 'test-bot', [mockBot], mockUser),
      ).rejects.toThrow('Search failed');

      expect(mockLoggingService.logSearchError).toHaveBeenCalledWith(
        expect.any(Number),
        searchError,
        'test-bot',
        mockUser,
      );
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

      expect(result).toHaveLength(1);
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
        mockUser,
      );

      // Expect ChatCompletion type
      expect('choices' in result).toBe(true);
      const completion = result as ChatCompletion;
      expect(completion.choices[0]?.message?.content).toContain(
        'Test response [1] with citation [2]',
      );

      // Verify the content includes metadata
      const content = completion.choices[0]?.message?.content || '';
      expect(content).toContain('Sources used:');
      expect(content).toContain('Date range:');
      expect(content).toContain('Total sources:');

      // Verify logging was called
      expect(mockLoggingService.logChatCompletion).toHaveBeenCalledWith(
        expect.any(Number),
        'test-model',
        messages.length,
        0.5,
        mockUser,
        'test-bot',
      );
    });

    it('should return readable stream when streaming is true', async () => {
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
        mockUser,
      );

      // Verify it's a ReadableStream
      expect(result).toBeInstanceOf(ReadableStream);

      // Verify logging was called
      expect(mockLoggingService.logChatCompletion).toHaveBeenCalledWith(
        expect.any(Number),
        'test-model',
        messages.length,
        0.5,
        mockUser,
        'test-bot',
      );
    });

    it('should handle errors and log them', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'test query',
          messageType: MessageType.TEXT,
        },
      ];

      const error = new Error('Test error');
      mockOpenAIClient.chat.completions.create.mockRejectedValueOnce(error);

      await expect(
        ragService.augmentMessages(
          messages,
          'test-bot',
          [mockBot],
          'test-model',
          false,
          mockUser,
        ),
      ).rejects.toThrow('Test error');
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
