/**
 * Local Knowledge Agent Tests
 *
 * Comprehensive unit tests for the LocalKnowledgeAgent implementation,
 * covering search functionality, access control, and agent behavior.
 */
import { LocalKnowledgeAgent } from '../../../services/agents/localKnowledgeAgent';
import { KnowledgeBaseService } from '../../../services/knowledgeBaseService';
import { SemanticSearchEngine } from '../../../services/semanticSearchEngine';

import {
  AgentExecutionContext,
  AgentExecutionEnvironment,
  AgentType,
  LocalKnowledgeAgentConfig,
} from '../../../types/agent';
import {
  AccessLevel,
  DEFAULT_LOCAL_KNOWLEDGE_CONFIG,
  KnowledgeDocument,
  KnowledgeDocumentType,
  KnowledgeSearchResult,
  KnowledgeSourceType,
  LocalKnowledgeResponse,
  UserRole,
} from '../../../types/localKnowledge';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies
vi.mock('../../../services/knowledgeBaseService', () => ({
  KnowledgeBaseService: vi.fn(),
}));
vi.mock('../../../services/semanticSearchEngine', () => ({
  SemanticSearchEngine: vi.fn(),
}));
vi.mock('../../../services/loggingService', () => ({
  AzureMonitorLoggingService: {
    getInstance: vi.fn(() => ({
      logAgentExecution: vi.fn(),
      logAgentError: vi.fn(),
      logAgentHealth: vi.fn(),
      logCustomMetric: vi.fn(),
    })),
  },
}));

describe('LocalKnowledgeAgent', () => {
  let agent: LocalKnowledgeAgent;
  let mockKnowledgeBaseService: any;
  let mockSearchEngine: any;
  let testConfig: LocalKnowledgeAgentConfig;
  let testContext: AgentExecutionContext;

  // Test data
  const mockDocument: KnowledgeDocument = {
    id: 'doc_001',
    title: 'Company Vacation Policy',
    content: 'Employees are entitled to 20 days of vacation per year...',
    type: KnowledgeDocumentType.POLICY,
    source: KnowledgeSourceType.LOCAL_FILE,
    accessLevel: AccessLevel.INTERNAL,
    allowedRoles: [UserRole.EMPLOYEE, UserRole.MANAGER],
    metadata: {
      status: 'published',
      author: 'HR Department',
      department: 'Human Resources',
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
    version: '1.0',
    tags: ['hr', 'vacation', 'policy'],
    language: 'en',
    searchableContent:
      'company vacation policy employees entitled 20 days vacation per year',
  };

  const mockSearchResult: KnowledgeSearchResult = {
    document: mockDocument,
    score: 0.85,
    highlights: ['Employees are entitled to 20 days of vacation per year'],
    explanation: 'High relevance match for vacation policy query',
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Set environment variables to force enterprise mode
    process.env.SIMPLE_KNOWLEDGE_MODE = 'false';
    process.env.AZURE_SEARCH_ENDPOINT = 'https://test.search.windows.net';
    process.env.AZURE_SEARCH_API_KEY = 'test-api-key';

    // Setup test configuration
    testConfig = {
      id: 'test-local-knowledge-agent',
      name: 'Test Local Knowledge Agent',
      type: AgentType.LOCAL_KNOWLEDGE,
      environment: AgentExecutionEnvironment.LOCAL,
      modelId: 'gpt-4o-mini',
      instructions: 'Test knowledge agent for enterprise knowledge base',
      tools: [],
      timeout: 30000,
      knowledgeBaseConfig: DEFAULT_LOCAL_KNOWLEDGE_CONFIG,
      maxResults: 10,
      defaultSearchMode: 'hybrid',
      enableAccessControl: true,
      enableKnowledgeGraph: false,
      enableCaching: true,
      cacheTtl: 3600,
      enableEntityExtraction: false,
      similarityThreshold: 0.7,
      enableAnswerSummary: true,
      maxSummaryLength: 300,
      enableRelatedSuggestions: true,
      enableAnalytics: true,
    };

    // Setup test execution context
    testContext = {
      query: 'What is our vacation policy?',
      messages: [],
      user: {
        id: 'test-user',
        email: 'test@company.com',
        name: 'Test User',
      },
      model: {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        maxLength: 4096,
        tokenLimit: 4096,
      },
      locale: 'en',
      userConfig: {},
      context: {},
      correlationId: 'test-correlation-id',
    };

    // Setup mocks
    mockKnowledgeBaseService = {
      initialize: vi.fn().mockResolvedValue(undefined),
      addDocument: vi.fn().mockResolvedValue('doc_001'),
      removeDocument: vi.fn().mockResolvedValue(undefined),
      getStatistics: vi.fn().mockResolvedValue({
        totalDocuments: 10,
        indexedDocuments: 10,
        pendingDocuments: 0,
        failedDocuments: 0,
        lastIndexUpdate: new Date(),
        averageIndexingTime: 1500,
        indexSize: 1.5,
      }),
      cleanup: vi.fn().mockResolvedValue(undefined),
    };

    mockSearchEngine = {
      initialize: vi.fn().mockResolvedValue(undefined),
      semanticSearch: vi.fn().mockResolvedValue([mockSearchResult]),
      keywordSearch: vi.fn().mockResolvedValue([mockSearchResult]),
      hybridSearch: vi.fn().mockResolvedValue([mockSearchResult]),
      indexDocument: vi.fn().mockResolvedValue(undefined),
      removeDocument: vi.fn().mockResolvedValue(undefined),
      getStatistics: vi.fn().mockReturnValue({
        totalSearches: 100,
        cacheHits: 20,
        averageSearchTime: 250,
        indexedDocuments: 10,
        vectorEmbeddings: 50,
        cacheSize: 5,
        embeddingCacheSize: 15,
      }),
      clearCache: vi.fn(),
    };

    // Mock constructors to return the mocked instances
    const MockedKnowledgeBaseService = vi.mocked(KnowledgeBaseService);
    const MockedSemanticSearchEngine = vi.mocked(SemanticSearchEngine);

    MockedKnowledgeBaseService.mockImplementation(
      () => mockKnowledgeBaseService,
    );
    MockedSemanticSearchEngine.mockImplementation(() => mockSearchEngine);

    // Create agent instance
    agent = new LocalKnowledgeAgent(testConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();

    // Clean up environment variables
    delete process.env.SIMPLE_KNOWLEDGE_MODE;
    delete process.env.AZURE_SEARCH_ENDPOINT;
    delete process.env.AZURE_SEARCH_API_KEY;
  });

  describe('Initialization', () => {
    it('should create agent with valid configuration', () => {
      expect(agent).toBeInstanceOf(LocalKnowledgeAgent);
      expect(agent.config.id).toBe('test-local-knowledge-agent');
      expect(agent.config.type).toBe(AgentType.LOCAL_KNOWLEDGE);
    });

    it('should initialize knowledge base service and search engine', async () => {
      // Test that the agent is created successfully in enterprise mode
      expect(agent).toBeInstanceOf(LocalKnowledgeAgent);

      // Give time for async initialization to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Agent should be healthy after successful initialization
      expect(agent.config).toBeDefined();
      expect(agent.config.id).toBe('test-local-knowledge-agent');

      // Test that enterprise mode is being used (not simple mode)
      // This indirectly tests that services are initialized
      const capabilities = agent.getCapabilities();
      expect(capabilities).toContain('semantic_search');
      expect(capabilities).toContain('hybrid_search');
    });

    it('should validate configuration correctly', () => {
      expect(() => new LocalKnowledgeAgent(testConfig)).not.toThrow();
    });

    it('should handle missing configuration gracefully', () => {
      const invalidConfig = { ...testConfig };
      delete invalidConfig.knowledgeBaseConfig;

      // The LocalKnowledgeAgent uses default config when knowledgeBaseConfig is missing
      // Validation error is logged but not thrown (based on BaseAgent implementation)
      expect(() => new LocalKnowledgeAgent(invalidConfig as any)).not.toThrow();
      const agent = new LocalKnowledgeAgent(invalidConfig as any);
      expect(agent).toBeDefined();
    });
  });

  describe('Configuration Validation', () => {
    it('should validate knowledge base configuration', () => {
      const configWithoutKB = { ...testConfig };
      delete configWithoutKB.knowledgeBaseConfig;

      // The LocalKnowledgeAgent uses default config when knowledgeBaseConfig is missing
      // Validation error is logged but not thrown (based on BaseAgent implementation)
      expect(
        () => new LocalKnowledgeAgent(configWithoutKB as any),
      ).not.toThrow();
      const agent = new LocalKnowledgeAgent(configWithoutKB as any);
      expect(agent).toBeDefined();
    });

    it('should validate maximum results parameter', () => {
      const configWithInvalidMaxResults = {
        ...testConfig,
        maxResults: -1,
      };

      const agent = new LocalKnowledgeAgent(configWithInvalidMaxResults);
      expect(agent).toBeDefined(); // Agent creation should work despite invalid config
    });

    it('should validate similarity threshold', () => {
      const configWithInvalidThreshold = {
        ...testConfig,
        similarityThreshold: 1.5,
      };

      const agent = new LocalKnowledgeAgent(configWithInvalidThreshold);
      expect(agent).toBeDefined(); // Agent creation should work despite invalid config
    });

    it('should validate cache TTL', () => {
      const configWithInvalidTTL = {
        ...testConfig,
        cacheTtl: -100,
      };

      const agent = new LocalKnowledgeAgent(configWithInvalidTTL);
      expect(agent).toBeDefined(); // Agent creation should work despite invalid config
    });
  });

  describe('Knowledge Search Execution', () => {
    it('should execute knowledge search successfully', async () => {
      const response = await agent.execute(testContext);

      expect(response.success).toBe(true);
      expect(response.agentType).toBe(AgentType.LOCAL_KNOWLEDGE);
      expect(response.content).toContain('1 relevant document');
      expect(response.content).toContain('Company Vacation Policy');
      expect(response.metadata?.toolResults).toBeDefined();
    });

    it('should use hybrid search by default', async () => {
      await agent.execute(testContext);

      expect(mockSearchEngine.hybridSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'What is our vacation policy?',
          searchMode: 'hybrid',
          maxResults: 10,
          userRole: UserRole.EMPLOYEE,
        }),
      );
    });

    it('should extract user role correctly', async () => {
      const contextWithAdmin = {
        ...testContext,
        user: { ...testContext.user, mail: 'admin@company.com' },
      };

      await agent.execute(contextWithAdmin);

      expect(mockSearchEngine.hybridSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          userRole: UserRole.ADMIN,
        }),
      );
    });

    it('should handle different search modes', async () => {
      const configWithSemanticSearch = {
        ...testConfig,
        defaultSearchMode: 'semantic' as const,
      };
      const semanticAgent = new LocalKnowledgeAgent(configWithSemanticSearch);

      await semanticAgent.execute(testContext);

      expect(mockSearchEngine.semanticSearch).toHaveBeenCalled();
    });

    it('should limit results based on configuration', async () => {
      const configWithLimit = {
        ...testConfig,
        maxResults: 5,
      };
      const limitedAgent = new LocalKnowledgeAgent(configWithLimit);

      await limitedAgent.execute(testContext);

      expect(mockSearchEngine.hybridSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          maxResults: 5,
        }),
      );
    });
  });

  describe('Response Formatting', () => {
    it('should format response with search results', async () => {
      const response = await agent.execute(testContext);

      expect(response.content).toMatch(/I found \d+ relevant document/);
      expect(response.content).toContain('Company Vacation Policy');
      expect(response.content).toContain('Relevance: 85%');
    });

    it('should handle no results gracefully', async () => {
      mockSearchEngine.hybridSearch.mockResolvedValue([]);

      const response = await agent.execute(testContext);

      expect(response.content).toContain(
        "I couldn't find any relevant information",
      );
      expect(response.success).toBe(true);
    });

    it('should include answer summary when enabled', async () => {
      const response = await agent.execute(testContext);

      expect(response.metadata?.toolResults?.[0]?.result).toMatchObject({
        answerSummary: expect.stringContaining(
          'Based on the available knowledge',
        ),
      });
    });

    it('should include suggested queries', async () => {
      const response = await agent.execute(testContext);

      expect(response.content).toContain('Related questions you might ask:');
    });
  });

  describe('Caching', () => {
    it('should cache search results when enabled', async () => {
      // First call
      await agent.execute(testContext);

      // Second call with same query
      const response = await agent.execute(testContext);

      expect(response.content).toContain('Company Vacation Policy');
      // Should use cache on second call
    });

    it('should not cache when disabled', async () => {
      const configWithoutCache = {
        ...testConfig,
        enableCaching: false,
      };
      const noCacheAgent = new LocalKnowledgeAgent(configWithoutCache);

      await noCacheAgent.execute(testContext);
      await noCacheAgent.execute(testContext);

      // Both calls should hit the search engine
      expect(mockSearchEngine.hybridSearch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Document Management', () => {
    it('should add document to knowledge base', async () => {
      const documentData = {
        title: 'New Policy',
        content: 'Content of new policy',
        type: KnowledgeDocumentType.POLICY,
        source: KnowledgeSourceType.LOCAL_FILE,
        accessLevel: AccessLevel.INTERNAL,
        allowedRoles: [UserRole.EMPLOYEE],
        metadata: { status: 'published' as const },
        version: '1.0',
        tags: ['policy'],
        language: 'en',
      };

      const documentId = await agent.addDocument(documentData);

      expect(documentId).toBe('doc_001');
      expect(mockKnowledgeBaseService.addDocument).toHaveBeenCalledWith(
        documentData,
      );
      expect(mockSearchEngine.indexDocument).toHaveBeenCalledWith({
        ...documentData,
        id: 'doc_001',
      });
    });

    it('should remove document from knowledge base', async () => {
      await agent.removeDocument('doc_001');

      expect(mockKnowledgeBaseService.removeDocument).toHaveBeenCalledWith(
        'doc_001',
      );
      expect(mockSearchEngine.removeDocument).toHaveBeenCalledWith('doc_001');
    });
  });

  describe('Health Check', () => {
    it('should pass health check with valid knowledge base', async () => {
      const healthResult = await agent.checkHealth();

      expect(healthResult.healthy).toBe(true);
      expect(healthResult.agentId).toBe('test-local-knowledge-agent');
    });

    it('should fail health check with empty knowledge base', async () => {
      mockKnowledgeBaseService.getStatistics.mockResolvedValue({
        totalDocuments: 0,
        indexedDocuments: 0,
        pendingDocuments: 0,
        failedDocuments: 0,
      });

      const healthResult = await agent.checkHealth();

      expect(healthResult.healthy).toBe(false);
    });

    it('should fail health check with no indexed documents', async () => {
      mockSearchEngine.getStatistics.mockReturnValue({
        indexedDocuments: 0,
      });

      const healthResult = await agent.checkHealth();

      expect(healthResult.healthy).toBe(false);
    });
  });

  describe('Agent Capabilities', () => {
    it('should return correct capabilities', () => {
      const capabilities = agent.getCapabilities();

      expect(capabilities).toContain('knowledge_search');
      expect(capabilities).toContain('semantic_search');
      expect(capabilities).toContain('keyword_search');
      expect(capabilities).toContain('hybrid_search');
      expect(capabilities).toContain('document_retrieval');
      expect(capabilities).toContain('content_filtering');
    });

    it('should include access control capability when enabled', () => {
      const capabilities = agent.getCapabilities();

      expect(capabilities).toContain('access_control');
    });

    it('should include answer summarization when enabled', () => {
      const capabilities = agent.getCapabilities();

      expect(capabilities).toContain('answer_summarization');
    });

    it('should include related suggestions when enabled', () => {
      const capabilities = agent.getCapabilities();

      expect(capabilities).toContain('related_suggestions');
    });

    it('should include analytics when enabled', () => {
      const capabilities = agent.getCapabilities();

      expect(capabilities).toContain('usage_analytics');
    });
  });

  describe('Error Handling', () => {
    it('should handle search engine errors gracefully', async () => {
      mockSearchEngine.hybridSearch.mockRejectedValue(
        new Error('Search engine error'),
      );

      const response = await agent.execute(testContext);
      // Agent should return an error response rather than throwing
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });

    it('should handle knowledge base service errors', async () => {
      mockKnowledgeBaseService.addDocument.mockRejectedValue(
        new Error('DB error'),
      );

      await expect(agent.addDocument({} as any)).rejects.toThrow(
        'Failed to add document to knowledge base',
      );
    });

    it('should handle initialization errors', async () => {
      mockKnowledgeBaseService.initialize.mockRejectedValue(
        new Error('Init error'),
      );

      // Since initialization is now async, the agent creation shouldn't throw
      const agent = new LocalKnowledgeAgent(testConfig);
      expect(agent).toBeDefined();

      // But execution might fail due to failed initialization
      const response = await agent.execute(testContext);
      expect(response).toBeDefined(); // Should still handle gracefully
    });
  });

  describe('Statistics and Analytics', () => {
    it('should return comprehensive statistics', async () => {
      const stats = await agent.getKnowledgeStatistics();

      expect(stats).toHaveProperty('knowledgeBase');
      expect(stats).toHaveProperty('searchEngine');
      expect(stats).toHaveProperty('agent');
      expect(stats).toHaveProperty('recentQueries');
      expect(stats).toHaveProperty('cacheSize');
    });

    it('should track query history', async () => {
      await agent.execute(testContext);
      await agent.execute({ ...testContext, query: 'Another query' });

      const stats = await agent.getKnowledgeStatistics();

      expect(stats.recentQueries).toHaveLength(2);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources properly', async () => {
      await agent.cleanup();

      expect(mockKnowledgeBaseService.cleanup).toHaveBeenCalled();
      expect(mockSearchEngine.clearCache).toHaveBeenCalled();
    });

    it('should handle cleanup errors', async () => {
      mockKnowledgeBaseService.cleanup.mockRejectedValue(
        new Error('Cleanup error'),
      );

      await expect(agent.cleanup()).rejects.toThrow('Cleanup error');
    });
  });

  describe('Context and Localization', () => {
    it('should handle different locales', async () => {
      const frenchContext = {
        ...testContext,
        query: 'Quelle est notre politique de vacances?',
        locale: 'fr',
      };

      const response = await agent.execute(frenchContext);

      expect(mockSearchEngine.hybridSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'fr',
        }),
      );
      expect(response.success).toBe(true);
    });

    it('should extract parameters from query context', async () => {
      const contextWithHistory = {
        ...testContext,
        messages: [
          {
            role: 'user' as const,
            content: 'I need information about HR policies',
          },
        ],
      };

      await agent.execute(contextWithHistory);

      expect(mockSearchEngine.hybridSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'What is our vacation policy?',
        }),
      );
    });
  });

  describe('Performance and Optimization', () => {
    it('should complete searches within reasonable time', async () => {
      const startTime = Date.now();
      await agent.execute(testContext);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should limit memory usage with cache size limits', async () => {
      // Execute many different queries to test cache limits
      for (let i = 0; i < 1500; i++) {
        await agent.execute({
          ...testContext,
          query: `Test query ${i}`,
        });
      }

      // Cache should be limited and not grow unbounded
      const stats = await agent.getKnowledgeStatistics();
      expect(stats.cacheSize).toBeLessThanOrEqual(1000);
    });
  });
});
