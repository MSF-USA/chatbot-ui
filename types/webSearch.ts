import { Session } from 'next-auth';

/**
 * Web search result from Azure Bing Grounding
 */
export interface WebSearchResult {
  /** Unique identifier for this result */
  id: string;
  /** Title of the web page */
  title: string;
  /** URL of the web page */
  url: string;
  /** Snippet or description of the content */
  snippet: string;
  /** Display URL (may be different from actual URL) */
  displayUrl?: string;
  /** Date when the content was published or last modified */
  dateLastCrawled?: string;
  /** Language of the content */
  language?: string;
  /** Content type (webpage, news, academic, etc.) */
  contentType?: 'webpage' | 'news' | 'academic' | 'image' | 'video';
  /** Relevance score from search engine */
  relevanceScore?: number;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Citation information extracted from search results
 */
export interface Citation {
  /** Unique identifier for the citation */
  id: string;
  /** Title of the source */
  title: string;
  /** URL of the source */
  url: string;
  /** Author(s) of the content */
  authors?: string[];
  /** Publication date */
  publishedDate?: string;
  /** Publisher or source organization */
  publisher?: string;
  /** Type of citation */
  type: 'webpage' | 'article' | 'academic' | 'news' | 'blog';
  /** Additional citation metadata */
  metadata?: Record<string, any>;
}

/**
 * Web search request parameters
 */
export interface WebSearchRequest {
  /** Search query string */
  query: string;
  /** Maximum number of results to return */
  count?: number;
  /** Offset for pagination */
  offset?: number;
  /** Market/region for search (e.g., 'en-US') */
  market?: string;
  /** Search result freshness (Day, Week, Month) */
  freshness?: 'Day' | 'Week' | 'Month';
  /** Safe search level */
  safeSearch?: 'Off' | 'Moderate' | 'Strict';
  /** Filter by content type */
  contentType?: 'webpage' | 'news' | 'academic' | 'all';
  /** Additional search parameters */
  parameters?: Record<string, any>;
}

/**
 * Web search response with results and metadata
 */
export interface WebSearchResponse {
  /** Search query that was executed */
  query: string;
  /** Array of search results */
  results: WebSearchResult[];
  /** Array of extracted citations */
  citations: Citation[];
  /** Total number of results available */
  totalCount?: number;
  /** Time taken to execute search in milliseconds */
  searchTime: number;
  /** Market/region used for search */
  market: string;
  /** Whether results were cached */
  cached: boolean;
  /** Cache timestamp if cached */
  cacheTimestamp?: string;
  /** AI Assistant's comprehensive analysis with citations */
  assistantContent?: string;
  /** Raw annotations from the assistant's response for citation mapping */
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
  /** Additional response metadata */
  metadata?: {
    /** Token usage if applicable */
    tokenUsage?: {
      prompt: number;
      completion: number;
      total: number;
    };
    /** Processing time breakdown */
    timing?: {
      searchTime: number;
      citationExtractionTime: number;
      totalTime: number;
    };
    /** Quality metrics */
    quality?: {
      relevanceScore: number;
      citationCount: number;
      uniqueSourcesCount: number;
    };
    /** Azure-specific metadata */
    azureMetadata?: {
      /** Bing search URL for compliance */
      bingSearchUrl: string;
      /** Optimized query used by Azure AI */
      optimizedQuery: string;
      /** Azure web search URL */
      webSearchUrl?: string;
      /** Additional Azure response data */
      additionalData?: Record<string, any>;
    };
  };
}

/**
 * Web search configuration parameters
 */
export interface WebSearchConfig {
  /** Azure Bing Grounding endpoint */
  endpoint: string;
  /** API key for authentication */
  apiKey: string;
  /** Default market for searches */
  defaultMarket: string;
  /** Default safe search level */
  defaultSafeSearch: 'Off' | 'Moderate' | 'Strict';
  /** Maximum results per search */
  maxResults: number;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Whether to enable result caching */
  enableCaching: boolean;
  /** Cache TTL in seconds */
  cacheTtl: number;
  /** Retry configuration */
  retry: {
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
  };
}

/**
 * Web search execution context
 */
export interface WebSearchContext {
  /** User making the search request */
  user: Session['user'];
  /** User's locale/language preference */
  locale: string;
  /** Conversation history for context */
  conversationHistory?: string[];
  /** Additional context parameters */
  context?: Record<string, any>;
  /** Request correlation ID */
  correlationId?: string;
}

/**
 * Web search error types
 */
export interface WebSearchError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Additional error details */
  details?: any;
  /** HTTP status code if applicable */
  statusCode?: number;
  /** Retry information */
  retryable?: boolean;
}

/**
 * Search result ranking factors
 */
export interface SearchRankingFactors {
  /** Relevance to query */
  relevance: number;
  /** Authority of the source */
  authority: number;
  /** Freshness of content */
  freshness: number;
  /** User engagement metrics */
  engagement?: number;
  /** Domain trust score */
  trustScore?: number;
}

/**
 * Search analytics data
 */
export interface SearchAnalytics {
  /** Query that was searched */
  query: string;
  /** Number of results returned */
  resultCount: number;
  /** User who performed the search */
  userId?: string;
  /** Timestamp of the search */
  timestamp: string;
  /** Search duration in milliseconds */
  duration: number;
  /** Whether search was successful */
  success: boolean;
  /** Error information if search failed */
  error?: WebSearchError;
  /** Market/region used */
  market: string;
  /** Additional analytics metadata */
  metadata?: Record<string, any>;
}