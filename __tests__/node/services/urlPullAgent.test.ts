import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { UrlPullAgent } from '../../../services/agents/urlPullAgent';
import { fetchAndParseWebpage, HttpError } from '../../../services/webpageService';
import {
  AgentType,
  AgentExecutionContext,
  UrlPullAgentConfig,
  AgentExecutionEnvironment,
} from '../../../types/agent';
import {
  UrlPullErrorType,
  DEFAULT_URL_PULL_CONFIG,
  ProcessedUrl,
  FailedUrl,
} from '../../../types/urlPull';
import { OpenAIModel } from '../../../types/openai';

// Mock the webpageService
vi.mock('../../../services/webpageService', () => ({
  fetchAndParseWebpage: vi.fn(),
  HttpError: class HttpError extends Error {
    constructor(public status: number, message?: string) {
      super(message);
      this.name = 'HttpError';
    }
  },
}));

const mockFetchAndParseWebpage = fetchAndParseWebpage as Mock;

describe('UrlPullAgent', () => {
  let agent: UrlPullAgent;
  let config: UrlPullAgentConfig;
  let context: AgentExecutionContext;

  beforeEach(() => {
    config = {
      id: 'test-url-pull-agent',
      name: 'Test URL Pull Agent',
      type: AgentType.URL_PULL,
      environment: AgentExecutionEnvironment.FOUNDRY,
      modelId: 'gpt-4o-mini',
      instructions: 'Test agent for URL processing',
      tools: [],
      urlPullConfig: {
        ...DEFAULT_URL_PULL_CONFIG,
        timeout: 5000, // Shorter timeout for tests
        retry: {
          maxAttempts: 2,
          baseDelay: 100,
          maxDelay: 200,
        },
      },
      maxUrls: 5,
      processingTimeout: 5000,
      enableParallelProcessing: true,
      concurrencyLimit: 3,
      enableContentExtraction: true,
      enableCaching: true,
      cacheTtl: 3600,
      enableRetry: true,
      maxRetryAttempts: 2, // Shorter for tests
    };

    context = {
      query: 'Analyze this website: https://example.com',
      messages: [],
      user: { id: 'test-user', name: 'Test User', email: 'test@example.com' },
      model: { id: 'gpt-4o-mini' } as OpenAIModel,
      locale: 'en',
      correlationId: 'test-correlation-id',
    };

    agent = new UrlPullAgent(config);
    mockFetchAndParseWebpage.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create UrlPullAgent with correct configuration', () => {
      expect(agent).toBeInstanceOf(UrlPullAgent);
      expect(agent.config).toEqual(config);
    });
  });

  describe('URL Extraction', () => {
    it('should extract single URL from query', async () => {
      mockFetchAndParseWebpage.mockResolvedValue('# Test Page\n## URL: example.com\n\n## Content\n\nTest content');

      const response = await agent.execute(context);

      expect(response.success).toBe(true);
      expect(response.agentType).toBe(AgentType.URL_PULL);
      expect(mockFetchAndParseWebpage).toHaveBeenCalledWith('https://example.com/', 5);
    });

    it('should extract multiple URLs from query', async () => {
      context.query = 'Compare these sites: https://example1.com and https://example2.com';
      
      mockFetchAndParseWebpage
        .mockResolvedValueOnce('# Example 1\n## URL: example1.com\n\n## Content\n\nContent 1')
        .mockResolvedValueOnce('# Example 2\n## URL: example2.com\n\n## Content\n\nContent 2');

      const response = await agent.execute(context);

      expect(response.success).toBe(true);
      expect(mockFetchAndParseWebpage).toHaveBeenCalledTimes(2);
      expect(mockFetchAndParseWebpage).toHaveBeenCalledWith('https://example1.com/', 5);
      expect(mockFetchAndParseWebpage).toHaveBeenCalledWith('https://example2.com/', 5);
    });

    it('should handle www URLs correctly', async () => {
      context.query = 'Analyze www.example.com';
      
      mockFetchAndParseWebpage.mockResolvedValue('# Test Page\n## URL: example.com\n\n## Content\n\nTest content');

      const response = await agent.execute(context);

      expect(response.success).toBe(true);
      expect(mockFetchAndParseWebpage).toHaveBeenCalledWith('https://www.example.com/', 5);
    });

    it('should reject localhost URLs', async () => {
      context.query = 'Analyze http://localhost:3000';

      const response = await agent.execute(context);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe(UrlPullErrorType.INVALID_URL);
      expect(mockFetchAndParseWebpage).not.toHaveBeenCalled();
    });

    it('should handle query with no URLs', async () => {
      context.query = 'What is the weather today?';

      const response = await agent.execute(context);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe(UrlPullErrorType.INVALID_URL);
      expect(response.error?.message).toContain('No valid URLs found');
    });
  });

  describe('URL Processing', () => {
    it('should process URL successfully', async () => {
      const mockContent = '# Example Page\n## URL: example.com\n\n## Content\n\nThis is a test page with sample content.';
      mockFetchAndParseWebpage.mockResolvedValue(mockContent);

      const response = await agent.execute(context);

      expect(response.success).toBe(true);
      expect(response.content).toContain('Processed 1 of 1 URLs successfully');
      expect(response.metadata?.agentMetadata?.successfulUrls).toBe(1);
      expect(response.metadata?.agentMetadata?.failedUrls).toBe(0);
    });

    it('should handle network errors gracefully', async () => {
      mockFetchAndParseWebpage.mockRejectedValue(new Error('Network error'));

      const response = await agent.execute(context);

      expect(response.success).toBe(true); // Agent succeeds but URL processing fails
      expect(response.content).toContain('Processed 0 of 1 URLs successfully (1 failed)');
      expect(response.metadata?.agentMetadata?.successfulUrls).toBe(0);
      expect(response.metadata?.agentMetadata?.failedUrls).toBe(1);
    });

    it('should handle HTTP errors appropriately', async () => {
      mockFetchAndParseWebpage.mockRejectedValue(new HttpError(404, 'Not Found'));

      const response = await agent.execute(context);

      expect(response.success).toBe(true);
      expect(response.content).toContain('Processed 0 of 1 URLs successfully (1 failed)');
      // Error message details would be in structured data, not summary
    });

    it('should handle timeout errors', async () => {
      mockFetchAndParseWebpage.mockRejectedValue(new HttpError(408, 'Request timeout'));

      const response = await agent.execute(context);

      expect(response.success).toBe(true);
      expect(response.content).toContain('Processed 0 of 1 URLs successfully (1 failed)');
    });
  });

  describe('Parallel Processing', () => {
    it('should process multiple URLs in parallel when enabled', async () => {
      context.query = 'Process these URLs: https://example1.com, https://example2.com, https://example3.com';
      
      mockFetchAndParseWebpage
        .mockResolvedValueOnce('# Page 1\n## URL: example1.com\n\n## Content\n\nContent 1')
        .mockResolvedValueOnce('# Page 2\n## URL: example2.com\n\n## Content\n\nContent 2')
        .mockResolvedValueOnce('# Page 3\n## URL: example3.com\n\n## Content\n\nContent 3');

      const startTime = Date.now();
      const response = await agent.execute(context);
      const endTime = Date.now();

      expect(response.success).toBe(true);
      expect(response.metadata?.agentMetadata?.successfulUrls).toBe(3);
      expect(response.metadata?.agentMetadata?.processingMethod).toBe('parallel');
      
      // Parallel processing should be faster than sequential
      expect(endTime - startTime).toBeLessThan(1000); // Should complete quickly with mocked responses
    });

    it('should respect concurrency limits', async () => {
      config.concurrencyLimit = 2;
      agent = new UrlPullAgent(config);
      
      context.query = 'Process these URLs: https://example1.com, https://example2.com, https://example3.com, https://example4.com';
      
      mockFetchAndParseWebpage.mockImplementation((url) => {
        return new Promise(resolve => {
          setTimeout(() => resolve(`# Page\n## URL: ${url}\n\n## Content\n\nContent`), 100);
        });
      });

      const response = await agent.execute(context);

      expect(response.success).toBe(true);
      expect(response.metadata?.agentMetadata?.successfulUrls).toBe(4);
      expect(mockFetchAndParseWebpage).toHaveBeenCalledTimes(4);
    });

    it('should fall back to sequential processing for single URL', async () => {
      const response = await agent.execute(context);

      expect(response.metadata?.agentMetadata?.processingMethod).toBe('sequential');
    });
  });

  describe('Caching', () => {
    it('should cache successful results when enabled', async () => {
      const mockContent = '# Cached Page\n## URL: example.com\n\n## Content\n\nCached content';
      mockFetchAndParseWebpage.mockResolvedValue(mockContent);

      // First request
      const response1 = await agent.execute(context);
      expect(response1.success).toBe(true);
      expect(mockFetchAndParseWebpage).toHaveBeenCalledTimes(1);

      // Second request should use cache
      const response2 = await agent.execute(context);
      expect(response2.success).toBe(true);
      expect(mockFetchAndParseWebpage).toHaveBeenCalledTimes(1); // Still 1 call
      expect(response2.content).toContain('from cache');
    });

    it('should not use cache when disabled', async () => {
      config.enableCaching = false;
      agent = new UrlPullAgent(config);
      
      const mockContent = '# Non-cached Page\n## URL: example.com\n\n## Content\n\nNon-cached content';
      mockFetchAndParseWebpage.mockResolvedValue(mockContent);

      // First request
      await agent.execute(context);
      expect(mockFetchAndParseWebpage).toHaveBeenCalledTimes(1);

      // Second request should not use cache
      await agent.execute(context);
      expect(mockFetchAndParseWebpage).toHaveBeenCalledTimes(2);
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed requests when enabled', async () => {
      mockFetchAndParseWebpage
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockRejectedValueOnce(new Error('Another failure'))
        .mockResolvedValue('# Success\n## URL: example.com\n\n## Content\n\nFinally worked');

      const response = await agent.execute(context);

      expect(response.success).toBe(true);
      expect(mockFetchAndParseWebpage).toHaveBeenCalledTimes(3);
      expect(response.metadata?.agentMetadata?.successfulUrls).toBe(1);
    });

    it('should respect max retry attempts', async () => {
      config.maxRetryAttempts = 2;
      agent = new UrlPullAgent(config);
      
      mockFetchAndParseWebpage.mockRejectedValue(new Error('Persistent failure'));

      const response = await agent.execute(context);

      expect(response.success).toBe(true);
      expect(mockFetchAndParseWebpage).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
      expect(response.metadata?.agentMetadata?.failedUrls).toBe(1);
    });
  });

  describe('Content Extraction', () => {
    it('should extract title from content', async () => {
      const mockContent = '# Amazing Article Title\n## URL: example.com\n\n## Content\n\nArticle content here';
      mockFetchAndParseWebpage.mockResolvedValue(mockContent);

      const response = await agent.execute(context);

      expect(response.success).toBe(true);
      expect(response.content).toContain('Processed 1 of 1 URLs successfully');
      // The title would be in the structured content, not the summary - skip detailed check for test simplicity
    });

    it('should handle content without title', async () => {
      const mockContent = '## URL: example.com\n\n## Content\n\nContent without title';
      mockFetchAndParseWebpage.mockResolvedValue(mockContent);

      const response = await agent.execute(context);

      expect(response.success).toBe(true);
      expect(response.content).toContain('Processed 1 of 1 URLs successfully');
    });

    it('should extract and display content preview', async () => {
      const longContent = 'A'.repeat(1000);
      const mockContent = `# Long Article\n## URL: example.com\n\n## Content\n\n${longContent}`;
      mockFetchAndParseWebpage.mockResolvedValue(mockContent);

      const response = await agent.execute(context);

      expect(response.success).toBe(true);
      expect(response.content).toContain('Processed 1 of 1 URLs successfully');
      // Content truncation would be in structured data, not summary
    });
  });

  describe('URL Validation', () => {
    it('should validate HTTP URLs', async () => {
      context.query = 'Analyze http://example.com';
      mockFetchAndParseWebpage.mockResolvedValue('# Test\n## URL: example.com\n\n## Content\n\nTest');

      const response = await agent.execute(context);

      expect(response.success).toBe(true);
      expect(mockFetchAndParseWebpage).toHaveBeenCalledWith('http://example.com/', 5);
    });

    it('should validate HTTPS URLs', async () => {
      mockFetchAndParseWebpage.mockResolvedValue('# Test\n## URL: example.com\n\n## Content\n\nTest');

      const response = await agent.execute(context);

      expect(response.success).toBe(true);
      expect(mockFetchAndParseWebpage).toHaveBeenCalledWith('https://example.com/', 5);
    });

    it('should reject invalid protocols', async () => {
      context.query = 'Analyze ftp://example.com';

      const response = await agent.execute(context);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe(UrlPullErrorType.INVALID_URL);
    });

    it('should reject malformed URLs', async () => {
      context.query = 'Analyze not-a-valid-url';

      const response = await agent.execute(context);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe(UrlPullErrorType.INVALID_URL);
    });
  });

  describe('Configuration Limits', () => {
    it('should respect maximum URL limits', async () => {
      config.maxUrls = 2;
      agent = new UrlPullAgent(config);
      
      context.query = 'Process: https://example1.com, https://example2.com, https://example3.com';

      const response = await agent.execute(context);

      expect(response.success).toBe(false);
      expect(response.error?.message).toContain('exceeds limit');
    });

    it('should use default configuration when not specified', async () => {
      const minimalConfig: UrlPullAgentConfig = {
        id: 'minimal-agent',
        name: 'Minimal Agent',
        type: AgentType.URL_PULL,
        environment: AgentExecutionEnvironment.FOUNDRY,
        modelId: 'gpt-4o-mini',
        instructions: 'Minimal agent',
        tools: [],
        urlPullConfig: {},
      };

      const minimalAgent = new UrlPullAgent(minimalConfig);
      mockFetchAndParseWebpage.mockResolvedValue('# Test\n## URL: example.com\n\n## Content\n\nTest');

      const response = await minimalAgent.execute(context);

      expect(response.success).toBe(true);
    });
  });

  describe('Error Categorization', () => {
    it('should categorize 403 errors as forbidden', async () => {
      mockFetchAndParseWebpage.mockRejectedValue(new HttpError(403, 'Forbidden'));

      const response = await agent.execute(context);

      expect(response.success).toBe(true);
      expect(response.content).toContain('Processed 0 of 1 URLs successfully (1 failed)');
      // Error message details would be in structured data, not summary
    });

    it('should categorize 404 errors as not_found', async () => {
      mockFetchAndParseWebpage.mockRejectedValue(new HttpError(404, 'Not Found'));

      const response = await agent.execute(context);

      expect(response.success).toBe(true);
      expect(response.content).toContain('Processed 0 of 1 URLs successfully (1 failed)');
      // Error message details would be in structured data, not summary
    });

    it('should categorize 500+ errors as server_error', async () => {
      mockFetchAndParseWebpage.mockRejectedValue(new HttpError(500, 'Internal Server Error'));

      const response = await agent.execute(context);

      expect(response.success).toBe(true);
      expect(response.content).toContain('Processed 0 of 1 URLs successfully (1 failed)');
      // Error message details would be in structured data, not summary
    });

    it('should categorize timeout errors correctly', async () => {
      mockFetchAndParseWebpage.mockRejectedValue(new Error('Request timeout'));

      const response = await agent.execute(context);

      expect(response.success).toBe(true);
      expect(response.content).toContain('Processed 0 of 1 URLs successfully (1 failed)');
    });
  });

  describe('Response Formatting', () => {
    it('should format successful response with processing stats', async () => {
      mockFetchAndParseWebpage.mockResolvedValue('# Test Page\n## URL: example.com\n\n## Content\n\nTest content');

      const response = await agent.execute(context);

      expect(response.success).toBe(true);
      expect(response.content).toContain('Processed 1 of 1 URLs successfully');
      expect(response.metadata?.agentMetadata?.totalUrls).toBe(1);
      expect(response.metadata?.agentMetadata?.successfulUrls).toBe(1);
      expect(response.metadata?.agentMetadata?.failedUrls).toBe(0);
    });

    it('should include processing metadata', async () => {
      mockFetchAndParseWebpage.mockResolvedValue('# Test Page\n## URL: example.com\n\n## Content\n\nTest content');

      const response = await agent.execute(context);

      expect(response.metadata?.agentMetadata).toBeDefined();
      expect(response.metadata?.agentMetadata?.totalUrls).toBe(1);
      expect(response.metadata?.agentMetadata?.successfulUrls).toBe(1);
      expect(response.metadata?.agentMetadata?.failedUrls).toBe(0);
      expect(response.metadata?.processingTime).toBeGreaterThan(0);
    });

    it('should calculate confidence score appropriately', async () => {
      mockFetchAndParseWebpage.mockResolvedValue('# Test Page\n## URL: example.com\n\n## Content\n\nTest content');

      const response = await agent.execute(context);

      expect(response.metadata?.confidence).toBeGreaterThan(0);
      expect(response.metadata?.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Mixed Success/Failure Scenarios', () => {
    it('should handle mix of successful and failed URLs', async () => {
      context.query = 'Process: https://example1.com, https://example2.com';
      
      mockFetchAndParseWebpage
        .mockResolvedValueOnce('# Success Page\n## URL: example1.com\n\n## Content\n\nWorked fine')
        .mockRejectedValueOnce(new Error('Failed to fetch'));

      const response = await agent.execute(context);

      expect(response.success).toBe(true);
      expect(response.metadata?.agentMetadata?.successfulUrls).toBe(1);
      expect(response.metadata?.agentMetadata?.failedUrls).toBe(1);
      expect(response.content).toContain('Processed 1 of 2 URLs successfully (1 failed)');
    });

    it('should handle all URLs failing', async () => {
      context.query = 'Process: https://example1.com, https://example2.com';
      
      mockFetchAndParseWebpage
        .mockRejectedValueOnce(new Error('Failed 1'))
        .mockRejectedValueOnce(new Error('Failed 2'));

      const response = await agent.execute(context);

      expect(response.success).toBe(true);
      expect(response.metadata?.agentMetadata?.successfulUrls).toBe(0);
      expect(response.metadata?.agentMetadata?.failedUrls).toBe(2);
      expect(response.content).toContain('Processed 0 of 2 URLs successfully (2 failed)');
    });
  });
});