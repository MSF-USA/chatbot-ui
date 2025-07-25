import { BingGroundingService } from '@/services/bingGroundingService';
import { AzureMonitorLoggingService } from '@/services/loggingService';

import { CitationExtractor } from '@/utils/citationExtractor';

import {
  AgentConfig,
  AgentExecutionContext,
  AgentExecutionEnvironment,
  AgentResponse,
  AgentType,
  WebSearchAgentConfig,
} from '@/types/agent';
import {
  Citation,
  WebSearchConfig,
  WebSearchRequest,
  WebSearchResponse,
  WebSearchResult,
} from '@/types/webSearch';

import {
  AgentCreationError,
  AgentExecutionError,
  BaseAgent,
} from './baseAgent';

/**
 * WebSearchAgent - Implementation for Azure Bing Grounding
 * Replaces direct Bing API calls with Azure AI Agents
 */
export class WebSearchAgent extends BaseAgent {
  private searchCache: Map<
    string,
    { response: WebSearchResponse; timestamp: number }
  > = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private webSearchConfig: WebSearchConfig;
  private bingGroundingService: BingGroundingService;

  constructor(config: WebSearchAgentConfig) {
    // Ensure this is a web search agent
    if (config.type !== AgentType.WEB_SEARCH) {
      throw new AgentCreationError(
        'WebSearchAgent can only be used with WEB_SEARCH type',
        { providedType: config.type },
      );
    }

    // Set environment to FOUNDRY as web search uses Azure AI Foundry
    config.environment = AgentExecutionEnvironment.FOUNDRY;

    super(config);

    // Initialize web search specific configuration
    this.webSearchConfig =
      config.webSearchConfig ?? this.getDefaultWebSearchConfig();

    // Validate that we have a valid configuration
    if (!this.webSearchConfig.endpoint) {
      console.warn(
        '[WARN] WebSearchAgent: No endpoint configured, using default placeholder',
      );
      this.webSearchConfig.endpoint =
        'https://placeholder.cognitiveservices.azure.com';
    }

    // Initialize BingGroundingService
    this.bingGroundingService = new BingGroundingService();
  }

  protected async initializeAgent(): Promise<void> {
    try {
      // Validate Azure Bing Grounding configuration
      if (!process.env.AZURE_GROUNDING_CONNECTION_ID) {
        throw new Error(
          'AZURE_GROUNDING_CONNECTION_ID environment variable is not set',
        );
      }
      const webSearchConfig =
        this.webSearchConfig ?? this.getDefaultWebSearchConfig();

      // Additional initialization if needed
      this.logInfo('WebSearchAgent initialized successfully', {
        agentId: this.config.id,
        endpoint: webSearchConfig.endpoint,
        defaultMarket: webSearchConfig.defaultMarket,
      });
    } catch (error) {
      const errorMessage = `Failed to initialize WebSearchAgent: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logError(errorMessage, error as Error, {
        agentId: this.config.id,
      });
      throw new AgentCreationError(errorMessage, error);
    }
  }

  protected async executeInternalStreaming(
    context: AgentExecutionContext,
  ): Promise<ReadableStream<string>> {
    const self = this; // Preserve 'this' context for use inside the stream

    try {
      // Create a streaming response for web search
      return new ReadableStream({
        async start(controller) {
          try {
            // First, show search status
            controller.enqueue('🔍 Searching the web...\n\n');

            // Perform the actual search
            const searchRequest = self.buildSearchRequest(context);
            const cacheKey = self.generateCacheKey(searchRequest);
            const cachedResponse = self.getCachedResponse(cacheKey);

            let searchResponse: WebSearchResponse;
            if (cachedResponse) {
              controller.enqueue('📋 Found cached results...\n\n');
              searchResponse = cachedResponse;
            } else {
              controller.enqueue('🌐 Performing new search...\n\n');
              searchResponse = await self.performWebSearch(
                searchRequest,
                context,
              );

              if (self.webSearchConfig.enableCaching) {
                self.cacheResponse(cacheKey, searchResponse);
              }
            }

            // Stream the formatted response
            const agentResponse = self.convertToAgentResponse(
              searchResponse,
              context,
            );
            if (agentResponse.success && agentResponse.content) {
              // Split content into chunks for smoother streaming
              const chunks = agentResponse.content.match(/.{1,100}/g) || [
                agentResponse.content,
              ];

              for (const chunk of chunks) {
                controller.enqueue(chunk);
                // Small delay for natural streaming feel
                await new Promise((resolve) => setTimeout(resolve, 30));
              }
            } else {
              controller.enqueue('❌ Search failed. Please try again.');
            }

            controller.close();
          } catch (error) {
            controller.enqueue(
              `❌ Search error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
            controller.close();
          }
        },
      });
    } catch (error) {
      // Return error stream
      return new ReadableStream({
        start(controller) {
          controller.enqueue(
            `❌ Web search failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
          controller.close();
        },
      });
    }
  }

  protected async executeInternal(
    context: AgentExecutionContext,
  ): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      // Extract search query from context
      const searchRequest = this.buildSearchRequest(context);

      // Check cache first
      const cacheKey = this.generateCacheKey(searchRequest);
      const cachedResponse = this.getCachedResponse(cacheKey);
      if (cachedResponse) {
        return this.convertToAgentResponse(cachedResponse, context);
      }

      // Perform web search using Azure AI Agents
      const searchResponse = await this.performWebSearch(
        searchRequest,
        context,
      );

      // Cache the response if enabled
      if (this.webSearchConfig.enableCaching) {
        this.cacheResponse(cacheKey, searchResponse);
      }

      return this.convertToAgentResponse(searchResponse, context);
    } catch (error) {
      const executionTime = Date.now() - startTime;
      throw new AgentExecutionError(
        `Web search execution failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        {
          agentId: this.config.id,
          query: context.query,
          executionTime,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  protected validateSpecificConfig(): string[] {
    const errors: string[] = [];
    const wsConfig = this.config as WebSearchAgentConfig;

    if (!wsConfig.webSearchConfig) {
      errors.push('webSearchConfig is required for WebSearchAgent');
    } else {
      if (!wsConfig.webSearchConfig.endpoint) {
        errors.push('webSearchConfig.endpoint is required');
      }
      if (
        !wsConfig.webSearchConfig.apiKey &&
        !process.env.AZURE_GROUNDING_CONNECTION_ID
      ) {
        errors.push(
          'webSearchConfig.apiKey or AZURE_GROUNDING_CONNECTION_ID is required',
        );
      }
    }

    return errors;
  }

  protected getCapabilities(): string[] {
    return [
      'web-search',
      'citation-extraction',
      'multi-market-search',
      'safe-search',
      'freshness-filtering',
      'result-caching',
    ];
  }

  /**
   * Build search request from execution context
   */
  private buildSearchRequest(context: AgentExecutionContext): WebSearchRequest {
    const config = this.config as WebSearchAgentConfig;

    return {
      query: context.query,
      count: config.maxResults || this.webSearchConfig.maxResults,
      market:
        context.locale ||
        config.defaultMarket ||
        this.webSearchConfig.defaultMarket,
      safeSearch:
        config.defaultSafeSearch || this.webSearchConfig.defaultSafeSearch,
      freshness: this.extractFreshness(context),
      contentType: 'webpage',
      parameters: context.context,
    };
  }

  /**
   * Perform web search using Azure AI Agents
   */
  private async performWebSearch(
    request: WebSearchRequest,
    context: AgentExecutionContext,
  ): Promise<WebSearchResponse> {
    const startTime = Date.now();

    try {
      this.logInfo('Starting web search', {
        query: request.query,
        market: request.market,
        count: request.count,
      });

      // Use BingGroundingService to perform the search
      const searchResponse = await this.bingGroundingService.search(request);

      // Extract and process citations using CitationExtractor
      const citationStartTime = Date.now();
      const extractedCitations = CitationExtractor.extractCitations(
        searchResponse.results,
      );
      const deduplicatedCitations =
        CitationExtractor.deduplicateCitations(extractedCitations);
      const sortedCitations = CitationExtractor.sortCitations(
        deduplicatedCitations,
        'relevance',
      );
      const citationExtractionTime = Date.now() - citationStartTime;

      // Update response with processed citations
      const finalResponse: WebSearchResponse = {
        ...searchResponse,
        citations: sortedCitations,
        metadata: {
          ...searchResponse.metadata,
          timing: {
            searchTime: searchResponse.metadata?.timing?.searchTime || 0,
            citationExtractionTime,
            totalTime: Date.now() - startTime,
          },
          quality: {
            relevanceScore: this.calculateAverageRelevance(
              searchResponse.results,
            ),
            citationCount: sortedCitations.length,
            uniqueSourcesCount: new Set(sortedCitations.map((c) => c.url)).size,
          },
        },
      };

      this.logInfo('Web search completed successfully', {
        resultCount: finalResponse.results.length,
        citationCount: finalResponse.citations.length,
        searchTime: finalResponse.searchTime,
        citationExtractionTime,
      });

      return finalResponse;
    } catch (error) {
      this.logError('Web search failed', error as Error, {
        query: request.query,
        market: request.market,
      });
      throw new Error(
        `Azure Bing Grounding search failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Convert WebSearchResponse to AgentResponse
   */
  private convertToAgentResponse(
    searchResponse: WebSearchResponse,
    context: AgentExecutionContext,
  ): AgentResponse {
    // Format the response content with citations
    const content = this.formatSearchResults(searchResponse);

    return {
      content,
      agentId: this.config.id,
      agentType: AgentType.WEB_SEARCH,
      success: true,
      metadata: {
        agentMetadata: {
          searchQuery: searchResponse.query,
          resultCount: searchResponse.results.length,
          citationCount: searchResponse.citations.length,
          market: searchResponse.market,
          cached: searchResponse.cached,
          ...searchResponse.metadata,
        },
      },
    };
  }

  /**
   * Format search results with citations
   */
  private formatSearchResults(response: WebSearchResponse): string {
    // If we have assistant content (from Azure AI Agents), use it as the primary response
    if (response.assistantContent) {
      let content = response.assistantContent;

      // Add formatted citations section if not already included
      if (response.citations.length > 0) {
        const citationsSection = CitationExtractor.formatCitationsForDisplay(
          response.citations,
        );
        // Only add citations if they're not already in the content
        if (!content.includes('References:') && !content.includes('Sources:')) {
          content += '\n\n' + citationsSection;
        }
      }

      // Add Bing query URL (required by terms of use)
      const bingQueryUrl = this.generateBingQueryUrl(
        response.query,
        response.market,
      );
      if (!content.includes(bingQueryUrl)) {
        content += `\n\nBing search: ${bingQueryUrl}`;
      }

      return content;
    }

    // Fallback to generating content from individual results
    if (response.results.length === 0) {
      return "I couldn't find any relevant information for your query. Please try rephrasing or using different keywords.";
    }

    let content = `Based on my web search, here's what I found:\n\n`;

    // Add summarized content from results with inline citations
    response.results.forEach((result, index) => {
      content += `${result.snippet}`;

      // Add inline citation reference
      if (response.citations.length > index) {
        content += ` ${CitationExtractor.formatInlineCitation(index + 1)}`;
      }
      content += `\n\n`;
    });

    // Add formatted citations section using CitationExtractor
    const citationsSection = CitationExtractor.formatCitationsForDisplay(
      response.citations,
    );
    content += citationsSection;

    // Add Bing query URL (required by terms of use)
    const bingQueryUrl = this.generateBingQueryUrl(
      response.query,
      response.market,
    );
    content += `\n\nBing search: ${bingQueryUrl}`;

    return content;
  }

  /**
   * Generate Bing query URL (required by terms of use)
   */
  private generateBingQueryUrl(query: string, market: string): string {
    const params = new URLSearchParams({
      q: query,
      setmkt: market,
    });

    return `https://www.bing.com/search?${params.toString()}`;
  }

  /**
   * Extract freshness parameter from context
   */
  private extractFreshness(
    context: AgentExecutionContext,
  ): 'Day' | 'Week' | 'Month' | undefined {
    const query = context.query.toLowerCase();

    if (
      query.includes('today') ||
      query.includes('latest') ||
      query.includes('breaking')
    ) {
      return 'Day';
    }
    if (query.includes('this week') || query.includes('recent')) {
      return 'Week';
    }
    if (query.includes('this month')) {
      return 'Month';
    }

    return undefined;
  }

  /**
   * Get default web search configuration
   */
  private getDefaultWebSearchConfig(): WebSearchConfig {
    // For Azure AI Foundry, we use PROJECT_ENDPOINT as the main endpoint
    const endpoint =
      process.env.AZURE_AI_FOUNDRY_ENDPOINT ??
      process.env.AZURE_AI_FOUNDRY_ENDPOINT_ID ??
      process.env.PROJECT_ENDPOINT ??
      process.env.AZURE_GROUNDING_ENDPOINT ??
      'https://placeholder.cognitiveservices.azure.com';

    // API key comes from either AZURE_GROUNDING_CONNECTION_ID or fallback
    const apiKey =
      process.env.AZURE_GROUNDING_CONNECTION_ID ||
      process.env.AZURE_GROUNDING_API_KEY ||
      '';

    return {
      endpoint,
      apiKey,
      defaultMarket: 'en-US',
      defaultSafeSearch: 'Moderate',
      maxResults: 10,
      timeout: 30000,
      enableCaching: true,
      cacheTtl: 300, // 5 minutes
      retry: {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10000,
      },
    };
  }

  /**
   * Cache management methods
   */
  private generateCacheKey(request: WebSearchRequest): string {
    return `${request.query}|${request.market}|${request.freshness || 'none'}|${
      request.safeSearch
    }`;
  }

  private getCachedResponse(cacheKey: string): WebSearchResponse | null {
    const cached = this.searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return {
        ...cached.response,
        cached: true,
        cacheTimestamp: new Date(cached.timestamp).toISOString(),
      };
    }

    if (cached) {
      this.searchCache.delete(cacheKey);
    }

    return null;
  }

  private cacheResponse(cacheKey: string, response: WebSearchResponse): void {
    // Implement cache size limit
    if (this.searchCache.size >= 100) {
      const oldestKey = this.searchCache.keys().next().value;
      this.searchCache.delete(oldestKey);
    }

    this.searchCache.set(cacheKey, {
      response,
      timestamp: Date.now(),
    });
  }

  /**
   * Calculate average relevance score from search results
   */
  private calculateAverageRelevance(results: WebSearchResult[]): number {
    if (results.length === 0) {
      return 0;
    }

    const relevanceScores = results
      .map((result) => result.relevanceScore || 0)
      .filter((score) => score > 0);

    if (relevanceScores.length === 0) {
      return 0.5; // Default relevance if no scores available
    }

    return (
      relevanceScores.reduce((sum, score) => sum + score, 0) /
      relevanceScores.length
    );
  }
}
