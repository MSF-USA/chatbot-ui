/**
 * Knowledge Graph Service Tests
 * 
 * Unit tests for the KnowledgeGraphService implementation,
 * covering entity extraction, relationship mapping, and graph operations.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { KnowledgeGraphService } from '../../../services/knowledgeGraphService';
import {
  KnowledgeDocument,
  KnowledgeDocumentType,
  KnowledgeSourceType,
  AccessLevel,
  UserRole,
  EntityType,
  RelationshipType,
  KnowledgeGraphConfig,
  KnowledgeGraphQuery,
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

describe('KnowledgeGraphService', () => {
  let service: KnowledgeGraphService;
  let testConfig: KnowledgeGraphConfig;

  // Test documents
  const mockDocument: KnowledgeDocument = {
    id: 'doc_001',
    title: 'Employee Handbook - John Smith HR Manager',
    content: 'John Smith is the HR Manager at TechCorp Inc. He works in the San Francisco office and manages employee policies and procedures.',
    type: KnowledgeDocumentType.HANDBOOK,
    source: KnowledgeSourceType.LOCAL_FILE,
    accessLevel: AccessLevel.INTERNAL,
    allowedRoles: [UserRole.EMPLOYEE, UserRole.MANAGER],
    metadata: {
      status: 'published',
      author: 'HR Department',
      department: 'Human Resources',
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    version: '1.0',
    tags: ['hr', 'employees', 'management'],
    language: 'en',
    searchableContent: 'john smith hr manager techcorp inc san francisco office employee policies procedures',
  };

  const mockDocument2: KnowledgeDocument = {
    id: 'doc_002',
    title: 'IT Security Policy - Alice Johnson IT Admin',
    content: 'Alice Johnson is the IT Administrator at TechCorp Inc. She is responsible for cybersecurity and data protection protocols.',
    type: KnowledgeDocumentType.POLICY,
    source: KnowledgeSourceType.LOCAL_FILE,
    accessLevel: AccessLevel.INTERNAL,
    allowedRoles: [UserRole.EMPLOYEE, UserRole.IT_ADMIN],
    metadata: {
      status: 'published',
      author: 'IT Department',
      department: 'Information Technology',
    },
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
    version: '1.0',
    tags: ['it', 'security', 'admin'],
    language: 'en',
    searchableContent: 'alice johnson it administrator techcorp inc cybersecurity data protection protocols',
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    testConfig = {
      ...DEFAULT_LOCAL_KNOWLEDGE_CONFIG.knowledgeGraph!,
      enableEntityExtraction: true,
      enableRelationshipExtraction: true,
      enableEntityLinking: true,
    };

    service = new KnowledgeGraphService(testConfig);
    await service.initialize();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize service successfully', async () => {
      const newService = new KnowledgeGraphService(testConfig);
      await expect(newService.initialize()).resolves.not.toThrow();
    });

    it('should initialize with empty graph', () => {
      const stats = service.getStatistics();
      expect(stats.totalEntities).toBe(0);
      expect(stats.totalRelationships).toBe(0);
      expect(stats.totalDocuments).toBe(0);
    });
  });

  describe('Document Processing', () => {
    it('should process document and extract entities', async () => {
      await service.processDocument(mockDocument);

      const stats = service.getStatistics();
      expect(stats.totalEntities).toBeGreaterThan(0);
      expect(stats.totalDocuments).toBe(1);
      
      // Should extract person entity
      const johnSmithEntities = service.getEntitiesByName('John Smith', false);
      expect(johnSmithEntities).toHaveLength(1);
      expect(johnSmithEntities[0].type).toBe(EntityType.PERSON);
      
      // Should extract organization entity
      const techCorpEntities = service.getEntitiesByName('TechCorp Inc', false);
      expect(techCorpEntities).toHaveLength(1);
      expect(techCorpEntities[0].type).toBe(EntityType.ORGANIZATION);
    });

    it('should extract relationships between entities', async () => {
      await service.processDocument(mockDocument);

      const stats = service.getStatistics();
      expect(stats.totalRelationships).toBeGreaterThan(0);
      
      // Find John Smith entity
      const johnSmithEntities = service.getEntitiesByName('John Smith', false);
      expect(johnSmithEntities).toHaveLength(1);
      
      // Check relationships
      const relationships = service.getEntityRelationships(johnSmithEntities[0].id);
      expect(relationships.length).toBeGreaterThan(0);
      
      // Should have "works for" relationship with TechCorp
      const worksForRel = relationships.find(rel => rel.type === RelationshipType.WORKS_FOR);
      expect(worksForRel).toBeDefined();
    });

    it('should process multiple documents', async () => {
      await service.processDocument(mockDocument);
      await service.processDocument(mockDocument2);

      const stats = service.getStatistics();
      expect(stats.totalDocuments).toBe(2);
      expect(stats.totalEntities).toBeGreaterThan(2); // At least 2 person entities + organization
      
      // Should have both John Smith and Alice Johnson
      const johnEntities = service.getEntitiesByName('John Smith', false);
      const aliceEntities = service.getEntitiesByName('Alice Johnson', false);
      expect(johnEntities).toHaveLength(1);
      expect(aliceEntities).toHaveLength(1);
      
      // Both should work for TechCorp
      const techCorpEntities = service.getEntitiesByName('TechCorp Inc', false);
      expect(techCorpEntities).toHaveLength(1);
      expect(techCorpEntities[0].frequency).toBe(2); // Mentioned in both documents
    });

    it('should handle document removal', async () => {
      await service.processDocument(mockDocument);
      
      const statsAfterAdd = service.getStatistics();
      expect(statsAfterAdd.totalDocuments).toBe(1);
      
      await service.removeDocument(mockDocument.id);
      
      const statsAfterRemove = service.getStatistics();
      expect(statsAfterRemove.totalDocuments).toBe(0);
      // Entities and relationships should also be cleaned up
    });

    it('should update entity frequency on multiple mentions', async () => {
      await service.processDocument(mockDocument);
      
      // Process same document again (simulating update)
      const updatedDoc = { ...mockDocument, id: 'doc_001_updated' };
      await service.processDocument(updatedDoc);
      
      const techCorpEntities = service.getEntitiesByName('TechCorp Inc', false);
      expect(techCorpEntities).toHaveLength(1);
      expect(techCorpEntities[0].frequency).toBe(2);
    });
  });

  describe('Entity Management', () => {
    beforeEach(async () => {
      await service.processDocument(mockDocument);
      await service.processDocument(mockDocument2);
    });

    it('should retrieve entities by name (exact match)', () => {
      const entities = service.getEntitiesByName('John Smith', false);
      expect(entities).toHaveLength(1);
      expect(entities[0].name).toBe('John Smith');
      expect(entities[0].type).toBe(EntityType.PERSON);
    });

    it('should retrieve entities by name (fuzzy match)', () => {
      const entities = service.getEntitiesByName('John', true);
      expect(entities.length).toBeGreaterThan(0);
      
      const johnEntity = entities.find(e => e.name === 'John Smith');
      expect(johnEntity).toBeDefined();
    });

    it('should return empty array for non-existent entity', () => {
      const entities = service.getEntitiesByName('Non Existent Person');
      expect(entities).toHaveLength(0);
    });

    it('should get entity by ID', () => {
      const johnEntities = service.getEntitiesByName('John Smith', false);
      expect(johnEntities).toHaveLength(1);
      
      const entity = service.getEntity(johnEntities[0].id);
      expect(entity).toBeDefined();
      expect(entity!.name).toBe('John Smith');
    });

    it('should return null for non-existent entity ID', () => {
      const entity = service.getEntity('non_existent_id');
      expect(entity).toBeNull();
    });
  });

  describe('Relationship Management', () => {
    beforeEach(async () => {
      await service.processDocument(mockDocument);
      await service.processDocument(mockDocument2);
    });

    it('should get relationships for an entity', () => {
      const johnEntities = service.getEntitiesByName('John Smith', false);
      expect(johnEntities).toHaveLength(1);
      
      const relationships = service.getEntityRelationships(johnEntities[0].id);
      expect(relationships.length).toBeGreaterThan(0);
    });

    it('should include both source and target relationships', () => {
      const techCorpEntities = service.getEntitiesByName('TechCorp Inc', false);
      expect(techCorpEntities).toHaveLength(1);
      
      const relationships = service.getEntityRelationships(techCorpEntities[0].id);
      
      // Should have relationships where TechCorp is both source and target
      const asTarget = relationships.filter(rel => rel.targetEntityId === techCorpEntities[0].id);
      expect(asTarget.length).toBeGreaterThan(0);
    });

    it('should return empty array for entity with no relationships', () => {
      // Create a standalone entity (this would require manual creation in a real scenario)
      const relationships = service.getEntityRelationships('non_existent_entity');
      expect(relationships).toHaveLength(0);
    });
  });

  describe('Knowledge Graph Queries', () => {
    beforeEach(async () => {
      await service.processDocument(mockDocument);
      await service.processDocument(mockDocument2);
    });

    it('should perform entity search query', async () => {
      const query: KnowledgeGraphQuery = {
        type: 'entity_search',
        parameters: {
          searchTerm: 'John',
        },
      };

      const results = await service.queryGraph(query);
      expect(results.length).toBeGreaterThan(0);
      
      const johnResult = results.find(r => r.entity?.name === 'John Smith');
      expect(johnResult).toBeDefined();
      expect(johnResult!.type).toBe('entity');
    });

    it('should perform relationship search query', async () => {
      const query: KnowledgeGraphQuery = {
        type: 'relationship_search',
        parameters: {
          relationshipType: RelationshipType.WORKS_FOR,
        },
      };

      const results = await service.queryGraph(query);
      expect(results.length).toBeGreaterThan(0);
      
      // Should find "works for" relationships
      const worksForResults = results.filter(r => r.relationship?.type === RelationshipType.WORKS_FOR);
      expect(worksForResults.length).toBeGreaterThan(0);
    });

    it('should perform neighborhood query', async () => {
      const johnEntities = service.getEntitiesByName('John Smith', false);
      expect(johnEntities).toHaveLength(1);
      
      const query: KnowledgeGraphQuery = {
        type: 'neighborhood',
        parameters: {
          entityId: johnEntities[0].id,
        },
      };

      const results = await service.queryGraph(query);
      expect(results.length).toBeGreaterThan(0);
      
      // Should return connected entities
      const connectedEntities = results.filter(r => r.type === 'entity');
      expect(connectedEntities.length).toBeGreaterThan(0);
    });

    it('should handle unsupported query type', async () => {
      const query: KnowledgeGraphQuery = {
        type: 'unsupported_type' as any,
        parameters: {},
      };

      await expect(service.queryGraph(query)).rejects.toThrow('Knowledge graph query failed');
    });
  });

  describe('Statistics and Analytics', () => {
    it('should return empty statistics initially', () => {
      const stats = service.getStatistics();
      
      expect(stats.totalEntities).toBe(0);
      expect(stats.totalRelationships).toBe(0);
      expect(stats.totalDocuments).toBe(0);
      expect(stats.averageEntitiesPerDocument).toBe(0);
      expect(stats.extractionStats.totalExtractions).toBe(0);
    });

    it('should track extraction statistics', async () => {
      // Process fresh service to ensure clean statistics
      const freshService = new KnowledgeGraphService(testConfig);
      await freshService.initialize();
      
      await freshService.processDocument(mockDocument);
      
      const stats = freshService.getStatistics();
      expect(stats.extractionStats.totalExtractions).toBe(1);
      expect(stats.extractionStats.entitiesExtracted).toBeGreaterThan(0);
      expect(stats.extractionStats.relationshipsExtracted).toBeGreaterThan(0);
      expect(stats.extractionStats.averageExtractionTime).toBeGreaterThan(0);
    });

    it('should calculate entity type distribution', async () => {
      await service.processDocument(mockDocument);
      
      const stats = service.getStatistics();
      expect(stats.entityTypes).toBeDefined();
      expect(stats.entityTypes[EntityType.PERSON]).toBeGreaterThan(0);
      expect(stats.entityTypes[EntityType.ORGANIZATION]).toBeGreaterThan(0);
    });

    it('should calculate relationship type distribution', async () => {
      await service.processDocument(mockDocument);
      
      const stats = service.getStatistics();
      expect(stats.relationshipTypes).toBeDefined();
      expect(stats.relationshipTypes[RelationshipType.WORKS_FOR]).toBeGreaterThan(0);
    });

    it('should calculate average entities per document', async () => {
      await service.processDocument(mockDocument);
      await service.processDocument(mockDocument2);
      
      const stats = service.getStatistics();
      expect(stats.averageEntitiesPerDocument).toBeGreaterThan(0);
      expect(stats.totalDocuments).toBe(2);
    });
  });

  describe('Graph Operations', () => {
    beforeEach(async () => {
      await service.processDocument(mockDocument);
      await service.processDocument(mockDocument2);
    });

    it('should clear the knowledge graph', () => {
      const statsBeforeClear = service.getStatistics();
      expect(statsBeforeClear.totalEntities).toBeGreaterThan(0);
      
      service.clear();
      
      const statsAfterClear = service.getStatistics();
      expect(statsAfterClear.totalEntities).toBe(0);
      expect(statsAfterClear.totalRelationships).toBe(0);
      expect(statsAfterClear.totalDocuments).toBe(0);
    });

    it('should maintain entity consistency across operations', async () => {
      // Get initial entity count
      const initialStats = service.getStatistics();
      const initialEntityCount = initialStats.totalEntities;
      
      // Add a document mentioning existing entities
      const newDoc = {
        ...mockDocument,
        id: 'doc_003',
        content: 'John Smith and Alice Johnson both work at TechCorp Inc.',
      };
      
      await service.processDocument(newDoc);
      
      const finalStats = service.getStatistics();
      
      // Should not create duplicate entities
      const johnEntities = service.getEntitiesByName('John Smith', false);
      const aliceEntities = service.getEntitiesByName('Alice Johnson', false);
      const techCorpEntities = service.getEntitiesByName('TechCorp Inc', false);
      
      expect(johnEntities).toHaveLength(1);
      expect(aliceEntities).toHaveLength(1);
      expect(techCorpEntities).toHaveLength(1);
      
      // Frequency should be updated
      expect(johnEntities[0].frequency).toBe(2);
      expect(aliceEntities[0].frequency).toBe(2);
      expect(techCorpEntities[0].frequency).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle document processing errors gracefully', async () => {
      const invalidDoc = {
        ...mockDocument,
        content: '', // Empty content
      };

      // Should not throw, but may have different behavior
      await expect(service.processDocument(invalidDoc)).resolves.not.toThrow();
    });

    it('should handle removal of non-existent document', async () => {
      await expect(service.removeDocument('non_existent_doc')).resolves.not.toThrow();
    });

    it('should handle query with missing parameters', async () => {
      const query: KnowledgeGraphQuery = {
        type: 'entity_search',
        parameters: {},
      };

      const results = await service.queryGraph(query);
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should process documents within reasonable time', async () => {
      const startTime = Date.now();
      await service.processDocument(mockDocument);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle multiple documents efficiently', async () => {
      const startTime = Date.now();
      
      // Process multiple documents
      for (let i = 0; i < 10; i++) {
        const doc = {
          ...mockDocument,
          id: `doc_${i}`,
          title: `Document ${i}`,
          content: `Employee ${i} works at Company ${i}.`,
        };
        await service.processDocument(doc);
      }
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(15000); // Should complete within 15 seconds
      
      const stats = service.getStatistics();
      expect(stats.totalDocuments).toBe(10);
    });

    it('should maintain performance with large graphs', async () => {
      // Build a larger graph
      for (let i = 0; i < 50; i++) {
        const doc = {
          ...mockDocument,
          id: `doc_${i}`,
          content: `Person ${i} works at Company ${i % 5} in City ${i % 3}.`,
        };
        await service.processDocument(doc);
      }
      
      // Query should still be fast
      const startTime = Date.now();
      const results = await service.queryGraph({
        type: 'entity_search',
        parameters: { searchTerm: 'Person' },
      });
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(results.length).toBeGreaterThan(0);
    });
  });
});