/**
 * Local Knowledge Agent Types and Interfaces
 * 
 * This file defines comprehensive types for enterprise knowledge management,
 * semantic search, access control, and knowledge graph operations.
 */

/**
 * Knowledge Base Document Types
 */
export enum KnowledgeDocumentType {
  FAQ = 'faq',
  DOCUMENTATION = 'documentation',
  POLICY = 'policy',
  PROCEDURE = 'procedure',
  ARTICLE = 'article',
  WIKI = 'wiki',
  HANDBOOK = 'handbook',
  TRAINING = 'training',
  API_DOC = 'api_doc',
  TROUBLESHOOTING = 'troubleshooting'
}

/**
 * Knowledge Source Types
 */
export enum KnowledgeSourceType {
  LOCAL_FILE = 'local_file',
  DATABASE = 'database', 
  SHAREPOINT = 'sharepoint',
  CONFLUENCE = 'confluence',
  NOTION = 'notion',
  INTERNAL_WIKI = 'internal_wiki',
  CMS = 'cms',
  API_ENDPOINT = 'api_endpoint'
}

/**
 * Access Control Levels
 */
export enum AccessLevel {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted',
  SECRET = 'secret'
}

/**
 * User Roles for Access Control
 */
export enum UserRole {
  GUEST = 'guest',
  EMPLOYEE = 'employee',
  MANAGER = 'manager',
  ADMIN = 'admin',
  EXECUTIVE = 'executive',
  IT_ADMIN = 'it_admin'
}

/**
 * Core Knowledge Document Interface
 */
export interface KnowledgeDocument {
  /** Unique document identifier */
  id: string;
  /** Document title */
  title: string;
  /** Main document content */
  content: string;
  /** Document type classification */
  type: KnowledgeDocumentType;
  /** Source system or origin */
  source: KnowledgeSourceType;
  /** Required access level to view */
  accessLevel: AccessLevel;
  /** Allowed user roles */
  allowedRoles: UserRole[];
  /** Document metadata */
  metadata: KnowledgeMetadata;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Document version */
  version: string;
  /** Tags for categorization */
  tags: string[];
  /** Related document IDs */
  relatedDocuments?: string[];
  /** Document language */
  language: string;
  /** Full text search optimization */
  searchableContent?: string;
}

/**
 * Knowledge Document Metadata
 */
export interface KnowledgeMetadata {
  /** Original file path or URL */
  originalPath?: string;
  /** File size in bytes */
  fileSize?: number;
  /** MIME type */
  mimeType?: string;
  /** Author information */
  author?: string;
  /** Department or team */
  department?: string;
  /** Document owner */
  owner?: string;
  /** Review date */
  reviewDate?: Date;
  /** Expiration date */
  expirationDate?: Date;
  /** Document status */
  status: 'draft' | 'published' | 'archived' | 'deprecated';
  /** Custom metadata fields */
  customFields?: Record<string, any>;
}

/**
 * Semantic Search Configuration
 */
export interface SemanticSearchConfig {
  /** Vector embedding model */
  embeddingModel: string;
  /** Vector dimension */
  vectorDimension: number;
  /** Similarity threshold */
  similarityThreshold: number;
  /** Maximum results to return */
  maxResults: number;
  /** Enable hybrid search (semantic + keyword) */
  enableHybridSearch: boolean;
  /** Keyword search weight (0-1) */
  keywordWeight: number;
  /** Semantic search weight (0-1) */
  semanticWeight: number;
  /** Enable re-ranking */
  enableReRanking: boolean;
}

/**
 * Search Query Interface
 */
export interface KnowledgeSearchQuery {
  /** Search query text */
  query: string;
  /** Document types to search */
  documentTypes?: KnowledgeDocumentType[];
  /** Access level filter */
  maxAccessLevel?: AccessLevel;
  /** User role for access control */
  userRole: UserRole;
  /** Department filter */
  department?: string;
  /** Tag filters */
  tags?: string[];
  /** Language preference */
  language?: string;
  /** Date range filter */
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  /** Maximum results */
  maxResults?: number;
  /** Include related documents */
  includeRelated?: boolean;
  /** Search mode */
  searchMode: 'semantic' | 'keyword' | 'hybrid';
}

/**
 * Search Result Interface
 */
export interface KnowledgeSearchResult {
  /** Matching document */
  document: KnowledgeDocument;
  /** Relevance score (0-1) */
  score: number;
  /** Highlighted snippets */
  highlights: string[];
  /** Explanation of why this result matched */
  explanation?: string;
  /** Related documents */
  relatedDocuments?: KnowledgeDocument[];
  /** Matched entities */
  matchedEntities?: Entity[];
}

/**
 * Knowledge Graph Entity
 */
export interface Entity {
  /** Entity ID */
  id: string;
  /** Entity name */
  name: string;
  /** Entity type */
  type: EntityType;
  /** Entity description */
  description?: string;
  /** Entity properties */
  properties: Record<string, any>;
  /** Related documents */
  documentIds: string[];
  /** Entity relationships */
  relationships: EntityRelationship[];
}

/**
 * Entity Types
 */
export enum EntityType {
  PERSON = 'person',
  DEPARTMENT = 'department',
  PRODUCT = 'product',
  SERVICE = 'service',
  TECHNOLOGY = 'technology',
  PROCESS = 'process',
  LOCATION = 'location',
  CONCEPT = 'concept',
  ORGANIZATION = 'organization'
}

/**
 * Entity Relationship
 */
export interface EntityRelationship {
  /** Related entity ID */
  entityId: string;
  /** Relationship type */
  type: RelationshipType;
  /** Relationship strength (0-1) */
  strength: number;
  /** Relationship metadata */
  metadata?: Record<string, any>;
}

/**
 * Relationship Types
 */
export enum RelationshipType {
  MANAGES = 'manages',
  WORKS_WITH = 'works_with',
  PART_OF = 'part_of',
  USES = 'uses',
  DEPENDS_ON = 'depends_on',
  SIMILAR_TO = 'similar_to',
  REPLACES = 'replaces',
  CONTAINS = 'contains'
}

/**
 * Knowledge Base Configuration
 */
export interface KnowledgeBaseConfig {
  /** Knowledge base name */
  name: string;
  /** Base path for documents */
  basePath: string;
  /** Supported file types */
  supportedFileTypes: string[];
  /** Maximum file size (MB) */
  maxFileSize: number;
  /** Indexing configuration */
  indexingConfig: IndexingConfig;
  /** Search configuration */
  searchConfig: SemanticSearchConfig;
  /** Access control settings */
  accessControl: AccessControlConfig;
  /** Caching settings */
  caching: CachingConfig;
  /** Auto-update settings */
  autoUpdate: {
    enabled: boolean;
    interval: number; // minutes
    sources: KnowledgeSourceType[];
  };
}

/**
 * Indexing Configuration
 */
export interface IndexingConfig {
  /** Enable full-text indexing */
  enableFullText: boolean;
  /** Enable vector indexing */
  enableVectorIndex: boolean;
  /** Batch size for indexing */
  batchSize: number;
  /** Index update frequency */
  updateFrequency: number; // hours
  /** Extract entities during indexing */
  extractEntities: boolean;
  /** Supported languages */
  supportedLanguages: string[];
}

/**
 * Access Control Configuration
 */
export interface AccessControlConfig {
  /** Enable role-based access control */
  enableRBAC: boolean;
  /** Default access level for new documents */
  defaultAccessLevel: AccessLevel;
  /** Enable department-based filtering */
  enableDepartmentFiltering: boolean;
  /** Admin roles that can access everything */
  adminRoles: UserRole[];
  /** Guest access limitations */
  guestLimitations: {
    maxResults: number;
    allowedTypes: KnowledgeDocumentType[];
  };
}

/**
 * Caching Configuration
 */
export interface CachingConfig {
  /** Enable search result caching */
  enableSearchCache: boolean;
  /** Cache TTL in seconds */
  cacheTTL: number;
  /** Maximum cache size (entries) */
  maxCacheSize: number;
  /** Enable document content caching */
  enableDocumentCache: boolean;
  /** Enable vector cache */
  enableVectorCache: boolean;
}

/**
 * Knowledge Agent Response
 */
export interface LocalKnowledgeResponse {
  /** Original search query */
  query: string;
  /** Search results */
  results: KnowledgeSearchResult[];
  /** Total results found */
  totalResults: number;
  /** Search took (ms) */
  searchTime: number;
  /** Search strategy used */
  searchStrategy: 'semantic' | 'keyword' | 'hybrid';
  /** Suggested related queries */
  suggestedQueries?: string[];
  /** Knowledge graph insights */
  entityInsights?: EntityInsight[];
  /** Answer summary (if available) */
  answerSummary?: string;
  /** Confidence score */
  confidence: number;
}

/**
 * Entity Insight
 */
export interface EntityInsight {
  /** Entity information */
  entity: Entity;
  /** Relevance to query */
  relevance: number;
  /** Related actions or suggestions */
  suggestions: string[];
}

/**
 * Knowledge Analytics
 */
export interface KnowledgeAnalytics {
  /** Total documents */
  totalDocuments: number;
  /** Documents by type */
  documentsByType: Record<KnowledgeDocumentType, number>;
  /** Documents by access level */
  documentsByAccess: Record<AccessLevel, number>;
  /** Search statistics */
  searchStats: {
    totalSearches: number;
    averageResultsPerSearch: number;
    topQueries: Array<{ query: string; count: number }>;
    searchSuccessRate: number;
  };
  /** Performance metrics */
  performance: {
    averageSearchTime: number;
    indexingTime: number;
    cacheHitRate: number;
  };
  /** User engagement */
  engagement: {
    activeUsers: number;
    documentsPerUser: number;
    mostAccessedDocuments: Array<{ documentId: string; accessCount: number }>;
  };
}

/**
 * Error Types for Local Knowledge
 */
export enum LocalKnowledgeErrorType {
  ACCESS_DENIED = 'access_denied',
  DOCUMENT_NOT_FOUND = 'document_not_found',
  SEARCH_FAILED = 'search_failed',
  INDEXING_ERROR = 'indexing_error',
  INVALID_QUERY = 'invalid_query',
  SERVICE_UNAVAILABLE = 'service_unavailable',
  CONFIGURATION_ERROR = 'configuration_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  INITIALIZATION_FAILED = 'initialization_failed',
  INVALID_RESPONSE = 'invalid_response',
  UNKNOWN_ERROR = 'unknown_error',
  EXTRACTION_FAILED = 'extraction_failed',
}

/**
 * Local Knowledge Error
 */
export class LocalKnowledgeError extends Error {
  constructor(
    message: string,
    public code: LocalKnowledgeErrorType,
    public details?: any,
    public context?: string
  ) {
    super(message);
    this.name = 'LocalKnowledgeError';
  }
}

/**
 * Default Configuration
 */
export const DEFAULT_LOCAL_KNOWLEDGE_CONFIG: Required<KnowledgeBaseConfig> = {
  name: 'Enterprise Knowledge Base',
  basePath: './knowledge',
  supportedFileTypes: ['.pdf', '.docx', '.txt', '.md', '.html', '.json'],
  maxFileSize: 50, // MB
  indexingConfig: {
    enableFullText: true,
    enableVectorIndex: true,
    batchSize: 100,
    updateFrequency: 24, // hours
    extractEntities: true,
    supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh']
  },
  searchConfig: {
    embeddingModel: 'text-embedding-3-small',
    vectorDimension: 1536,
    similarityThreshold: 0.7,
    maxResults: 10,
    enableHybridSearch: true,
    keywordWeight: 0.3,
    semanticWeight: 0.7,
    enableReRanking: true
  },
  accessControl: {
    enableRBAC: true,
    defaultAccessLevel: AccessLevel.INTERNAL,
    enableDepartmentFiltering: true,
    adminRoles: [UserRole.ADMIN, UserRole.IT_ADMIN],
    guestLimitations: {
      maxResults: 5,
      allowedTypes: [KnowledgeDocumentType.FAQ, KnowledgeDocumentType.DOCUMENTATION]
    }
  },
  caching: {
    enableSearchCache: true,
    cacheTTL: 3600, // 1 hour
    maxCacheSize: 1000,
    enableDocumentCache: true,
    enableVectorCache: true
  },
  autoUpdate: {
    enabled: true,
    interval: 60, // minutes
    sources: [KnowledgeSourceType.LOCAL_FILE, KnowledgeSourceType.DATABASE]
  }
};