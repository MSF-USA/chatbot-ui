import { AgentResponse, AgentType } from './agent';
import { OpenAIModel } from './openai';

/**
 * Request interface for agent execution API
 */
export interface AgentExecutionApiRequest {
  /** Type of agent to execute */
  agentType: AgentType;
  /** User query/message to process */
  query: string;
  /** Optional conversation history for context (recent messages) */
  conversationHistory?: string[];
  /** Optional model configuration */
  model?: {
    id: string;
    tokenLimit?: number;
  };
  /** Agent-specific configuration overrides */
  config?: Record<string, any>;
  /** Optional timeout in milliseconds */
  timeout?: number;
}

/**
 * Response interface for agent execution API
 */
export interface AgentExecutionApiResponse {
  /** Success status */
  success: boolean;
  /** Agent response data */
  data?: {
    /** Agent's content response */
    content: string;
    /** Agent type that processed the request */
    agentType: AgentType;
    /** Agent ID */
    agentId: string;
    /** Structured content if available */
    structuredContent?: AgentResponse['structuredContent'];
    /** Response metadata */
    metadata?: {
      processingTime: number;
      confidence: number;
      agentMetadata?: Record<string, any>;
    };
  };
  /** Error information if unsuccessful */
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  /** Request execution metadata */
  execution: {
    startTime: string;
    endTime: string;
    executionTime: number;
    agentType: AgentType;
  };
}

/**
 * Request interface for intent analysis API
 */
export interface IntentAnalysisApiRequest {
  /** User message to analyze */
  message: string;
  /** Optional conversation history for context */
  conversationHistory?: string[];
  /** Optional user locale/language preference */
  locale?: string;
  /** Optional user agent string */
  userAgent?: string;
  /** Optional additional context metadata */
  metadata?: Record<string, any>;
}

/**
 * Response interface for intent analysis API
 */
export interface IntentAnalysisApiResponse {
  /** Success status */
  success: boolean;
  /** Intent analysis data */
  data?: {
    /** Recommended agent type for routing */
    recommendedAgent: AgentType;
    /** Confidence score (0-1) */
    confidence: number;
    /** Alternative agent suggestions */
    alternatives: Array<{
      agent: AgentType;
      confidence: number;
      reasoning: string;
    }>;
    /** Extracted parameters for the agent */
    parameters: Record<string, any>;
    /** Reasoning for the classification */
    reasoning: string;
    /** Analysis method used */
    analysisMethod: 'ai' | 'heuristic' | 'hybrid';
    /** Processing time in milliseconds */
    processingTime: number;
    /** Analysis locale */
    locale: string;
    /** Additional metadata */
    metadata?: {
      hasQuestion: boolean;
      hasUrgency: boolean;
      messageLength: number;
      aiClassificationUsed: boolean;
      fallbackReason?: string;
    };
  };
  /** Error information if unsuccessful */
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  /** Analysis execution metadata */
  execution: {
    startTime: string;
    endTime: string;
    executionTime: number;
  };
}

/**
 * Supported agent types for the API (subset of AgentType enum)
 */
export const SUPPORTED_AGENT_TYPES: AgentType[] = [
  AgentType.WEB_SEARCH,
  AgentType.URL_PULL,
  AgentType.LOCAL_KNOWLEDGE,
  AgentType.CODE_INTERPRETER,
];

/**
 * Validation helper for agent types
 */
export function isSupportedAgentType(
  agentType: string,
): agentType is AgentType {
  return SUPPORTED_AGENT_TYPES.includes(agentType as AgentType);
}

/**
 * Default configuration for different agent types
 */
export const DEFAULT_AGENT_CONFIGS: Record<string, Record<string, any>> = {
  [AgentType.WEB_SEARCH]: {
    maxResults: 5,
    defaultMarket: 'en-US',
    defaultSafeSearch: 'Moderate',
    enableCitations: true,
    enableCaching: true,
    cacheTtl: 300,
  },
  [AgentType.URL_PULL]: {
    maxUrls: 3,
    processingTimeout: 30000,
    enableParallelProcessing: true,
    concurrencyLimit: 3,
    enableContentExtraction: true,
    enableCaching: true,
    cacheTtl: 300,
  },
  [AgentType.LOCAL_KNOWLEDGE]: {
    maxResults: 10,
    enableSemanticSearch: true,
    enableKeywordSearch: true,
    enableHybridSearch: true,
    confidenceThreshold: 0.7,
  },
  [AgentType.CODE_INTERPRETER]: {
    enableCodeExecution: true,
    enablePythonSupport: true,
    enableJavaScriptSupport: true,
    enableDebugging: true,
    timeout: 60000,
  },
};
