import { AgentType } from './agent';

/**
 * Intent analysis result containing the recommended agent and confidence
 */
export interface IntentAnalysisResult {
  /** Primary recommended agent type */
  recommendedAgent: AgentType;
  /** Confidence score (0-1) for the recommendation */
  confidence: number;
  /** Alternative agent suggestions with their confidence scores */
  alternatives: Array<{
    agent: AgentType;
    confidence: number;
    reasoning: string;
  }>;
  /** Extracted parameters for the recommended agent */
  parameters: Record<string, any>;
  /** Reasoning for the primary recommendation */
  reasoning: string;
  /** Analysis method used (AI, heuristic, or hybrid) */
  analysisMethod: 'ai' | 'heuristic' | 'hybrid';
  /** Processing time in milliseconds */
  processingTime: number;
  /** Locale used for analysis */
  locale: string;
}

/**
 * AI classification response from the structured response system
 */
export interface IntentClassificationResponse {
  /** Primary agent type recommendation */
  agent_type: string;
  /** Confidence score for the primary recommendation */
  confidence: number;
  /** Reasoning for the recommendation */
  reasoning: string;
  /** Alternative agent suggestions */
  alternatives: Array<{
    agent_type: string;
    confidence: number;
    reasoning: string;
  }>;
  /** Extracted parameters for the agents */
  parameters: {
    web_search?: {
      query: string;
      freshness?: 'day' | 'week' | 'month' | 'year';
      count?: number;
      market?: string;
    };
    code_interpreter?: {
      language?: string;
      libraries?: string[];
      file_upload?: boolean;
    };
    url_analysis?: {
      urls: string[];
      analysis_type: 'content' | 'metadata' | 'full';
    };
    local_knowledge?: {
      topics: string[];
      keywords: string[];
    };
    third_party?: {
      service: string;
      endpoint?: string;
      parameters?: Record<string, any>;
    };
  };
  /** Detected user intent categories */
  intent_categories: string[];
  /** Query complexity assessment */
  complexity: 'simple' | 'moderate' | 'complex';
  /** Temporal aspects of the query */
  temporal_context?: {
    time_sensitive: boolean;
    time_range?: string;
    urgency?: 'low' | 'medium' | 'high';
  };
}

/**
 * Heuristic analysis result
 */
export interface HeuristicAnalysisResult {
  /** Detected agent type */
  agentType: AgentType;
  /** Confidence score */
  confidence: number;
  /** Matched patterns or keywords */
  matchedPatterns: string[];
  /** Analysis method used */
  method:
    | 'url_detection'
    | 'code_detection'
    | 'time_detection'
    | 'keyword_detection'
    | 'default';
  /** Extracted parameters */
  parameters: Record<string, any>;
}

/**
 * Parameter extraction configuration for different agent types
 */
export interface ParameterExtractionConfig {
  [AgentType.WEB_SEARCH]: {
    queryKeywords: string[];
    freshnessIndicators: Record<string, 'day' | 'week' | 'month' | 'year'>;
    countIndicators: string[];
    marketIndicators: Record<string, string>;
  };
  [AgentType.CODE_INTERPRETER]: {
    languageIndicators: Record<string, string>;
    libraryIndicators: Record<string, string[]>;
    fileUploadIndicators: string[];
  };
  [AgentType.URL_PULL]: {
    urlPatterns: RegExp[];
    analysisTypeIndicators: Record<string, 'content' | 'metadata' | 'full'>;
  };
  [AgentType.LOCAL_KNOWLEDGE]: {
    companyKeywords: string[];
    internalTopics: string[];
    knowledgeBaseIndicators: string[];
  };
  [AgentType.THIRD_PARTY]: {
    serviceIndicators: Record<string, string>;
    endpointPatterns: Record<string, string>;
  };
}

/**
 * Intent analysis configuration
 */
export interface IntentAnalysisConfig {
  /** Enable AI-powered classification */
  enableAIClassification: boolean;
  /** Enable fallback heuristic analysis */
  enableHeuristicFallback: boolean;
  /** Confidence threshold for AI classification */
  aiConfidenceThreshold: number;
  /** Confidence threshold for heuristic analysis */
  heuristicConfidenceThreshold: number;
  /** Default agent type when analysis fails */
  defaultAgent: AgentType;
  /** Maximum processing time in milliseconds */
  maxProcessingTime: number;
  /** Enable caching of analysis results */
  enableCaching: boolean;
  /** Cache TTL in milliseconds */
  cacheTTL: number;
  /** Enable multi-language support */
  enableMultiLanguage: boolean;
  /** Supported locales */
  supportedLocales: string[];
  /** Parameter extraction configuration */
  parameterExtraction: Partial<ParameterExtractionConfig>;
}

/**
 * Confidence scoring weights for different factors
 */
export interface ConfidenceWeights {
  /** AI classification confidence weight */
  aiClassification: number;
  /** Heuristic pattern matching weight */
  heuristicPatterns: number;
  /** Keyword relevance weight */
  keywordRelevance: number;
  /** Historical success rate weight */
  historicalSuccess: number;
  /** Context similarity weight */
  contextSimilarity: number;
  /** User preference weight */
  userPreference: number;
}

/**
 * Intent analysis cache entry
 */
export interface IntentAnalysisCacheEntry {
  /** Cached analysis result */
  result: IntentAnalysisResult;
  /** Cache timestamp */
  timestamp: Date;
  /** Query hash used as cache key */
  queryHash: string;
  /** Context hash for validation */
  contextHash: string;
  /** Hit count for this cache entry */
  hitCount: number;
}

/**
 * Intent analysis metrics
 */
export interface IntentAnalysisMetrics {
  /** Total number of analyses performed */
  totalAnalyses: number;
  /** Successful AI classifications */
  successfulAIClassifications: number;
  /** Fallback to heuristic analyses */
  heuristicFallbacks: number;
  /** Average processing time */
  averageProcessingTime: number;
  /** Confidence score distribution */
  confidenceDistribution: Record<string, number>;
  /** Agent type distribution */
  agentTypeDistribution: Record<AgentType, number>;
  /** Cache hit rate */
  cacheHitRate: number;
  /** Error rate */
  errorRate: number;
  /** Language distribution */
  languageDistribution: Record<string, number>;
}

/**
 * Intent analysis context for processing
 */
export interface IntentAnalysisContext {
  /** User query */
  query: string;
  /** Conversation history */
  conversationHistory: string[];
  /** User locale */
  locale: string;
  /** User preferences */
  userPreferences?: {
    preferredAgents?: AgentType[];
    disabledAgents?: AgentType[];
    languagePreference?: string;
  };
  /** Additional context information */
  additionalContext?: Record<string, any>;
  /** Request timestamp */
  timestamp: Date;
  /** Session information */
  sessionInfo?: {
    sessionId: string;
    userId: string;
    previousInteractions: number;
  };
}

/**
 * Multi-language support configuration
 */
export interface MultiLanguageConfig {
  /** Default language for analysis */
  defaultLanguage: string;
  /** Language detection threshold */
  languageDetectionThreshold: number;
  /** Fallback language when detection fails */
  fallbackLanguage: string;
  /** Language-specific keyword mappings */
  languageKeywords: Record<string, Record<string, string[]>>;
  /** Language-specific prompts */
  languagePrompts: Record<string, string>;
}

/**
 * Intent monitoring and alerting configuration
 */
export interface IntentMonitoringConfig {
  /** Enable real-time monitoring */
  enableMonitoring: boolean;
  /** Metrics collection interval */
  metricsInterval: number;
  /** Alert thresholds */
  alertThresholds: {
    lowConfidenceRate: number;
    highErrorRate: number;
    slowResponseTime: number;
    cacheHitRateThreshold: number;
  };
  /** Alert handlers */
  alertHandlers: Array<{
    type: 'email' | 'webhook' | 'log';
    configuration: Record<string, any>;
  }>;
}

/**
 * Intent analysis validation result
 */
export interface IntentValidationResult {
  /** Validation success status */
  valid: boolean;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
  /** Sanitized query */
  sanitizedQuery?: string;
  /** Sanitized context */
  sanitizedContext?: IntentAnalysisContext;
}

/**
 * Intent classification schema for AI responses
 */
export interface IntentClassificationSchema {
  type: 'object';
  properties: {
    agent_type: {
      type: 'string';
      enum: string[];
      description: string;
    };
    confidence: {
      type: 'number';
      minimum: 0;
      maximum: 1;
      description: string;
    };
    reasoning: {
      type: 'string';
      description: string;
    };
    alternatives: {
      type: 'array';
      items: {
        type: 'object';
        properties: {
          agent_type: { type: 'string'; enum: string[] };
          confidence: { type: 'number'; minimum: 0; maximum: 1 };
          reasoning: { type: 'string' };
        };
        required: ['agent_type', 'confidence', 'reasoning'];
      };
    };
    parameters: {
      type: 'object';
      properties: Record<string, any>;
    };
    intent_categories: {
      type: 'array';
      items: { type: 'string' };
    };
    complexity: {
      type: 'string';
      enum: ['simple', 'moderate', 'complex'];
    };
    temporal_context: {
      type: 'object';
      properties: {
        time_sensitive: { type: 'boolean' };
        time_range: { type: 'string' };
        urgency: { type: 'string'; enum: ['low', 'medium', 'high'] };
      };
    };
  };
  required: ['agent_type', 'confidence', 'reasoning'];
  additionalProperties: false;
}

/**
 * Agent exclusion detection result
 */
export interface AgentExclusionResult {
  /** Agents that user explicitly requested to avoid */
  excludedAgents: AgentType[];
  /** Confidence penalty to apply to excluded agents (0-1) */
  confidencePenalty: number;
  /** Matched exclusion patterns for debugging */
  matchedPatterns: string[];
  /** Reasoning for exclusions */
  reasoning: string;
}

/**
 * Exclusion pattern configuration for each agent type
 */
export interface AgentExclusionPatterns {
  /** Patterns that indicate user wants to avoid this agent */
  avoidancePatterns: string[];
  /** Patterns that indicate user explicitly doesn't want this agent */
  negativePatterns: string[];
  /** Keywords that suggest avoiding this agent */
  exclusionKeywords: string[];
}
