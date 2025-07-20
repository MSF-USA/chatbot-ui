import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AgentType, AgentExecutionContext, WebSearchAgentConfig } from '@/types/agent';
import { WebSearchAgent } from '@/services/agents/webSearchAgent';
import { BingGroundingService } from '@/services/bingGroundingService';
import { CitationExtractor } from '@/utils/citationExtractor';
import { WebSearchRequest, WebSearchResponse } from '@/types/webSearch';

// Mock dependencies
vi.mock('@/services/bingGroundingService');
vi.mock('@/utils/citationExtractor');

describe('WebSearchAgent', () => {
  let webSearchAgent: WebSearchAgent;
  let mockContext: AgentExecutionContext;
  let mockConfig: WebSearchAgentConfig;
  let mockBingGroundingService: jest.Mocked<BingGroundingService>;

  beforeEach(() => {
    // Set environment variable for tests
    process.env.AZURE_GROUNDING_CONNECTION_ID = 'test-connection-id';
    
    mockConfig = {
      id: 'web-search-test-agent',
      name: 'Test Web Search Agent',
      type: AgentType.WEB_SEARCH,
      modelId: 'gpt-4o-mini',
      instructions: 'Test web search agent',
      tools: [],
      timeout: 30000,
      webSearchConfig: {
        endpoint: 'https://test-grounding.azure.com',
        apiKey: 'test-api-key',
        defaultMarket: 'en-US',
        defaultSafeSearch: 'Moderate',
        maxResults: 5,
        timeout: 30000,
        enableCaching: true,
        cacheTtl: 300,
        retry: {
          maxAttempts: 3,
          baseDelay: 1000,
          maxDelay: 10000,
        },
      },
      maxResults: 5,
      defaultMarket: 'en-US',
      defaultSafeSearch: 'Moderate',
      enableCitations: true,
      enableCaching: true,
      cacheTtl: 300,
    };

    // Mock BingGroundingService
    mockBingGroundingService = {
      search: vi.fn(),
    } as any;

    // Replace the constructor's BingGroundingService creation
    vi.mocked(BingGroundingService).mockImplementation(() => mockBingGroundingService);

    mockContext = {
      query: 'latest news about artificial intelligence',
      model: { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      locale: 'en',
      sessionId: 'test-session-web-search',
      user: {
        id: 'test-user',
        name: 'Test User',
        email: 'test@example.com',
      },
      botId: 'test-bot',
      parameters: {
        temperature: 0.3,
        maxTokens: 1500,
      },
      conversationHistory: [],
      context: {},
      correlationId: 'test-correlation-id',
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.AZURE_GROUNDING_CONNECTION_ID;
  });

  describe('Initialization', () => {
    it('should initialize with correct agent type', () => {
      webSearchAgent = new WebSearchAgent(mockConfig);
      expect(webSearchAgent.config.type).toBe(AgentType.WEB_SEARCH);
    });

    it('should throw error for incorrect agent type', () => {
      const invalidConfig = { ...mockConfig, type: AgentType.CODE_INTERPRETER };
      expect(() => new WebSearchAgent(invalidConfig as WebSearchAgentConfig)).toThrow(
        'WebSearchAgent can only be used with WEB_SEARCH type'
      );
    });

    it('should initialize with default web search config if not provided', () => {
      const configWithoutWebSearch = { ...mockConfig };
      delete configWithoutWebSearch.webSearchConfig;
      webSearchAgent = new WebSearchAgent(configWithoutWebSearch);
      expect(webSearchAgent).toBeDefined();
    });
  });

  describe('Configuration Validation', () => {
    beforeEach(() => {
      webSearchAgent = new WebSearchAgent(mockConfig);
    });

    it('should validate specific configuration correctly', () => {
      // This tests the validateSpecificConfig method indirectly through initialization
      expect(webSearchAgent.config.webSearchConfig).toBeDefined();
      expect(webSearchAgent.config.webSearchConfig!.endpoint).toBe('https://test-grounding.azure.com');
    });

    it('should provide correct capabilities', () => {
      const capabilities = webSearchAgent.getCapabilities();
      expect(capabilities).toContain('web-search');
      expect(capabilities).toContain('citation-extraction');
      expect(capabilities).toContain('multi-market-search');
      expect(capabilities).toContain('safe-search');
      expect(capabilities).toContain('freshness-filtering');
      expect(capabilities).toContain('result-caching');
    });
  });

  describe('Web Search Execution', () => {
    beforeEach(() => {
      webSearchAgent = new WebSearchAgent(mockConfig);
      
      // Mock successful search response
      const mockSearchResponse: WebSearchResponse = {
        query: 'latest news about artificial intelligence',
        results: [
          {
            id: 'result-1',
            title: 'Latest AI Developments',
            url: 'https://example.com/ai-news',
            snippet: 'Recent breakthroughs in artificial intelligence...',
            displayUrl: 'example.com/ai-news',
            dateLastCrawled: new Date().toISOString(),
            language: 'en',
            contentType: 'news',
            relevanceScore: 0.95,
            metadata: {},
          }
        ],
        citations: [],
        totalCount: 1,
        searchTime: 250,
        market: 'en-US',
        cached: false,
        metadata: {
          timing: {
            searchTime: 250,
            citationExtractionTime: 50,
            totalTime: 300,
          },
          quality: {
            relevanceScore: 0.95,
            citationCount: 1,
            uniqueSourcesCount: 1,
          },
        },
      };

      mockBingGroundingService.search.mockResolvedValue(mockSearchResponse);

      // Mock CitationExtractor methods
      vi.mocked(CitationExtractor.extractCitations).mockReturnValue([
        {
          id: 'cite_1',
          title: 'Latest AI Developments',
          url: 'https://example.com/ai-news',
          type: 'news',
          publishedDate: new Date().toISOString(),
          publisher: 'example.com',
          metadata: {
            snippet: 'Recent breakthroughs in artificial intelligence...',
            relevanceScore: 0.95,
          },
        }
      ]);

      vi.mocked(CitationExtractor.deduplicateCitations).mockImplementation((citations) => citations);
      vi.mocked(CitationExtractor.sortCitations).mockImplementation((citations) => citations);
      vi.mocked(CitationExtractor.formatCitationsForDisplay).mockReturnValue('\n\nSources:\n[1] Latest AI Developments - https://example.com/ai-news\n\n');
      vi.mocked(CitationExtractor.formatInlineCitation).mockReturnValue('[1]');
    });

    it('should execute web search successfully', async () => {
      const response = await webSearchAgent.execute(mockContext);

      expect(response.success).toBe(true);
      expect(response.agentType).toBe(AgentType.WEB_SEARCH);
      expect(response.content).toContain('Based on my web search');
      expect(response.content).toContain('Recent breakthroughs in artificial intelligence');
      expect(response.content).toContain('[1]');
      expect(response.content).toContain('Sources:');
    });

    it('should build correct search request from context', async () => {
      await webSearchAgent.execute(mockContext);

      expect(mockBingGroundingService.search).toHaveBeenCalledWith({
        query: 'latest news about artificial intelligence',
        count: 5,
        market: 'en',
        safeSearch: 'Moderate',
        freshness: 'Day', // Should detect "latest" as requiring fresh content
        contentType: 'webpage',
        parameters: {},
      });
    });

    it('should handle search errors gracefully', async () => {
      mockBingGroundingService.search.mockRejectedValue(new Error('Search service unavailable'));

      const response = await webSearchAgent.execute(mockContext);

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error!.message).toContain('Web search execution failed');
    });

    it('should return fallback content when no results found', async () => {
      const emptyResponse: WebSearchResponse = {
        query: 'latest news about artificial intelligence',
        results: [],
        citations: [],
        searchTime: 100,
        market: 'en-US',
        cached: false,
      };

      mockBingGroundingService.search.mockResolvedValue(emptyResponse);
      vi.mocked(CitationExtractor.extractCitations).mockReturnValue([]);

      const response = await webSearchAgent.execute(mockContext);

      expect(response.success).toBe(true);
      expect(response.content).toContain("I couldn't find any relevant information");
    });
  });

  describe('Caching Functionality', () => {
    beforeEach(() => {
      webSearchAgent = new WebSearchAgent(mockConfig);
      
      const mockSearchResponse: WebSearchResponse = {
        query: 'test query',
        results: [],
        citations: [],
        searchTime: 100,
        market: 'en-US',
        cached: false,
      };

      mockBingGroundingService.search.mockResolvedValue(mockSearchResponse);
      vi.mocked(CitationExtractor.extractCitations).mockReturnValue([]);
      vi.mocked(CitationExtractor.deduplicateCitations).mockImplementation((citations) => citations);
      vi.mocked(CitationExtractor.sortCitations).mockImplementation((citations) => citations);
      vi.mocked(CitationExtractor.formatCitationsForDisplay).mockReturnValue('');
    });

    it('should cache search results', async () => {
      // First call
      await webSearchAgent.execute(mockContext);
      expect(mockBingGroundingService.search).toHaveBeenCalledTimes(1);

      // Second call with same query should use cache
      await webSearchAgent.execute(mockContext);
      expect(mockBingGroundingService.search).toHaveBeenCalledTimes(1); // Should not call search again
    });

    it('should not cache when caching is disabled', async () => {
      const noCacheConfig = {
        ...mockConfig,
        webSearchConfig: {
          ...mockConfig.webSearchConfig!,
          enableCaching: false,
        },
      };
      webSearchAgent = new WebSearchAgent(noCacheConfig);

      // First call
      await webSearchAgent.execute(mockContext);
      expect(mockBingGroundingService.search).toHaveBeenCalledTimes(1);

      // Second call should make another search request
      await webSearchAgent.execute(mockContext);
      expect(mockBingGroundingService.search).toHaveBeenCalledTimes(2);
    });
  });

  describe('Freshness Detection', () => {
    beforeEach(() => {
      webSearchAgent = new WebSearchAgent(mockConfig);
      
      const mockSearchResponse: WebSearchResponse = {
        query: 'test query',
        results: [],
        citations: [],
        searchTime: 100,
        market: 'en-US',
        cached: false,
      };

      mockBingGroundingService.search.mockResolvedValue(mockSearchResponse);
      vi.mocked(CitationExtractor.extractCitations).mockReturnValue([]);
      vi.mocked(CitationExtractor.deduplicateCitations).mockImplementation((citations) => citations);
      vi.mocked(CitationExtractor.sortCitations).mockImplementation((citations) => citations);
    });

    it('should detect "today" queries as requiring day freshness', async () => {
      const todayContext = { ...mockContext, query: 'news today about technology' };
      await webSearchAgent.execute(todayContext);

      expect(mockBingGroundingService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          freshness: 'Day',
        })
      );
    });

    it('should detect "this week" queries as requiring week freshness', async () => {
      const weekContext = { ...mockContext, query: 'events this week in sports' };
      await webSearchAgent.execute(weekContext);

      expect(mockBingGroundingService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          freshness: 'Week',
        })
      );
    });

    it('should detect "this month" queries as requiring month freshness', async () => {
      const monthContext = { ...mockContext, query: 'trends this month in business' };
      await webSearchAgent.execute(monthContext);

      expect(mockBingGroundingService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          freshness: 'Month',
        })
      );
    });

    it('should not set freshness for general queries', async () => {
      const generalContext = { ...mockContext, query: 'history of artificial intelligence' };
      await webSearchAgent.execute(generalContext);

      expect(mockBingGroundingService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          freshness: undefined,
        })
      );
    });
  });

  describe('Bing Query URL Generation', () => {
    beforeEach(() => {
      webSearchAgent = new WebSearchAgent(mockConfig);
      
      const mockSearchResponse: WebSearchResponse = {
        query: 'test query',
        results: [
          {
            id: 'result-1',
            title: 'Test Result',
            url: 'https://example.com/test',
            snippet: 'Test snippet',
            displayUrl: 'example.com/test',
            dateLastCrawled: new Date().toISOString(),
            language: 'en',
            relevanceScore: 0.8,
            metadata: {},
          }
        ],
        citations: [],
        searchTime: 100,
        market: 'en-US',
        cached: false,
      };

      mockBingGroundingService.search.mockResolvedValue(mockSearchResponse);
      vi.mocked(CitationExtractor.extractCitations).mockReturnValue([]);
      vi.mocked(CitationExtractor.deduplicateCitations).mockImplementation((citations) => citations);
      vi.mocked(CitationExtractor.sortCitations).mockImplementation((citations) => citations);
      vi.mocked(CitationExtractor.formatCitationsForDisplay).mockReturnValue('');
      vi.mocked(CitationExtractor.formatInlineCitation).mockReturnValue('[1]');
    });

    it('should include Bing query URL in response', async () => {
      const response = await webSearchAgent.execute(mockContext);

      expect(response.content).toContain('Bing search: https://www.bing.com/search?');
      expect(response.content).toContain('q=test+query'); // This uses the mock response query
      expect(response.content).toContain('setmkt=en-US');
    });
  });

  describe('Health Check', () => {
    beforeEach(() => {
      webSearchAgent = new WebSearchAgent(mockConfig);
    });

    it('should perform health check successfully', async () => {
      const healthResult = await webSearchAgent.checkHealth();

      expect(healthResult.agentId).toBe(mockConfig.id);
      expect(healthResult.healthy).toBe(true);
      expect(healthResult.timestamp).toBeDefined();
      expect(healthResult.responseTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Cleanup', () => {
    beforeEach(() => {
      webSearchAgent = new WebSearchAgent(mockConfig);
    });

    it('should cleanup resources without error', async () => {
      await expect(webSearchAgent.cleanup()).resolves.not.toThrow();
    });
  });
});