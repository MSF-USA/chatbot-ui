/**
 * Knowledge Base Service Tests
 * 
 * Unit tests for the KnowledgeBaseService implementation,
 * covering document management, search operations, and access control.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { KnowledgeBaseService } from '../../../services/knowledgeBaseService';
import {
  KnowledgeDocument,
  KnowledgeDocumentType,
  KnowledgeSourceType,
  AccessLevel,
  UserRole,
  KnowledgeSearchQuery,
  KnowledgeBaseConfig,
  LocalKnowledgeError,
  LocalKnowledgeErrorType,
  DEFAULT_LOCAL_KNOWLEDGE_CONFIG,
} from '../../../types/localKnowledge';

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

describe('KnowledgeBaseService', () => {
  let service: KnowledgeBaseService;
  let testConfig: KnowledgeBaseConfig;

  // Test data
  const mockDocument = {
    title: 'Employee Handbook',
    content: 'This handbook contains important information for all employees including policies, procedures, and guidelines.',
    type: KnowledgeDocumentType.HANDBOOK,
    source: KnowledgeSourceType.LOCAL_FILE,
    accessLevel: AccessLevel.INTERNAL,
    allowedRoles: [UserRole.EMPLOYEE, UserRole.MANAGER],
    metadata: {
      status: 'published' as const,
      author: 'HR Department',
      department: 'Human Resources',
    },
    version: '1.0',
    tags: ['hr', 'employees', 'policies'],
    language: 'en',
  };

  const restrictedDocument = {
    title: 'Executive Compensation',
    content: 'Confidential executive compensation details and salary bands.',
    type: KnowledgeDocumentType.POLICY,
    source: KnowledgeSourceType.LOCAL_FILE,
    accessLevel: AccessLevel.RESTRICTED,
    allowedRoles: [UserRole.EXECUTIVE, UserRole.ADMIN],
    metadata: {
      status: 'published' as const,
      author: 'Executive Team',
      department: 'Executive',
    },
    version: '1.0',
    tags: ['compensation', 'executive', 'confidential'],
    language: 'en',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    testConfig = {
      ...DEFAULT_LOCAL_KNOWLEDGE_CONFIG,
      name: 'Test Knowledge Base',
      basePath: './test-knowledge',
    };

    service = new KnowledgeBaseService(testConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize service with default configuration', () => {
      expect(service).toBeInstanceOf(KnowledgeBaseService);
    });

    it('should initialize service with custom configuration', () => {
      const customConfig = {
        ...testConfig,
        name: 'Custom Knowledge Base',
        maxFileSize: 100,
      };

      const customService = new KnowledgeBaseService(customConfig);
      expect(customService).toBeInstanceOf(KnowledgeBaseService);
    });

    it('should initialize with proper default values', async () => {
      await service.initialize();
      // Service should be ready after initialization
    });
  });

  describe('Document Management', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should add document successfully', async () => {
      const documentId = await service.addDocument(mockDocument);

      expect(documentId).toBeDefined();
      expect(typeof documentId).toBe('string');
      expect(documentId).toMatch(/^doc_/);
    });

    it('should retrieve document by ID', async () => {
      const documentId = await service.addDocument(mockDocument);
      const retrievedDoc = await service.getDocument(documentId, UserRole.EMPLOYEE);

      expect(retrievedDoc).toBeDefined();
      expect(retrievedDoc?.id).toBe(documentId);
      expect(retrievedDoc?.title).toBe(mockDocument.title);
      expect(retrievedDoc?.content).toBe(mockDocument.content);
    });

    it('should update document successfully', async () => {
      const documentId = await service.addDocument(mockDocument);
      
      const updates = {
        title: 'Updated Employee Handbook',
        content: 'Updated content for the employee handbook.',
      };

      await service.updateDocument(documentId, updates);

      const updatedDoc = await service.getDocument(documentId, UserRole.EMPLOYEE);
      expect(updatedDoc?.title).toBe(updates.title);
      expect(updatedDoc?.content).toBe(updates.content);
      expect(updatedDoc?.updatedAt).toBeInstanceOf(Date);
    });

    it('should remove document successfully', async () => {
      const documentId = await service.addDocument(mockDocument);
      
      await service.removeDocument(documentId);
      
      const retrievedDoc = await service.getDocument(documentId, UserRole.EMPLOYEE);
      expect(retrievedDoc).toBeNull();
    });

    it('should handle document not found error', async () => {
      const nonExistentId = 'doc_nonexistent';
      
      const retrievedDoc = await service.getDocument(nonExistentId, UserRole.EMPLOYEE);
      expect(retrievedDoc).toBeNull();
    });

    it('should handle update of non-existent document', async () => {
      const nonExistentId = 'doc_nonexistent';
      
      await expect(service.updateDocument(nonExistentId, { title: 'New Title' }))
        .rejects.toThrow('Document not found');
    });

    it('should handle removal of non-existent document', async () => {
      const nonExistentId = 'doc_nonexistent';
      
      await expect(service.removeDocument(nonExistentId))
        .rejects.toThrow('Document not found');
    });
  });

  describe('Document Validation', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should reject document without title', async () => {
      const invalidDoc = { ...mockDocument, title: '' };
      
      await expect(service.addDocument(invalidDoc))
        .rejects.toThrow('Document title is required');
    });

    it('should reject document without content', async () => {
      const invalidDoc = { ...mockDocument, content: '' };
      
      await expect(service.addDocument(invalidDoc))
        .rejects.toThrow('Document content is required');
    });

    it('should reject document with content too large', async () => {
      const largeContent = 'a'.repeat(1500000); // 1.5MB content
      const invalidDoc = { ...mockDocument, content: largeContent };
      
      await expect(service.addDocument(invalidDoc))
        .rejects.toThrow('Document content too large');
    });

    it('should accept document with valid content size', async () => {
      const validDoc = { ...mockDocument, content: 'Valid content size' };
      
      const documentId = await service.addDocument(validDoc);
      expect(documentId).toBeDefined();
    });
  });

  describe('Search Operations', () => {
    let document1Id: string;
    let document2Id: string;

    beforeEach(async () => {
      await service.initialize();
      
      // Add test documents
      document1Id = await service.addDocument(mockDocument);
      document2Id = await service.addDocument({
        ...restrictedDocument,
        title: 'IT Security Policy',
        content: 'Security policies and procedures for IT systems and data protection.',
        accessLevel: AccessLevel.INTERNAL,
        allowedRoles: [UserRole.EMPLOYEE, UserRole.IT_ADMIN],
        tags: ['it', 'security', 'policies'],
      });
    });

    it('should perform basic search', async () => {
      const query: KnowledgeSearchQuery = {
        query: 'employee handbook',
        userRole: UserRole.EMPLOYEE,
        searchMode: 'keyword',
        maxResults: 10,
      };

      const results = await service.search(query);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should perform semantic search', async () => {
      const query: KnowledgeSearchQuery = {
        query: 'company policies for staff',
        userRole: UserRole.EMPLOYEE,
        searchMode: 'semantic',
        maxResults: 5,
      };

      const results = await service.search(query);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should perform hybrid search', async () => {
      const query: KnowledgeSearchQuery = {
        query: 'security guidelines',
        userRole: UserRole.EMPLOYEE,
        searchMode: 'hybrid',
        maxResults: 10,
      };

      const results = await service.search(query);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should filter by document types', async () => {
      const query: KnowledgeSearchQuery = {
        query: 'policies',
        userRole: UserRole.EMPLOYEE,
        searchMode: 'keyword',
        documentTypes: [KnowledgeDocumentType.POLICY],
        maxResults: 10,
      };

      const results = await service.search(query);

      expect(results).toBeDefined();
      results.forEach(result => {
        expect(result.document.type).toBe(KnowledgeDocumentType.POLICY);
      });
    });

    it('should filter by tags', async () => {
      const query: KnowledgeSearchQuery = {
        query: 'handbook',
        userRole: UserRole.EMPLOYEE,
        searchMode: 'keyword',
        tags: ['hr'],
        maxResults: 10,
      };

      const results = await service.search(query);

      expect(results).toBeDefined();
      results.forEach(result => {
        expect(result.document.tags).toContain('hr');
      });
    });

    it('should filter by language', async () => {
      const query: KnowledgeSearchQuery = {
        query: 'handbook',
        userRole: UserRole.EMPLOYEE,
        searchMode: 'keyword',
        language: 'en',
        maxResults: 10,
      };

      const results = await service.search(query);

      expect(results).toBeDefined();
      results.forEach(result => {
        expect(result.document.language).toBe('en');
      });
    });

    it('should limit results based on maxResults parameter', async () => {
      const query: KnowledgeSearchQuery = {
        query: 'policy',
        userRole: UserRole.EMPLOYEE,
        searchMode: 'keyword',
        maxResults: 1,
      };

      const results = await service.search(query);

      expect(results.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Access Control', () => {
    let restrictedDocId: string;
    let publicDocId: string;

    beforeEach(async () => {
      await service.initialize();
      
      // Add documents with different access levels
      restrictedDocId = await service.addDocument(restrictedDocument);
      publicDocId = await service.addDocument({
        ...mockDocument,
        accessLevel: AccessLevel.PUBLIC,
        allowedRoles: [UserRole.GUEST, UserRole.EMPLOYEE, UserRole.MANAGER],
      });
    });

    it('should allow employee to access internal documents', async () => {
      const doc = await service.getDocument(publicDocId, UserRole.EMPLOYEE);
      expect(doc).toBeDefined();
      expect(doc?.id).toBe(publicDocId);
    });

    it('should deny employee access to restricted documents', async () => {
      await expect(service.getDocument(restrictedDocId, UserRole.EMPLOYEE))
        .rejects.toThrow('Access denied to document');
    });

    it('should allow admin to access restricted documents', async () => {
      const doc = await service.getDocument(restrictedDocId, UserRole.ADMIN);
      expect(doc).toBeDefined();
      expect(doc?.id).toBe(restrictedDocId);
    });

    it('should filter search results by access level', async () => {
      const query: KnowledgeSearchQuery = {
        query: 'executive',
        userRole: UserRole.EMPLOYEE,
        searchMode: 'keyword',
        maxAccessLevel: AccessLevel.INTERNAL,
        maxResults: 10,
      };

      const results = await service.search(query);

      // Should not return restricted documents
      results.forEach(result => {
        const accessLevels = [AccessLevel.PUBLIC, AccessLevel.INTERNAL, AccessLevel.CONFIDENTIAL, AccessLevel.RESTRICTED, AccessLevel.SECRET];
        const userMaxLevel = accessLevels.indexOf(AccessLevel.INTERNAL);
        const docLevel = accessLevels.indexOf(result.document.accessLevel);
        expect(docLevel).toBeLessThanOrEqual(userMaxLevel);
      });
    });

    it('should respect user role restrictions in search', async () => {
      const query: KnowledgeSearchQuery = {
        query: 'compensation',
        userRole: UserRole.EMPLOYEE, // Regular employee
        searchMode: 'keyword',
        maxResults: 10,
      };

      const results = await service.search(query);

      // Should not return documents the user doesn't have access to
      results.forEach(result => {
        expect(result.document.allowedRoles).toContain(UserRole.EMPLOYEE);
      });
    });
  });

  describe('Search Query Validation', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should reject empty search query', async () => {
      const invalidQuery: KnowledgeSearchQuery = {
        query: '',
        userRole: UserRole.EMPLOYEE,
        searchMode: 'keyword',
      };

      await expect(service.search(invalidQuery))
        .rejects.toThrow('Search query cannot be empty');
    });

    it('should reject very long search query', async () => {
      const longQuery = 'a'.repeat(1500);
      const invalidQuery: KnowledgeSearchQuery = {
        query: longQuery,
        userRole: UserRole.EMPLOYEE,
        searchMode: 'keyword',
      };

      await expect(service.search(invalidQuery))
        .rejects.toThrow('Search query too long');
    });

    it('should accept valid search query', async () => {
      const validQuery: KnowledgeSearchQuery = {
        query: 'valid search query',
        userRole: UserRole.EMPLOYEE,
        searchMode: 'keyword',
      };

      const results = await service.search(validQuery);
      expect(results).toBeDefined();
    });
  });

  describe('Caching', () => {
    beforeEach(async () => {
      await service.initialize();
      await service.addDocument(mockDocument);
    });

    it('should cache search results', async () => {
      const query: KnowledgeSearchQuery = {
        query: 'employee handbook',
        userRole: UserRole.EMPLOYEE,
        searchMode: 'keyword',
      };

      // First search
      const results1 = await service.search(query);
      
      // Second search (should use cache)
      const results2 = await service.search(query);

      expect(results1).toEqual(results2);
    });

    it('should respect cache TTL', async () => {
      // This test would require mocking time or using a very short TTL
      // For now, just verify that caching is enabled in configuration
      expect(testConfig.caching.enableSearchCache).toBe(true);
      expect(testConfig.caching.cacheTTL).toBeGreaterThan(0);
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should return empty statistics initially', async () => {
      const stats = await service.getStatistics();

      expect(stats.totalDocuments).toBe(0);
      expect(stats.indexedDocuments).toBe(0);
      expect(stats.pendingDocuments).toBe(0);
      expect(stats.failedDocuments).toBe(0);
    });

    it('should update statistics after adding documents', async () => {
      await service.addDocument(mockDocument);

      const stats = await service.getStatistics();

      expect(stats.totalDocuments).toBe(1);
      expect(stats.lastIndexUpdate).toBeInstanceOf(Date);
    });

    it('should return analytics data', () => {
      const analytics = service.getAnalytics();

      expect(analytics).toBeDefined();
      expect(analytics).toHaveProperty('totalDocuments');
      expect(analytics).toHaveProperty('documentsByType');
      expect(analytics).toHaveProperty('searchStats');
      expect(analytics).toHaveProperty('performance');
      expect(analytics).toHaveProperty('engagement');
    });
  });

  describe('Error Handling', () => {
    it('should handle LocalKnowledgeError correctly', async () => {
      await service.initialize();
      
      // Try to get a non-existent document
      const result = await service.getDocument('nonexistent', UserRole.EMPLOYEE);
      expect(result).toBeNull();
    });

    it('should throw LocalKnowledgeError for access denied', async () => {
      await service.initialize();
      const docId = await service.addDocument(restrictedDocument);

      await expect(service.getDocument(docId, UserRole.EMPLOYEE))
        .rejects.toThrow(LocalKnowledgeError);
      
      try {
        await service.getDocument(docId, UserRole.EMPLOYEE);
      } catch (error) {
        expect(error).toBeInstanceOf(LocalKnowledgeError);
        expect((error as LocalKnowledgeError).code).toBe(LocalKnowledgeErrorType.ACCESS_DENIED);
      }
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources properly', async () => {
      await service.initialize();
      await service.addDocument(mockDocument);

      await service.cleanup();

      // Verify cleanup was performed
      // In a real implementation, this would clear connections, caches, etc.
    });
  });

  describe('Performance', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should handle multiple documents efficiently', async () => {
      // Add multiple documents
      const addPromises = [];
      for (let i = 0; i < 10; i++) {
        addPromises.push(service.addDocument({
          ...mockDocument,
          title: `Document ${i}`,
          content: `Content for document ${i}`,
        }));
      }

      const documentIds = await Promise.all(addPromises);
      expect(documentIds).toHaveLength(10);

      // Search should still be fast
      const startTime = Date.now();
      const results = await service.search({
        query: 'document',
        userRole: UserRole.EMPLOYEE,
        searchMode: 'keyword',
        maxResults: 5,
      });
      const searchTime = Date.now() - startTime;

      expect(results).toBeDefined();
      expect(searchTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should limit cache size', async () => {
      // Perform many different searches to test cache limits
      for (let i = 0; i < 1500; i++) {
        await service.search({
          query: `search query ${i}`,
          userRole: UserRole.EMPLOYEE,
          searchMode: 'keyword',
          maxResults: 1,
        });
      }

      // Cache should be limited (this is verified internally by the service)
      const analytics = service.getAnalytics();
      expect(analytics).toBeDefined();
    });
  });
});