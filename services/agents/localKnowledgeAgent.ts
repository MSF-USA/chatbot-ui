/**
 * Local Knowledge Agent
 * 
 * Specialized agent for accessing enterprise knowledge bases, internal documentation,
 * FAQs, and organizational knowledge with advanced semantic search capabilities.
 */

import { BaseAgent, AgentExecutionError } from './baseAgent';
import {
  AgentConfig,
  AgentExecutionContext,
  AgentResponse,
  AgentType,
  LocalKnowledgeAgentConfig,
} from '../../types/agent';
import {
  KnowledgeSearchQuery,
  KnowledgeSearchResult,
  LocalKnowledgeResponse,
  LocalKnowledgeError,
  LocalKnowledgeErrorType,
  UserRole,
  AccessLevel,
  DEFAULT_LOCAL_KNOWLEDGE_CONFIG,
} from '../../types/localKnowledge';

import { KnowledgeBaseService } from '../knowledgeBaseService';
import { SemanticSearchEngine } from '../semanticSearchEngine';
import { KnowledgeGraphService } from '../knowledgeGraphService';
import { AzureMonitorLoggingService } from '../loggingService';

/**
 * Local Knowledge Agent Implementation
 */
export class LocalKnowledgeAgent extends BaseAgent {
  private knowledgeBaseService: KnowledgeBaseService;
  private searchEngine: SemanticSearchEngine;
  private knowledgeGraphService?: KnowledgeGraphService;
  private logger: AzureMonitorLoggingService;
  
  // Performance tracking
  private searchCache: Map<string, { results: LocalKnowledgeResponse; timestamp: number }> = new Map();
  private queryHistory: Array<{ query: string; timestamp: Date; results: number }> = [];

  constructor(config: LocalKnowledgeAgentConfig) {
    super(config);
    
    // Initialize services
    const knowledgeConfig = config.knowledgeBaseConfig || DEFAULT_LOCAL_KNOWLEDGE_CONFIG;
    this.knowledgeBaseService = new KnowledgeBaseService(knowledgeConfig);
    this.searchEngine = new SemanticSearchEngine(knowledgeConfig.searchConfig);
    this.logger = AzureMonitorLoggingService.getInstance() || new AzureMonitorLoggingService();
    
    // Initialize knowledge graph service if enabled
    if (config.enableKnowledgeGraph) {
      this.knowledgeGraphService = new KnowledgeGraphService(knowledgeConfig);
    }
  }

  /**
   * Initialize the knowledge agent
   */
  protected initializeAgent(): void {
    try {
      console.log(`[INFO] Initializing Local Knowledge Agent: ${this.config.id}`);

      // Initialize services asynchronously in the background
      this.initializeAsync();

      console.log(`[INFO] Local Knowledge Agent initialization started: ${this.config.id}`);
    } catch (error) {
      console.error(`[ERROR] Failed to initialize Local Knowledge Agent: ${this.config.id}`, error);
      throw new AgentExecutionError(
        'Failed to initialize Local Knowledge Agent',
        error
      );
    }
  }

  /**
   * Async initialization of services
   */
  private async initializeAsync(): Promise<void> {
    try {
      // Initialize knowledge base service
      await this.knowledgeBaseService.initialize();

      // Initialize semantic search engine
      await this.searchEngine.initialize();

      // Initialize knowledge graph service if enabled
      if (this.knowledgeGraphService) {
        await this.knowledgeGraphService.initialize();
      }

      // Load initial knowledge if configured
      await this.loadInitialKnowledge();

      console.log(`[INFO] Local Knowledge Agent initialized successfully: ${this.config.id}`);
    } catch (error) {
      console.error(`[ERROR] Failed to async initialize Local Knowledge Agent: ${this.config.id}`, error);
    }
  }

  /**
   * Execute knowledge search and retrieval
   */
  protected async executeInternal(context: AgentExecutionContext): Promise<AgentResponse> {
    const startTime = Date.now();
    const correlationId = context.correlationId || this.generateCorrelationId();

    try {
      console.log(`[INFO] Executing knowledge search`, {
        agentId: this.config.id,
        query: context.query.substring(0, 100),
        correlationId,
      });

      // Extract user role for access control
      const userRole = this.extractUserRole(context);
      const maxAccessLevel = this.determineMaxAccessLevel(userRole);

      // Check cache first if enabled
      if (this.getKnowledgeConfig().enableCaching) {
        const cached = this.getCachedResponse(context.query, userRole);
        if (cached) {
          console.log(`[INFO] Returning cached knowledge result for: ${context.query.substring(0, 50)}`);
          return this.createSuccessResponse(cached, correlationId, Date.now() - startTime);
        }
      }

      // Create knowledge search query
      const searchQuery: KnowledgeSearchQuery = {
        query: context.query,
        userRole,
        maxAccessLevel,
        searchMode: this.getKnowledgeConfig().defaultSearchMode || 'hybrid',
        maxResults: this.getKnowledgeConfig().maxResults || 10,
        includeRelated: this.getKnowledgeConfig().enableRelatedSuggestions,
        language: context.locale || 'en',
      };

      // Perform knowledge search
      const searchResults = await this.performKnowledgeSearch(searchQuery);

      // Create comprehensive response
      const knowledgeResponse = await this.createKnowledgeResponse(
        searchQuery,
        searchResults,
        Date.now() - startTime
      );

      // Cache result if enabled
      if (this.getKnowledgeConfig().enableCaching) {
        this.cacheResponse(context.query, userRole, knowledgeResponse);
      }

      // Track query for analytics
      this.trackQuery(context.query, searchResults.length);

      // Log to Azure Monitor
      void this.logger.logAgentExecution(
        startTime,
        this.config.id,
        AgentType.LOCAL_KNOWLEDGE,
        this.config.modelId,
        context.user,
        undefined, // botId not available in context
        correlationId
      );

      console.log(`[INFO] Knowledge search completed successfully`, {
        agentId: this.config.id,
        resultsCount: searchResults.length,
        processingTime: Date.now() - startTime,
        correlationId,
      });

      return this.createSuccessResponse(knowledgeResponse, correlationId, Date.now() - startTime);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      console.error(`[ERROR] Knowledge search failed`, error, {
        agentId: this.config.id,
        query: context.query.substring(0, 100),
        processingTime,
        correlationId,
      });

      // Log error to Azure Monitor
      void this.logger.logAgentError(
        startTime,
        error,
        this.config.id,
        AgentType.LOCAL_KNOWLEDGE,
        this.config.modelId,
        context.user,
        undefined, // botId not available in context
        correlationId
      );

      throw new AgentExecutionError(
        'Knowledge search operation failed',
        {
          originalError: error,
          query: context.query,
          processingTime,
        }
      );
    }
  }

  /**
   * Validate agent-specific configuration
   */
  protected validateSpecificConfig(): string[] {
    const errors: string[] = [];
    const config = this.config as LocalKnowledgeAgentConfig;

    // Validate knowledge base configuration
    if (!config.knowledgeBaseConfig) {
      errors.push('Knowledge base configuration is required');
    } else {
      if (!config.knowledgeBaseConfig.name) {
        errors.push('Knowledge base name is required');
      }
      if (!config.knowledgeBaseConfig.basePath) {
        errors.push('Knowledge base path is required');
      }
    }

    // Validate optional settings
    if (config.maxResults !== undefined && config.maxResults <= 0) {
      errors.push('Maximum results must be greater than 0');
    }

    if (config.similarityThreshold !== undefined && 
        (config.similarityThreshold < 0 || config.similarityThreshold > 1)) {
      errors.push('Similarity threshold must be between 0 and 1');
    }

    if (config.cacheTtl !== undefined && config.cacheTtl <= 0) {
      errors.push('Cache TTL must be greater than 0');
    }

    return errors;
  }

  /**
   * Get agent capabilities
   */
  protected getCapabilities(): string[] {
    const capabilities = [
      'knowledge_search',
      'semantic_search',
      'keyword_search',
      'hybrid_search',
      'document_retrieval',
      'content_filtering',
    ];

    const config = this.getKnowledgeConfig();

    if (config.enableAccessControl) {
      capabilities.push('access_control');
    }

    if (config.enableKnowledgeGraph) {
      capabilities.push('knowledge_graph', 'entity_linking');
    }

    if (config.enableEntityExtraction) {
      capabilities.push('entity_extraction');
    }

    if (config.enableAnswerSummary) {
      capabilities.push('answer_summarization');
    }

    if (config.enableRelatedSuggestions) {
      capabilities.push('related_suggestions');
    }

    if (config.enableAnalytics) {
      capabilities.push('usage_analytics');
    }

    return capabilities;
  }

  /**
   * Perform health check specific to knowledge agent
   */
  protected async performHealthCheck(): Promise<boolean> {
    try {
      // Check knowledge base service health
      const kbStats = await this.knowledgeBaseService.getStatistics();
      if (kbStats.totalDocuments === 0) {
        console.warn('[WARN] Knowledge base contains no documents');
        return false;
      }

      // Check search engine health
      const searchStats = this.searchEngine.getStatistics();
      if (searchStats.indexedDocuments === 0) {
        console.warn('[WARN] Search engine has no indexed documents');
        return false;
      }

      // Perform test search
      const testQuery: KnowledgeSearchQuery = {
        query: 'test health check',
        userRole: UserRole.EMPLOYEE,
        searchMode: 'keyword',
        maxResults: 1,
      };

      await this.searchEngine.keywordSearch(testQuery);

      return true;
    } catch (error) {
      console.error('[ERROR] Knowledge agent health check failed:', error);
      return false;
    }
  }

  /**
   * Clean up agent resources
   */
  protected async performCleanup(): Promise<void> {
    try {
      // Clear caches
      this.searchCache.clear();
      this.queryHistory.length = 0;

      // Cleanup services
      await this.knowledgeBaseService.cleanup();
      this.searchEngine.clearCache();
      
      // Cleanup knowledge graph if enabled
      if (this.knowledgeGraphService) {
        this.knowledgeGraphService.clear();
      }

      console.log(`[INFO] Local Knowledge Agent cleanup completed: ${this.config.id}`);
    } catch (error) {
      console.error(`[ERROR] Local Knowledge Agent cleanup failed: ${this.config.id}`, error);
      throw error;
    }
  }

  /**
   * Add a document to the knowledge base
   */
  async addDocument(document: any): Promise<string> {
    try {
      const documentId = await this.knowledgeBaseService.addDocument(document);
      const fullDocument = { ...document, id: documentId };
      
      await this.searchEngine.indexDocument(fullDocument);
      
      // Process document with knowledge graph if enabled
      if (this.knowledgeGraphService) {
        await this.knowledgeGraphService.processDocument(fullDocument);
      }
      
      // Clear caches since new content is available
      this.searchCache.clear();
      
      return documentId;
    } catch (error) {
      throw new AgentExecutionError('Failed to add document to knowledge base', error);
    }
  }

  /**
   * Remove a document from the knowledge base
   */
  async removeDocument(documentId: string): Promise<void> {
    try {
      await this.knowledgeBaseService.removeDocument(documentId);
      await this.searchEngine.removeDocument(documentId);
      
      // Remove document from knowledge graph if enabled
      if (this.knowledgeGraphService) {
        await this.knowledgeGraphService.removeDocument(documentId);
      }
      
      // Clear caches since content has been removed
      this.searchCache.clear();
    } catch (error) {
      throw new AgentExecutionError('Failed to remove document from knowledge base', error);
    }
  }

  /**
   * Query the knowledge graph for entities and relationships
   */
  async queryKnowledgeGraph(query: any): Promise<any[]> {
    if (!this.knowledgeGraphService) {
      throw new AgentExecutionError('Knowledge graph is not enabled for this agent');
    }
    
    try {
      return await this.knowledgeGraphService.queryGraph(query);
    } catch (error) {
      throw new AgentExecutionError('Failed to query knowledge graph', error);
    }
  }

  /**
   * Get entities by name or type
   */
  getEntities(name?: string, type?: string): any[] {
    if (!this.knowledgeGraphService) {
      return [];
    }
    
    if (name) {
      return this.knowledgeGraphService.getEntitiesByName(name);
    }
    
    // If type filtering is needed, would implement here
    return [];
  }

  /**
   * Get relationships for an entity
   */
  getEntityRelationships(entityId: string): any[] {
    if (!this.knowledgeGraphService) {
      return [];
    }
    
    return this.knowledgeGraphService.getEntityRelationships(entityId);
  }

  /**
   * Get knowledge base statistics
   */
  async getKnowledgeStatistics() {
    const kbStats = await this.knowledgeBaseService.getStatistics();
    const searchStats = this.searchEngine.getStatistics();
    const agentStats = this.getExecutionStats();
    const knowledgeGraphStats = this.knowledgeGraphService?.getStatistics();

    return {
      knowledgeBase: kbStats,
      searchEngine: searchStats,
      knowledgeGraph: knowledgeGraphStats,
      agent: agentStats,
      recentQueries: this.queryHistory.slice(-10),
      cacheSize: this.searchCache.size,
    };
  }

  /**
   * Private helper methods
   */

  private getKnowledgeConfig(): LocalKnowledgeAgentConfig {
    return this.config as LocalKnowledgeAgentConfig;
  }

  private async loadInitialKnowledge(): Promise<void> {
    // Placeholder for loading initial knowledge documents
    // In production, this would load from configured sources
    console.log('[INFO] Initial knowledge loading completed (placeholder)');
  }

  private extractUserRole(context: AgentExecutionContext): UserRole {
    // Extract user role from context or session
    // This would integrate with the application's user management system
    const userEmail = context.user?.mail || '';
    
    // Simple role determination based on email domain or other factors
    if (userEmail.includes('admin')) {
      return UserRole.ADMIN;
    }
    if (userEmail.includes('manager')) {
      return UserRole.MANAGER;
    }
    if (userEmail.includes('it')) {
      return UserRole.IT_ADMIN;
    }
    
    return UserRole.EMPLOYEE; // Default role
  }

  private determineMaxAccessLevel(userRole: UserRole): AccessLevel {
    // Determine maximum access level based on user role
    switch (userRole) {
      case UserRole.ADMIN:
      case UserRole.IT_ADMIN:
        return AccessLevel.SECRET;
      case UserRole.EXECUTIVE:
        return AccessLevel.RESTRICTED;
      case UserRole.MANAGER:
        return AccessLevel.CONFIDENTIAL;
      case UserRole.EMPLOYEE:
        return AccessLevel.INTERNAL;
      case UserRole.GUEST:
      default:
        return AccessLevel.PUBLIC;
    }
  }

  private async performKnowledgeSearch(query: KnowledgeSearchQuery): Promise<KnowledgeSearchResult[]> {
    try {
      let results: KnowledgeSearchResult[] = [];

      switch (query.searchMode) {
        case 'semantic':
          results = await this.searchEngine.semanticSearch(query);
          break;
        case 'keyword':
          results = await this.searchEngine.keywordSearch(query);
          break;
        case 'hybrid':
        default:
          results = await this.searchEngine.hybridSearch(query);
          break;
      }

      return results;
    } catch (error) {
      if (error instanceof LocalKnowledgeError) {
        throw error;
      }
      throw new LocalKnowledgeError(
        'Knowledge search failed',
        LocalKnowledgeErrorType.SEARCH_FAILED,
        error,
        query.query
      );
    }
  }

  private async createKnowledgeResponse(
    query: KnowledgeSearchQuery,
    results: KnowledgeSearchResult[],
    searchTime: number
  ): Promise<LocalKnowledgeResponse> {
    const config = this.getKnowledgeConfig();
    
    // Generate answer summary if enabled
    let answerSummary: string | undefined;
    if (config.enableAnswerSummary && results.length > 0) {
      answerSummary = await this.generateAnswerSummary(query, results);
    }

    // Generate suggested queries
    const suggestedQueries = this.generateSuggestedQueries(query, results);

    // Calculate confidence score
    const confidence = this.calculateConfidenceScore(results);

    return {
      query: query.query,
      results,
      totalResults: results.length,
      searchTime,
      searchStrategy: query.searchMode,
      suggestedQueries,
      answerSummary,
      confidence,
    };
  }

  private async generateAnswerSummary(
    query: KnowledgeSearchQuery, 
    results: KnowledgeSearchResult[]
  ): Promise<string> {
    // Placeholder for answer summarization
    // In production, this would use AI to generate a summary from the top results
    if (results.length === 0) {
      return 'No relevant information found for your query.';
    }

    const topResult = results[0];
    const maxLength = this.getKnowledgeConfig().maxSummaryLength || 300;
    
    let summary = `Based on the available knowledge: ${topResult.document.content}`;
    if (summary.length > maxLength) {
      summary = summary.substring(0, maxLength - 3) + '...';
    }

    return summary;
  }

  private generateSuggestedQueries(
    query: KnowledgeSearchQuery,
    results: KnowledgeSearchResult[]
  ): string[] {
    // Generate related query suggestions based on results and query history
    const suggestions: string[] = [];
    
    // Add suggestions based on document tags
    for (const result of results.slice(0, 3)) {
      for (const tag of result.document.tags.slice(0, 2)) {
        const suggestion = `Tell me more about ${tag}`;
        if (!suggestions.includes(suggestion)) {
          suggestions.push(suggestion);
        }
      }
    }

    // Add suggestions based on related documents
    if (results.length > 0 && results[0].relatedDocuments) {
      for (const relatedDoc of results[0].relatedDocuments.slice(0, 2)) {
        const suggestion = `What about ${relatedDoc.title}?`;
        if (!suggestions.includes(suggestion)) {
          suggestions.push(suggestion);
        }
      }
    }

    return suggestions.slice(0, 5); // Limit to 5 suggestions
  }

  private calculateConfidenceScore(results: KnowledgeSearchResult[]): number {
    if (results.length === 0) return 0;

    // Calculate confidence based on top result score and number of results
    const topScore = results[0].score;
    const resultsBonus = Math.min(results.length / 10, 0.2); // Up to 20% bonus for multiple results
    
    return Math.min(topScore + resultsBonus, 1.0);
  }

  private getCachedResponse(query: string, userRole: UserRole): LocalKnowledgeResponse | null {
    const cacheKey = this.generateCacheKey(query, userRole);
    const cached = this.searchCache.get(cacheKey);
    
    if (cached) {
      const ttl = this.getKnowledgeConfig().cacheTtl || 3600; // Default 1 hour
      const age = (Date.now() - cached.timestamp) / 1000;
      
      if (age < ttl) {
        return cached.results;
      } else {
        this.searchCache.delete(cacheKey);
      }
    }
    
    return null;
  }

  private cacheResponse(query: string, userRole: UserRole, response: LocalKnowledgeResponse): void {
    const cacheKey = this.generateCacheKey(query, userRole);
    this.searchCache.set(cacheKey, {
      results: response,
      timestamp: Date.now(),
    });

    // Cleanup old cache entries if needed
    if (this.searchCache.size > 1000) {
      const oldestKey = this.searchCache.keys().next().value;
      this.searchCache.delete(oldestKey);
    }
  }

  private generateCacheKey(query: string, userRole: UserRole): string {
    return `${query.toLowerCase().trim()}-${userRole}`;
  }

  private trackQuery(query: string, resultsCount: number): void {
    this.queryHistory.push({
      query,
      timestamp: new Date(),
      results: resultsCount,
    });

    // Keep only recent queries
    if (this.queryHistory.length > 100) {
      this.queryHistory.shift();
    }
  }

  private createSuccessResponse(
    knowledgeResponse: LocalKnowledgeResponse,
    correlationId: string,
    processingTime: number
  ): AgentResponse {
    // Format the response content
    let content = this.formatKnowledgeResponse(knowledgeResponse);

    return {
      content,
      agentId: this.config.id,
      agentType: AgentType.LOCAL_KNOWLEDGE,
      success: true,
      metadata: {
        processingTime,
        agentMetadata: {
          agentId: this.config.id,
          usageCount: this.usageCount,
          correlationId,
          searchStats: {
            totalResults: knowledgeResponse.totalResults,
            searchTime: knowledgeResponse.searchTime,
            searchStrategy: knowledgeResponse.searchStrategy,
            confidence: knowledgeResponse.confidence,
          },
        },
        toolResults: [
          {
            toolName: 'local_knowledge_search',
            result: knowledgeResponse,
          },
        ],
      },
    };
  }

  private formatKnowledgeResponse(response: LocalKnowledgeResponse): string {
    if (response.results.length === 0) {
      return `I couldn't find any relevant information in our knowledge base for "${response.query}". You might want to try rephrasing your question or checking if the information is available in a different format.`;
    }

    let content = '';

    // Add answer summary if available
    if (response.answerSummary) {
      content += `${response.answerSummary}\n\n`;
    }

    // Add search results
    content += `I found ${response.totalResults} relevant document${response.totalResults === 1 ? '' : 's'} in our knowledge base:\n\n`;

    for (let i = 0; i < Math.min(response.results.length, 5); i++) {
      const result = response.results[i];
      content += `**${i + 1}. ${result.document.title}**\n`;
      
      if (result.highlights.length > 0) {
        content += `${result.highlights[0]}\n`;
      }
      
      content += `*Relevance: ${(result.score * 100).toFixed(0)}%*\n\n`;
    }

    // Add suggested queries if available
    if (response.suggestedQueries && response.suggestedQueries.length > 0) {
      content += `**Related questions you might ask:**\n`;
      for (const suggestion of response.suggestedQueries) {
        content += `• ${suggestion}\n`;
      }
    }

    return content;
  }
}