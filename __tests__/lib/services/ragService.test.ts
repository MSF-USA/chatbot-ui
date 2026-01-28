/**
 * Unit Tests for RAGService
 *
 * Tests the service that handles Retrieval-Augmented Generation (RAG) operations
 * including Azure AI Search queries and query reformulation using the Foundry LLM.
 */
// Import after mocks are set up
import { RAGService } from '@/lib/services/ragService';

import { Message } from '@/types/chat';

import { getOrganizationAgentById } from '@/lib/organizationAgents';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Create mock search function that we can control
const mockSearch = vi.fn();

// Mock Azure Search SDK - must be before import
vi.mock('@azure/search-documents', () => ({
  SearchClient: class MockSearchClient {
    search = mockSearch;
    constructor() {}
  },
}));

// Mock Azure Identity
vi.mock('@azure/identity', () => ({
  DefaultAzureCredential: vi.fn(),
}));

// Mock organization agents
vi.mock('@/lib/organizationAgents', () => ({
  getOrganizationAgentById: vi.fn(),
}));

describe('RAGService', () => {
  let ragService: RAGService;
  let mockOpenAIClient: any;

  const mockOrganizationAgent = {
    id: 'msf_communications',
    name: 'MSF Communications',
    type: 'rag' as const,
    description: 'Test agent',
    systemPrompt: 'You are a helpful communications assistant.',
    icon: 'IconMessageCircle',
    sources: ['Internal Communications'],
    ragConfig: {
      topK: 5,
      semanticConfig: 'custom-semantic-config',
    },
  };

  // Helper to create async generator for search results
  const createMockSearchResults = (docs: any[]) => ({
    results: (async function* () {
      for (const doc of docs) {
        yield { document: doc };
      }
    })(),
  });

  const defaultSearchDocs = [
    {
      chunk: 'Document 1 content about communications policy.',
      title: 'Communications Policy Guide',
      date: '2025-01-15',
      url: 'https://example.com/doc1',
    },
    {
      chunk: 'Document 2 content about internal procedures.',
      title: 'Internal Procedures Manual',
      date: '2025-01-10',
      url: 'https://example.com/doc2',
    },
  ];

  const mockUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset the mock search function
    mockSearch.mockReset();
    mockSearch.mockReturnValue(createMockSearchResults(defaultSearchDocs));

    // Mock OpenAI client for query reformulation
    mockOpenAIClient = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: 'reformulated search query',
                },
              },
            ],
          }),
        },
      },
    };

    // Create RAGService instance
    ragService = new RAGService(
      'https://search.example.com',
      'test-index',
      mockOpenAIClient,
    );

    // Mock organization agent lookup
    (getOrganizationAgentById as any).mockReturnValue(mockOrganizationAgent);
  });

  describe('performSearch', () => {
    const createTestMessages = (content: string): Message[] => [
      { role: 'user', content },
    ];

    it('should perform search with correct parameters', async () => {
      const messages = createTestMessages('What is the communications policy?');

      // Reset mock to return fresh async generator
      mockSearch.mockReturnValue(
        createMockSearchResults([
          {
            chunk: 'Test content',
            title: 'Test Title',
            date: '2025-01-15',
            url: 'https://example.com/test',
          },
        ]),
      );

      const result = await ragService.performSearch(
        messages,
        'msf_communications',
        mockUser as any,
      );

      expect(mockSearch).toHaveBeenCalled();
      expect(result.searchDocs).toBeDefined();
      expect(result.searchMetadata).toBeDefined();
    });

    it('should use agent ragConfig for topK', async () => {
      const messages = createTestMessages('Test query');

      mockSearch.mockReturnValue(createMockSearchResults([]));

      await ragService.performSearch(
        messages,
        'msf_communications',
        mockUser as any,
      );

      // Verify search was called with agent's topK (5)
      expect(mockSearch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          top: 5, // From mockOrganizationAgent.ragConfig.topK
        }),
      );
    });

    it('should use agent semanticConfig', async () => {
      const messages = createTestMessages('Test query');

      mockSearch.mockReturnValue(createMockSearchResults([]));

      await ragService.performSearch(
        messages,
        'msf_communications',
        mockUser as any,
      );

      // Verify search was called with agent's semantic config
      expect(mockSearch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          semanticSearchOptions: expect.objectContaining({
            configurationName: 'custom-semantic-config',
          }),
        }),
      );
    });

    it('should deduplicate results by URL', async () => {
      mockSearch.mockReturnValue(
        createMockSearchResults([
          {
            chunk: 'Content 1',
            title: 'Doc 1',
            date: '2025-01-15',
            url: 'https://example.com/same-url',
          },
          {
            chunk: 'Content 2 (duplicate URL)',
            title: 'Doc 2',
            date: '2025-01-14',
            url: 'https://example.com/same-url', // Duplicate
          },
          {
            chunk: 'Content 3',
            title: 'Doc 3',
            date: '2025-01-13',
            url: 'https://example.com/different-url',
          },
        ]),
      );

      const messages = createTestMessages('Test query');
      const result = await ragService.performSearch(
        messages,
        'msf_communications',
        mockUser as any,
      );

      // Should only have 2 results (deduped by URL)
      expect(result.searchDocs).toHaveLength(2);
    });

    it('should calculate date range from results', async () => {
      mockSearch.mockReturnValue(
        createMockSearchResults([
          {
            chunk: 'Content',
            title: 'Oldest',
            date: '2025-01-01',
            url: 'https://example.com/1',
          },
          {
            chunk: 'Content',
            title: 'Newest',
            date: '2025-01-20',
            url: 'https://example.com/2',
          },
          {
            chunk: 'Content',
            title: 'Middle',
            date: '2025-01-10',
            url: 'https://example.com/3',
          },
        ]),
      );

      const messages = createTestMessages('Test query');
      const result = await ragService.performSearch(
        messages,
        'msf_communications',
        mockUser as any,
      );

      expect(result.searchMetadata.dateRange.oldest).toBe('2025-01-01');
      expect(result.searchMetadata.dateRange.newest).toBe('2025-01-20');
    });

    it('should throw error when agent not found', async () => {
      (getOrganizationAgentById as any).mockReturnValue(undefined);

      const messages = createTestMessages('Test query');

      await expect(
        ragService.performSearch(messages, 'unknown_agent', mockUser as any),
      ).rejects.toThrow('Organization agent unknown_agent not found');
    });

    it('should use reformulated query for follow-up questions', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'What is the policy?' },
        { role: 'assistant', content: 'The policy covers...' },
        { role: 'user', content: 'Tell me more about that' }, // Follow-up
      ];

      mockSearch.mockReturnValue(createMockSearchResults([]));

      await ragService.performSearch(
        messages,
        'msf_communications',
        mockUser as any,
      );

      // Should have called OpenAI for query reformulation
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalled();

      // Search should use the reformulated query
      expect(mockSearch).toHaveBeenCalledWith(
        'reformulated search query',
        expect.any(Object),
      );
    });

    it('should use original query for first question', async () => {
      const messages = createTestMessages('What is the communications policy?');

      mockSearch.mockReturnValue(createMockSearchResults([]));

      await ragService.performSearch(
        messages,
        'msf_communications',
        mockUser as any,
      );

      // Should NOT have called OpenAI for query reformulation
      expect(mockOpenAIClient.chat.completions.create).not.toHaveBeenCalled();

      // Search should use the original query
      expect(mockSearch).toHaveBeenCalledWith(
        'What is the communications policy?',
        expect.any(Object),
      );
    });
  });

  describe('reformulateQuery', () => {
    it('should call gpt-5-mini for query reformulation', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Original query' }];

      await ragService.reformulateQuery(messages);

      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-5-mini',
        }),
      );
    });

    it('should include conversation history in reformulation request', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'First question' },
        { role: 'assistant', content: 'First answer' },
        { role: 'user', content: 'Follow up question' },
      ];

      await ragService.reformulateQuery(messages);

      // Check that conversation history was included
      const call = mockOpenAIClient.chat.completions.create.mock.calls[0][0];
      const userMessage = call.messages.find(
        (m: any) => m.role === 'user',
      )?.content;

      expect(userMessage).toContain('First question');
      expect(userMessage).toContain('First answer');
      expect(userMessage).toContain('Follow up question');
    });

    it('should return original query on error', async () => {
      mockOpenAIClient.chat.completions.create.mockRejectedValue(
        new Error('API error'),
      );

      const messages: Message[] = [{ role: 'user', content: 'Original query' }];

      const result = await ragService.reformulateQuery(messages);

      // Should fall back to original query
      expect(result).toBe('Original query');
    });

    it('should not specify custom temperature for gpt-5-mini', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Test query' }];

      await ragService.reformulateQuery(messages);

      const call = mockOpenAIClient.chat.completions.create.mock.calls[0][0];

      // gpt-5-mini only supports default temperature (1)
      // So we should NOT be setting a custom temperature
      expect(call.temperature).toBeUndefined();
    });
  });

  describe('extractQuery', () => {
    it('should extract query from last user message', () => {
      const messages: Message[] = [
        { role: 'user', content: 'First message' },
        { role: 'assistant', content: 'Response' },
        { role: 'user', content: 'Last message - this is the query' },
      ];

      const query = ragService.extractQuery(messages);

      expect(query).toBe('Last message - this is the query');
    });

    it('should throw error when no user message found', () => {
      const messages: Message[] = [
        { role: 'assistant', content: 'Only assistant message' },
      ];

      expect(() => ragService.extractQuery(messages)).toThrow(
        'No user message found',
      );
    });

    it('should handle empty messages array', () => {
      expect(() => ragService.extractQuery([])).toThrow(
        'No user message found',
      );
    });
  });

  describe('citation processing', () => {
    it('should process citations in chunk correctly', () => {
      ragService.initCitationTracking();

      const result = ragService.processCitationInChunk(
        'This is text with [1] and [2] citations.',
      );

      expect(result).toContain('[1]');
      expect(result).toContain('[2]');
    });

    it('should handle consecutive citations', () => {
      ragService.initCitationTracking();

      const result = ragService.processCitationInChunk(
        'Text with consecutive citations[1][2][3].',
      );

      expect(result).toContain('[1]');
      expect(result).toContain('[2]');
      expect(result).toContain('[3]');
    });

    it('should not process text in brackets', () => {
      ragService.initCitationTracking();

      const result = ragService.processCitationInChunk(
        'Text with [some text] and [1] citation.',
      );

      expect(result).toContain('[some text]');
      expect(result).toContain('[1]');
    });

    it('should deduplicate citations', () => {
      const citations = [
        {
          title: 'Doc 1',
          date: '2025-01-01',
          url: 'https://example.com/1',
          number: 1,
        },
        {
          title: 'Doc 2',
          date: '2025-01-02',
          url: 'https://example.com/1', // Duplicate URL
          number: 2,
        },
        {
          title: 'Doc 3',
          date: '2025-01-03',
          url: 'https://example.com/3',
          number: 3,
        },
      ];

      const deduped = ragService.deduplicateCitations(citations);

      // Should have only 2 unique citations
      expect(deduped).toHaveLength(2);
      expect(deduped[0].url).toBe('https://example.com/1');
      expect(deduped[1].url).toBe('https://example.com/3');
    });
  });
});
