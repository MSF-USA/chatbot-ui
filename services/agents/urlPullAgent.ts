import { BaseAgent } from './baseAgent';
import { AgentExecutionContext, AgentResponse, AgentType, UrlPullAgentConfig } from '../../types/agent';
import {
  UrlPullRequest,
  UrlPullResponse,
  ProcessedUrl,
  FailedUrl,
  ProcessingStats,
  UrlValidationResult,
  UrlExtractionResult,
  UrlPullError,
  UrlPullErrorType,
  DEFAULT_URL_PULL_CONFIG,
  UrlProcessingJob,
  UrlMetadata,
} from '@/types/urlPull';
import { HttpError } from '@/utils/app/security';
import { fetchAndParseWebpage } from '../webpageService';
import * as cheerio from 'cheerio';
import { URL } from 'url';

interface ProcessingResult {
  processedUrls: ProcessedUrl[];
  failedUrls: FailedUrl[];
  processingStats: ProcessingStats;
}

export class UrlPullAgent extends BaseAgent {
  private urlPullConfig: UrlPullAgentConfig;
  private cache: Map<string, { data: ProcessedUrl; timestamp: number }> = new Map();
  private processingQueue: Map<string, UrlProcessingJob> = new Map();
  private activeJobs = 0;

  constructor(config: UrlPullAgentConfig) {
    super(config);
    this.urlPullConfig = config;
  }

  protected async initializeAgent(): Promise<void> {
    // Initialize URL Pull Agent specific components
    this.cache?.clear();
    this.processingQueue?.clear();
    this.activeJobs = 0;
  }

  protected validateSpecificConfig(): string[] {
    const errors: string[] = [];
    
    if (!this.urlPullConfig.urlPullConfig) {
      errors.push('URL pull configuration is required');
    }
    
    if (this.urlPullConfig.maxUrls && this.urlPullConfig.maxUrls <= 0) {
      errors.push('Maximum URLs must be greater than 0');
    }
    
    if (this.urlPullConfig.concurrencyLimit && this.urlPullConfig.concurrencyLimit <= 0) {
      errors.push('Concurrency limit must be greater than 0');
    }
    
    return errors;
  }

  protected getCapabilities(): string[] {
    return [
      'url-processing',
      'parallel-fetching', 
      'content-extraction',
      'metadata-extraction',
      'caching',
      'validation'
    ];
  }

  protected async executeInternal(context: AgentExecutionContext): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      const request = this.parseRequest(context.query);
      const response = await this.processUrls(request, context);
      
      const processingTime = Date.now() - startTime;
      
      // Build structured content for downstream processing
      const structuredContent = {
        type: 'url_content' as const,
        items: response.processedUrls.map(url => ({
          source: url.url,
          content: url.content,
          metadata: {
            title: url.title,
            contentType: url.contentType,
            contentLength: url.contentLength,
            extractedAt: url.extractedAt,
            cached: url.cached,
            processingTime: url.processingTime,
            ...url.metadata,
          },
        })),
        originalQuery: context.query,
        summary: {
          totalItems: response.processingStats.totalUrls,
          successfulItems: response.processingStats.successfulUrls,
          failedItems: response.processingStats.failedUrls,
          errors: response.failedUrls.map(failed => ({
            source: failed.url,
            error: `${failed.error} (${failed.errorType})`,
          })),
        },
      };
      
      return {
        content: this.formatSummaryResponse(response),
        agentId: this.config.id,
        agentType: AgentType.URL_PULL,
        success: true,
        structuredContent,
        metadata: {
          processingTime,
          confidence: this.calculateConfidence(response),
          agentMetadata: {
            totalUrls: response.processingStats.totalUrls,
            successfulUrls: response.processingStats.successfulUrls,
            failedUrls: response.processingStats.failedUrls,
            cachedUrls: response.processingStats.cachedUrls,
            processingMethod: response.metadata?.processingMethod,
          },
        },
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      return {
        content: `URL processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        agentId: this.config.id,
        agentType: AgentType.URL_PULL,
        success: false,
        metadata: {
          processingTime,
          confidence: 0,
        },
        error: {
          code: error instanceof UrlPullError ? error.code : UrlPullErrorType.CONTENT_ERROR,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          details: error,
        },
      };
    }
  }

  private parseRequest(query: string): UrlPullRequest {
    const urls = this.extractUrls(query);
    
    return {
      urls: urls.urls,
      extractFromQuery: true,
      config: {
        ...DEFAULT_URL_PULL_CONFIG,
        ...this.urlPullConfig.urlPullConfig,
        maxUrls: this.urlPullConfig.maxUrls || DEFAULT_URL_PULL_CONFIG.maxUrls,
        timeout: this.urlPullConfig.processingTimeout || DEFAULT_URL_PULL_CONFIG.timeout,
        concurrencyLimit: this.urlPullConfig.concurrencyLimit || DEFAULT_URL_PULL_CONFIG.concurrencyLimit,
        enableCaching: this.urlPullConfig.enableCaching ?? DEFAULT_URL_PULL_CONFIG.enableCaching,
        cacheTtl: this.urlPullConfig.cacheTtl ? this.urlPullConfig.cacheTtl * 1000 : DEFAULT_URL_PULL_CONFIG.cacheTtl,
      },
      context: {
        enableParallelProcessing: this.urlPullConfig.enableParallelProcessing ?? true,
        enableContentExtraction: this.urlPullConfig.enableContentExtraction ?? true,
        enableRetry: this.urlPullConfig.enableRetry ?? true,
        maxRetryAttempts: this.urlPullConfig.maxRetryAttempts || 3,
      },
    };
  }

  private extractUrls(text: string): UrlExtractionResult {
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
    const matches = text.match(urlRegex) || [];
    
    const validUrls = new Set<string>();
    const invalidUrls: string[] = [];
    
    for (const match of matches) {
      const validation = this.validateUrl(match);
      if (validation.valid && validation.normalizedUrl) {
        validUrls.add(validation.normalizedUrl);
      } else {
        invalidUrls.push(match);
      }
    }
    
    return {
      urls: Array.from(validUrls),
      totalFound: matches.length,
      duplicatesRemoved: matches.length - validUrls.size - invalidUrls.length,
      invalidUrls,
      extractionMethod: 'regex',
      extractionContext: {
        textLength: text.length,
        linkCount: validUrls.size,
        imageCount: 0,
      },
    };
  }

  private validateUrl(url: string): UrlValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      const parsedUrl = new URL(url);
      
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        errors.push('Only HTTP and HTTPS protocols are supported');
      }
      
      if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1') {
        errors.push('Localhost URLs are not allowed');
      }
      
      if (parsedUrl.protocol === 'http:') {
        warnings.push('HTTP URL detected, HTTPS is recommended');
      }
      
      return {
        valid: errors.length === 0,
        normalizedUrl: parsedUrl.toString(),
        errors,
        warnings,
        metadata: {
          protocol: parsedUrl.protocol,
          domain: parsedUrl.hostname,
          path: parsedUrl.pathname,
          isSecure: parsedUrl.protocol === 'https:',
          isInternal: false,
        },
      };
    } catch (error) {
      return {
        valid: false,
        errors: ['Invalid URL format'],
        warnings: [],
      };
    }
  }

  private async processUrls(request: UrlPullRequest, context: AgentExecutionContext): Promise<UrlPullResponse> {
    const urls = request.urls || [];
    const config = request.config || DEFAULT_URL_PULL_CONFIG;
    const startTime = Date.now();
    
    if (urls.length === 0) {
      throw new UrlPullError('No valid URLs found to process', UrlPullErrorType.INVALID_URL);
    }


    if (!config.maxUrls) {
      config.maxUrls = DEFAULT_URL_PULL_CONFIG.maxUrls;
    }
    
    if (urls.length > config.maxUrls) {
      throw new UrlPullError(
        `Too many URLs: ${urls.length} exceeds limit of ${config.maxUrls || DEFAULT_URL_PULL_CONFIG.maxUrls}`,
        UrlPullErrorType.CONTENT_ERROR
      );
    }
    
    const processingMethod = request.context?.enableParallelProcessing ? 'parallel' : 'sequential';
    const concurrencyLimit = Math.min(config.concurrencyLimit || DEFAULT_URL_PULL_CONFIG.concurrencyLimit, urls.length);
    
    let result: ProcessingResult;
    
    if (processingMethod === 'parallel' && urls.length > 1) {
      result = await this.processUrlsParallel(urls, config, concurrencyLimit);
    } else {
      result = await this.processUrlsSequential(urls, config);
    }
    
    const processingTime = Date.now() - startTime;
    
    return {
      query: context.query,
      processedUrls: result.processedUrls,
      failedUrls: result.failedUrls,
      extractedUrls: urls,
      processingStats: {
        ...result.processingStats,
        totalProcessingTime: processingTime,
        averageProcessingTime: urls.length > 0 ? processingTime / urls.length : 0,
      },
      cached: result.processedUrls.some(url => url.cached),
      metadata: {
        totalUrlsFound: urls.length,
        urlsFromQuery: urls.length,
        urlsProvided: request.urls?.length || 0,
        processingMethod,
        concurrencyUsed: concurrencyLimit,
      },
    };
  }

  private async processUrlsParallel(urls: string[], config: any, concurrencyLimit: number): Promise<ProcessingResult> {
    const processedUrls: ProcessedUrl[] = [];
    const failedUrls: FailedUrl[] = [];
    const processingTimes: number[] = [];
    const contentSizes: number[] = [];
    let cachedCount = 0;
    let redirectCount = 0;
    let retryCount = 0;
    
    const semaphore = new Array(concurrencyLimit).fill(0);
    const urlPromises = urls.map(async (url) => {
      await this.waitForSlot(semaphore);
      
      try {
        const result = await this.processUrl(url, config);
        if (result.type === 'success') {
          processedUrls.push(result.data);
          processingTimes.push(result.data.processingTime);
          contentSizes.push(result.data.contentLength);
          if (result.data.cached) cachedCount++;
          if (result.data.redirectedFrom) redirectCount++;
        } else {
          failedUrls.push(result.data);
          if (result.data.retryAttempts) retryCount += result.data.retryAttempts;
        }
      } finally {
        this.releaseSlot(semaphore);
      }
    });
    
    await Promise.all(urlPromises);
    
    return {
      processedUrls,
      failedUrls,
      processingStats: this.calculateStats(
        processedUrls,
        failedUrls,
        processingTimes,
        contentSizes,
        cachedCount,
        redirectCount,
        retryCount
      ),
    };
  }

  private async processUrlsSequential(urls: string[], config: any): Promise<ProcessingResult> {
    const processedUrls: ProcessedUrl[] = [];
    const failedUrls: FailedUrl[] = [];
    const processingTimes: number[] = [];
    const contentSizes: number[] = [];
    let cachedCount = 0;
    let redirectCount = 0;
    let retryCount = 0;
    
    for (const url of urls) {
      const result = await this.processUrl(url, config);
      if (result.type === 'success') {
        processedUrls.push(result.data);
        processingTimes.push(result.data.processingTime);
        contentSizes.push(result.data.contentLength);
        if (result.data.cached) cachedCount++;
        if (result.data.redirectedFrom) redirectCount++;
      } else {
        failedUrls.push(result.data);
        if (result.data.retryAttempts) retryCount += result.data.retryAttempts;
      }
    }
    
    return {
      processedUrls,
      failedUrls,
      processingStats: this.calculateStats(
        processedUrls,
        failedUrls,
        processingTimes,
        contentSizes,
        cachedCount,
        redirectCount,
        retryCount
      ),
    };
  }

  private async processUrl(url: string, config: any): Promise<
    { type: 'success'; data: ProcessedUrl } | { type: 'failure'; data: FailedUrl }
  > {
    const startTime = Date.now();
    
    if (config.enableCaching) {
      const cached = this.getCachedResult(url, config.cacheTtl);
      if (cached) {
        return { type: 'success', data: cached };
      }
    }
    
    let retryAttempts = 0;
    const maxRetries = config.retry?.maxAttempts || 3;
    
    while (retryAttempts <= maxRetries) {
      try {
        const content = await fetchAndParseWebpage(url, 5);
        const processingTime = Date.now() - startTime;
        
        const processedUrl: ProcessedUrl = {
          url,
          title: this.extractTitle(content),
          content: this.extractContent(content),
          contentLength: content.length,
          processingTime,
          contentType: 'text/html',
          statusCode: 200,
          metadata: this.extractMetadata(content, url),
          extractedAt: new Date().toISOString(),
          cached: false,
        };
        
        if (config.enableCaching) {
          this.setCachedResult(url, processedUrl, config.cacheTtl);
        }
        
        return { type: 'success', data: processedUrl };
      } catch (error) {
        retryAttempts++;
        
        if (retryAttempts > maxRetries) {
          const processingTime = Date.now() - startTime;
          
          const failedUrl: FailedUrl = {
            url,
            error: error instanceof Error ? error.message : 'Unknown error',
            errorType: this.categorizeError(error as Error),
            statusCode: error instanceof HttpError ? error.status : undefined,
            retryAttempts: retryAttempts - 1,
            processingTime,
            timestamp: new Date().toISOString(),
          };
          
          return { type: 'failure', data: failedUrl };
        }
        
        const delay = Math.min(
          (config.retry?.baseDelay || 1000) * Math.pow(2, retryAttempts - 1),
          config.retry?.maxDelay || 10000
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error('Unexpected error in processUrl');
  }

  private extractTitle(content: string): string {
    const titleMatch = content.match(/^# (.+)$/m);
    return titleMatch ? titleMatch[1] : 'No title';
  }

  private extractContent(content: string): string {
    const contentMatch = content.match(/## Content\n\n(.+)$/s);
    return contentMatch ? contentMatch[1].trim() : content;
  }

  private extractMetadata(content: string, url: string): UrlMetadata {
    try {
      const $ = cheerio.load(content);
      
      return {
        description: $('meta[name="description"]').attr('content') || 
                    $('meta[property="og:description"]').attr('content'),
        author: $('meta[name="author"]').attr('content'),
        keywords: $('meta[name="keywords"]').attr('content')?.split(',').map(k => k.trim()),
        canonical: $('link[rel="canonical"]').attr('href'),
        socialMedia: {
          openGraph: {
            title: $('meta[property="og:title"]').attr('content'),
            description: $('meta[property="og:description"]').attr('content'),
            image: $('meta[property="og:image"]').attr('content'),
            url: $('meta[property="og:url"]').attr('content'),
            type: $('meta[property="og:type"]').attr('content'),
            siteName: $('meta[property="og:site_name"]').attr('content'),
          },
          twitter: {
            card: $('meta[name="twitter:card"]').attr('content'),
            title: $('meta[name="twitter:title"]').attr('content'),
            description: $('meta[name="twitter:description"]').attr('content'),
            image: $('meta[name="twitter:image"]').attr('content'),
            creator: $('meta[name="twitter:creator"]').attr('content'),
            site: $('meta[name="twitter:site"]').attr('content'),
          },
        },
        performance: {
          downloadTime: 0,
          parseTime: 0,
          totalTime: 0,
          contentSize: content.length,
        },
      };
    } catch (error) {
      return {
        performance: {
          downloadTime: 0,
          parseTime: 0,
          totalTime: 0,
          contentSize: content.length,
        },
      };
    }
  }

  private categorizeError(error: any): FailedUrl['errorType'] {
    if (error instanceof HttpError) {
      if (error.status === 403) return 'forbidden';
      if (error.status === 404) return 'not_found';
      if (error.status >= 500) return 'server_error';
      if (error.status === 408) return 'timeout';
    }
    
    if (error instanceof Error) {
      if (error.message.includes('timeout')) return 'timeout';
      if (error.message.includes('Invalid URL')) return 'invalid_url';
      if (error.message.includes('Network')) return 'network';
    }
    
    return 'content_error';
  }

  private calculateStats(
    processedUrls: ProcessedUrl[],
    failedUrls: FailedUrl[],
    processingTimes: number[],
    contentSizes: number[],
    cachedCount: number,
    redirectCount: number,
    retryCount: number
  ): ProcessingStats {
    const totalUrls = processedUrls.length + failedUrls.length;
    
    return {
      totalUrls,
      successfulUrls: processedUrls.length,
      failedUrls: failedUrls.length,
      cachedUrls: cachedCount,
      totalProcessingTime: 0, // Set by caller
      averageProcessingTime: processingTimes.length > 0 ? 
        processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length : 0,
      fastestProcessingTime: processingTimes.length > 0 ? Math.min(...processingTimes) : 0,
      slowestProcessingTime: processingTimes.length > 0 ? Math.max(...processingTimes) : 0,
      totalContentSize: contentSizes.reduce((a, b) => a + b, 0),
      averageContentSize: contentSizes.length > 0 ? 
        contentSizes.reduce((a, b) => a + b, 0) / contentSizes.length : 0,
      redirectCount,
      retryCount,
    };
  }

  private getCachedResult(url: string, cacheTtl: number): ProcessedUrl | null {
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.timestamp < cacheTtl) {
      return { ...cached.data, cached: true, cacheTimestamp: new Date(cached.timestamp).toISOString() };
    }
    return null;
  }

  private setCachedResult(url: string, result: ProcessedUrl, cacheTtl: number): void {
    this.cache.set(url, { data: result, timestamp: Date.now() });
    
    setTimeout(() => {
      this.cache.delete(url);
    }, cacheTtl);
  }

  private async waitForSlot(semaphore: number[]): Promise<void> {
    return new Promise(resolve => {
      const checkSlot = () => {
        const availableSlot = semaphore.findIndex(slot => slot === 0);
        if (availableSlot !== -1) {
          semaphore[availableSlot] = 1;
          resolve();
        } else {
          setTimeout(checkSlot, 10);
        }
      };
      checkSlot();
    });
  }

  private releaseSlot(semaphore: number[]): void {
    const occupiedSlot = semaphore.findIndex(slot => slot === 1);
    if (occupiedSlot !== -1) {
      semaphore[occupiedSlot] = 0;
    }
  }

  private calculateConfidence(response: UrlPullResponse): number {
    const successRate = response.processingStats.totalUrls > 0 ? 
      response.processingStats.successfulUrls / response.processingStats.totalUrls : 0;
    
    let confidence = successRate;
    
    if (response.processingStats.cachedUrls > 0) {
      confidence += 0.1;
    }
    
    if (response.processingStats.averageProcessingTime < 5000) {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }

  private formatSummaryResponse(response: UrlPullResponse): string {
    const { processingStats } = response;
    
    let summary = `Processed ${processingStats.successfulUrls} of ${processingStats.totalUrls} URLs successfully`;
    
    if (processingStats.failedUrls > 0) {
      summary += ` (${processingStats.failedUrls} failed)`;
    }
    
    if (processingStats.cachedUrls > 0) {
      summary += ` - ${processingStats.cachedUrls} from cache`;
    }
    
    summary += `. Total content extracted: ${this.formatBytes(processingStats.totalContentSize)}.`;
    
    return summary;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

}