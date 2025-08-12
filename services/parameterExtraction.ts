import { AgentType } from '@/types/agent';
import {
  IntentAnalysisContext,
  IntentClassificationResponse,
  ParameterExtractionConfig,
} from '@/types/intentAnalysis';

import { AzureMonitorLoggingService } from './loggingService';

/**
 * Parameter extraction configuration for different agent types
 */
const DEFAULT_PARAMETER_CONFIG: ParameterExtractionConfig = {
  [AgentType.WEB_SEARCH]: {
    queryKeywords: [
      'search',
      'find',
      'look up',
      'google',
      'research',
      'investigate',
      'what is',
      'who is',
      'where is',
      'when did',
      'how to',
      'why does',
    ],
    freshnessIndicators: {
      today: 'day',
      now: 'day',
      current: 'day',
      live: 'day',
      recent: 'week',
      latest: 'week',
      'this week': 'week',
      'last week': 'week',
      'this month': 'month',
      monthly: 'month',
      yearly: 'year',
      annual: 'year',
    },
    countIndicators: [
      'top 5',
      'first 10',
      'best 3',
      'top 10',
      'first 5',
      'show me 5',
      'give me 3',
      'list 10',
      'find 5',
    ],
    marketIndicators: {
      us: 'en-US',
      usa: 'en-US',
      'united states': 'en-US',
      uk: 'en-GB',
      britain: 'en-GB',
      canada: 'en-CA',
      australia: 'en-AU',
      france: 'fr-FR',
      germany: 'de-DE',
      spain: 'es-ES',
      italy: 'it-IT',
      japan: 'ja-JP',
      china: 'zh-CN',
    },
  },
  [AgentType.CODE_INTERPRETER]: {
    languageIndicators: {
      python: 'python',
      py: 'python',
      javascript: 'javascript',
      js: 'javascript',
      typescript: 'typescript',
      ts: 'typescript',
      bash: 'bash',
      shell: 'bash',
      sh: 'bash',
      sql: 'sql',
      r: 'r',
      java: 'java',
      'c++': 'cpp',
      cpp: 'cpp',
      go: 'go',
      rust: 'rust',
    },
    libraryIndicators: {
      pandas: ['pandas', 'numpy', 'matplotlib'],
      numpy: ['numpy', 'scipy'],
      matplotlib: ['matplotlib', 'seaborn'],
      react: ['react', 'jsx', 'tsx'],
      node: ['nodejs', 'express', 'npm'],
      tensorflow: ['tensorflow', 'keras'],
      pytorch: ['pytorch', 'torch'],
      scikit: ['scikit-learn', 'sklearn'],
      opencv: ['opencv', 'cv2'],
    },
    fileUploadIndicators: [
      'upload',
      'file',
      'csv',
      'json',
      'data',
      'dataset',
      'spreadsheet',
      'excel',
      'txt',
      'log',
      'image',
      'picture',
    ],
  },
  [AgentType.URL_PULL]: {
    urlPatterns: [
      /https?:\/\/[^\s]+/g,
      /www\.[^\s]+/g,
      /[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/g,
    ],
    analysisTypeIndicators: {
      content: 'content',
      text: 'content',
      article: 'content',
      metadata: 'metadata',
      meta: 'metadata',
      seo: 'metadata',
      full: 'full',
      complete: 'full',
      everything: 'full',
    },
  },
  [AgentType.LOCAL_KNOWLEDGE]: {
    companyKeywords: [
      'company',
      'our',
      'internal',
      'organization',
      'org',
      'corporate',
      'business',
      'enterprise',
      'firm',
    ],
    internalTopics: [
      'policy',
      'procedure',
      'guideline',
      'handbook',
      'manual',
      'process',
      'workflow',
      'protocol',
      'standard',
      'rule',
    ],
    knowledgeBaseIndicators: [
      'documentation',
      'docs',
      'wiki',
      'knowledge base',
      'help center',
      'support',
      'faq',
      'guide',
      'tutorial',
    ],
  },
  [AgentType.THIRD_PARTY]: {
    serviceIndicators: {
      github: 'github',
      git: 'github',
      repository: 'github',
      repo: 'github',
      slack: 'slack',
      teams: 'teams',
      discord: 'discord',
      jira: 'jira',
      atlassian: 'jira',
      salesforce: 'salesforce',
      crm: 'salesforce',
      calendar: 'calendar',
      'google calendar': 'calendar',
      outlook: 'calendar',
      email: 'email',
      gmail: 'email',
      mail: 'email',
    },
    endpointPatterns: {
      issues: '/issues',
      'pull requests': '/pulls',
      repositories: '/repos',
      channels: '/channels',
      messages: '/messages',
      users: '/users',
      projects: '/projects',
    },
  },
};

/**
 * Extracted parameter structures for different agent types
 */
interface ExtractedWebSearchParams {
  query: string;
  freshness?: 'day' | 'week' | 'month' | 'year';
  count?: number;
  market?: string;
  category?: 'news' | 'academic' | 'shopping' | 'images' | 'videos' | 'general';
}

interface ExtractedCodeParams {
  language?: string;
  libraries?: string[];
  file_upload?: boolean;
  execution_type?:
    | 'analysis'
    | 'visualization'
    | 'calculation'
    | 'debugging'
    | 'tutorial';
}

interface ExtractedUrlParams {
  urls: string[];
  analysis_type: 'content' | 'metadata' | 'full' | 'comparison' | 'extraction';
  output_format?: 'summary' | 'detailed' | 'structured' | 'raw';
}

interface ExtractedLocalKnowledgeParams {
  topics: string[];
  keywords: string[];
  category?:
    | 'policy'
    | 'procedure'
    | 'contact'
    | 'product'
    | 'training'
    | 'general';
  department?: string;
}

interface ExtractedThirdPartyParams {
  service: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'list' | 'search';
  endpoint?: string;
  parameters?: Record<string, any>;
}

/**
 * Parameter Extraction Engine
 * Extracts and processes agent-specific parameters from user queries
 */
export class ParameterExtractionEngine {
  private static instance: ParameterExtractionEngine | null = null;
  private logger: AzureMonitorLoggingService;
  private config: ParameterExtractionConfig;

  private constructor(config?: Partial<ParameterExtractionConfig>) {
    const loggingService = AzureMonitorLoggingService.getInstance();
    if (!loggingService) {
      throw new Error('Failed to initialize Azure Monitor Logging Service');
    }
    this.logger = loggingService;
    this.config = { ...DEFAULT_PARAMETER_CONFIG, ...config };
  }

  /**
   * Singleton pattern - get or create engine instance
   */
  public static getInstance(
    config?: Partial<ParameterExtractionConfig>,
  ): ParameterExtractionEngine {
    if (!ParameterExtractionEngine.instance) {
      ParameterExtractionEngine.instance = new ParameterExtractionEngine(
        config,
      );
    }
    return ParameterExtractionEngine.instance;
  }

  /**
   * Extract parameters for a specific agent type from user query
   */
  public extractParameters(
    agentType: AgentType,
    query: string,
    context?: IntentAnalysisContext,
    aiParameters?: any,
  ): Record<string, any> {
    try {
      const startTime = Date.now();

      // Start with AI-extracted parameters if available
      let extractedParams = this.processAIParameters(agentType, aiParameters);

      // Enhance with rule-based extraction
      const ruleBasedParams = this.extractRuleBasedParameters(
        agentType,
        query,
        context,
      );
      extractedParams = { ...extractedParams, ...ruleBasedParams };

      // Apply post-processing and validation
      extractedParams = this.postProcessParameters(
        agentType,
        extractedParams,
        query,
      );

      const processingTime = Date.now() - startTime;

      console.log('[INFO] Parameter extraction completed', {
        agentType,
        processingTime,
        parameterCount: Object.keys(extractedParams).length,
        query: query.substring(0, 100),
      });

      return extractedParams;
    } catch (error) {
      console.error('[ERROR] Parameter extraction failed', error, {
        agentType,
        query: query.substring(0, 100),
      });
      return {};
    }
  }

  /**
   * Extract parameters from AI classification response
   */
  public extractFromAIResponse(
    agentType: AgentType,
    aiResponse: IntentClassificationResponse,
    context?: IntentAnalysisContext,
  ): Record<string, any> {
    const agentKey = agentType.toLowerCase().replace('_', '');
    const aiParams =
      aiResponse.parameters?.[agentKey as keyof typeof aiResponse.parameters] ||
      aiResponse.parameters ||
      {};

    return this.extractParameters(
      agentType,
      context?.query || '',
      context,
      aiParams,
    );
  }

  /**
   * Validate extracted parameters for an agent type
   */
  public validateParameters(
    agentType: AgentType,
    parameters: Record<string, any>,
  ): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    sanitizedParameters: Record<string, any>;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const sanitizedParameters = { ...parameters };

    try {
      switch (agentType) {
        case AgentType.WEB_SEARCH:
          this.validateWebSearchParams(sanitizedParameters, errors, warnings);
          break;
        case AgentType.CODE_INTERPRETER:
          this.validateCodeParams(sanitizedParameters, errors, warnings);
          break;
        case AgentType.URL_PULL:
          this.validateUrlParams(sanitizedParameters, errors, warnings);
          break;
        case AgentType.LOCAL_KNOWLEDGE:
          this.validateLocalKnowledgeParams(
            sanitizedParameters,
            errors,
            warnings,
          );
          break;
        case AgentType.THIRD_PARTY:
          this.validateThirdPartyParams(sanitizedParameters, errors, warnings);
          break;
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        sanitizedParameters,
      };
    } catch (error) {
      console.error('[ERROR] Parameter validation failed', error, {
        agentType,
        parameters: JSON.stringify(parameters),
      });

      return {
        valid: false,
        errors: [
          `Validation error: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ],
        warnings,
        sanitizedParameters: parameters,
      };
    }
  }

  /**
   * Get default parameters for an agent type
   */
  public getDefaultParameters(
    agentType: AgentType,
    query?: string,
  ): Record<string, any> {
    const defaults: Record<AgentType, Record<string, any>> = {
      [AgentType.WEB_SEARCH]: {
        query: query || '',
        freshness: 'week',
        count: 10,
        market: 'en-US',
        category: 'general',
      },
      [AgentType.CODE_INTERPRETER]: {
        language: 'python',
        libraries: [],
        file_upload: false,
        execution_type: 'analysis',
      },
      [AgentType.URL_PULL]: {
        urls: [],
        analysis_type: 'content',
        output_format: 'summary',
      },
      [AgentType.LOCAL_KNOWLEDGE]: {
        topics: [],
        keywords: [],
        category: 'general',
      },
      [AgentType.THIRD_PARTY]: {
        service: 'custom',
        action: 'read',
        parameters: {},
      },
      [AgentType.STANDARD_CHAT]: {},
      [AgentType.FOUNDRY]: {},
      [AgentType.TRANSLATION]: {
        sourceLanguage: '',
        targetLanguage: query?.includes(' to ') ? query.split(' to ')[1]?.split(' ')[0] || '' : '',
        text: query || '',
        enableLanguageDetection: true,
        enableCaching: true,
      },
    };

    return defaults[agentType] || {};
  }

  /**
   * Private helper methods
   */

  private processAIParameters(
    agentType: AgentType,
    aiParameters: any,
  ): Record<string, any> {
    if (!aiParameters) return {};

    // AI parameters might be nested under agent type key
    const agentKey = agentType.toLowerCase().replace('_', '');
    const params = aiParameters[agentKey] || aiParameters;

    // Normalize and clean AI parameters
    const processed: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined && value !== '') {
        processed[key] = value;
      }
    }

    return processed;
  }

  private extractRuleBasedParameters(
    agentType: AgentType,
    query: string,
    context?: IntentAnalysisContext,
  ): Record<string, any> {
    switch (agentType) {
      case AgentType.WEB_SEARCH:
        return this.extractWebSearchParams(query, context);
      case AgentType.CODE_INTERPRETER:
        return this.extractCodeParams(query, context);
      case AgentType.URL_PULL:
        return this.extractUrlParams(query, context);
      case AgentType.LOCAL_KNOWLEDGE:
        return this.extractLocalKnowledgeParams(query, context);
      case AgentType.THIRD_PARTY:
        return this.extractThirdPartyParams(query, context);
      default:
        return {};
    }
  }

  private extractWebSearchParams(
    query: string,
    context?: IntentAnalysisContext,
  ): ExtractedWebSearchParams {
    const params: ExtractedWebSearchParams = {
      query: this.cleanSearchQuery(query),
    };

    // Extract freshness
    const queryLower = query.toLowerCase();
    for (const [indicator, freshness] of Object.entries(
      this.config[AgentType.WEB_SEARCH]?.freshnessIndicators || {},
    )) {
      if (queryLower.includes(indicator)) {
        params.freshness = freshness;
        break;
      }
    }

    // Extract count
    for (const countIndicator of this.config[AgentType.WEB_SEARCH]
      ?.countIndicators || []) {
      if (queryLower.includes(countIndicator)) {
        const match = countIndicator.match(/\d+/);
        if (match) {
          params.count = parseInt(match[0], 10);
          break;
        }
      }
    }

    // Extract market/locale
    for (const [indicator, market] of Object.entries(
      this.config[AgentType.WEB_SEARCH]?.marketIndicators || {},
    )) {
      if (queryLower.includes(indicator)) {
        params.market = market;
        break;
      }
    }

    // Determine category
    params.category = this.determineSearchCategory(query);

    return params;
  }

  private extractCodeParams(
    query: string,
    context?: IntentAnalysisContext,
  ): ExtractedCodeParams {
    const params: ExtractedCodeParams = {};

    // Extract language
    const queryLower = query.toLowerCase();
    for (const [indicator, language] of Object.entries(
      this.config[AgentType.CODE_INTERPRETER]?.languageIndicators || {},
    )) {
      if (queryLower.includes(indicator)) {
        params.language = language;
        break;
      }
    }

    // Extract libraries
    const libraries: string[] = [];
    for (const [indicator, libs] of Object.entries(
      this.config[AgentType.CODE_INTERPRETER]?.libraryIndicators || {},
    )) {
      if (queryLower.includes(indicator)) {
        libraries.push(...libs);
      }
    }
    if (libraries.length > 0) {
      params.libraries = [...new Set(libraries)];
    }

    // Check for file upload indication
    const fileIndicators =
      this.config[AgentType.CODE_INTERPRETER]?.fileUploadIndicators || [];
    params.file_upload = fileIndicators.some((indicator) =>
      queryLower.includes(indicator),
    );

    // Determine execution type
    params.execution_type = this.determineExecutionType(query);

    return params;
  }

  private extractUrlParams(
    query: string,
    context?: IntentAnalysisContext,
  ): ExtractedUrlParams {
    const params: ExtractedUrlParams = {
      urls: [],
      analysis_type: 'content',
    };

    // Extract URLs
    for (const pattern of this.config[AgentType.URL_PULL]?.urlPatterns || []) {
      const matches = query.match(pattern);
      if (matches) {
        params.urls.push(...matches);
      }
    }

    // Remove duplicates and clean URLs
    params.urls = [...new Set(params.urls)].map((url) => this.cleanUrl(url));

    // Extract analysis type
    const queryLower = query.toLowerCase();
    for (const [indicator, type] of Object.entries(
      this.config[AgentType.URL_PULL]?.analysisTypeIndicators || {},
    )) {
      if (queryLower.includes(indicator)) {
        params.analysis_type = type as any;
        break;
      }
    }

    // Determine output format
    if (queryLower.includes('summary') || queryLower.includes('brief')) {
      params.output_format = 'summary';
    } else if (
      queryLower.includes('detailed') ||
      queryLower.includes('complete')
    ) {
      params.output_format = 'detailed';
    } else if (
      queryLower.includes('json') ||
      queryLower.includes('structured')
    ) {
      params.output_format = 'structured';
    }

    return params;
  }

  private extractLocalKnowledgeParams(
    query: string,
    context?: IntentAnalysisContext,
  ): ExtractedLocalKnowledgeParams {
    const params: ExtractedLocalKnowledgeParams = {
      topics: [],
      keywords: [],
    };

    const queryLower = query.toLowerCase();

    // Extract topics
    const topics: string[] = [];
    for (const topic of this.config[AgentType.LOCAL_KNOWLEDGE]
      ?.internalTopics || []) {
      if (queryLower.includes(topic)) {
        topics.push(topic);
      }
    }
    params.topics = topics;

    // Extract keywords
    const words = query.split(/\s+/).filter((word) => word.length > 2);
    params.keywords = words.slice(0, 10); // Limit to 10 keywords

    // Determine category
    if (queryLower.includes('policy') || queryLower.includes('rule')) {
      params.category = 'policy';
    } else if (
      queryLower.includes('procedure') ||
      queryLower.includes('process')
    ) {
      params.category = 'procedure';
    } else if (
      queryLower.includes('contact') ||
      queryLower.includes('phone') ||
      queryLower.includes('email')
    ) {
      params.category = 'contact';
    } else if (
      queryLower.includes('product') ||
      queryLower.includes('service')
    ) {
      params.category = 'product';
    } else if (
      queryLower.includes('training') ||
      queryLower.includes('tutorial')
    ) {
      params.category = 'training';
    }

    // Extract department
    const departments = [
      'hr',
      'engineering',
      'sales',
      'marketing',
      'finance',
      'legal',
      'it',
      'support',
    ];
    for (const dept of departments) {
      if (queryLower.includes(dept)) {
        params.department = dept;
        break;
      }
    }

    return params;
  }

  private extractThirdPartyParams(
    query: string,
    context?: IntentAnalysisContext,
  ): ExtractedThirdPartyParams {
    const params: ExtractedThirdPartyParams = {
      service: 'custom',
      action: 'read',
    };

    const queryLower = query.toLowerCase();

    // Extract service
    for (const [indicator, service] of Object.entries(
      this.config[AgentType.THIRD_PARTY]?.serviceIndicators || {},
    )) {
      if (queryLower.includes(indicator)) {
        params.service = service;
        break;
      }
    }

    // Extract action
    if (
      queryLower.includes('create') ||
      queryLower.includes('make') ||
      queryLower.includes('add')
    ) {
      params.action = 'create';
    } else if (
      queryLower.includes('update') ||
      queryLower.includes('edit') ||
      queryLower.includes('modify')
    ) {
      params.action = 'update';
    } else if (queryLower.includes('delete') || queryLower.includes('remove')) {
      params.action = 'delete';
    } else if (queryLower.includes('list') || queryLower.includes('show all')) {
      params.action = 'list';
    } else if (queryLower.includes('search') || queryLower.includes('find')) {
      params.action = 'search';
    }

    // Extract endpoint
    for (const [indicator, endpoint] of Object.entries(
      this.config[AgentType.THIRD_PARTY]?.endpointPatterns || {},
    )) {
      if (queryLower.includes(indicator)) {
        params.endpoint = endpoint;
        break;
      }
    }

    return params;
  }

  private postProcessParameters(
    agentType: AgentType,
    parameters: Record<string, any>,
    query: string,
  ): Record<string, any> {
    const processed = { ...parameters };

    switch (agentType) {
      case AgentType.WEB_SEARCH:
        // Ensure query is present
        if (!processed.query || processed.query.trim() === '') {
          processed.query = query;
        }
        // Set default freshness if not specified and query seems time-sensitive
        if (!processed.freshness && this.isTimeSensitive(query)) {
          processed.freshness = 'day';
        }
        break;

      case AgentType.CODE_INTERPRETER:
        // Set default language if not detected
        if (!processed.language) {
          processed.language = this.inferLanguageFromContext(query);
        }
        break;

      case AgentType.URL_PULL:
        // Ensure URLs are valid
        if (processed.urls) {
          processed.urls = processed.urls.filter((url: string) =>
            this.isValidUrl(url),
          );
        }
        break;
    }

    return processed;
  }

  private cleanSearchQuery(query: string): string {
    // Remove common command words and clean the query
    const cleanedQuery = query
      .replace(/\b(search for|find|look up|google|research)\b/gi, '')
      .replace(/\b(show me|tell me|give me)\b/gi, '')
      .trim();

    return cleanedQuery || query;
  }

  private determineSearchCategory(
    query: string,
  ): 'news' | 'academic' | 'shopping' | 'images' | 'videos' | 'general' {
    const queryLower = query.toLowerCase();

    if (
      queryLower.includes('news') ||
      queryLower.includes('breaking') ||
      queryLower.includes('headline')
    ) {
      return 'news';
    }
    if (
      queryLower.includes('research') ||
      queryLower.includes('study') ||
      queryLower.includes('paper')
    ) {
      return 'academic';
    }
    if (
      queryLower.includes('buy') ||
      queryLower.includes('price') ||
      queryLower.includes('shop')
    ) {
      return 'shopping';
    }
    if (
      queryLower.includes('image') ||
      queryLower.includes('picture') ||
      queryLower.includes('photo')
    ) {
      return 'images';
    }
    if (
      queryLower.includes('video') ||
      queryLower.includes('watch') ||
      queryLower.includes('clip')
    ) {
      return 'videos';
    }

    return 'general';
  }

  private determineExecutionType(
    query: string,
  ): 'analysis' | 'visualization' | 'calculation' | 'debugging' | 'tutorial' {
    const queryLower = query.toLowerCase();

    if (
      queryLower.includes('debug') ||
      queryLower.includes('error') ||
      queryLower.includes('fix')
    ) {
      return 'debugging';
    }
    if (
      queryLower.includes('plot') ||
      queryLower.includes('chart') ||
      queryLower.includes('graph') ||
      queryLower.includes('visualize')
    ) {
      return 'visualization';
    }
    if (
      queryLower.includes('calculate') ||
      queryLower.includes('compute') ||
      queryLower.includes('math')
    ) {
      return 'calculation';
    }
    if (
      queryLower.includes('tutorial') ||
      queryLower.includes('learn') ||
      queryLower.includes('example')
    ) {
      return 'tutorial';
    }

    return 'analysis';
  }

  private cleanUrl(url: string): string {
    // Ensure URL has protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      if (url.startsWith('www.')) {
        url = 'https://' + url;
      } else if (url.includes('.')) {
        url = 'https://' + url;
      }
    }

    return url.trim();
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isTimeSensitive(query: string): boolean {
    const timeSensitiveWords = [
      'today',
      'now',
      'current',
      'latest',
      'recent',
      'breaking',
      'live',
      'real-time',
    ];
    const queryLower = query.toLowerCase();
    return timeSensitiveWords.some((word) => queryLower.includes(word));
  }

  private inferLanguageFromContext(query: string): string {
    // Simple language inference based on patterns
    if (
      query.includes('def ') ||
      query.includes('import ') ||
      query.includes('print(')
    ) {
      return 'python';
    }
    if (
      query.includes('function ') ||
      query.includes('console.log') ||
      query.includes('const ')
    ) {
      return 'javascript';
    }
    if (
      query.includes('interface ') ||
      query.includes(': string') ||
      query.includes(': number')
    ) {
      return 'typescript';
    }
    if (
      query.includes('echo ') ||
      query.includes('ls ') ||
      query.includes('grep ')
    ) {
      return 'bash';
    }

    return 'python'; // Default
  }

  private validateWebSearchParams(
    params: Record<string, any>,
    errors: string[],
    warnings: string[],
  ): void {
    if (
      !params.query ||
      typeof params.query !== 'string' ||
      params.query.trim() === ''
    ) {
      errors.push('Search query is required and must be a non-empty string');
    }

    if (
      params.freshness &&
      !['day', 'week', 'month', 'year'].includes(params.freshness)
    ) {
      errors.push('Freshness must be one of: day, week, month, year');
    }

    if (
      params.count &&
      (typeof params.count !== 'number' ||
        params.count < 1 ||
        params.count > 50)
    ) {
      warnings.push('Count should be between 1 and 50');
      params.count = Math.max(1, Math.min(50, params.count || 10));
    }
  }

  private validateCodeParams(
    params: Record<string, any>,
    errors: string[],
    warnings: string[],
  ): void {
    const supportedLanguages = [
      'python',
      'javascript',
      'typescript',
      'bash',
      'sql',
      'r',
    ];
    if (params.language && !supportedLanguages.includes(params.language)) {
      warnings.push(`Language ${params.language} may not be fully supported`);
    }

    if (params.libraries && !Array.isArray(params.libraries)) {
      errors.push('Libraries must be an array of strings');
    }
  }

  private validateUrlParams(
    params: Record<string, any>,
    errors: string[],
    warnings: string[],
  ): void {
    if (
      !params.urls ||
      !Array.isArray(params.urls) ||
      params.urls.length === 0
    ) {
      errors.push('At least one URL is required');
    } else {
      for (const url of params.urls) {
        if (!this.isValidUrl(url)) {
          errors.push(`Invalid URL: ${url}`);
        }
      }
    }

    if (
      params.analysis_type &&
      !['content', 'metadata', 'full', 'comparison', 'extraction'].includes(
        params.analysis_type,
      )
    ) {
      errors.push(
        'Analysis type must be one of: content, metadata, full, comparison, extraction',
      );
    }
  }

  private validateLocalKnowledgeParams(
    params: Record<string, any>,
    errors: string[],
    warnings: string[],
  ): void {
    if (params.topics && !Array.isArray(params.topics)) {
      errors.push('Topics must be an array of strings');
    }

    if (params.keywords && !Array.isArray(params.keywords)) {
      errors.push('Keywords must be an array of strings');
    }

    if (
      (!params.topics || params.topics.length === 0) &&
      (!params.keywords || params.keywords.length === 0)
    ) {
      warnings.push(
        'No topics or keywords specified - search may be too broad',
      );
    }
  }

  private validateThirdPartyParams(
    params: Record<string, any>,
    errors: string[],
    warnings: string[],
  ): void {
    if (!params.service || typeof params.service !== 'string') {
      errors.push('Service name is required');
    }

    if (
      !params.action ||
      !['create', 'read', 'update', 'delete', 'list', 'search'].includes(
        params.action,
      )
    ) {
      errors.push(
        'Action must be one of: create, read, update, delete, list, search',
      );
    }
  }
}

/**
 * Convenience function to get the singleton engine instance
 */
export function getParameterExtractionEngine(
  config?: Partial<ParameterExtractionConfig>,
): ParameterExtractionEngine {
  return ParameterExtractionEngine.getInstance(config);
}

/**
 * Convenience function to extract parameters
 */
export function extractAgentParameters(
  agentType: AgentType,
  query: string,
  context?: IntentAnalysisContext,
  aiParameters?: any,
): Record<string, any> {
  const engine = getParameterExtractionEngine();
  return engine.extractParameters(agentType, query, context, aiParameters);
}
