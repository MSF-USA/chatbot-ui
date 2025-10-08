/**
 * Type definitions for URL Pull Agent
 * Enhanced webpage processing with parallel URL handling capabilities
 */

/**
 * Configuration for URL pull operations
 */
export interface UrlPullConfig {
  endpoint?: string;
  timeout?: number;
  maxUrls?: number;
  followRedirects?: boolean;
  extractImages?: boolean;
  extractMetadata?: boolean;
  sanitizeContent?: boolean;
  enableCaching?: boolean;
  cacheTtl?: number;
  concurrencyLimit?: number;
  userAgent?: string;
  headers?: Record<string, string>;
  retry?: {
    maxAttempts?: number;
    baseDelay?: number;
    maxDelay?: number;
  };
}

/**
 * Request for URL pull operation
 */
export interface UrlPullRequest {
  urls?: string[];
  extractFromQuery?: boolean;
  config?: UrlPullConfig;
  context?: Record<string, any>;
}

/**
 * Individual processed URL result
 */
export interface ProcessedUrl {
  url: string;
  originalUrl?: string;
  title: string;
  content: string;
  contentLength: number;
  processingTime: number;
  contentType?: string;
  language?: string;
  encoding?: string;
  redirectedFrom?: string;
  finalUrl?: string;
  statusCode?: number;
  metadata: UrlMetadata;
  extractedAt: string;
  cached?: boolean;
  cacheTimestamp?: string;
}

/**
 * Failed URL processing result
 */
export interface FailedUrl {
  url: string;
  originalUrl?: string;
  error: string;
  errorType:
    | 'network'
    | 'timeout'
    | 'invalid_url'
    | 'content_error'
    | 'forbidden'
    | 'not_found'
    | 'server_error';
  statusCode?: number;
  redirectedTo?: string;
  retryAttempts?: number;
  processingTime?: number;
  timestamp: string;
}

/**
 * URL metadata extracted from webpage
 */
export interface UrlMetadata {
  description?: string;
  author?: string;
  publishedDate?: string;
  modifiedDate?: string;
  keywords?: string[];
  tags?: string[];
  images?: ImageInfo[];
  links?: LinkInfo[];
  headers?: HeaderInfo[];
  canonical?: string;
  socialMedia?: SocialMediaInfo;
  seo?: SEOInfo;
  performance?: PerformanceInfo;
}

/**
 * Image information extracted from webpage
 */
export interface ImageInfo {
  src: string;
  alt?: string;
  title?: string;
  width?: number;
  height?: number;
  size?: number;
  format?: string;
}

/**
 * Link information extracted from webpage
 */
export interface LinkInfo {
  href: string;
  text?: string;
  title?: string;
  rel?: string;
  type?: 'internal' | 'external' | 'anchor';
}

/**
 * Header information from webpage
 */
export interface HeaderInfo {
  level: number;
  text: string;
  id?: string;
  anchor?: string;
}

/**
 * Social media metadata
 */
export interface SocialMediaInfo {
  openGraph?: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: string;
    siteName?: string;
  };
  twitter?: {
    card?: string;
    title?: string;
    description?: string;
    image?: string;
    creator?: string;
    site?: string;
  };
}

/**
 * SEO information
 */
export interface SEOInfo {
  metaTitle?: string;
  metaDescription?: string;
  robots?: string;
  canonical?: string;
  hreflang?: Record<string, string>;
  schema?: any[];
}

/**
 * Performance metrics for URL processing
 */
export interface PerformanceInfo {
  downloadTime: number;
  parseTime: number;
  totalTime: number;
  contentSize: number;
  compressedSize?: number;
  redirectCount?: number;
}

/**
 * URL pull operation response
 */
export interface UrlPullResponse {
  query: string;
  processedUrls: ProcessedUrl[];
  failedUrls: FailedUrl[];
  extractedUrls: string[];
  processingStats: ProcessingStats;
  cached: boolean;
  cacheTimestamp?: string;
  metadata?: {
    totalUrlsFound?: number;
    urlsFromQuery?: number;
    urlsProvided?: number;
    processingMethod?: 'parallel' | 'sequential';
    concurrencyUsed?: number;
    retryStats?: RetryStats;
  };
}

/**
 * Processing statistics
 */
export interface ProcessingStats {
  totalUrls: number;
  successfulUrls: number;
  failedUrls: number;
  cachedUrls: number;
  totalProcessingTime: number;
  averageProcessingTime: number;
  fastestProcessingTime: number;
  slowestProcessingTime: number;
  totalContentSize: number;
  averageContentSize: number;
  redirectCount: number;
  retryCount: number;
}

/**
 * Retry statistics
 */
export interface RetryStats {
  totalRetries: number;
  successAfterRetry: number;
  maxRetriesReached: number;
  retryReasons: Record<string, number>;
}

/**
 * URL validation result
 */
export interface UrlValidationResult {
  valid: boolean;
  normalizedUrl?: string;
  errors: string[];
  warnings: string[];
  metadata?: {
    protocol?: string;
    domain?: string;
    path?: string;
    isSecure?: boolean;
    isInternal?: boolean;
  };
}

/**
 * URL extraction result
 */
export interface UrlExtractionResult {
  urls: string[];
  totalFound: number;
  duplicatesRemoved: number;
  invalidUrls: string[];
  extractionMethod: 'regex' | 'markdown' | 'html' | 'mixed';
  extractionContext?: {
    textLength: number;
    linkCount: number;
    imageCount: number;
  };
}

/**
 * Content processing options
 */
export interface ContentProcessingOptions {
  sanitize?: boolean;
  extractMarkdown?: boolean;
  preserveFormatting?: boolean;
  removeNavigation?: boolean;
  removeFooter?: boolean;
  removeSidebar?: boolean;
  extractMainContent?: boolean;
  minContentLength?: number;
  maxContentLength?: number;
}

/**
 * Caching options for URL processing
 */
export interface UrlCacheOptions {
  ttl?: number;
  respectCacheHeaders?: boolean;
  maxCacheSize?: number;
  compressionEnabled?: boolean;
  keyStrategy?: 'url' | 'url_with_headers' | 'content_hash';
}

/**
 * Error types for URL processing
 */
export enum UrlPullErrorType {
  NETWORK_ERROR = 'network_error',
  TIMEOUT_ERROR = 'timeout_error',
  INVALID_URL = 'invalid_url',
  CONTENT_ERROR = 'content_error',
  FORBIDDEN = 'forbidden',
  NOT_FOUND = 'not_found',
  SERVER_ERROR = 'server_error',
  RATE_LIMITED = 'rate_limited',
  SSL_ERROR = 'ssl_error',
  REDIRECT_ERROR = 'redirect_error',
  CONTENT_TOO_LARGE = 'content_too_large',
  UNSUPPORTED_CONTENT_TYPE = 'unsupported_content_type',
}

/**
 * URL processing priority levels
 */
export enum UrlProcessingPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * URL processing job
 */
export interface UrlProcessingJob {
  id: string;
  url: string;
  priority: UrlProcessingPriority;
  config: UrlPullConfig;
  retryCount: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: ProcessedUrl | FailedUrl;
}

/**
 * URL processing queue
 */
export interface UrlProcessingQueue {
  jobs: UrlProcessingJob[];
  activeJobs: number;
  pendingJobs: number;
  completedJobs: number;
  failedJobs: number;
  maxConcurrency: number;
  totalProcessed: number;
}

/**
 * Custom error class for URL pull operations
 */
export class UrlPullError extends Error {
  constructor(
    message: string,
    public code: UrlPullErrorType,
    public statusCode?: number,
    public url?: string,
    public originalError?: Error,
  ) {
    super(message);
    this.name = 'UrlPullError';
  }
}

/**
 * URL content types that can be processed
 */
export const SUPPORTED_CONTENT_TYPES = [
  'text/html',
  'text/plain',
  'text/markdown',
  'application/json',
  'application/xml',
  'text/xml',
  'application/rss+xml',
  'application/atom+xml',
] as const;

/**
 * Default configuration values
 */
export const DEFAULT_URL_PULL_CONFIG: Required<UrlPullConfig> = {
  endpoint: '',
  timeout: 30000,
  maxUrls: 10,
  followRedirects: true,
  extractImages: false,
  extractMetadata: true,
  sanitizeContent: true,
  enableCaching: true,
  cacheTtl: 3600000, // 1 hour
  concurrencyLimit: 5,
  userAgent: 'MSF-AI-Assistant/1.0',
  headers: {
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate',
    'Cache-Control': 'max-age=0',
  },
  retry: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
  },
};

/**
 * URL processing metrics for monitoring
 */
export interface UrlPullMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  cacheHitRate: number;
  errorDistribution: Record<UrlPullErrorType, number>;
  contentSizeDistribution: {
    small: number; // < 10KB
    medium: number; // 10KB - 100KB
    large: number; // 100KB - 1MB
    extraLarge: number; // > 1MB
  };
  domainDistribution: Record<string, number>;
  processingTimeDistribution: {
    fast: number; // < 1s
    normal: number; // 1s - 5s
    slow: number; // 5s - 15s
    timeout: number; // > 15s
  };
}

/**
 * URL processing configuration profiles
 */
export const URL_PROCESSING_PROFILES = {
  fast: {
    timeout: 10000,
    maxUrls: 5,
    concurrencyLimit: 3,
    extractMetadata: false,
    extractImages: false,
  },
  balanced: {
    timeout: 30000,
    maxUrls: 10,
    concurrencyLimit: 5,
    extractMetadata: true,
    extractImages: false,
  },
  comprehensive: {
    timeout: 60000,
    maxUrls: 20,
    concurrencyLimit: 3,
    extractMetadata: true,
    extractImages: true,
  },
} as const;
