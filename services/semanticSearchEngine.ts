/**
 * Semantic Search Engine
 *
 * Advanced search engine providing vector-based semantic search, keyword matching,
 * and hybrid search capabilities for enterprise knowledge management.
 */
import {
  DEFAULT_LOCAL_KNOWLEDGE_CONFIG,
  KnowledgeDocument,
  KnowledgeSearchQuery,
  KnowledgeSearchResult,
  LocalKnowledgeError,
  LocalKnowledgeErrorType,
  SemanticSearchConfig,
} from '../types/localKnowledge';

import { AzureMonitorLoggingService } from './loggingService';

/**
 * Vector Embedding Interface
 */
interface VectorEmbedding {
  id: string;
  documentId: string;
  vector: number[];
  metadata: {
    textChunk: string;
    chunkIndex: number;
    documentTitle: string;
    documentType: string;
  };
}

/**
 * Search Index Entry
 */
interface SearchIndexEntry {
  documentId: string;
  title: string;
  content: string;
  searchableText: string;
  tokens: string[];
  termFrequency: Map<string, number>;
  documentLength: number;
}

/**
 * Semantic Search Result with Score Details
 */
interface DetailedSearchResult extends KnowledgeSearchResult {
  scoreDetails: {
    semanticScore?: number;
    keywordScore?: number;
    combinedScore: number;
    matchedTerms?: string[];
    similarityScore?: number;
  };
}

/**
 * Semantic Search Engine Implementation
 */
export class SemanticSearchEngine {
  private config: SemanticSearchConfig;
  private logger: AzureMonitorLoggingService;

  // Vector storage (placeholder for actual vector database)
  private vectorStore: Map<string, VectorEmbedding[]> = new Map();
  private searchIndex: Map<string, SearchIndexEntry> = new Map();
  private documentStorage: Map<string, KnowledgeDocument> = new Map();

  // Caching
  private embeddingCache: Map<string, number[]> = new Map();
  private searchCache: Map<string, KnowledgeSearchResult[]> = new Map();

  // Statistics
  private searchStats = {
    totalSearches: 0,
    cacheHits: 0,
    averageSearchTime: 0,
    lastOptimization: new Date(),
  };

  constructor(config?: Partial<SemanticSearchConfig>) {
    this.config = { ...DEFAULT_LOCAL_KNOWLEDGE_CONFIG.searchConfig, ...config };
    this.logger =
      AzureMonitorLoggingService.getInstance() ||
      new AzureMonitorLoggingService();
  }

  /**
   * Initialize the search engine
   */
  async initialize(): Promise<void> {
    try {
      console.log('[INFO] Initializing Semantic Search Engine');

      // Initialize vector store connection (placeholder)
      await this.initializeVectorStore();

      // Initialize search index
      await this.initializeSearchIndex();

      // Warm up embedding cache if needed
      await this.warmupEmbeddingCache();

      console.log('[INFO] Semantic Search Engine initialized successfully');
    } catch (error) {
      console.error(
        '[ERROR] Failed to initialize Semantic Search Engine:',
        error,
      );
      throw new LocalKnowledgeError(
        'Failed to initialize semantic search engine',
        LocalKnowledgeErrorType.SERVICE_UNAVAILABLE,
        error,
      );
    }
  }

  /**
   * Perform semantic search using vector embeddings
   */
  async semanticSearch(
    query: KnowledgeSearchQuery,
  ): Promise<KnowledgeSearchResult[]> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = this.generateSemanticCacheKey(query);
      if (this.searchCache.has(cacheKey)) {
        this.searchStats.cacheHits++;
        return this.searchCache.get(cacheKey)!;
      }

      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query.query);

      // Find similar vectors
      const similarDocuments = await this.findSimilarVectors(
        queryEmbedding,
        query.maxResults || this.config.maxResults,
      );

      // Convert to search results
      const results = await this.convertToSearchResults(
        similarDocuments,
        query,
        'semantic',
      );

      // Apply filters and ranking
      const filteredResults = this.applyFilters(results, query);
      const rankedResults = this.rankResults(filteredResults, 'semantic');

      // Cache results
      this.searchCache.set(cacheKey, rankedResults);

      const searchTime = Date.now() - startTime;
      this.updateSearchStats(searchTime);

      console.log(
        `[INFO] Semantic search completed in ${searchTime}ms, found ${rankedResults.length} results`,
      );

      return rankedResults;
    } catch (error) {
      console.error('[ERROR] Semantic search failed:', error);
      throw new LocalKnowledgeError(
        'Semantic search operation failed',
        LocalKnowledgeErrorType.SEARCH_FAILED,
        error,
        query.query,
      );
    }
  }

  /**
   * Perform keyword-based search
   */
  async keywordSearch(
    query: KnowledgeSearchQuery,
  ): Promise<KnowledgeSearchResult[]> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = this.generateKeywordCacheKey(query);
      if (this.searchCache.has(cacheKey)) {
        this.searchStats.cacheHits++;
        return this.searchCache.get(cacheKey)!;
      }

      // Tokenize and process query
      const queryTerms = this.tokenizeQuery(query.query);
      const results: DetailedSearchResult[] = [];

      // Search through indexed documents
      for (const [documentId, indexEntry] of this.searchIndex.entries()) {
        const score = this.calculateKeywordScore(queryTerms, indexEntry);

        if (score > 0) {
          const matchedTerms = this.findMatchedTerms(queryTerms, indexEntry);
          const highlights = this.generateHighlights(indexEntry, queryTerms);

          // Create search result (placeholder - need actual document)
          const result: DetailedSearchResult = {
            document: this.createPlaceholderDocument(documentId, indexEntry),
            score,
            highlights,
            explanation: `Keyword match score: ${score.toFixed(2)}`,
            scoreDetails: {
              keywordScore: score,
              combinedScore: score,
              matchedTerms,
            },
          };

          results.push(result);
        }
      }

      // Apply filters and ranking
      const filteredResults = this.applyFilters(results, query);
      const rankedResults = this.rankResults(filteredResults, 'keyword');

      // Cache results
      this.searchCache.set(cacheKey, rankedResults);

      const searchTime = Date.now() - startTime;
      this.updateSearchStats(searchTime);

      console.log(
        `[INFO] Keyword search completed in ${searchTime}ms, found ${rankedResults.length} results`,
      );

      return rankedResults;
    } catch (error) {
      console.error('[ERROR] Keyword search failed:', error);
      throw new LocalKnowledgeError(
        'Keyword search operation failed',
        LocalKnowledgeErrorType.SEARCH_FAILED,
        error,
        query.query,
      );
    }
  }

  /**
   * Perform hybrid search combining semantic and keyword approaches
   */
  async hybridSearch(
    query: KnowledgeSearchQuery,
  ): Promise<KnowledgeSearchResult[]> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = this.generateHybridCacheKey(query);
      if (this.searchCache.has(cacheKey)) {
        this.searchStats.cacheHits++;
        return this.searchCache.get(cacheKey)!;
      }

      // Perform both searches concurrently
      const [semanticResults, keywordResults] = await Promise.all([
        this.semanticSearch({
          ...query,
          maxResults: query.maxResults || this.config.maxResults,
        }),
        this.keywordSearch({
          ...query,
          maxResults: query.maxResults || this.config.maxResults,
        }),
      ]);

      // Merge and rerank results
      const mergedResults = this.mergeSearchResults(
        semanticResults,
        keywordResults,
      );
      const rankedResults = this.rankResults(mergedResults, 'hybrid');

      // Limit final results
      const finalResults = rankedResults.slice(
        0,
        query.maxResults || this.config.maxResults,
      );

      // Cache results
      this.searchCache.set(cacheKey, finalResults);

      const searchTime = Date.now() - startTime;
      this.updateSearchStats(searchTime);

      console.log(
        `[INFO] Hybrid search completed in ${searchTime}ms, found ${finalResults.length} results`,
      );

      return finalResults;
    } catch (error) {
      console.error('[ERROR] Hybrid search failed:', error);
      throw new LocalKnowledgeError(
        'Hybrid search operation failed',
        LocalKnowledgeErrorType.SEARCH_FAILED,
        error,
        query.query,
      );
    }
  }

  /**
   * Index a document for search
   */
  async indexDocument(document: KnowledgeDocument): Promise<void> {
    try {
      // Validate document
      if (!document.id || document.id.trim() === '') {
        throw new Error('Document ID is required');
      }

      console.log(`[INFO] Indexing document: ${document.id}`);

      // Store full document data for retrieval
      this.documentStorage.set(document.id, document);

      // Create search index entry
      const indexEntry: SearchIndexEntry = {
        documentId: document.id,
        title: document.title,
        content: document.content,
        searchableText: document.searchableContent || document.content,
        tokens: this.tokenizeText(
          document.searchableContent || document.content,
        ),
        termFrequency: new Map(),
        documentLength: document.content.length,
      };

      // Calculate term frequencies
      indexEntry.termFrequency = this.calculateTermFrequency(indexEntry.tokens);

      // Store in search index
      this.searchIndex.set(document.id, indexEntry);

      // Generate and store vector embeddings
      // Note: Vector index is enabled by default for semantic search
      await this.generateDocumentEmbeddings(document);

      console.log(`[INFO] Document indexed successfully: ${document.id}`);
    } catch (error) {
      console.error(`[ERROR] Failed to index document ${document.id}:`, error);
      throw new LocalKnowledgeError(
        'Failed to index document',
        LocalKnowledgeErrorType.INDEXING_ERROR,
        error,
        document.id,
      );
    }
  }

  /**
   * Remove a document from the index
   */
  async removeDocument(documentId: string): Promise<void> {
    try {
      // Remove from search index
      this.searchIndex.delete(documentId);

      // Remove from document storage
      this.documentStorage.delete(documentId);

      // Remove from vector store
      this.vectorStore.delete(documentId);

      // Clear cache entries containing this document
      this.clearCacheForDocument(documentId);

      console.log(`[INFO] Document removed from index: ${documentId}`);
    } catch (error) {
      console.error(`[ERROR] Failed to remove document ${documentId}:`, error);
      throw new LocalKnowledgeError(
        'Failed to remove document from index',
        LocalKnowledgeErrorType.INDEXING_ERROR,
        error,
        documentId,
      );
    }
  }

  /**
   * Get search engine statistics
   */
  getStatistics() {
    return {
      ...this.searchStats,
      indexedDocuments: this.searchIndex.size,
      vectorEmbeddings: Array.from(this.vectorStore.values()).reduce(
        (sum, vectors) => sum + vectors.length,
        0,
      ),
      cacheSize: this.searchCache.size,
      embeddingCacheSize: this.embeddingCache.size,
    };
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.searchCache.clear();
    this.embeddingCache.clear();
    console.log('[INFO] Semantic search caches cleared');
  }

  /**
   * Optimize the search engine
   */
  async optimize(): Promise<void> {
    try {
      console.log('[INFO] Optimizing semantic search engine');

      // Clear old cache entries
      this.clearExpiredCacheEntries();

      // Optimize vector storage
      await this.optimizeVectorStorage();

      // Update statistics
      this.searchStats.lastOptimization = new Date();

      console.log('[INFO] Semantic search engine optimization completed');
    } catch (error) {
      console.error('[ERROR] Search engine optimization failed:', error);
    }
  }

  /**
   * Private helper methods
   */

  private async initializeVectorStore(): Promise<void> {
    // Placeholder for vector database initialization
    console.log('[INFO] Vector store initialized (placeholder)');
  }

  private async initializeSearchIndex(): Promise<void> {
    // Placeholder for search index initialization
    console.log('[INFO] Search index initialized (placeholder)');
  }

  private async warmupEmbeddingCache(): Promise<void> {
    // Placeholder for warming up embedding cache
    console.log('[INFO] Embedding cache warmed up (placeholder)');
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // Check cache first
    const cacheKey = this.hashText(text);
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey)!;
    }

    // Placeholder for actual embedding generation using Azure OpenAI
    // In production, this would call Azure OpenAI embeddings API
    const embedding = new Array(this.config.vectorDimension)
      .fill(0)
      .map(() => Math.random());

    // Cache the result
    this.embeddingCache.set(cacheKey, embedding);

    return embedding;
  }

  private async findSimilarVectors(
    queryEmbedding: number[],
    maxResults: number,
  ): Promise<Array<{ documentId: string; similarity: number; metadata: any }>> {
    const similarities: Array<{
      documentId: string;
      similarity: number;
      metadata: any;
    }> = [];

    // Search through all vector embeddings
    for (const [documentId, embeddings] of this.vectorStore.entries()) {
      for (const embedding of embeddings) {
        const similarity = this.calculateCosineSimilarity(
          queryEmbedding,
          embedding.vector,
        );

        if (similarity >= this.config.similarityThreshold) {
          similarities.push({
            documentId,
            similarity,
            metadata: embedding.metadata,
          });
        }
      }
    }

    // Sort by similarity and limit results
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxResults);
  }

  private calculateCosineSimilarity(
    vectorA: number[],
    vectorB: number[],
  ): number {
    if (vectorA.length !== vectorB.length) {
      throw new Error('Vectors must have the same dimension');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private async convertToSearchResults(
    similarDocuments: Array<{
      documentId: string;
      similarity: number;
      metadata: any;
    }>,
    query: KnowledgeSearchQuery,
    searchType: string,
  ): Promise<KnowledgeSearchResult[]> {
    const results: KnowledgeSearchResult[] = [];

    for (const similar of similarDocuments) {
      // Get document from index
      const indexEntry = this.searchIndex.get(similar.documentId);
      if (!indexEntry) continue;

      // Create placeholder document
      const document = this.createPlaceholderDocument(
        similar.documentId,
        indexEntry,
      );

      // Generate highlights
      const highlights = this.generateHighlights(
        indexEntry,
        this.tokenizeQuery(query.query),
      );

      results.push({
        document,
        score: similar.similarity,
        highlights,
        explanation: `${searchType} similarity: ${similar.similarity.toFixed(
          3,
        )}`,
      });
    }

    return results;
  }

  private tokenizeQuery(query: string): string[] {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((term) => term.length > 2);
  }

  private tokenizeText(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((term) => term.length > 1);
  }

  private calculateTermFrequency(tokens: string[]): Map<string, number> {
    const termFreq = new Map<string, number>();

    for (const token of tokens) {
      termFreq.set(token, (termFreq.get(token) || 0) + 1);
    }

    return termFreq;
  }

  private calculateKeywordScore(
    queryTerms: string[],
    indexEntry: SearchIndexEntry,
  ): number {
    let score = 0;
    const totalTerms = indexEntry.tokens.length;

    for (const term of queryTerms) {
      const termFreq = indexEntry.termFrequency.get(term) || 0;
      if (termFreq > 0) {
        // TF-IDF-like scoring (simplified)
        const tf = termFreq / totalTerms;
        const idf = Math.log(
          this.searchIndex.size / (this.getDocumentFrequency(term) + 1),
        );
        score += tf * idf;

        // Boost for title matches
        if (indexEntry.title.toLowerCase().includes(term)) {
          score += 0.5;
        }
      }
    }

    return Math.min(score, 1.0); // Normalize to 0-1
  }

  private getDocumentFrequency(term: string): number {
    let count = 0;
    for (const indexEntry of this.searchIndex.values()) {
      if (indexEntry.termFrequency.has(term)) {
        count++;
      }
    }
    return count;
  }

  private findMatchedTerms(
    queryTerms: string[],
    indexEntry: SearchIndexEntry,
  ): string[] {
    const matched: string[] = [];

    for (const term of queryTerms) {
      if (indexEntry.termFrequency.has(term)) {
        matched.push(term);
      }
    }

    return matched;
  }

  private generateHighlights(
    indexEntry: SearchIndexEntry,
    queryTerms: string[],
  ): string[] {
    const highlights: string[] = [];
    const content = indexEntry.content.toLowerCase();

    for (const term of queryTerms) {
      const index = content.indexOf(term);
      if (index !== -1) {
        const start = Math.max(0, index - 50);
        const end = Math.min(content.length, index + term.length + 50);
        const snippet = indexEntry.content.substring(start, end);
        highlights.push(`...${snippet}...`);
      }
    }

    return highlights.slice(0, 3); // Limit to 3 highlights
  }

  private createPlaceholderDocument(
    documentId: string,
    indexEntry: SearchIndexEntry,
  ): KnowledgeDocument {
    // Retrieve the full document from storage if available
    const storedDocument = this.documentStorage.get(documentId);
    if (storedDocument) {
      return storedDocument;
    }

    // Fallback to creating placeholder document
    return {
      id: documentId,
      title: indexEntry.title,
      content: indexEntry.content,
      type: 'documentation' as any,
      source: 'local_file' as any,
      accessLevel: 'internal' as any,
      allowedRoles: [],
      metadata: {
        status: 'published' as any,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      version: '1.0',
      tags: [],
      language: 'en',
      searchableContent: indexEntry.searchableText,
    };
  }

  private applyFilters(
    results: KnowledgeSearchResult[],
    query: KnowledgeSearchQuery,
  ): KnowledgeSearchResult[] {
    let filtered = results;

    // Apply document type filter
    if (query.documentTypes && query.documentTypes.length > 0) {
      filtered = filtered.filter((result) =>
        query.documentTypes!.includes(result.document.type),
      );
    }

    // Apply user role filter
    if (query.userRole) {
      filtered = filtered.filter((result) =>
        result.document.allowedRoles.includes(query.userRole!),
      );
    }

    // Apply other filters as needed
    return filtered;
  }

  private rankResults(
    results: KnowledgeSearchResult[],
    searchType: string,
  ): KnowledgeSearchResult[] {
    return results.sort((a, b) => {
      // Primary sort by score
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      // Secondary sort by document title length (shorter titles first)
      return a.document.title.length - b.document.title.length;
    });
  }

  private mergeSearchResults(
    semanticResults: KnowledgeSearchResult[],
    keywordResults: KnowledgeSearchResult[],
  ): KnowledgeSearchResult[] {
    const mergedMap = new Map<string, KnowledgeSearchResult>();

    // Add semantic results
    for (const result of semanticResults) {
      const combinedScore = result.score * this.config.semanticWeight;
      mergedMap.set(result.document.id, {
        ...result,
        score: combinedScore,
        explanation: `Semantic: ${result.score.toFixed(
          3,
        )} (weighted: ${combinedScore.toFixed(3)})`,
      });
    }

    // Add keyword results and combine scores
    for (const result of keywordResults) {
      const keywordScore = result.score * this.config.keywordWeight;
      const existing = mergedMap.get(result.document.id);

      if (existing) {
        // Combine scores
        existing.score += keywordScore;
        existing.explanation += `, Keyword: ${result.score.toFixed(
          3,
        )} (weighted: ${keywordScore.toFixed(3)})`;
        existing.highlights = [...existing.highlights, ...result.highlights];
      } else {
        mergedMap.set(result.document.id, {
          ...result,
          score: keywordScore,
          explanation: `Keyword: ${result.score.toFixed(
            3,
          )} (weighted: ${keywordScore.toFixed(3)})`,
        });
      }
    }

    return Array.from(mergedMap.values());
  }

  private async generateDocumentEmbeddings(
    document: KnowledgeDocument,
  ): Promise<void> {
    const text = document.searchableContent || document.content;
    const chunkSize = 1000; // Characters per chunk
    const chunks: string[] = [];

    // Split document into chunks
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.substring(i, i + chunkSize));
    }

    // Generate embeddings for each chunk
    const embeddings: VectorEmbedding[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const vector = await this.generateEmbedding(chunks[i]);
      embeddings.push({
        id: `${document.id}_chunk_${i}`,
        documentId: document.id,
        vector,
        metadata: {
          textChunk: chunks[i],
          chunkIndex: i,
          documentTitle: document.title,
          documentType: document.type,
        },
      });
    }

    // Store embeddings
    this.vectorStore.set(document.id, embeddings);
  }

  private generateSemanticCacheKey(query: KnowledgeSearchQuery): string {
    const keyObj = {
      query: query.query,
      type: 'semantic',
      maxResults: query.maxResults,
      documentTypes: query.documentTypes,
    };
    return this.hashText(JSON.stringify(keyObj));
  }

  private generateKeywordCacheKey(query: KnowledgeSearchQuery): string {
    const keyObj = {
      query: query.query,
      type: 'keyword',
      maxResults: query.maxResults,
      documentTypes: query.documentTypes,
    };
    return this.hashText(JSON.stringify(keyObj));
  }

  private generateHybridCacheKey(query: KnowledgeSearchQuery): string {
    const keyObj = {
      query: query.query,
      type: 'hybrid',
      maxResults: query.maxResults,
      documentTypes: query.documentTypes,
    };
    return this.hashText(JSON.stringify(keyObj));
  }

  private hashText(text: string): string {
    // Simple hash function (in production, use a proper hash)
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  private clearCacheForDocument(documentId: string): void {
    // Clear cache entries that might contain this document
    for (const [key, results] of this.searchCache.entries()) {
      if (results.some((result) => result.document.id === documentId)) {
        this.searchCache.delete(key);
      }
    }
  }

  private clearExpiredCacheEntries(): void {
    // In a real implementation, this would check timestamps and clear expired entries
    if (this.searchCache.size > 1000) {
      this.searchCache.clear();
    }
    if (this.embeddingCache.size > 500) {
      this.embeddingCache.clear();
    }
  }

  private async optimizeVectorStorage(): Promise<void> {
    // Placeholder for vector storage optimization
    console.log('[INFO] Vector storage optimized (placeholder)');
  }

  private updateSearchStats(searchTime: number): void {
    this.searchStats.totalSearches++;
    this.searchStats.averageSearchTime =
      (this.searchStats.averageSearchTime + searchTime) / 2;
  }
}
