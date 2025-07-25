import { Session } from 'next-auth';

import {
  AgentExecutionContext,
  AgentExecutionResult,
  AgentResponse,
  AgentType,
} from '@/types/agent';
import { ChatBody, Message, MessageType } from '@/types/chat';
import { IntentAnalysisResult } from '@/types/intentAnalysis';
import { OpenAIModelID } from '@/types/openai';

/**
 * Transformed response for the chat interface
 */
export interface TransformedAgentResponse {
  content: string;
  messageType: MessageType;
  agentType: AgentType;
  success: boolean;
  processingTime: number;
  confidence: number;
  metadata: ResponseMetadata;
  fallbackUsed: boolean;
  citations?: Citation[];
  attachments?: Attachment[];
  actions?: ResponseAction[];
}

/**
 * Response metadata for tracking and debugging
 */
export interface ResponseMetadata {
  agentId: string;
  executionId: string;
  timestamp: Date;
  tokenUsage?: TokenUsage;
  costEstimate?: number;
  processingStages: string[];
  errorCodes?: string[];
  debugInfo?: Record<string, any>;
  sourceData?: any;
  cacheInfo?: {
    hit: boolean;
    key?: string;
    ttl?: number;
  };
}

/**
 * Citation information for RAG-style responses
 */
export interface Citation {
  id: string;
  title: string;
  url?: string;
  snippet: string;
  confidence: number;
  source: 'web' | 'knowledge' | 'document' | 'code' | 'foundry';
  metadata?: Record<string, any>;
}

/**
 * File or media attachments
 */
export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'code' | 'data';
  url?: string;
  mimeType: string;
  size?: number;
  preview?: string;
  metadata?: Record<string, any>;
}

/**
 * Actionable response items
 */
export interface ResponseAction {
  id: string;
  type: 'download' | 'execute' | 'navigate' | 'search' | 'copy' | 'share';
  label: string;
  description?: string;
  payload: Record<string, any>;
  enabled: boolean;
  icon?: string;
}

/**
 * Token usage tracking
 */
export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
  model: string;
}

/**
 * Transformation context
 */
export interface TransformationContext {
  originalRequest: ChatBody;
  user: Session['user'];
  intentResult?: IntentAnalysisResult;
  processingMetadata: {
    startTime: number;
    pipelineId: string;
    stagesExecuted: string[];
  };
}

/**
 * Agent Response Transformation System
 * Handles formatting and transformation of agent responses into consistent chat interface format
 */
export class AgentResponseTransformService {
  private static instance: AgentResponseTransformService | null = null;

  private transformers: Map<AgentType, AgentResponseTransformer>;

  private constructor() {
    this.transformers = new Map();
    this.initializeTransformers();
  }

  /**
   * Singleton pattern - get or create transform service instance
   */
  public static getInstance(): AgentResponseTransformService {
    if (!AgentResponseTransformService.instance) {
      AgentResponseTransformService.instance =
        new AgentResponseTransformService();
    }
    return AgentResponseTransformService.instance;
  }

  /**
   * Main transformation method
   */
  public async transformResponse(
    agentResult: AgentExecutionResult,
    context: TransformationContext,
  ): Promise<TransformedAgentResponse> {
    const startTime = Date.now();

    try {
      console.log('Response transformation started', {
        agentType: agentResult.response.agentType,
        executionId: context.processingMetadata.pipelineId, // Use pipelineId as executionId
        pipelineId: context.processingMetadata.pipelineId,
      });

      // Get appropriate transformer for agent type
      const transformer = this.getTransformer(agentResult.response.agentType);

      // Perform transformation
      const transformedResponse = await transformer.transform(
        agentResult,
        context,
      );

      // Add universal metadata
      const enhancedResponse = await this.enhanceWithMetadata(
        transformedResponse,
        agentResult,
        context,
        startTime,
      );

      // Validate transformed response
      const validationResult =
        this.validateTransformedResponse(enhancedResponse);
      if (!validationResult.valid) {
        console.warn('Response validation failed', {
          agentType: agentResult.response.agentType,
          validationErrors: validationResult.errors,
        });

        // Apply fallback transformation
        return this.createFallbackResponse(agentResult, context, startTime);
      }

      // Apply content filters and safety checks
      const filteredResponse = await this.applyContentFilters(enhancedResponse);

      const processingTime = Date.now() - startTime;

      console.log('Response transformation completed', {
        agentType: agentResult.response.agentType,
        processingTime,
        contentLength: filteredResponse.content.length,
        hasCitations: Boolean(filteredResponse.citations?.length),
        hasAttachments: Boolean(filteredResponse.attachments?.length),
      });

      return filteredResponse;
    } catch (error) {
      const processingTime = Date.now() - startTime;

      console.error('Response transformation failed', error as Error, {
        agentType: agentResult.response.agentType,
        executionId: context.processingMetadata.pipelineId, // Use pipelineId as executionId
        processingTime,
      });

      return this.createFallbackResponse(agentResult, context, startTime);
    }
  }

  /**
   * Register a custom transformer for an agent type
   */
  public registerTransformer(
    agentType: AgentType,
    transformer: AgentResponseTransformer,
  ): void {
    this.transformers.set(agentType, transformer);
    console.log('Custom transformer registered', { agentType });
  }

  /**
   * Batch transform multiple responses
   */
  public async transformBatch(
    results: AgentExecutionResult[],
    context: TransformationContext,
  ): Promise<TransformedAgentResponse[]> {
    const promises = results.map((result) =>
      this.transformResponse(result, context),
    );
    return await Promise.all(promises);
  }

  /**
   * Extract structured data from response content
   */
  public extractStructuredData(response: TransformedAgentResponse): {
    tables?: any[];
    charts?: any[];
    codeBlocks?: any[];
    links?: any[];
    mentions?: any[];
  } {
    try {
      const structured: any = {};

      // Extract code blocks
      const codeBlockRegex = /```(\w+)?\n([\s\S]*?)\n```/g;
      const codeBlocks: any[] = [];
      let match;
      while ((match = codeBlockRegex.exec(response.content)) !== null) {
        codeBlocks.push({
          language: match[1] || 'text',
          code: match[2].trim(),
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        });
      }
      if (codeBlocks.length > 0) structured.codeBlocks = codeBlocks;

      // Extract links
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      const links: any[] = [];
      while ((match = linkRegex.exec(response.content)) !== null) {
        links.push({
          text: match[1],
          url: match[2],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        });
      }
      if (links.length > 0) structured.links = links;

      // Extract mentions (if agent-specific)
      if (
        response.agentType === AgentType.WEB_SEARCH ||
        response.agentType === AgentType.LOCAL_KNOWLEDGE
      ) {
        const mentionRegex = /@(\w+)/g;
        const mentions: any[] = [];
        while ((match = mentionRegex.exec(response.content)) !== null) {
          mentions.push({
            entity: match[1],
            startIndex: match.index,
            endIndex: match.index + match[0].length,
          });
        }
        if (mentions.length > 0) structured.mentions = mentions;
      }

      return structured;
    } catch (error) {
      console.error('Failed to extract structured data', error as Error, {
        agentType: response.agentType,
        contentLength: response.content.length,
      });
      return {};
    }
  }

  /**
   * Private helper methods
   */

  private initializeTransformers(): void {
    // Initialize default transformers for each agent type
    this.transformers.set(AgentType.WEB_SEARCH, new WebSearchTransformer());
    this.transformers.set(
      AgentType.CODE_INTERPRETER,
      new CodeInterpreterTransformer(),
    );
    this.transformers.set(AgentType.URL_PULL, new UrlPullTransformer());
    this.transformers.set(
      AgentType.LOCAL_KNOWLEDGE,
      new LocalKnowledgeTransformer(),
    );
    this.transformers.set(AgentType.FOUNDRY, new FoundryTransformer());
    this.transformers.set(AgentType.THIRD_PARTY, new ThirdPartyTransformer());
    this.transformers.set(
      AgentType.STANDARD_CHAT,
      new StandardChatTransformer(),
    );
  }

  private getTransformer(agentType: AgentType): AgentResponseTransformer {
    const transformer = this.transformers.get(agentType);
    if (!transformer) {
      console.warn('No transformer found for agent type, using default', {
        agentType,
      });
      return new DefaultTransformer();
    }
    return transformer;
  }

  private async enhanceWithMetadata(
    response: TransformedAgentResponse,
    agentResult: AgentExecutionResult,
    context: TransformationContext,
    startTime: number,
  ): Promise<TransformedAgentResponse> {
    const processingTime = Date.now() - startTime;

    const enhancedMetadata: ResponseMetadata = {
      ...response.metadata,
      executionId: agentResult.response.agentId,
      timestamp: new Date(),
      processingStages: [
        ...context.processingMetadata.stagesExecuted,
        'response_transformation',
      ],
      tokenUsage: this.extractTokenUsage(agentResult),
      costEstimate: this.estimateCost(agentResult),
      sourceData: agentResult.response.metadata,
    };

    return {
      ...response,
      processingTime: response.processingTime + processingTime,
      metadata: enhancedMetadata,
    };
  }

  private validateTransformedResponse(response: TransformedAgentResponse): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!response.content || typeof response.content !== 'string') {
      errors.push('Response content is missing or invalid');
    }

    if (!Object.values(AgentType).includes(response.agentType)) {
      errors.push('Invalid agent type');
    }

    if (typeof response.success !== 'boolean') {
      errors.push('Success flag must be boolean');
    }

    if (
      typeof response.confidence !== 'number' ||
      response.confidence < 0 ||
      response.confidence > 1
    ) {
      errors.push('Confidence must be a number between 0 and 1');
    }

    if (response.citations) {
      for (const citation of response.citations) {
        if (!citation.id || !citation.title || !citation.snippet) {
          errors.push('Citation missing required fields');
          break;
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private async applyContentFilters(
    response: TransformedAgentResponse,
  ): Promise<TransformedAgentResponse> {
    try {
      // Apply basic content safety filters
      let filteredContent = response.content;

      // Remove potential sensitive information patterns
      filteredContent = this.sanitizeContent(filteredContent);

      // Validate URLs in citations
      if (response.citations) {
        response.citations = response.citations.filter((citation) =>
          this.isValidCitation(citation),
        );
      }

      // Validate attachments
      if (response.attachments) {
        response.attachments = response.attachments.filter((attachment) =>
          this.isValidAttachment(attachment),
        );
      }

      return {
        ...response,
        content: filteredContent,
      };
    } catch (error) {
      console.error('Content filtering failed', error as Error, {
        agentType: response.agentType,
      });
      return response;
    }
  }

  private createFallbackResponse(
    agentResult: AgentExecutionResult,
    context: TransformationContext,
    startTime: number,
  ): TransformedAgentResponse {
    const processingTime = Date.now() - startTime;

    return {
      content:
        agentResult.response.content ||
        'I encountered an issue processing your request. Please try again.',
      messageType: MessageType.TEXT,
      agentType: agentResult.response.agentType,
      success: false,
      processingTime,
      confidence: 0.1,
      metadata: {
        agentId: agentResult.response.agentId || 'unknown',
        executionId: agentResult.response.agentId,
        timestamp: new Date(),
        processingStages: ['fallback_transformation'],
        errorCodes: ['TRANSFORMATION_FAILED'],
        debugInfo: {
          originalResponse: agentResult.response,
          fallbackUsed: true,
        },
      },
      fallbackUsed: true,
    };
  }

  private extractTokenUsage(
    agentResult: AgentExecutionResult,
  ): TokenUsage | undefined {
    const metadata = agentResult.response.metadata;
    if (metadata?.tokenUsage) {
      return {
        prompt: metadata.tokenUsage.prompt || 0,
        completion: metadata.tokenUsage.completion || 0,
        total: metadata.tokenUsage.total || 0,
        model: agentResult.request.context.model.id || 'unknown',
      };
    }
    return undefined;
  }

  private estimateCost(agentResult: AgentExecutionResult): number | undefined {
    const tokenUsage = this.extractTokenUsage(agentResult);
    if (tokenUsage) {
      // Basic cost estimation (would be more sophisticated in production)
      const promptCost = tokenUsage.prompt * 0.0001;
      const completionCost = tokenUsage.completion * 0.0002;
      return promptCost + completionCost;
    }
    return undefined;
  }

  private sanitizeContent(content: string): string {
    // Remove potential API keys, tokens, etc.
    let sanitized = content;

    // Pattern for potential API keys
    sanitized = sanitized.replace(/\b[A-Za-z0-9]{32,}\b/g, '[REDACTED]');

    // Pattern for potential tokens
    sanitized = sanitized.replace(
      /bearer\s+[A-Za-z0-9-_.]+/gi,
      'bearer [REDACTED]',
    );

    // Pattern for potential passwords in URLs
    sanitized = sanitized.replace(
      /:\/\/[^:]+:[^@]+@/g,
      '://[REDACTED]:[REDACTED]@',
    );

    return sanitized;
  }

  private isValidCitation(citation: Citation): boolean {
    try {
      // Basic validation for citations
      if (!citation.id || !citation.title || !citation.snippet) {
        return false;
      }

      // Validate URL if present
      if (citation.url) {
        try {
          new URL(citation.url);
        } catch {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  private isValidAttachment(attachment: Attachment): boolean {
    try {
      // Basic validation for attachments
      if (
        !attachment.id ||
        !attachment.name ||
        !attachment.type ||
        !attachment.mimeType
      ) {
        return false;
      }

      // Validate URL if present
      if (attachment.url) {
        try {
          new URL(attachment.url);
        } catch {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Base transformer interface
 */
export interface AgentResponseTransformer {
  transform(
    agentResult: AgentExecutionResult,
    context: TransformationContext,
  ): Promise<TransformedAgentResponse>;
}

/**
 * Default transformer implementation
 */
export class DefaultTransformer implements AgentResponseTransformer {
  async transform(
    agentResult: AgentExecutionResult,
    context: TransformationContext,
  ): Promise<TransformedAgentResponse> {
    return {
      content: agentResult.response.content,
      messageType: MessageType.TEXT,
      agentType: agentResult.response.agentType,
      success: agentResult.response.success,
      processingTime: agentResult.executionTime,
      confidence: 0.5,
      metadata: {
        agentId: agentResult.response.agentId || 'unknown',
        executionId: agentResult.response.agentId,
        timestamp: new Date(),
        processingStages: ['default_transformation'],
      },
      fallbackUsed: false,
    };
  }
}

/**
 * Web Search specific transformer
 */
export class WebSearchTransformer implements AgentResponseTransformer {
  async transform(
    agentResult: AgentExecutionResult,
    context: TransformationContext,
  ): Promise<TransformedAgentResponse> {
    const metadata = agentResult.response.metadata;
    const citations: Citation[] = [];

    // Extract search results as citations
    if (metadata?.agentMetadata?.searchResults) {
      for (const result of metadata.agentMetadata.searchResults.slice(0, 5)) {
        citations.push({
          id: `search-${result.id || Math.random()}`,
          title: result.title || 'Search Result',
          url: result.url,
          snippet: result.snippet || result.description || '',
          confidence: result.score || 0.7,
          source: 'web',
          metadata: {
            rank: result.rank,
            datePublished: result.datePublished,
          },
        });
      }
    }

    return {
      content: agentResult.response.content,
      messageType: MessageType.TEXT,
      agentType: agentResult.response.agentType,
      success: agentResult.response.success,
      processingTime: agentResult.executionTime,
      confidence: 0.8,
      metadata: {
        agentId: agentResult.response.agentId || 'web-search',
        executionId: agentResult.response.agentId,
        timestamp: new Date(),
        processingStages: ['web_search_transformation'],
        sourceData: metadata,
      },
      fallbackUsed: false,
      citations,
    };
  }
}

/**
 * Code Interpreter specific transformer
 */
export class CodeInterpreterTransformer implements AgentResponseTransformer {
  async transform(
    agentResult: AgentExecutionResult,
    context: TransformationContext,
  ): Promise<TransformedAgentResponse> {
    const metadata = agentResult.response.metadata;
    const attachments: Attachment[] = [];
    const actions: ResponseAction[] = [];

    // Extract code execution results as attachments
    if (metadata?.agentMetadata?.executionResults) {
      for (const result of metadata.agentMetadata.executionResults) {
        if (result.output) {
          attachments.push({
            id: `output-${result.id || Math.random()}`,
            name: `${result.language || 'code'}_output.txt`,
            type: 'code',
            mimeType: 'text/plain',
            preview: result.output.substring(0, 200),
            metadata: {
              language: result.language,
              exitCode: result.exitCode,
              executionTime: result.executionTime,
            },
          });
        }

        if (result.generatedFiles) {
          for (const file of result.generatedFiles) {
            actions.push({
              id: `download-${file.name}`,
              type: 'download',
              label: `Download ${file.name}`,
              description: `Download generated file: ${file.name}`,
              payload: {
                filename: file.name,
                content: file.content,
                mimeType: file.mimeType,
              },
              enabled: true,
              icon: 'download',
            });
          }
        }
      }
    }

    return {
      content: agentResult.response.content,
      messageType: MessageType.TEXT,
      agentType: agentResult.response.agentType,
      success: agentResult.response.success,
      processingTime: agentResult.executionTime,
      confidence: 0.9,
      metadata: {
        agentId: agentResult.response.agentId || 'code-interpreter',
        executionId: agentResult.response.agentId,
        timestamp: new Date(),
        processingStages: ['code_interpreter_transformation'],
        sourceData: metadata,
      },
      fallbackUsed: false,
      attachments,
      actions,
    };
  }
}

/**
 * URL Pull specific transformer
 */
export class UrlPullTransformer implements AgentResponseTransformer {
  async transform(
    agentResult: AgentExecutionResult,
    context: TransformationContext,
  ): Promise<TransformedAgentResponse> {
    const metadata = agentResult.response.metadata;
    const citations: Citation[] = [];

    // Extract analyzed URLs as citations
    if (metadata?.agentMetadata?.analyzedUrls) {
      for (const urlData of metadata.agentMetadata.analyzedUrls) {
        citations.push({
          id: `url-${urlData.url.replace(/[^a-zA-Z0-9]/g, '')}`,
          title: urlData.title || 'Web Page Analysis',
          url: urlData.url,
          snippet: urlData.summary || urlData.description || '',
          confidence: 0.9,
          source: 'web',
          metadata: {
            contentType: urlData.contentType,
            wordCount: urlData.wordCount,
            lastModified: urlData.lastModified,
          },
        });
      }
    }

    return {
      content: agentResult.response.content,
      messageType: MessageType.TEXT,
      agentType: agentResult.response.agentType,
      success: agentResult.response.success,
      processingTime: agentResult.executionTime,
      confidence: 0.85,
      metadata: {
        agentId: agentResult.response.agentId || 'url-pull',
        executionId: agentResult.response.agentId,
        timestamp: new Date(),
        processingStages: ['url_pull_transformation'],
        sourceData: metadata,
      },
      fallbackUsed: false,
      citations,
    };
  }
}

/**
 * Local Knowledge specific transformer
 */
export class LocalKnowledgeTransformer implements AgentResponseTransformer {
  async transform(
    agentResult: AgentExecutionResult,
    context: TransformationContext,
  ): Promise<TransformedAgentResponse> {
    const metadata = agentResult.response.metadata;
    const citations: Citation[] = [];

    // Extract knowledge base sources as citations
    if (metadata?.agentMetadata?.knowledgeSources) {
      for (const source of metadata.agentMetadata.knowledgeSources) {
        citations.push({
          id: `kb-${source.id || Math.random()}`,
          title: source.title || 'Knowledge Base Entry',
          snippet: source.content?.substring(0, 200) || '',
          confidence: source.relevanceScore || 0.8,
          source: 'knowledge',
          metadata: {
            category: source.category,
            lastUpdated: source.lastUpdated,
            tags: source.tags,
          },
        });
      }
    }

    return {
      content: agentResult.response.content,
      messageType: MessageType.TEXT,
      agentType: agentResult.response.agentType,
      success: agentResult.response.success,
      processingTime: agentResult.executionTime,
      confidence: 0.75,
      metadata: {
        agentId: agentResult.response.agentId || 'local-knowledge',
        executionId: agentResult.response.agentId,
        timestamp: new Date(),
        processingStages: ['local_knowledge_transformation'],
        sourceData: metadata,
      },
      fallbackUsed: false,
      citations,
    };
  }
}

/**
 * Foundry specific transformer
 */
export class FoundryTransformer implements AgentResponseTransformer {
  async transform(
    agentResult: AgentExecutionResult,
    context: TransformationContext,
  ): Promise<TransformedAgentResponse> {
    return {
      content: agentResult.response.content,
      messageType: MessageType.TEXT,
      agentType: agentResult.response.agentType,
      success: agentResult.response.success,
      processingTime: agentResult.executionTime,
      confidence: 0.8,
      metadata: {
        agentId: agentResult.response.agentId || 'foundry',
        executionId: agentResult.response.agentId,
        timestamp: new Date(),
        processingStages: ['foundry_transformation'],
        sourceData: agentResult.response.metadata,
      },
      fallbackUsed: false,
    };
  }
}

/**
 * Third Party specific transformer
 */
export class ThirdPartyTransformer implements AgentResponseTransformer {
  async transform(
    agentResult: AgentExecutionResult,
    context: TransformationContext,
  ): Promise<TransformedAgentResponse> {
    const metadata = agentResult.response.metadata;
    const actions: ResponseAction[] = [];

    // Extract third-party service actions
    if (metadata?.agentMetadata?.availableActions) {
      for (const action of metadata.agentMetadata.availableActions) {
        actions.push({
          id: action.id,
          type: action.type,
          label: action.label,
          description: action.description,
          payload: action.payload,
          enabled: action.enabled !== false,
          icon: action.icon,
        });
      }
    }

    return {
      content: agentResult.response.content,
      messageType: MessageType.TEXT,
      agentType: agentResult.response.agentType,
      success: agentResult.response.success,
      processingTime: agentResult.executionTime,
      confidence: 0.7,
      metadata: {
        agentId: agentResult.response.agentId || 'third-party',
        executionId: agentResult.response.agentId,
        timestamp: new Date(),
        processingStages: ['third_party_transformation'],
        sourceData: metadata,
      },
      fallbackUsed: false,
      actions,
    };
  }
}

/**
 * Standard Chat specific transformer
 */
export class StandardChatTransformer implements AgentResponseTransformer {
  async transform(
    agentResult: AgentExecutionResult,
    context: TransformationContext,
  ): Promise<TransformedAgentResponse> {
    return {
      content: agentResult.response.content,
      messageType: MessageType.TEXT,
      agentType: agentResult.response.agentType,
      success: agentResult.response.success,
      processingTime: agentResult.executionTime,
      confidence: 0.6,
      metadata: {
        agentId: agentResult.response.agentId || 'standard-chat',
        executionId: agentResult.response.agentId,
        timestamp: new Date(),
        processingStages: ['standard_chat_transformation'],
        sourceData: agentResult.response.metadata,
      },
      fallbackUsed: false,
    };
  }
}

/**
 * Convenience function to get the singleton transform service instance
 */
export function getAgentResponseTransformService(): AgentResponseTransformService {
  return AgentResponseTransformService.getInstance();
}

/**
 * Convenience function to transform an agent response
 */
export async function transformAgentResponse(
  agentResult: AgentExecutionResult,
  context: TransformationContext,
): Promise<TransformedAgentResponse> {
  const service = getAgentResponseTransformService();
  return await service.transformResponse(agentResult, context);
}

/**
 * Convenience function to register a custom transformer
 */
export function registerAgentTransformer(
  agentType: AgentType,
  transformer: AgentResponseTransformer,
): void {
  const service = getAgentResponseTransformService();
  service.registerTransformer(agentType, transformer);
}
