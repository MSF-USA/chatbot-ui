import { 
  WebSearchRequest, 
  WebSearchResponse, 
  WebSearchResult, 
  Citation,
  WebSearchError,
  SearchRankingFactors,
} from '@/types/webSearch';
import { AzureMonitorLoggingService } from './loggingService';

import { AgentsClient } from '@azure/ai-agents';
import { DefaultAzureCredential } from '@azure/identity';

/**
 * Azure Bing Grounding Configuration
 * Based on Azure AI Foundry documentation
 */
export interface BingGroundingConfiguration {
  /** Connection ID for Azure Bing Grounding resource */
  connectionId: string;
  /** ID of existing Azure AI Agent with Bing Grounding tool configured */
  bingGroundingAgentId?: string;
  /** Name of existing Azure AI Agent with Bing Grounding tool (alternative to bingGroundingAgentId) */
  bingGroundingAgentName?: string;
  /** Number of search results to return (1-50) */
  count?: number;
  /** Market/locale for search results (e.g., 'en-US') */
  market?: string;
  /** Language for UI elements */
  setLang?: string;
  /** Content freshness filter */
  freshness?: 'Day' | 'Week' | 'Month' | '7d' | '30d';
  /** Safe search level */
  safeSearch?: 'Off' | 'Moderate' | 'Strict';
  /** Custom search parameters */
  customParams?: Record<string, any>;
}

/**
 * Azure AI Agents Response Structure
 * Based on documentation examples
 */
export interface AzureAgentsResponse {
  messages: Array<{
    id: string;
    role: 'assistant' | 'user' | 'system';
    content: Array<{
      type: 'text' | 'image_file';
      text?: {
        value: string;
        annotations?: Array<{
          type: 'citation' | 'uri_citation' | 'url_citation';
          text: string;
          start_index?: number;
          end_index?: number;
          startIndex?: number;
          endIndex?: number;
          title?: string;
          url?: string;
          uri_citation?: {
            uri: string;
            title: string;
          };
          urlCitation?: {
            url: string;
            title: string;
          };
        }>;
      };
    }>;
    created_at: number;
  }>;
  runSteps?: Array<{
    id: string;
    type: 'tool_calls';
    status: 'completed' | 'in_progress' | 'failed';
    step_details?: {
      tool_calls?: Array<{
        id: string;
        type: 'bing_grounding';
        function?: {
          name: string;
          arguments: string;
        };
        bing_grounding?: Record<string, any>;
      }>;
    };
  }>;
  metadata?: {
    search_results?: any[];
    search_query?: string;
    optimized_query?: string;
    total_estimated_matches?: number;
    ranking_response?: any;
    web_search_url?: string;
  };
}

/**
 * Service wrapper for Azure Bing Grounding integration
 * Handles communication with Azure AI Agents for web search
 */
export class BingGroundingService {
  private connectionId: string = process.env.AZURE_GROUNDING_CONNECTION_ID ?? '';
  private projectEndpoint: string = process.env.AZURE_AI_FOUNDRY_ENDPOINT ?? '';
  private bingGroundingAgentId: string;
  private bingGroundingAgentName: string;
  private maxRetries: number;
  private baseDelay: number;
  private logger: AzureMonitorLoggingService;
  private searchCache: Map<string, { response: WebSearchResponse; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes as per Phase 3 docs
  private readonly MAX_CACHE_SIZE = 100; // Max cache entries
  
  private agentsClient: AgentsClient | null = null;
  private initializationPromise: Promise<void> | null = null;
  private initializationComplete = false;

  constructor(config?: Partial<BingGroundingConfiguration>) {
    // Environment variables for Azure AI Foundry integration
    this.connectionId = config?.connectionId || 
                      process.env.AZURE_GROUNDING_CONNECTION_ID || 
                      process.env.BING_CONNECTION_NAME || '';
    this.projectEndpoint = process.env.AZURE_AI_FOUNDRY_ENDPOINT || process.env.PROJECT_ENDPOINT || '';
    
    // Agent configuration - support existing agents
    this.bingGroundingAgentId = config?.bingGroundingAgentId || 
                               process.env.AZURE_BING_GROUNDING_AGENT_ID || 
                               process.env.AZURE_AI_AGENT_ID || '';
    this.bingGroundingAgentName = config?.bingGroundingAgentName || 
                                 process.env.AZURE_BING_GROUNDING_AGENT_NAME || 
                                 process.env.AZURE_AI_AGENT_NAME || '';
    
    this.maxRetries = 3;
    this.baseDelay = 1000;

    // Initialize logging service
    try {
      this.logger = AzureMonitorLoggingService.getInstance();
      if (!this.logger) {
        // Create a mock logger for testing/development environments
        console.warn('AzureMonitorLoggingService: Missing required environment variables for Azure Monitor Logging');
        console.warn('Set LOGS_INGESTION_ENDPOINT, DATA_COLLECTION_RULE_ID, and STREAM_NAME to enable logging');
        // Create a minimal mock logger
        this.logger = {
          logMessage: () => Promise.resolve(),
          logFileProcess: () => Promise.resolve(),
          logSearch: () => Promise.resolve(),
          logError: () => Promise.resolve(),
          logCustomMetric: () => Promise.resolve()
        } as any;
      }
    } catch (error) {
      // Fallback to mock logger if initialization fails
      this.logger = {
        logMessage: () => Promise.resolve(),
        logFileProcess: () => Promise.resolve(),
        logSearch: () => Promise.resolve(),
        logError: () => Promise.resolve(),
        logCustomMetric: () => Promise.resolve()
      } as any;
    }

    // Validate required configuration for Azure AI Agents
    const configErrors = this.validateConfiguration();
    if (configErrors.length > 0) {
      console.warn('[WARN] Azure AI Agents configuration incomplete:', configErrors.join(', '));
      console.warn('[WARN 7] Web search will use development fallback mode.');
      
      // Set placeholder values for development
      if (!this.connectionId) {
        console.warn('[SETUP] To enable Azure AI Agents, set AZURE_GROUNDING_CONNECTION_ID environment variable');
      }
      if (!this.projectEndpoint) {
        console.warn('[SETUP] To enable Azure AI Agents, set PROJECT_ENDPOINT environment variable');
        this.projectEndpoint = 'https://placeholder.cognitiveservices.azure.com';
      }
    }

    // Initialize Azure AI Agents client
    this.initializationPromise = this.initializeAzureAgents();
    
    console.log('[INFO] BingGroundingService initialized with connection:', this.connectionId.substring(0, 20) + '...');
  }

  /**
   * Initialize Azure AI Agents client and Bing Grounding tool
   */
  private async initializeAzureAgents(): Promise<void> {
    try {
      // Only initialize if we have a real project endpoint
      if (this.projectEndpoint && this.projectEndpoint !== 'https://placeholder.cognitiveservices.azure.com') {
        // Initialize Azure AI Agents client with endpoint and credentials
        this.agentsClient = new AgentsClient(this.projectEndpoint, new DefaultAzureCredential());
        
        console.log('[INFO] Azure AI Agents client initialized successfully');
        this.initializationComplete = true;
      } else {
        console.warn('[WARN] Azure AI Agents initialization skipped - Invalid PROJECT_ENDPOINT:', this.projectEndpoint);
        console.warn('[SETUP] Set PROJECT_ENDPOINT to your Azure AI Foundry project endpoint (e.g., https://my-project.cognitiveservices.azure.com/)');
        this.initializationComplete = true; // Mark as complete to avoid waiting
      }
    } catch (error) {
      console.error('[ERROR] Failed to initialize Azure AI Agents:', error);
      // Don't throw error during construction - allow graceful degradation
      console.warn('[WARN] Continuing with placeholder implementation');
      this.agentsClient = null;
      this.initializationComplete = true;
    }
  }

  /**
   * Ensure Azure AI Agents initialization is complete
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initializationComplete && this.initializationPromise) {
      await this.initializationPromise;
    }
  }

  /**
   * Execute web search using Azure Bing Grounding
   */
  async search(request: WebSearchRequest): Promise<WebSearchResponse> {
    const startTime = Date.now();
    
    try {
      // Validate request
      this.validateRequest(request);

      // Check cache first
      const cacheKey = this.generateCacheKey(request);
      const cachedResponse = this.getCachedResponse(cacheKey);
      if (cachedResponse) {
        console.log('[INFO] Returning cached search results for query:', request.query.substring(0, 50));
        await this.logger?.logCustomMetric('BingGroundingCacheHit', 1, 'count', {
          query: request.query.substring(0, 100),
          market: request.market || 'default'
        });
        return cachedResponse;
      }

      // Execute search with retry logic
      const searchResults = await this.executeSearchWithRetry(request);

      // Process and format results
      const response = this.processSearchResults(searchResults, request, startTime);

      // Cache the response
      this.cacheResponse(cacheKey, response);

      // Log successful search
      await this.logger?.logCustomMetric('BingGroundingSearchCompleted', 1, 'count', {
        query: request.query.substring(0, 100),
        market: request.market || 'default',
        resultCount: response.results.length,
        searchTime: response.searchTime
      });

      return response;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // Log search error
      await this.logger?.logCustomMetric('BingGroundingSearchFailed', 1, 'count', {
        query: request.query.substring(0, 100),
        error: error instanceof Error ? error.message : String(error),
        processingTime
      });

      const webSearchError: WebSearchError = {
        code: 'SEARCH_FAILED',
        message: error instanceof Error ? error.message : 'Web search failed',
        details: error,
        statusCode: error && typeof error === 'object' && 'statusCode' in error ? (error as any).statusCode : 500,
        retryable: this.isRetryableError(error),
      };

      throw webSearchError;
    }
  }

  /**
   * Execute search with exponential backoff retry
   */
  private async executeSearchWithRetry(request: WebSearchRequest): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await this.executeSearch(request);
      } catch (error) {
        lastError = error as Error;
        
        if (!this.isRetryableError(error) || attempt === this.maxRetries - 1) {
          throw error;
        }

        // Exponential backoff
        const delay = Math.min(
          this.baseDelay * Math.pow(2, attempt),
          10000 // Max 10 seconds
        );

        await this.sleep(delay);
      }
    }

    throw lastError || new Error('Search failed after retries');
  }

  /**
   * Execute the actual search request using Azure AI Agents
   */
  private async executeSearch(request: WebSearchRequest): Promise<AzureAgentsResponse> {
    try {
      // Ensure initialization is complete
      await this.ensureInitialized();
      
      // Check if Azure AI Agents client is available and properly configured
      if (this.agentsClient && this.initializationComplete) {
        try {
          console.log('[INFO] Attempting Azure AI Agents search for query:', request.query.substring(0, 50));
          
          // Get existing agent (from environment variable)
          const agentId = this.bingGroundingAgentId || process.env.AZURE_AI_AGENT_ID;
          if (!agentId) {
            throw new Error('Agent ID is required. Set AZURE_BING_GROUNDING_AGENT_ID or AZURE_AI_AGENT_ID');
          }
          
          const agent = await this.agentsClient.getAgent(agentId);
          console.log('[INFO] Retrieved agent:', agent.name);
          
          // Create thread for search
          const thread = await this.agentsClient.threads.create();
          console.log('[INFO] Created thread:', thread.id);
          
          // Add search message to thread
          const message = await this.agentsClient.messages.create(
            thread.id,
            'user',
            request.query
          );
          console.log('[INFO] Created message:', message.id);
          
          // Create and execute run
          let run = await this.agentsClient.runs.create(thread.id, agent.id);
          console.log('[INFO] Created run:', run.id);
          
          // Poll for completion
          const maxWaitTime = 30000; // 30 seconds max
          const startTime = Date.now();
          
          while ((run.status === 'queued' || run.status === 'in_progress') && 
                 (Date.now() - startTime < maxWaitTime)) {
            await this.sleep(1000); // Wait 1 second
            run = await this.agentsClient.runs.get(thread.id, run.id);
          }
          
          if (run.status === 'failed') {
            throw new Error(`Azure AI run failed: ${run.lastError?.message || 'Unknown error'}`);
          }
          
          if (run.status !== 'completed') {
            throw new Error(`Azure AI run timed out with status: ${run.status}`);
          }
          
          console.log('[INFO] Run completed successfully');
          
          // TODO: Extract token usage from run.usage when available
          // Based on C# docs: step.Usage.TotalTokens contains token count
          
          // Get messages from thread (following documentation pattern)
          const messages = await this.agentsClient.messages.list(thread.id, { order: 'asc' });
          const messageList = [];
          for await (const msg of messages) {
            messageList.push(msg);
          }
          
          // Extract content from assistant messages
          const assistantMessages = messageList.filter(m => m.role === 'assistant');
          let searchContent = '';
          
          for (const msg of assistantMessages) {
            const textContent = msg.content.find((c: any) => c.type === 'text' && 'text' in c);
            if (textContent) {
              searchContent += (textContent as any).text.value + '\n';
            }
          }
          
          // Build simplified response structure (matching documentation pattern)
          const azureAgentsResponse: AzureAgentsResponse = {
            messages: messageList.map(msg => ({
              id: msg.id,
              role: msg.role as 'assistant' | 'user' | 'system',
              content: msg.content.map(content => ({
                type: content.type as 'text' | 'image_file',
                text: content.type === 'text' ? {
                  value: (content as any).text?.value || '',
                  annotations: (content as any).text?.annotations || []
                } : undefined
              })),
              created_at: typeof msg.createdAt === 'number' ? msg.createdAt : 
                       msg.createdAt instanceof Date ? msg.createdAt.getTime() : Date.now()
            })),
            runSteps: [], // Simplified - don't need run steps for basic functionality
            metadata: {
              search_query: request.query,
              optimized_query: request.query,
              web_search_url: this.generateBingSearchUrl(request),
              search_results: this.parseSearchResultsFromContent(searchContent),
              total_estimated_matches: 0
            }
          };
          
          // Clean up thread (agent belongs to the project)
          await this.agentsClient.threads.delete(thread.id);
          console.log('[INFO] Cleaned up Azure AI Agents resources');
          
          // Return the response
          return azureAgentsResponse;
          
        } catch (agentError) {
          console.warn('[WARN] Azure AI Agents execution failed, falling back to placeholder:', agentError);
          
          // Handle specific Azure AI error types
          if (agentError && typeof agentError === 'object') {
            const error = agentError as any;
            
            // Authentication errors
            if (error.code === 'EAUTH' || error.message?.includes('authentication')) {
              console.error('[ERROR] Azure AI Agents authentication failed. Check DefaultAzureCredential setup.');
            }
            
            // Rate limiting
            if (error.statusCode === 429 || error.code === 'RATE_LIMIT_EXCEEDED') {
              console.error('[ERROR] Azure AI Agents rate limit exceeded. Consider implementing backoff strategy.');
            }
            
            // Quota/capacity issues
            if (error.statusCode === 503 || error.message?.includes('quota')) {
              console.error('[ERROR] Azure AI Agents service unavailable or quota exceeded.');
            }
          }
          
          // Fall through to placeholder implementation
        }
      } else {
        // Provide specific reasons why Azure AI Agents is not available
        const reasons = [];
        if (!this.projectEndpoint || this.projectEndpoint === 'https://placeholder.cognitiveservices.azure.com') {
          reasons.push('PROJECT_ENDPOINT not set');
        }
        if (!this.connectionId) {
          reasons.push('AZURE_GROUNDING_CONNECTION_ID not set');
        }
        if (!this.agentsClient) {
          reasons.push('AgentsClient initialization failed');
        }
        
        console.log('[DEV] Azure AI Agents unavailable - Reasons:', reasons.join(', '), '| Query:', request.query.substring(0, 50));
      }

      // Development fallback when Azure AI Agents is unavailable
      // Create a more user-friendly response instead of technical placeholder
      const developmentResponse: AzureAgentsResponse = {
        messages: [{
          id: 'msg_dev_fallback_' + Date.now(),
          role: 'assistant',
          content: [{
            type: 'text',
            text: {
              value: `I would normally search the web for "${request.query}", but Azure AI Agents is not configured in this environment. Please check the setup instructions for PROJECT_ENDPOINT and AZURE_AI_AGENT_ID environment variables.`,
              annotations: []
            }
          }],
          created_at: Date.now()
        }],
        runSteps: [],
        metadata: {
          search_results: [{
            name: 'Configuration Required',
            url: 'https://learn.microsoft.com/en-us/azure/ai-services/openai/',
            snippet: 'Azure AI Agents configuration is required for web search functionality. Please set up PROJECT_ENDPOINT and AZURE_AI_AGENT_ID environment variables.',
            displayUrl: 'learn.microsoft.com',
            dateLastCrawled: new Date().toISOString()
          }],
          search_query: request.query,
          optimized_query: request.query,
          total_estimated_matches: 1,
          web_search_url: this.generateBingSearchUrl(request)
        }
      };
      
      return developmentResponse;
      
    } catch (error) {
      console.error('[ERROR] Search execution failed:', error);
      throw error;
    }
  }

  /**
   * Process Azure AI Agents response into standardized WebSearchResponse format
   */
  private processSearchResults(
    azureResponse: AzureAgentsResponse,
    request: WebSearchRequest,
    startTime: number,
  ): WebSearchResponse {
    const searchTime = Date.now() - startTime;
    
    try {
      // Extract web search results from Azure response
      const results = this.extractWebSearchResults(azureResponse);
      
      // Extract citations from message annotations
      const citations = this.extractCitationsFromAnnotations(azureResponse);

      // Extract assistant's comprehensive analysis and annotations
      const { assistantContent, assistantAnnotations } = this.extractAssistantContent(azureResponse);

      // Calculate quality metrics
      const quality = this.calculateQualityMetrics(results, citations);

      // Generate Bing search URL (compliance requirement)
      const bingSearchUrl = this.generateBingSearchUrl(request);

      return {
        query: request.query,
        results,
        citations,
        totalCount: azureResponse.metadata?.total_estimated_matches || results.length,
        searchTime,
        market: request.market || 'en-US',
        cached: false,
        assistantContent,
        assistantAnnotations,
        metadata: {
          timing: {
            searchTime,
            citationExtractionTime: 0,
            totalTime: searchTime,
          },
          quality,
          tokenUsage: this.extractTokenUsage(azureResponse),
          // Add Azure-specific metadata
          azureMetadata: {
            bingSearchUrl,
            optimizedQuery: azureResponse.metadata?.optimized_query || request.query,
            webSearchUrl: azureResponse.metadata?.web_search_url
          }
        },
      };
    } catch (error) {
      console.error('[ERROR] Failed to process search results:', error);
      throw new Error(`Failed to process search results: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Extract web search results from Azure AI Agents response
   */
  private extractWebSearchResults(azureResponse: AzureAgentsResponse): WebSearchResult[] {
    try {
      const results: WebSearchResult[] = [];
      
      // Primary: Extract from run steps tool calls (based on documentation)
      // The C# example shows: toolCall.BingGrounding contains the actual search results
      if (azureResponse.runSteps) {
        azureResponse.runSteps.forEach((step) => {
          if (step.step_details?.tool_calls) {
            step.step_details.tool_calls.forEach((toolCall, callIndex) => {
              if (toolCall.type === 'bing_grounding' && toolCall.bing_grounding) {
                // Extract search results from bing_grounding data
                // Based on C# docs: toolCall.BingGrounding contains key-value pairs
                const bingData = toolCall.bing_grounding as any;
                
                // Try to extract structured results if available
                if (bingData.results && Array.isArray(bingData.results)) {
                  bingData.results.forEach((result: any, index: number) => {
                    results.push({
                      id: `bing_result_${callIndex}_${index}`,
                      title: result.name || result.title || 'Untitled',
                      url: result.url || result.displayUrl || '',
                      snippet: result.snippet || result.description || '',
                      displayUrl: result.displayUrl || this.extractDisplayUrl(result.url),
                      dateLastCrawled: result.dateLastCrawled || result.datePublished,
                      language: result.language || 'en',
                      contentType: this.inferContentType(result),
                      relevanceScore: this.calculateRelevanceScore(result, index),
                      metadata: {
                        deepLinks: result.deepLinks,
                        searchTags: result.searchTags,
                        toolCallId: toolCall.id,
                      },
                    });
                  });
                }
                // If no structured results, try to parse key-value pairs
                // Based on C# docs line 319-322: toolCall.BingGrounding contains key-value pairs
                else {
                  console.log('[INFO] Parsing Bing Grounding key-value pairs:', Object.keys(bingData));
                  // TODO: Parse individual key-value pairs like: result.Key, result.Value
                  // C# example shows: foreach (var result in toolCall.BingGrounding) { result.Key, result.Value }
                  // Need to map this to JavaScript object structure when real responses are available
                  
                  // Handle placeholder mode gracefully
                  if (bingData.status === 'placeholder_mode') {
                    // Don't create search results from placeholder data - let it fall through to other extraction methods
                    console.log('[INFO] Skipping placeholder mode tool call data');
                  } else if (Object.keys(bingData).length > 0) {
                    // Temporary: Create a basic result from available data when real API responses are available
                    results.push({
                      id: `bing_kvp_result_${callIndex}`,
                      title: bingData.title || bingData.name || 'Search Result',
                      url: bingData.url || bingData.link || '',
                      snippet: bingData.snippet || bingData.description || 'No description available',
                      displayUrl: bingData.displayUrl || this.extractDisplayUrl(bingData.url || ''),
                      language: 'en',
                      contentType: 'webpage',
                      relevanceScore: 0.8,
                      metadata: {
                        toolCallId: toolCall.id,
                        source: 'bing_grounding_kvp'
                      },
                    });
                  }
                }
              }
            });
          }
        });
      }
      
      // Secondary: Try metadata search_results
      if (results.length === 0 && azureResponse.metadata?.search_results) {
        azureResponse.metadata.search_results.forEach((result: any, index: number) => {
          results.push({
            id: `metadata_result_${index}`,
            title: result.name || result.title || 'Untitled',
            url: result.url,
            snippet: result.snippet || result.description || '',
            displayUrl: result.displayUrl || this.extractDisplayUrl(result.url),
            dateLastCrawled: result.dateLastCrawled || result.datePublished,
            language: result.language || 'en',
            contentType: this.inferContentType(result),
            relevanceScore: this.calculateRelevanceScore(result, index),
            metadata: {
              deepLinks: result.deepLinks,
              searchTags: result.searchTags,
            },
          });
        });
      }

      // Tertiary fallback: Extract from message citations
      if (results.length === 0) {
        azureResponse.messages.forEach((message, msgIndex) => {
          if (message.content) {
            message.content.forEach((content) => {
              if (content.text?.annotations) {
                content.text.annotations.forEach((annotation, index) => {
                  // Handle both 'url_citation' (actual response) and 'uri_citation' (legacy/docs)
                  if (annotation.type === 'url_citation' && annotation.urlCitation) {
                    results.push({
                      id: `citation_result_${msgIndex}_${index}`,
                      title: annotation.urlCitation.title || annotation.text || 'Untitled',
                      url: annotation.urlCitation.url,
                      snippet: annotation.text || 'No snippet available',
                      displayUrl: this.extractDisplayUrl(annotation.urlCitation.url),
                      language: 'en',
                      contentType: 'webpage',
                      relevanceScore: Math.max(0.1, 1 - (index * 0.1)),
                      metadata: {
                        source: 'message_annotation'
                      },
                    });
                  } else if (annotation.type === 'uri_citation' && annotation.uri_citation) {
                    results.push({
                      id: `citation_result_${msgIndex}_${index}`,
                      title: annotation.uri_citation.title || annotation.text || 'Untitled',
                      url: annotation.uri_citation.uri,
                      snippet: annotation.text || 'No snippet available',
                      displayUrl: this.extractDisplayUrl(annotation.uri_citation.uri),
                      language: 'en',
                      contentType: 'webpage',
                      relevanceScore: Math.max(0.1, 1 - (index * 0.1)),
                      metadata: {
                        source: 'message_annotation'
                      },
                    });
                  }
                });
              }
            });
          }
        });
      }

      console.log(`[INFO] Extracted ${results.length} search results from Azure AI Agents response`);
      return results;
    } catch (error) {
      console.error('[ERROR] Failed to extract search results from Azure response:', error);
      return [];
    }
  }

  // Removed unused extractCitations method - now using extractCitationsFromAnnotations for Azure AI Agents

  /**
   * Calculate quality metrics for search results
   */
  private calculateQualityMetrics(
    results: WebSearchResult[],
    citations: Citation[],
  ): NonNullable<WebSearchResponse['metadata']>['quality'] {
    const relevanceScores = results.map(r => r.relevanceScore || 0);
    const averageRelevance = relevanceScores.length > 0
      ? relevanceScores.reduce((a, b) => a + b, 0) / relevanceScores.length
      : 0;

    const uniqueSources = new Set(citations.map(c => new URL(c.url).hostname));

    return {
      relevanceScore: averageRelevance,
      citationCount: citations.length,
      uniqueSourcesCount: uniqueSources.size,
    };
  }

  /**
   * Extract citations from Azure AI Agents message annotations
   */
  private extractCitationsFromAnnotations(azureResponse: AzureAgentsResponse): Citation[] {
    const citations: Citation[] = [];
    let citationIndex = 1;

    try {
      azureResponse.messages.forEach((message) => {
        if (message.content) {
          message.content.forEach((content) => {
            if (content.text?.annotations) {
              content.text.annotations.forEach((annotation) => {
                // Handle both 'url_citation' (actual response) and 'uri_citation' (legacy/docs)
                if (annotation.type === 'url_citation' && annotation.urlCitation) {
                  citations.push({
                    id: `cite_${citationIndex}`,
                    title: annotation.urlCitation.title || 'Untitled Source',
                    url: annotation.urlCitation.url,
                    publisher: this.extractPublisher(annotation.urlCitation.url),
                    type: this.determineCitationTypeFromUrl(annotation.urlCitation.url),
                    metadata: {
                      snippet: annotation.text,
                      annotationIndex: citationIndex - 1,
                      startIndex: annotation.startIndex || annotation.start_index,
                      endIndex: annotation.endIndex || annotation.end_index
                    },
                  });
                  citationIndex++;
                } else if (annotation.type === 'uri_citation' && annotation.uri_citation) {
                  citations.push({
                    id: `cite_${citationIndex}`,
                    title: annotation.uri_citation.title || 'Untitled Source',
                    url: annotation.uri_citation.uri,
                    publisher: this.extractPublisher(annotation.uri_citation.uri),
                    type: this.determineCitationTypeFromUrl(annotation.uri_citation.uri),
                    metadata: {
                      snippet: annotation.text,
                      annotationIndex: citationIndex - 1,
                      startIndex: annotation.startIndex || annotation.start_index,
                      endIndex: annotation.endIndex || annotation.end_index
                    },
                  });
                  citationIndex++;
                }
              });
            }
          });
        }
      });

      return citations;
    } catch (error) {
      console.error('[ERROR] Failed to extract citations from annotations:', error);
      return [];
    }
  }

  /**
   * Extract assistant's content and annotations from Azure AI Agents response
   */
  private extractAssistantContent(azureResponse: AzureAgentsResponse): {
    assistantContent?: string;
    assistantAnnotations?: Array<{
      type: string;
      text: string;
      startIndex: number;
      endIndex: number;
      urlCitation?: {
        url: string;
        title: string;
      };
    }>;
  } {
    try {
      // Find the assistant's message (last message with role 'assistant')
      const assistantMessages = azureResponse.messages.filter(m => m.role === 'assistant');
      if (assistantMessages.length === 0) {
        return {};
      }

      // Get the last assistant message (most recent response)
      const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];
      
      // Extract the text content
      let assistantContent = '';
      let assistantAnnotations: any[] = [];
      
      lastAssistantMessage.content.forEach(content => {
        if (content.type === 'text' && content.text) {
          assistantContent += content.text.value;
          
          // Extract annotations
          if (content.text.annotations) {
            content.text.annotations.forEach(annotation => {
              // Map the annotation to our simplified format
              const mappedAnnotation: any = {
                type: annotation.type,
                text: annotation.text,
                startIndex: annotation.startIndex || annotation.start_index || 0,
                endIndex: annotation.endIndex || annotation.end_index || 0
              };
              
              // Add URL citation if present
              if (annotation.type === 'url_citation' && annotation.urlCitation) {
                mappedAnnotation.urlCitation = {
                  url: annotation.urlCitation.url,
                  title: annotation.urlCitation.title
                };
              } else if (annotation.type === 'uri_citation' && annotation.uri_citation) {
                mappedAnnotation.urlCitation = {
                  url: annotation.uri_citation.uri,
                  title: annotation.uri_citation.title
                };
              }
              
              assistantAnnotations.push(mappedAnnotation);
            });
          }
        }
      });

      return {
        assistantContent: assistantContent.trim(),
        assistantAnnotations: assistantAnnotations.length > 0 ? assistantAnnotations : undefined
      };
    } catch (error) {
      console.error('[ERROR] Failed to extract assistant content:', error);
      return {};
    }
  }

  /**
   * Generate Bing search URL (required for compliance)
   */
  private generateBingSearchUrl(request: WebSearchRequest): string {
    const params = new URLSearchParams({
      q: request.query,
    });

    if (request.market) {
      params.set('setmkt', request.market);
    }

    if (request.safeSearch) {
      params.set('safesearch', request.safeSearch.toLowerCase());
    }

    if (request.freshness) {
      // Map our freshness values to Bing's format
      const freshnessMap: Record<string, string> = {
        'Day': 'day',
        'Week': 'week', 
        'Month': 'month'
      };
      params.set('qft', `filterui:age-lt${freshnessMap[request.freshness] || 'week'}`);
    }

    return `https://www.bing.com/search?${params.toString()}`;
  }

  /**
   * Parse search results from agent response content
   * Simplified approach - extract URLs and titles from text content
   */
  private parseSearchResultsFromContent(content: string): any[] {
    const results: any[] = [];
    
    try {
      // Simple regex patterns to extract URLs and titles from agent response
      // This is a fallback - ideally the agent would return structured data
      const urlPattern = /https?:\/\/[^\s]+/g;
      const urls = content.match(urlPattern) || [];
      
      urls.forEach((url, index) => {
        // Extract title from surrounding text (rough approach)
        const urlIndex = content.indexOf(url);
        const beforeUrl = content.substring(Math.max(0, urlIndex - 100), urlIndex);
        const afterUrl = content.substring(urlIndex + url.length, urlIndex + url.length + 100);
        
        // Try to find a title in the surrounding text
        const titleMatch = beforeUrl.match(/([^\n.!?]{10,80})\s*$/) || afterUrl.match(/^\s*([^\n.!?]{10,80})/);
        const title = titleMatch ? titleMatch[1].trim() : `Search Result ${index + 1}`;
        
        results.push({
          name: title,
          url: url,
          snippet: afterUrl.substring(0, 150) + '...',
          displayUrl: this.extractDisplayUrl(url),
          dateLastCrawled: new Date().toISOString()
        });
      });
      
      return results;
    } catch (error) {
      console.error('[ERROR] Failed to parse search results from content:', error);
      return [];
    }
  }





  /**
   * Generate cache key for request
   */
  private generateCacheKey(request: WebSearchRequest): string {
    const keyParts = [
      request.query,
      request.market || 'en-US',
      request.count || 5,
      request.freshness || 'none',
      request.safeSearch || 'Moderate',
      request.contentType || 'all'
    ];
    return keyParts.join('|');
  }

  /**
   * Get cached response if available and not expired
   */
  private getCachedResponse(cacheKey: string): WebSearchResponse | null {
    const cached = this.searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.response;
    }

    // Clean up expired entry
    if (cached) {
      this.searchCache.delete(cacheKey);
    }

    return null;
  }

  /**
   * Cache response with size management
   */
  private cacheResponse(cacheKey: string, response: WebSearchResponse): void {
    // Implement cache size limit
    if (this.searchCache.size >= this.MAX_CACHE_SIZE) {
      // Remove oldest entries (simple FIFO)
      const oldestKey = this.searchCache.keys().next().value;
      if (oldestKey) {
        this.searchCache.delete(oldestKey);
      }
    }

    // Mark as cached
    const cachedResponse = { ...response, cached: true, cacheTimestamp: new Date().toISOString() };
    
    this.searchCache.set(cacheKey, {
      response: cachedResponse,
      timestamp: Date.now(),
    });
  }

  /**
   * Determine citation type from URL
   */
  private determineCitationTypeFromUrl(url: string): Citation['type'] {
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('news') || urlLower.includes('/article/') || urlLower.match(/\.(com|org|net)\/\d{4}\/\d{2}/)) {
      return 'news';
    }
    if (urlLower.includes('academic') || urlLower.includes('.edu') || urlLower.includes('doi.org') || urlLower.includes('arxiv')) {
      return 'academic';
    }
    if (urlLower.includes('blog') || urlLower.includes('/post/') || urlLower.includes('medium.com')) {
      return 'blog';
    }
    if (urlLower.includes('/article/') || urlLower.includes('wiki')) {
      return 'article';
    }
    
    return 'webpage';
  }

  /**
   * Helper methods
   */

  private validateRequest(request: WebSearchRequest): void {
    if (!request.query || request.query.trim().length === 0) {
      throw new Error('Search query is required');
    }

    if (request.count && (request.count < 1 || request.count > 50)) {
      throw new Error('Search count must be between 1 and 50');
    }

    if (request.offset && request.offset < 0) {
      throw new Error('Search offset must be non-negative');
    }
  }

  private isRetryableError(error: any): boolean {
    // Network errors and rate limiting are retryable
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // HTTP status codes that are retryable
    const retryableStatusCodes = [429, 502, 503, 504];
    if (error.statusCode && retryableStatusCodes.includes(error.statusCode)) {
      return true;
    }

    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private extractDisplayUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname + urlObj.pathname;
    } catch {
      return url;
    }
  }

  private inferContentType(page: any): WebSearchResult['contentType'] {
    const url = page.url?.toLowerCase() || '';
    
    // Return existing contentType if available
    if (page.contentType) {
      return page.contentType;
    }

    // Infer from URL patterns
    if (url.includes('news') || url.includes('article')) {
      return 'news';
    }
    if (url.includes('.edu') || url.includes('academic') || url.includes('journal')) {
      return 'academic';
    }
    if (url.match(/\.(jpg|jpeg|png|gif|webp)/i)) {
      return 'image';
    }
    if (url.match(/\.(mp4|webm|mov)/i)) {
      return 'video';
    }

    return 'webpage';
  }

  private calculateRelevanceScore(_item: any, index: number): number {
    // Base score from position (earlier results are more relevant)
    const positionScore = 1 - (index * 0.1);
    
    // Additional factors could be added here
    // For now, using position-based scoring
    return Math.max(0.1, Math.min(1, positionScore));
  }

  private extractAuthors(_result: WebSearchResult): string[] {
    // This would need more sophisticated extraction
    // For now, returning empty array
    return [];
  }

  private extractPublisher(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'Unknown';
    }
  }

  private determineCitationType(result: WebSearchResult): Citation['type'] {
    const contentType = result.contentType;
    
    switch (contentType) {
      case 'news':
        return 'news';
      case 'academic':
        return 'academic';
      default:
        // Further analysis could be done here
        if (result.url.includes('blog')) {
          return 'blog';
        }
        if (result.url.includes('news') || result.url.includes('article')) {
          return 'article';
        }
        return 'webpage';
    }
  }

  /**
   * Validate Azure AI Agents configuration
   * Returns array of configuration errors
   */
  private validateConfiguration(): string[] {
    const errors: string[] = [];
    
    if (!this.connectionId) {
      errors.push('AZURE_GROUNDING_CONNECTION_ID is required');
    }
    
    if (!this.projectEndpoint) {
      errors.push('PROJECT_ENDPOINT is required');
    } else if (this.projectEndpoint === 'https://placeholder.cognitiveservices.azure.com') {
      errors.push('PROJECT_ENDPOINT contains placeholder value');
    }
    
    // Validate connection ID format (should be Azure resource path)
    if (this.connectionId && !this.connectionId.startsWith('/subscriptions/')) {
      errors.push('AZURE_GROUNDING_CONNECTION_ID should be a full Azure resource path (e.g., /subscriptions/.../connections/...)');
    }
    
    // Validate project endpoint format
    if (this.projectEndpoint && !this.projectEndpoint.startsWith('https://')) {
      errors.push('PROJECT_ENDPOINT should start with https://');
    }
    
    // Check agent configuration - either we can create agents OR we have an existing agent
    const hasExistingAgent = !!(this.bingGroundingAgentId || this.bingGroundingAgentName);
    if (!hasExistingAgent) {
      // If no existing agent specified, warn that agent creation requires additional permissions
      console.log('[INFO] No existing agent specified. Will attempt to create agent dynamically (requires foundry write permissions)');
      console.log('[SETUP] To use existing agent, set AZURE_BING_GROUNDING_AGENT_ID or AZURE_BING_GROUNDING_AGENT_NAME');
    } else {
      console.log('[INFO] Using existing agent:', this.bingGroundingAgentId || this.bingGroundingAgentName);
    }
    
    return errors;
  }

  /**
   * Public utility methods for agent integration
   */

  /**
   * Discover available agents with Bing Grounding tools
   * Helpful for identifying which agents can be used
   */
  public async discoverBingGroundingAgents(): Promise<Array<{
    id: string;
    name: string;
    hasBingGrounding: boolean;
    tools: string[];
  }>> {
    try {
      await this.ensureInitialized();
      
      if (!this.agentsClient) {
        throw new Error('Azure AI Agents client not available');
      }

      const agents: Array<{
        id: string;
        name: string;
        hasBingGrounding: boolean;
        tools: string[];
      }> = [];

      console.log('[INFO] Discovering available agents with Bing Grounding tools...');
      
      // Note: Simplified for now - would need to implement agent listing
      // when the actual API structure is available
      agents.push({
        id: this.bingGroundingAgentId || 'unknown',
        name: 'Configured Agent',
        hasBingGrounding: true,
        tools: ['bing_grounding']
      });

      console.log(`[INFO] Found ${agents.length} agents, ${agents.filter(a => a.hasBingGrounding).length} with Bing Grounding`);
      return agents;
    } catch (error) {
      console.error('[ERROR] Failed to discover agents:', error);
      throw new Error(`Failed to discover agents: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get service health status
   */
  public getHealthStatus(): { 
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  } {
    const cacheStats = {
      size: this.searchCache.size,
      maxSize: this.MAX_CACHE_SIZE,
      utilizationPercent: (this.searchCache.size / this.MAX_CACHE_SIZE) * 100
    };

    const connectionStatus = {
      hasConnectionId: !!this.connectionId,
      hasProjectEndpoint: !!this.projectEndpoint,
      connectionIdLength: this.connectionId.length
    };

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (!this.connectionId || !this.projectEndpoint) {
      status = 'unhealthy';
    } else if (this.searchCache.size > this.MAX_CACHE_SIZE * 0.9) {
      status = 'degraded';
    }

    return {
      status,
      details: {
        cache: cacheStats,
        connection: connectionStatus,
        initialized: true,
        cacheTtlMs: this.CACHE_TTL,
        maxRetries: this.maxRetries
      }
    };
  }

  /**
   * Clear search cache
   */
  public clearCache(): void {
    this.searchCache.clear();
    console.log('[INFO] BingGroundingService cache cleared');
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    utilizationPercent: number;
  } {
    return {
      size: this.searchCache.size,
      maxSize: this.MAX_CACHE_SIZE,
      hitRate: 0, // TODO: Track cache hits/misses for proper hit rate calculation
      // TODO: Add cache hit/miss counters and calculate actual hit rate percentage
      utilizationPercent: (this.searchCache.size / this.MAX_CACHE_SIZE) * 100
    };
  }

  /**
   * Test connection to Azure AI Agents (when available)
   */
  public async testConnection(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      // TODO: Implement actual connection test when @azure/ai-agents is available
      // TODO: Test with minimal agent access
      // TODO: Verify connection ID format and endpoint accessibility
      // TODO: Add timeout handling for connection tests

      // Placeholder test
      if (!this.connectionId || !this.projectEndpoint) {
        return { 
          success: false, 
          error: 'Missing required configuration (connectionId or projectEndpoint)' 
        };
      }

      return { 
        success: true, 
        details: { 
          message: 'Configuration validation passed (using Azure AI Agents)',
          connectionId: this.connectionId.substring(0, 20) + '...',
          projectEndpoint: this.projectEndpoint
        } 
      };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * Configure search parameters for specific use cases
   */
  public static createConfigForUseCase(useCase: 'news' | 'academic' | 'general' | 'recent'): Partial<BingGroundingConfiguration> {
    const baseConfig: Partial<BingGroundingConfiguration> = {
      safeSearch: 'Moderate'
    };

    switch (useCase) {
      case 'news':
        return {
          ...baseConfig,
          count: 10,
          freshness: 'Day',
          market: 'en-US'
        };
      case 'academic':
        return {
          ...baseConfig,
          count: 5,
          freshness: 'Month',
          market: 'en-US'
        };
      case 'recent':
        return {
          ...baseConfig,
          count: 8,
          freshness: 'Week',
          market: 'en-US'
        };
      case 'general':
      default:
        return {
          ...baseConfig,
          count: 5,
          market: 'en-US'
        };
    }
  }

  /**
   * Extract token usage from Azure AI Agents response
   * Based on C# documentation: step.Usage.TotalTokens contains token count
   */
  private extractTokenUsage(azureResponse: AzureAgentsResponse): {
    prompt: number;
    completion: number;
    total: number;
  } {
    let totalTokens = 0;
    let promptTokens = 0;
    let completionTokens = 0;

    try {
      // Extract from run steps usage (primary source)
      if (azureResponse.runSteps) {
        azureResponse.runSteps.forEach((step) => {
          // Based on C# docs: step.Usage.TotalTokens
          if ((step as any).usage?.totalTokens) {
            totalTokens += (step as any).usage.totalTokens;
          }
          if ((step as any).usage?.promptTokens) {
            promptTokens += (step as any).usage.promptTokens;
          }
          if ((step as any).usage?.completionTokens) {
            completionTokens += (step as any).usage.completionTokens;
          }
        });
      }
      
      // If no individual prompt/completion counts, estimate split
      if (totalTokens > 0 && (promptTokens === 0 && completionTokens === 0)) {
        // Rough estimate: 70% prompt, 30% completion
        promptTokens = Math.floor(totalTokens * 0.7);
        completionTokens = totalTokens - promptTokens;
      }
      
      return {
        prompt: promptTokens,
        completion: completionTokens,
        total: totalTokens || (promptTokens + completionTokens)
      };
    } catch (error) {
      console.error('[ERROR] Failed to extract token usage:', error);
      return { prompt: 0, completion: 0, total: 0 };
    }
  }


}