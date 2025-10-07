import { IconNews } from '@tabler/icons-react';

import { Session } from 'next-auth';

import { RAGService } from '@/lib/services/ragService';

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
        chunk: 'Test content 1',
      },
    },
    {
      document: {
        title: 'Test Document 2',
        date: '2024-01-02',
        url: 'https://test.com/2',
        chunk: 'Test content 2',
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

  describe('reformulateQuery', () => {
    it('should reformulate query with conversation context', async () => {
      // Mock the OpenAI response for query reformulation
      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'reformulated test query with context',
            },
          },
        ],
      });

      const messages: Message[] = [
        {
          role: 'user',
          content: 'initial question',
          messageType: MessageType.TEXT,
        },
        {
          role: 'assistant',
          content: 'initial response',
          messageType: MessageType.TEXT,
        },
        {
          role: 'user',
          content: 'follow up question',
          messageType: MessageType.TEXT,
        },
      ];

      const result = await ragService.reformulateQuery(messages);
      expect(result).toBe('reformulated test query with context');

      // Verify the OpenAI client was called with appropriate parameters
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-mini',
          temperature: 0.2,
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('follow up question'),
            }),
          ]),
        }),
      );
    });

    it('should fall back to original query if reformulation fails', async () => {
      // Mock the OpenAI client to throw an error
      mockOpenAIClient.chat.completions.create.mockRejectedValueOnce(
        new Error('API error'),
      );

      const messages: Message[] = [
        {
          role: 'user',
          content: 'test query',
          messageType: MessageType.TEXT,
        },
      ];

      const result = await ragService.reformulateQuery(messages);
      expect(result).toBe('test query');
    });
  });

  describe('performSearch', () => {
    it('should perform search with semantic options for initial query', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'test query',
          messageType: MessageType.TEXT,
        },
      ];

      // Spy on extractQuery
      const extractQuerySpy = vi.spyOn(ragService, 'extractQuery');

      // Spy on reformulateQuery (to ensure it's NOT called for initial queries)
      const reformulateQuerySpy = vi.spyOn(ragService, 'reformulateQuery');

      const { searchDocs, searchMetadata } = await ragService.performSearch(
        messages,
        'test-bot',
        [mockBot],
        mockUser,
      );

      // Verify extractQuery was called and reformulateQuery was NOT called
      expect(extractQuerySpy).toHaveBeenCalledWith(messages);
      expect(reformulateQuerySpy).not.toHaveBeenCalled();

      // Verify the search was called with correct parameters
      expect(mockSearchClient.search).toHaveBeenCalledWith(
        'test query',
        expect.objectContaining({
          select: ['chunk', 'title', 'date', 'url'],
          top: 10,
          queryType: 'semantic',
          semanticSearchOptions: expect.objectContaining({
            configurationName: 'test-index-semantic-configuration',
          }),
          vectorSearchOptions: expect.objectContaining({
            queries: expect.arrayContaining([
              expect.objectContaining({
                kind: 'text',
                text: 'test query',
                fields: ['text_vector'],
              }),
            ]),
          }),
        }),
      );

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

    it('should use reformulateQuery for follow-up questions', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'initial question',
          messageType: MessageType.TEXT,
        },
        {
          role: 'assistant',
          content: 'initial response',
          messageType: MessageType.TEXT,
        },
        {
          role: 'user',
          content: 'follow up question',
          messageType: MessageType.TEXT,
        },
      ];

      // Mock the reformulateQuery method
      const reformulateSpy = vi.spyOn(ragService, 'reformulateQuery');
      reformulateSpy.mockResolvedValue('reformulated query');

      await ragService.performSearch(messages, 'test-bot', [mockBot], mockUser);

      // Verify reformulateQuery was called for follow-up questions
      expect(reformulateSpy).toHaveBeenCalledWith(messages);

      // Verify the search was called with the reformulated query
      expect(mockSearchClient.search).toHaveBeenCalledWith(
        'reformulated query',
        expect.any(Object),
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
    it('should format messages with context and source numbering', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'test message',
          messageType: MessageType.TEXT,
        },
      ];

      // When testing getCompletionMessages, set the searchDocs property
      ragService.searchDocs = mockSearchResults.map((r) => r.document);

      const result = ragService.getCompletionMessages(
        messages,
        mockBot,
        mockSearchResults.map((r) => r.document),
      );

      // Verify format of messages
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('user');
      expect(typeof result[0].content).toBe('string');

      // Check for source numbering in the content
      const content = result[0].content as string;
      expect(content).toContain('Source 1:');
      expect(content).toContain('Source 2:');
      expect(content).toContain('Question: test message');

      // Should not include follow-up context note for initial question
      expect(content).not.toContain('This is a follow-up question');
    });

    it('should include follow-up context for follow-up questions', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'initial question',
          messageType: MessageType.TEXT,
        },
        {
          role: 'assistant',
          content: 'initial response',
          messageType: MessageType.TEXT,
        },
        {
          role: 'user',
          content: 'follow up question',
          messageType: MessageType.TEXT,
        },
      ];

      // When testing getCompletionMessages, set the searchDocs property
      ragService.searchDocs = mockSearchResults.map((r) => r.document);

      const result = ragService.getCompletionMessages(
        messages,
        mockBot,
        mockSearchResults.map((r) => r.document),
      );

      // Check for follow-up context note
      const content = result[2].content as string;
      expect(content).toContain('This is a follow-up question');
      expect(content).toContain('Previous questions include');
      expect(content).toContain('initial question');
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

      // Mock performSearch
      vi.spyOn(ragService, 'performSearch').mockResolvedValue({
        searchDocs: mockSearchResults.map((r) => r.document),
        searchMetadata: {
          dateRange: {
            newest: '2024-01-02',
            oldest: '2024-01-01',
          },
          resultCount: 2,
        },
      });

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

      // Mock performSearch
      vi.spyOn(ragService, 'performSearch').mockResolvedValue({
        searchDocs: mockSearchResults.map((r) => r.document),
        searchMetadata: {
          dateRange: {
            newest: '2024-01-02',
            oldest: '2024-01-01',
          },
          resultCount: 2,
        },
      });

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

      // Mock performSearch
      vi.spyOn(ragService, 'performSearch').mockResolvedValue({
        searchDocs: mockSearchResults.map((r) => r.document),
        searchMetadata: {
          dateRange: {
            newest: '2024-01-02',
            oldest: '2024-01-01',
          },
          resultCount: 2,
        },
      });

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
      // Mock the search docs
      ragService.searchDocs = mockSearchResults.map((r) => r.document);

      // Directly set up the sourcesNumberMap for testing
      // This is what getCompletionMessages would do
      (ragService as any).sourcesNumberMap = new Map();
      (ragService as any).sourcesNumberMap.set(1, {
        title: 'Test Document 1',
        date: '2024-01-01',
        url: 'https://test.com/1',
        chunk: 'Test content 1',
      });
      (ragService as any).sourcesNumberMap.set(2, {
        title: 'Test Document 2',
        date: '2024-01-02',
        url: 'https://test.com/2',
        chunk: 'Test content 2',
      });

      // Initialize citation tracking
      ragService.initCitationTracking(true);
    });

    it('should process citations correctly', () => {
      const content = 'This is a test [1] with multiple citations [2]';

      // Process the citations
      const processed = ragService.processCitationsInContent(content);

      expect(processed).toHaveLength(2);
      expect(processed[0]).toMatchObject({
        title: 'Test Document 1',
        date: expect.any(String),
        url: 'https://test.com/1',
        number: 1,
      });
      expect(processed[1]).toMatchObject({
        title: 'Test Document 2',
        date: expect.any(String),
        url: 'https://test.com/2',
        number: 2,
      });
    });

    it('should handle split citations across chunks', () => {
      // Reset citation tracking
      ragService.initCitationTracking(true);

      // Process chunks with split citation
      const chunk1 = ragService.processCitationInChunk('This is a test [');
      const chunk2 = ragService.processCitationInChunk('1]');
      const chunk3 = ragService.processCitationInChunk(' with citation');

      expect(chunk1 + chunk2 + chunk3).toBe('This is a test [1] with citation');

      // Get the citations that were processed
      const citations = ragService.getCurrentCitations();
      expect(citations).toHaveLength(1);
      expect(citations[0].number).toBe(1);
    });

    it('should ignore text in brackets that contains letters', () => {
      // Reset citation tracking
      ragService.initCitationTracking(true);

      const content = 'This is [not a citation] but this is [1]';
      ragService.processCitationInChunk(content);

      // Get the citations that were processed
      const citations = ragService.getCurrentCitations();
      expect(citations).toHaveLength(1);
    });

    it('should reset citation tracking state', () => {
      // First add some citations
      ragService.processCitationInChunk('This is a test [1] and [2]');

      // Verify citations were added
      expect(ragService.getCurrentCitations()).toHaveLength(2);

      // Then reset (but maintain sourcesNumberMap)
      ragService.initCitationTracking(true);

      // Verify citation tracking was reset but sourcesNumberMap preserved
      expect(ragService.getCurrentCitations()).toHaveLength(0);
      expect((ragService as any).sourcesNumberMap.size).toBe(2);

      // Complete reset including sourcesNumberMap
      ragService.initCitationTracking(false);
      expect((ragService as any).sourcesNumberMap.size).toBe(0);
    });

    it('should deduplicate citations', () => {
      // Process content with duplicate citations
      const content = 'This cites [1] and then cites [1] again, plus [2]';
      ragService.processCitationInChunk(content);

      // Get the citations
      const citations = ragService.getCurrentCitations();

      // Get the deduplicated citations
      const uniqueCitations = ragService.deduplicateCitations(citations);

      // Should have 2 unique citations even though [1] appears twice
      expect(uniqueCitations).toHaveLength(2);
    });
  });

  describe('deduplicateResults', () => {
    it('should deduplicate search results by URL and title', () => {
      // Create test data with duplicates
      const duplicateResults = [
        {
          title: 'Duplicate Title',
          date: '2024-01-01',
          url: 'https://test.com/dup1',
          chunk: 'Content 1',
        },
        {
          title: 'Duplicate Title', // Same title as above
          date: '2024-01-02',
          url: 'https://test.com/unique',
          chunk: 'Content 2',
        },
        {
          title: 'Unique Title',
          date: '2024-01-03',
          url: 'https://test.com/dup1', // Same URL as first item
          chunk: 'Content 3',
        },
        {
          title: 'Another Title',
          date: '2024-01-04',
          url: 'https://test.com/another',
          chunk: 'Content 4',
        },
      ];

      // Call the private method using any type assertion
      const deduplicateResults = (ragService as any).deduplicateResults.bind(
        ragService,
      );
      const result = deduplicateResults(duplicateResults);

      // Should remove duplicates (by URL or title)
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Duplicate Title');
      expect(result[1].title).toBe('Another Title');
    });
  });
});
