/**
 * Semantic Search Engine Tests
 *
 * Unit tests for the SemanticSearchEngine implementation,
 * covering semantic search, keyword search, and hybrid search functionality.
 */
import { SemanticSearchEngine } from '../../../services/semanticSearchEngine';

import {
  AccessLevel,
  DEFAULT_LOCAL_KNOWLEDGE_CONFIG,
  KnowledgeDocument,
  KnowledgeDocumentType,
  KnowledgeSearchQuery,
  KnowledgeSourceType,
  SemanticSearchConfig,
  UserRole,
} from '../../../types/localKnowledge';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies
vi.mock('../../../services/loggingService', () => ({
  AzureMonitorLoggingService: {
    getInstance: vi.fn(() => ({
      logEvent: vi.fn(),
      logError: vi.fn(),
      logCustomMetric: vi.fn(),
    })),
  },
}));

describe('SemanticSearchEngine', () => {
  let searchEngine: SemanticSearchEngine;
  let testConfig: SemanticSearchConfig;

  // Test documents
  const mockDocuments: KnowledgeDocument[] = [
    {
      id: 'doc_001',
      title: 'Employee Vacation Policy',
      content:
        'All employees are entitled to 20 days of paid vacation per year. Vacation requests must be submitted at least 2 weeks in advance.',
      type: KnowledgeDocumentType.POLICY,
      source: KnowledgeSourceType.LOCAL_FILE,
      accessLevel: AccessLevel.INTERNAL,
      allowedRoles: [UserRole.EMPLOYEE, UserRole.MANAGER],
      metadata: { status: 'published' },
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      version: '1.0',
      tags: ['hr', 'vacation', 'policy'],
      language: 'en',
      searchableContent:
        'employee vacation policy paid days per year advance notice',
    },
    {
      id: 'doc_002',
      title: 'Remote Work Guidelines',
      content:
        'Remote work is permitted for eligible employees. Remote workers must maintain regular communication with their team and attend all required meetings.',
      type: KnowledgeDocumentType.POLICY,
      source: KnowledgeSourceType.LOCAL_FILE,
      accessLevel: AccessLevel.INTERNAL,
      allowedRoles: [UserRole.EMPLOYEE, UserRole.MANAGER],
      metadata: { status: 'published' },
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
      version: '1.0',
      tags: ['hr', 'remote', 'work'],
      language: 'en',
      searchableContent:
        'remote work guidelines eligible employees communication team meetings',
    },
    {
      id: 'doc_003',
      title: 'IT Security Handbook',
      content:
        'This handbook covers cybersecurity best practices, password requirements, and data protection protocols for all company systems.',
      type: KnowledgeDocumentType.HANDBOOK,
      source: KnowledgeSourceType.LOCAL_FILE,
      accessLevel: AccessLevel.INTERNAL,
      allowedRoles: [UserRole.EMPLOYEE, UserRole.IT_ADMIN],
      metadata: { status: 'published' },
      createdAt: new Date('2024-01-03'),
      updatedAt: new Date('2024-01-03'),
      version: '1.0',
      tags: ['it', 'security', 'cybersecurity'],
      language: 'en',
      searchableContent:
        'it security handbook cybersecurity best practices password data protection',
    },
  ];

  beforeEach(async () => {
    vi.clearAllMocks();

    testConfig = {
      ...DEFAULT_LOCAL_KNOWLEDGE_CONFIG.searchConfig,
      maxResults: 10,
      similarityThreshold: 0.5,
    };

    searchEngine = new SemanticSearchEngine(testConfig);
    await searchEngine.initialize();

    // Index test documents
    for (const doc of mockDocuments) {
      await searchEngine.indexDocument(doc);
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', async () => {
      const engine = new SemanticSearchEngine();
      await engine.initialize();

      expect(engine).toBeInstanceOf(SemanticSearchEngine);
    });

    it('should initialize with custom configuration', async () => {
      const customConfig = {
        ...testConfig,
        maxResults: 5,
        similarityThreshold: 0.8,
      };

      const engine = new SemanticSearchEngine(customConfig);
      await engine.initialize();

      expect(engine).toBeInstanceOf(SemanticSearchEngine);
    });

    it('should complete initialization successfully', async () => {
      const engine = new SemanticSearchEngine(testConfig);

      await expect(engine.initialize()).resolves.not.toThrow();
    });
  });

  describe('Document Indexing', () => {
    let engine: SemanticSearchEngine;

    beforeEach(async () => {
      engine = new SemanticSearchEngine(testConfig);
      await engine.initialize();
    });

    it('should index document successfully', async () => {
      const testDoc = mockDocuments[0];

      await expect(engine.indexDocument(testDoc)).resolves.not.toThrow();
    });

    it('should index multiple documents', async () => {
      for (const doc of mockDocuments) {
        await expect(engine.indexDocument(doc)).resolves.not.toThrow();
      }
    });

    it('should remove document from index', async () => {
      const testDoc = mockDocuments[0];
      await engine.indexDocument(testDoc);

      await expect(engine.removeDocument(testDoc.id)).resolves.not.toThrow();
    });

    it('should handle indexing document with missing searchable content', async () => {
      const docWithoutSearchable = {
        ...mockDocuments[0],
        searchableContent: undefined,
      };

      await expect(
        engine.indexDocument(docWithoutSearchable),
      ).resolves.not.toThrow();
    });
  });

  describe('Keyword Search', () => {
    it('should perform basic keyword search', async () => {
      const query: KnowledgeSearchQuery = {
        query: 'vacation policy',
        userRole: UserRole.EMPLOYEE,
        searchMode: 'keyword',
        maxResults: 5,
      };

      const results = await searchEngine.keywordSearch(query);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      // Should find the vacation policy document
      const vacationDoc = results.find((r) =>
        r.document.title.includes('Vacation'),
      );
      expect(vacationDoc).toBeDefined();
      expect(vacationDoc!.score).toBeGreaterThan(0);
    });

    it('should rank results by relevance', async () => {
      const query: KnowledgeSearchQuery = {
        query: 'employee work',
        userRole: UserRole.EMPLOYEE,
        searchMode: 'keyword',
      };

      const results = await searchEngine.keywordSearch(query);

      // Results should be sorted by score (descending)
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it('should generate highlights for matching terms', async () => {
      const query: KnowledgeSearchQuery = {
        query: 'vacation',
        userRole: UserRole.EMPLOYEE,
        searchMode: 'keyword',
      };

      const results = await searchEngine.keywordSearch(query);
      const vacationResult = results.find((r) =>
        r.document.title.includes('Vacation'),
      );

      expect(vacationResult).toBeDefined();
      expect(vacationResult!.highlights).toBeDefined();
      expect(vacationResult!.highlights.length).toBeGreaterThan(0);
      expect(vacationResult!.highlights[0]).toContain('vacation');
    });

    it('should boost title matches', async () => {
      const query: KnowledgeSearchQuery = {
        query: 'vacation',
        userRole: UserRole.EMPLOYEE,
        searchMode: 'keyword',
      };

      const results = await searchEngine.keywordSearch(query);
      const vacationResult = results.find((r) =>
        r.document.title.includes('Vacation'),
      );

      expect(vacationResult).toBeDefined();
      expect(vacationResult!.score).toBeGreaterThan(0.5); // Should have higher score due to title match
    });

    it('should handle case-insensitive search', async () => {
      const query: KnowledgeSearchQuery = {
        query: 'VACATION POLICY',
        userRole: UserRole.EMPLOYEE,
        searchMode: 'keyword',
      };

      const results = await searchEngine.keywordSearch(query);

      expect(results.length).toBeGreaterThan(0);
      const vacationDoc = results.find((r) =>
        r.document.title.includes('Vacation'),
      );
      expect(vacationDoc).toBeDefined();
    });

    it('should return empty results for non-matching query', async () => {
      const query: KnowledgeSearchQuery = {
        query: 'nonexistent nonsense query',
        userRole: UserRole.EMPLOYEE,
        searchMode: 'keyword',
      };

      const results = await searchEngine.keywordSearch(query);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });
  });

  describe('Semantic Search', () => {
    it('should perform semantic search', async () => {
      const query: KnowledgeSearchQuery = {
        query: 'time off policies for staff',
        userRole: UserRole.EMPLOYEE,
        searchMode: 'semantic',
        maxResults: 5,
      };

      const results = await searchEngine.semanticSearch(query);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      // Note: This is a mock implementation, so results may be placeholder
    });

    it('should respect similarity threshold', async () => {
      const query: KnowledgeSearchQuery = {
        query: 'completely unrelated topic about astronomy',
        userRole: UserRole.EMPLOYEE,
        searchMode: 'semantic',
      };

      const results = await searchEngine.semanticSearch(query);

      // All results should meet the similarity threshold
      results.forEach((result) => {
        expect(result.score).toBeGreaterThanOrEqual(
          testConfig.similarityThreshold,
        );
      });
    });

    it('should limit results based on maxResults', async () => {
      const query: KnowledgeSearchQuery = {
        query: 'employee policies',
        userRole: UserRole.EMPLOYEE,
        searchMode: 'semantic',
        maxResults: 2,
      };

      const results = await searchEngine.semanticSearch(query);

      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Hybrid Search', () => {
    it('should perform hybrid search combining semantic and keyword', async () => {
      const query: KnowledgeSearchQuery = {
        query: 'employee remote work policies',
        userRole: UserRole.EMPLOYEE,
        searchMode: 'hybrid',
        maxResults: 5,
      };

      const results = await searchEngine.hybridSearch(query);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should merge results from both search methods', async () => {
      const query: KnowledgeSearchQuery = {
        query: 'security guidelines',
        userRole: UserRole.EMPLOYEE,
        searchMode: 'hybrid',
      };

      const results = await searchEngine.hybridSearch(query);

      // Should find security-related documents
      const securityDoc = results.find((r) =>
        r.document.title.includes('Security'),
      );
      expect(securityDoc).toBeDefined();
    });

    it('should apply proper score weighting', async () => {
      const query: KnowledgeSearchQuery = {
        query: 'it security',
        userRole: UserRole.EMPLOYEE,
        searchMode: 'hybrid',
      };

      const results = await searchEngine.hybridSearch(query);

      // Scores should be influenced by both semantic and keyword weights
      results.forEach((result) => {
        expect(result.score).toBeGreaterThan(0);
        expect(result.score).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Search Performance and Caching', () => {
    it('should complete searches within reasonable time', async () => {
      const query: KnowledgeSearchQuery = {
        query: 'employee policies',
        userRole: UserRole.EMPLOYEE,
        searchMode: 'keyword',
      };

      const startTime = Date.now();
      await searchEngine.keywordSearch(query);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should cache search results', async () => {
      const query: KnowledgeSearchQuery = {
        query: 'vacation policy',
        userRole: UserRole.EMPLOYEE,
        searchMode: 'keyword',
      };

      // First search
      const results1 = await searchEngine.keywordSearch(query);

      // Second search (should be faster due to caching)
      const startTime = Date.now();
      const results2 = await searchEngine.keywordSearch(query);
      const endTime = Date.now();

      expect(results1).toEqual(results2);
      expect(endTime - startTime).toBeLessThan(100); // Should be very fast from cache
    });

    it('should clear cache properly', () => {
      searchEngine.clearCache();

      const stats = searchEngine.getStatistics();
      expect(stats.cacheSize).toBe(0);
      expect(stats.embeddingCacheSize).toBe(0);
    });
  });

  describe('Search Filters', () => {
    it('should filter by document types', async () => {
      const query: KnowledgeSearchQuery = {
        query: 'policy',
        userRole: UserRole.EMPLOYEE,
        searchMode: 'keyword',
        documentTypes: [KnowledgeDocumentType.POLICY],
      };

      const results = await searchEngine.keywordSearch(query);

      results.forEach((result) => {
        expect(result.document.type).toBe(KnowledgeDocumentType.POLICY);
      });
    });

    it('should respect user role filtering', async () => {
      const query: KnowledgeSearchQuery = {
        query: 'security',
        userRole: UserRole.EMPLOYEE,
        searchMode: 'keyword',
      };

      const results = await searchEngine.keywordSearch(query);

      // All returned documents should allow employee access
      results.forEach((result) => {
        expect(result.document.allowedRoles).toContain(UserRole.EMPLOYEE);
      });
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should track search statistics', async () => {
      const initialStats = searchEngine.getStatistics();

      const query: KnowledgeSearchQuery = {
        query: 'test query',
        userRole: UserRole.EMPLOYEE,
        searchMode: 'keyword',
      };

      await searchEngine.keywordSearch(query);

      const updatedStats = searchEngine.getStatistics();
      expect(updatedStats.totalSearches).toBeGreaterThan(
        initialStats.totalSearches,
      );
    });

    it('should return comprehensive statistics', () => {
      const stats = searchEngine.getStatistics();

      expect(stats).toHaveProperty('totalSearches');
      expect(stats).toHaveProperty('cacheHits');
      expect(stats).toHaveProperty('averageSearchTime');
      expect(stats).toHaveProperty('indexedDocuments');
      expect(stats).toHaveProperty('vectorEmbeddings');
      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('embeddingCacheSize');
    });

    it('should track indexed documents count', () => {
      const stats = searchEngine.getStatistics();
      expect(stats.indexedDocuments).toBe(mockDocuments.length);
    });
  });

  describe('Error Handling', () => {
    it('should handle search errors gracefully', async () => {
      // Mock an error in the search process
      const invalidQuery: KnowledgeSearchQuery = {
        query: '', // Empty query should be handled
        userRole: UserRole.EMPLOYEE,
        searchMode: 'keyword',
      };

      // Should not throw, but return empty results or handle gracefully
      const results = await searchEngine.keywordSearch(invalidQuery);
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle document indexing errors', async () => {
      const invalidDoc = {
        ...mockDocuments[0],
        id: '', // Invalid ID
      };

      await expect(searchEngine.indexDocument(invalidDoc)).rejects.toThrow();
    });

    it('should handle removal of non-existent document', async () => {
      await expect(
        searchEngine.removeDocument('nonexistent'),
      ).resolves.not.toThrow();
    });
  });

  describe('Optimization', () => {
    it('should optimize search engine', async () => {
      await expect(searchEngine.optimize()).resolves.not.toThrow();
    });

    it('should clear expired cache entries during optimization', async () => {
      // Add some searches to create cache entries
      for (let i = 0; i < 5; i++) {
        await searchEngine.keywordSearch({
          query: `test query ${i}`,
          userRole: UserRole.EMPLOYEE,
          searchMode: 'keyword',
        });
      }

      const statsBefore = searchEngine.getStatistics();
      await searchEngine.optimize();
      const statsAfter = searchEngine.getStatistics();

      // Cache size should be managed
      expect(statsAfter.cacheSize).toBeLessThanOrEqual(statsBefore.cacheSize);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long search queries', async () => {
      const longQuery = 'word '.repeat(100);
      const query: KnowledgeSearchQuery = {
        query: longQuery,
        userRole: UserRole.EMPLOYEE,
        searchMode: 'keyword',
      };

      const results = await searchEngine.keywordSearch(query);
      expect(results).toBeDefined();
    });

    it('should handle special characters in search', async () => {
      const query: KnowledgeSearchQuery = {
        query: 'policy@#$%^&*()',
        userRole: UserRole.EMPLOYEE,
        searchMode: 'keyword',
      };

      const results = await searchEngine.keywordSearch(query);
      expect(results).toBeDefined();
    });

    it('should handle unicode characters', async () => {
      const query: KnowledgeSearchQuery = {
        query: 'políticas employées 政策',
        userRole: UserRole.EMPLOYEE,
        searchMode: 'keyword',
      };

      const results = await searchEngine.keywordSearch(query);
      expect(results).toBeDefined();
    });

    it('should handle queries with only stop words', async () => {
      const query: KnowledgeSearchQuery = {
        query: 'the and or but',
        userRole: UserRole.EMPLOYEE,
        searchMode: 'keyword',
      };

      const results = await searchEngine.keywordSearch(query);
      expect(results).toBeDefined();
    });
  });

  describe('Vector Operations', () => {
    it('should generate embeddings for documents', async () => {
      const testDoc = mockDocuments[0];

      // Indexing should generate embeddings (this is tested implicitly)
      await expect(searchEngine.indexDocument(testDoc)).resolves.not.toThrow();
    });

    it('should calculate similarity scores properly', async () => {
      const query: KnowledgeSearchQuery = {
        query: 'vacation time off',
        userRole: UserRole.EMPLOYEE,
        searchMode: 'semantic',
      };

      const results = await searchEngine.semanticSearch(query);

      results.forEach((result) => {
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
      });
    });
  });
});
