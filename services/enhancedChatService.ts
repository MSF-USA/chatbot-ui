/**
 * Enhanced Chat Service with Agent Routing
 *
 * Extends the original ChatService with Azure AI Agent routing capabilities,
 * feature flag integration, and fallback mechanisms for controlled rollout.
 */
import { JWT, Session } from 'next-auth';
import { NextRequest } from 'next/server';

// import { azureMonitorDashboard } from './azureMonitorDashboard';
import { BaseAgent } from '@/services/agents/baseAgent';

import {
  checkIsModelValid,
  isFileConversation,
  isImageConversation,
} from '@/utils/app/chat';
import {
  DEFAULT_AGENT_TIMEOUT,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_TEMPERATURE,
} from '@/utils/app/const';
import { generateOptimizedWebSearchQuery } from '@/utils/server/structuredResponses';

import {
  AgentConfig,
  AgentExecutionContext,
  AgentExecutionEnvironment,
  AgentExecutionRequest,
  AgentExecutionResult,
  AgentResponse,
  AgentType,
} from '@/types/agent';
import {
  ChatBody,
  Message,
  TextMessageContent,
} from '@/types/chat';
import { IntentAnalysisContext } from '@/types/intentAnalysis';

import { AgentFactory } from './agentFactory';
import {
  AgentPoolingService,
  getAgentPoolingService,
} from './agentPoolingService';
import ChatService from './chatService';
import {
  IntentAnalysisService,
  getIntentAnalysisService,
} from './intentAnalysis';
import { AzureMonitorLoggingService } from './loggingService';
import {
  SimpleFeatureFlagService as FeatureFlagService,
  UserContext,
  getFeatureFlagService,
} from './simpleFeatureFlags';

import {
  DefaultAzureCredential,
  getBearerTokenProvider,
} from '@azure/identity';
import { StreamingTextResponse } from 'ai';
import { AzureOpenAI } from 'openai';

/**
 * Enhanced chat request interface
 */
export interface EnhancedChatRequest extends ChatBody {
  conversationId?: string;
  userContext?: UserContext;
  forceAgentType?: AgentType;
  enableFallback?: boolean;
  agentSettings?: {
    enabled: boolean;
    enabledAgentTypes: AgentType[];
  };
}

/**
 * Chat response interface
 */
export interface ChatResponse {
  text?: string;
  stream?: ReadableStream;
  agentType?: AgentType;
  usedFallback?: boolean;
  processingTime?: number;
  metadata?: {
    confidence?: number;
    sources?: any[];
    agentId?: string;
    flagsUsed?: Record<string, any>;
  };
}

/**
 * Agent routing decision
 */
interface RoutingDecision {
  shouldUseAgents: boolean;
  agentType: AgentType;
  confidence: number;
  reason: string;
  flags: Record<string, any>;
}

/**
 * Enhanced Chat Service with agent routing capabilities
 */
export class EnhancedChatService {
  private standardChatService: ChatService;
  private featureFlagService: FeatureFlagService;
  private agentPoolingService: AgentPoolingService | null = null;
  private agentFactory: AgentFactory;
  private intentAnalysisService: IntentAnalysisService;
  private openaiInstance: AzureOpenAI | null = null;
  private modelId: string | null = null;
  private logger: AzureMonitorLoggingService;
  private isInitialized = false;

  /**
   * Get initialization status
   */
  get isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  // Performance metrics
  private metrics = {
    totalRequests: 0,
    agentRequests: 0,
    legacyRequests: 0,
    fallbackRequests: 0,
    averageAgentResponseTime: 0,
    averageLegacyResponseTime: 0,
    errorRate: 0,
  };

  constructor() {
    this.standardChatService = new ChatService();
    this.featureFlagService = getFeatureFlagService();
    this.agentFactory = AgentFactory.getInstance();
    this.intentAnalysisService = getIntentAnalysisService();
    this.initializeAIServices();
    this.logger =
      AzureMonitorLoggingService.getInstance() ||
      new AzureMonitorLoggingService();
  }

  /**
   * Initialize the enhanced chat service
   */
  async initialize(): Promise<void> {
    try {
      console.log('[INFO] Initializing Enhanced Chat Service');

      // Initialize feature flag service
      await this.featureFlagService.initialize();

      // Initialize agent factory (no initialize method needed for singleton)

      // Initialize agent pooling service
      try {
        this.agentPoolingService = getAgentPoolingService();
      } catch (error) {
        console.warn(
          '[WARN] Agent pooling service not available, will initialize on demand',
        );
      }

      // Intent analysis service is already initialized via singleton

      this.isInitialized = true;
      console.log('[INFO] Enhanced Chat Service initialized successfully');

      // Start Azure Monitor metrics collection
      // azureMonitorDashboard.startMetricsCollection(60000); // Collect metrics every minute

      await this.logger?.logCustomMetric(
        'EnhancedChatServiceInitialized',
        1,
        'count',
        {
          agentPoolingAvailable: String(!!this.agentPoolingService),
          metricsCollectionEnabled: 'true',
          timestamp: new Date().toISOString(),
        },
      );
    } catch (error) {
      console.error(
        '[ERROR] Failed to initialize Enhanced Chat Service:',
        error,
      );
      throw error;
    }
  }

  /**
   * Main request handler with agent routing
   */
  async handleRequest(
    req: NextRequest,
    providedSession?: Session | null,
    providedToken?: JWT | null,
    parsedBody?: any,
  ): Promise<Response> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      if (!this.isInitialized) {
        console.warn(
          '[WARN] Enhanced Chat Service not initialized, using standard chat fallback',
        );
        // If we have parsed body, create a new request to avoid body consumption issues
        if (parsedBody) {
          const fallbackRequest = new Request(req.url, {
            method: 'POST',
            headers: req.headers,
            body: JSON.stringify(parsedBody),
          });
          return this.standardChatService.handleRequest(
            fallbackRequest as NextRequest,
            providedSession,
            providedToken,
          );
        }
        return this.standardChatService.handleRequest(
          req,
          providedSession,
          providedToken,
        );
      }

      // Parse request (use provided body if available to avoid double consumption)
      const chatRequest = parsedBody
        ? this.parseRequestFromBody(parsedBody)
        : await this.parseRequest(req);
      const userContext = await this.extractUserContext(
        req,
        providedSession,
        providedToken,
      );

      // Make routing decision
      const routingDecision = await this.makeRoutingDecision(
        chatRequest,
        userContext,
        providedSession,
      );

      console.log('[INFO] Chat routing decision:', {
        shouldUseAgents: routingDecision.shouldUseAgents,
        agentType: routingDecision.agentType,
        reason: routingDecision.reason,
        userId: userContext.userId,
      });

      let response: Response;

      if (routingDecision.shouldUseAgents) {
        // Route through agent system with streaming support
        // Default to streaming unless explicitly disabled
        const shouldStream = chatRequest.stream !== false;
        response = await this.handleWithAgents(
          chatRequest,
          userContext,
          routingDecision,
          shouldStream,
          providedSession,
          providedToken,
        );
        this.metrics.agentRequests++;
      } else {
        // Use standard chat system
        response = await this.handleWithStandardChat(
          req,
          providedSession,
          providedToken,
          chatRequest,
        );
        this.metrics.legacyRequests++;
      }

      // Update metrics
      const responseTime = Date.now() - startTime;
      this.updateMetrics(routingDecision.shouldUseAgents, responseTime);

      // TODO: Re-enable if/when Azure Monitor Dashboard is implemented
      // Record metrics in Azure Monitor Dashboard
      // azureMonitorDashboard.recordRequest(true, responseTime);

      // if (routingDecision.shouldUseAgents) {
      //   azureMonitorDashboard.recordAgentRouting(
      //     'agent-selected',
      //     routingDecision.agentType || 'unknown',
      //     responseTime
      //   );
      // }

      // Log successful completion
      await this.logger?.logCustomMetric('ChatRequestCompleted', 1, 'count', {
        usedAgents: String(routingDecision.shouldUseAgents),
        agentType: routingDecision.agentType || 'none',
        responseTime: String(responseTime),
        userId: userContext.userId || 'unknown',
        success: 'true',
      });

      return response;
    } catch (error) {
      console.error('[ERROR] Chat request failed:', error);

      const processingTime = Date.now() - startTime;

      // TODO: Re-enable if/when Azure Monitor Dashboard is implemented
      // Record failed request
      // azureMonitorDashboard.recordRequest(false, processingTime);
      // azureMonitorDashboard.recordAgentRouting(
      //   'agent-failed',
      //   'unknown',
      //   processingTime,
      //   error instanceof Error ? error.message : String(error)
      // );

      // Log error
      await this.logger?.logCustomMetric(
        'EnhancedChatRequestFailed',
        1,
        'count',
        {
          error: error instanceof Error ? error.message : String(error),
          processingTime: String(processingTime),
        },
      );

      // Attempt fallback to standard chat system
      try {
        console.log('[INFO] Attempting fallback to standard chat system');
        this.metrics.fallbackRequests++;

        // Create a new request with the parsed body to avoid body consumption issues
        let fallbackResponse;
        if (parsedBody) {
          const fallbackRequest = new Request(req.url, {
            method: 'POST',
            headers: req.headers,
            body: JSON.stringify(parsedBody),
          });
          fallbackResponse = await this.standardChatService.handleRequest(
            fallbackRequest as NextRequest,
            providedSession,
            providedToken,
          );
        } else {
          fallbackResponse = await this.standardChatService.handleRequest(
            req,
            providedSession,
            providedToken,
          );
        }

        const fallbackTime = Date.now() - startTime;

        // TODO: Re-enable when Azure Monitor Dashboard is implemented
        // Record successful fallback
        // azureMonitorDashboard.recordRequest(true, fallbackTime);
        // azureMonitorDashboard.recordAgentRouting(
        //   'fallback-used',
        //   'standard-chat',
        //   fallbackTime,
        //   'Agent system failure'
        // );

        await this.logger?.logCustomMetric(
          'ChatFallbackSucceeded',
          1,
          'count',
          {
            originalError:
              error instanceof Error ? error.message : String(error),
            fallbackTime: String(fallbackTime),
          },
        );

        return fallbackResponse;
      } catch (fallbackError) {
        console.error('[ERROR] Fallback also failed:', fallbackError);

        await this.logger.logCustomMetric('ChatFallbackFailed', 1, 'count', {
          originalError: error instanceof Error ? error.message : String(error),
          fallbackError:
            fallbackError instanceof Error
              ? fallbackError.message
              : String(fallbackError),
        });

        return new Response(
          JSON.stringify({
            error:
              'Chat service temporarily unavailable. Please try again later.',
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }
    }
  }

  /**
   * Make routing decision based on feature flags and intent analysis
   */
  private async makeRoutingDecision(
    chatRequest: EnhancedChatRequest,
    userContext: UserContext,
    providedSession?: Session | null,
  ): Promise<RoutingDecision> {
    try {
      // Get feature flags
      const flags = await this.featureFlagService.getAgentRoutingFlags(
        userContext,
      );

      // Check if agents are enabled
      if (!flags.agentRoutingEnabled) {
        return {
          shouldUseAgents: false,
          agentType: AgentType.WEB_SEARCH, // Default to web-search when not using agents
          confidence: 1.0,
          reason: 'Agent routing disabled by feature flag',
          flags,
        };
      }

      // Check user targeting
      const shouldRoute = await this.featureFlagService.shouldRouteToAgents(
        userContext,
      );
      if (!shouldRoute) {
        return {
          shouldUseAgents: false,
          agentType: AgentType.WEB_SEARCH, // Default to web-search when not using agents
          confidence: 1.0,
          reason: 'User not in rollout group',
          flags,
        };
      }

      // Forced agent type override - bypass all other logic
      if (chatRequest.forceAgentType) {
        console.log(
          `[EnhancedChatService] Force agent type detected: ${chatRequest.forceAgentType}`,
        );
        return {
          shouldUseAgents: true,
          agentType: chatRequest.forceAgentType,
          confidence: 1.0,
          reason: 'Force agent type specified by command',
          flags,
        };
      }

      // Check if we have agent settings that restrict available agents
      const enabledAgents = chatRequest.agentSettings?.enabledAgentTypes || [
        AgentType.WEB_SEARCH,
        AgentType.LOCAL_KNOWLEDGE,
        AgentType.URL_PULL,
      ];

      // If agents are disabled in settings, don't use them
      if (chatRequest.agentSettings && !chatRequest.agentSettings.enabled) {
        return {
          shouldUseAgents: false,
          agentType: AgentType.WEB_SEARCH,
          confidence: 1.0,
          reason: 'Agents disabled in user settings',
          flags,
        };
      }

      // Analyze intent to determine best agent using AI-powered analysis
      const lastMessage = chatRequest.messages[chatRequest.messages.length - 1];
      const messageContent = this.extractMessageText(lastMessage);

      console.log('[EnhancedChatService] Analyzing message intent:', {
        messageLength: messageContent.length,
        messagePreview:
          messageContent.substring(0, 100) +
          (messageContent.length > 100 ? '...' : ''),
        enabledAgents,
      });

      // Build intent analysis context
      const intentContext: IntentAnalysisContext = {
        query: messageContent,
        conversationHistory: chatRequest.messages
          .slice(0, -1)
          .map((msg) => this.extractMessageText(msg)),
        locale: 'en', // Default to English, could be extracted from userContext
        userPreferences: {
          preferredAgents: undefined,
          disabledAgents: undefined,
          languagePreference: 'en',
        },
        additionalContext: {
          model: chatRequest.model?.id,
          temperature: chatRequest.temperature,
          systemPrompt: chatRequest.prompt,
        },
        timestamp: new Date(),
        sessionInfo: {
          sessionId: userContext.custom?.sessionId || 'unknown',
          userId: userContext.userId,
          previousInteractions: chatRequest.messages.length - 1,
        },
      };

      // Get user session for AI analysis
      const userSession = providedSession;

      // Ensure we have valid OpenAI instance and model ID for AI classification
      const openaiForAnalysis = this.getValidOpenAIInstance();
      const modelIdForAnalysis = this.getValidModelId();

      console.log('[EnhancedChatService] Intent analysis parameters:', {
        hasOpenAI: !!openaiForAnalysis,
        modelId: modelIdForAnalysis,
        hasUser: !!userSession?.user,
      });

      const intentAnalysis = await this.intentAnalysisService.analyzeIntent(
        intentContext,
        openaiForAnalysis,
        modelIdForAnalysis,
        userSession?.user,
      );
      let agentType = this.selectAgentType(intentAnalysis, flags);

      // Filter agent type based on enabled agents
      if (!enabledAgents.includes(agentType)) {
        console.log(
          `[EnhancedChatService] Recommended agent ${agentType} is disabled, selecting from enabled agents`,
        );
        // Fall back to the first enabled agent or web search
        agentType =
          enabledAgents.length > 0 ? enabledAgents[0] : AgentType.WEB_SEARCH;
      }

      console.log('[EnhancedChatService] Intent analysis complete:', {
        recommendedAgent: intentAnalysis.recommendedAgent,
        confidence: intentAnalysis.confidence,
        selectedAgent: agentType,
        reasoning: intentAnalysis.reasoning,
        analysisMethod: intentAnalysis.analysisMethod,
        processingTime: intentAnalysis.processingTime,
      });

      return {
        shouldUseAgents: true,
        agentType,
        confidence: intentAnalysis.confidence,
        reason: `Intent analysis (${intentAnalysis.analysisMethod}): ${intentAnalysis.reasoning}`,
        flags,
      };
    } catch (error) {
      console.error('[ERROR] Failed to make routing decision:', error);

      // Safe fallback
      return {
        shouldUseAgents: false,
        agentType: AgentType.WEB_SEARCH, // Default to web-search when routing fails
        confidence: 0.0,
        reason: 'Routing decision failed, using fallback',
        flags: {},
      };
    }
  }

  /**
   * Handle request with agent system
   */
  private async handleWithAgents(
    chatRequest: EnhancedChatRequest,
    userContext: UserContext,
    routingDecision: RoutingDecision,
    shouldStream: boolean = true,
    providedSession?: Session | null,
    providedToken?: JWT | null,
  ): Promise<Response> {
    try {
      // Check if pooling service is available
      if (!this.agentPoolingService) {
        console.log(
          '[INFO] Agent pooling not available, creating agent directly',
        );
        return this.handleWithDirectAgent(
          chatRequest,
          userContext,
          routingDecision,
          shouldStream,
          providedSession,
          providedToken,
        );
      }

      // Prepare agent execution request
      const mockUser = {
        id: userContext.userId,
        givenName: userContext.email?.split('@')[0] || userContext.userId,
        surname: '',
        displayName: userContext.email || userContext.userId,
        mail: userContext.email,
      };

      // Extract the current query and optimize it for web search if needed
      const currentQuery = this.extractMessageText(
        chatRequest.messages[chatRequest.messages.length - 1],
      );
      const optimizedQuery = await this.optimizeQueryForWebSearch(
        chatRequest,
        routingDecision,
        currentQuery,
        providedSession,
      );

      const agentExecutionContext: AgentExecutionContext = {
        query: optimizedQuery,
        messages: chatRequest.messages,
        user: mockUser,
        model: chatRequest.model,
        locale: 'en', // UserContext doesn't have locale, using default
        userConfig: userContext.custom,
        context: {
          temperature: chatRequest.temperature,
          systemPrompt: chatRequest.prompt,
          conversationId: chatRequest.conversationId,
        },
      };

      const agentExecutionRequest: AgentExecutionRequest = {
        agentType: routingDecision.agentType,
        context: agentExecutionContext,
        timeout: DEFAULT_AGENT_TIMEOUT,
      };

      if (shouldStream) {
        // Execute with streaming agent
        const pooledAgent = await this.agentPoolingService.getAgent(
          routingDecision.agentType,
        );
        if (!pooledAgent) {
          throw new Error(
            `No agent available for type: ${routingDecision.agentType}`,
          );
        }

        const stream = await (
          pooledAgent.instance as BaseAgent
        ).executeStreaming(agentExecutionContext);
        return this.formatStreamingResponse(stream, routingDecision);
      } else {
        // Execute with pooled agent (non-streaming)
        const executionResult = await this.agentPoolingService.executeWithAgent(
          routingDecision.agentType,
          agentExecutionRequest,
        );

        return await this.formatAgentResponse(
          executionResult.response,
          routingDecision,
          chatRequest,
          providedSession,
          providedToken,
          executionResult.agentInstance?.config,
        );
      }
    } catch (error) {
      console.error(
        `[ERROR] Agent execution failed for ${routingDecision.agentType}:`,
        error,
      );

      // Check if fallback is enabled
      if (routingDecision.flags.fallbackOnError !== false) {
        console.log(
          '[INFO] Agent failed, falling back to standard chat system',
        );
        return this.handleFallbackToStandardChat(
          chatRequest,
          providedSession,
          providedToken,
        );
      }

      throw error;
    }
  }

  /**
   * Handle request with direct agent creation (no pooling)
   */
  private async handleWithDirectAgent(
    chatRequest: EnhancedChatRequest,
    userContext: UserContext,
    routingDecision: RoutingDecision,
    shouldStream: boolean = true,
    providedSession?: Session | null,
    providedToken?: JWT | null,
  ): Promise<Response> {
    let agent = null;

    try {
      // Create agent directly
      const agentConfig = {
        id: `agent-${routingDecision.agentType}-${Date.now()}`,
        name: `${routingDecision.agentType} Agent`,
        type: routingDecision.agentType,
        environment: AgentExecutionEnvironment.LOCAL,
        modelId: chatRequest.model.id,
        instructions: chatRequest.prompt || 'You are a helpful AI assistant.',
        tools: [],
        temperature: chatRequest.temperature,
        maxTokens: undefined,
        timeout: DEFAULT_AGENT_TIMEOUT,
      };

      agent = await this.agentFactory.createAgent(agentConfig);

      // Prepare execution context
      const mockUser = {
        id: userContext.userId,
        givenName: userContext.email?.split('@')[0] || userContext.userId,
        surname: '',
        displayName: userContext.email || userContext.userId,
        mail: userContext.email,
      };

      // Extract the current query and optimize it for web search if needed
      const currentQuery = this.extractMessageText(
        chatRequest.messages[chatRequest.messages.length - 1],
      );
      const optimizedQuery = await this.optimizeQueryForWebSearch(
        chatRequest,
        routingDecision,
        currentQuery,
        providedSession,
      );

      const agentExecutionContext: AgentExecutionContext = {
        query: optimizedQuery,
        messages: chatRequest.messages,
        user: mockUser,
        model: chatRequest.model,
        locale: 'en', // UserContext doesn't have locale, using default
        userConfig: userContext.custom,
        context: {
          temperature: chatRequest.temperature,
          systemPrompt: chatRequest.prompt,
          conversationId: chatRequest.conversationId,
        },
      };

      if (shouldStream) {
        // Execute with streaming
        const stream = await (agent as BaseAgent).executeStreaming(
          agentExecutionContext,
        );
        return this.formatStreamingResponse(stream, routingDecision);
      } else {
        // Execute request (non-streaming)
        const result = await (agent as BaseAgent).execute(
          agentExecutionContext,
        );
        return await this.formatAgentResponse(
          result,
          routingDecision,
          chatRequest,
          providedSession,
          providedToken,
          (agent as BaseAgent).config,
        );
      }
    } finally {
      // Clean up agent
      if (agent && typeof agent.cleanup === 'function') {
        try {
          await agent.cleanup();
        } catch (cleanupError) {
          console.error('[ERROR] Failed to cleanup agent:', cleanupError);
        }
      }
    }
  }

  /**
   * Handle fallback to standard chat system
   */
  private async handleFallbackToStandardChat(
    chatRequest: EnhancedChatRequest,
    providedSession?: Session | null,
    providedToken?: JWT | null,
  ): Promise<Response> {
    // Convert back to original request format for standard chat system
    const originalRequest = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: chatRequest.model,
        messages: chatRequest.messages,
        prompt: chatRequest.prompt,
        temperature: chatRequest.temperature,
        botId: chatRequest.botId,
        stream: chatRequest.stream,
      }),
    });

    return this.standardChatService.handleRequest(
      originalRequest as NextRequest,
      providedSession,
      providedToken,
    );
  }

  /**
   * Handle request with standard chat system
   */
  private async handleWithStandardChat(
    req: NextRequest,
    providedSession?: Session | null,
    providedToken?: JWT | null,
    chatRequest?: EnhancedChatRequest,
  ): Promise<Response> {
    // If we have the parsed chat request, create a new request to avoid body consumption issues
    if (chatRequest) {
      const standardRequest = new Request(req.url, {
        method: 'POST',
        headers: req.headers,
        body: JSON.stringify(chatRequest),
      });
      return this.standardChatService.handleRequest(
        standardRequest as NextRequest,
        providedSession,
        providedToken,
      );
    }
    return this.standardChatService.handleRequest(
      req,
      providedSession,
      providedToken,
    );
  }

  /**
   * Format agent response for client (non-streaming)
   */
  private async formatAgentResponse(
    result: AgentResponse,
    routingDecision: RoutingDecision,
    chatRequest: EnhancedChatRequest,
    providedSession?: Session | null,
    providedToken?: JWT | null,
    agentConfig?: AgentConfig,
  ): Promise<Response> {
    if (!result.success) {
      throw new Error('Agent execution failed');
    }

    // Check if agent is configured to skip standard chat processing
    if (agentConfig?.skipStandardChatProcessing) {
      console.log(
        `[INFO] Agent ${result.agentType} configured to skip standard chat processing, returning direct response`,
        {
          agentId: result.agentId,
          contentLength: result.content?.length || 0,
        },
      );

      const response = {
        success: true,
        data: {
          text: result.content,
          sources: result.metadata?.agentMetadata?.sources || [],
          processingTime: result.metadata?.processingTime || 0,
          usedFallback: false,
          skipStandardChatProcessing: true,
        },
        metadata: {
          version: '2.0',
          timestamp: new Date().toISOString(),
          requestId: `req_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`,
          agentType: routingDecision.agentType,
          confidence: routingDecision.confidence,
          agentId: result.agentId,
          flagsUsed: routingDecision.flags,
          directResponse: true,
        },
      };

      return new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if we have structured content that needs to be processed
    if (
      result.structuredContent &&
      result.structuredContent.type === 'url_content'
    ) {
      console.log(
        '[INFO] [URLAgent] Detected structured content, processing through AI...',
        {
          itemCount: result.structuredContent.items.length,
          originalQuery: result.structuredContent.originalQuery,
          agentType: routingDecision.agentType,
        },
      );
      // For URL content, we need to pass it through the main chat pipeline
      // This will handle chunking, summarization, and answering the original query
      return await this.processStructuredContent(
        result,
        routingDecision,
        chatRequest,
        providedSession,
        providedToken,
      );
    }

    const response = {
      success: true,
      data: {
        text: result.content,
        sources: result.metadata?.agentMetadata?.sources || [],
        processingTime: result.metadata?.processingTime || 0,
        usedFallback: false,
      },
      metadata: {
        version: '2.0',
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        agentType: routingDecision.agentType,
        confidence: routingDecision.confidence,
        agentId: result.agentId,
        flagsUsed: routingDecision.flags,
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Process structured content from agents (e.g., URL content)
   */
  private async processStructuredContent(
    result: AgentResponse,
    routingDecision: RoutingDecision,
    chatRequest: EnhancedChatRequest,
    providedSession?: Session | null,
    providedToken?: JWT | null,
  ): Promise<Response> {
    console.log('[DEBUG] [URLAgent] Starting processStructuredContent');

    if (!result.structuredContent) {
      console.error('[ERROR] [URLAgent] No structured content to process');
      throw new Error('No structured content to process');
    }

    const { items, originalQuery, summary } = result.structuredContent;
    console.log('[DEBUG] [URLAgent] Processing structured content:', {
      itemCount: items.length,
      originalQuery,
      summaryStats: summary,
    });

    // Combine all extracted content with metadata
    let combinedContent = '';
    const contentMetadata: any[] = [];

    for (const item of items) {
      // Build a structured representation of the content
      combinedContent += `\n\n=== Content from: ${item.source} ===\n`;
      if (item.metadata?.title) {
        combinedContent += `Title: ${item.metadata.title}\n`;
      }
      combinedContent += `\n${item.content}\n`;
      combinedContent += `\n=== End of content from: ${item.source} ===\n`;

      contentMetadata.push({
        source: item.source,
        title: item.metadata?.title,
        contentLength: item.metadata?.contentLength,
        contentType: item.metadata?.contentType,
      });
    }

    // Create a modified chat request with the extracted content
    const messagesWithContent = [...chatRequest.messages];

    // Add the extracted content as a system message
    const systemMessage: Message = {
      role: 'system',
      content: `The following content has been extracted from the requested URLs:\n\n${combinedContent}\n\nUse this content to answer the user's question.`,
      messageType: 'text',
    };

    // Find the last user message and ensure it contains the original query
    let lastUserMessageIndex = -1;
    for (let i = messagesWithContent.length - 1; i >= 0; i--) {
      if (messagesWithContent[i].role === 'user') {
        lastUserMessageIndex = i;
        break;
      }
    }
    if (lastUserMessageIndex >= 0) {
      // Insert the system message right before the last user message
      messagesWithContent.splice(lastUserMessageIndex, 0, systemMessage);
    } else {
      // If no user message found, prepend the system message
      messagesWithContent.unshift(systemMessage);
    }

    // Create a new chat request with the modified messages
    const modifiedChatRequest: EnhancedChatRequest = {
      ...chatRequest,
      messages: messagesWithContent,
      // Add metadata about URL sources to the prompt if not already present
      prompt: chatRequest.prompt || DEFAULT_SYSTEM_PROMPT,
    };

    try {
      const systemMessage = messagesWithContent.find(
        (m) => m.role === 'system',
      );
      const systemContent = systemMessage
        ? typeof systemMessage.content === 'string'
          ? systemMessage.content.substring(0, 200) + '...'
          : '[Complex content]'
        : 'None';

      console.log(
        '[DEBUG] [URLAgent] Calling standard chat service with messages:',
        {
          messageCount: messagesWithContent.length,
          lastMessage:
            messagesWithContent[messagesWithContent.length - 1]?.role,
          systemMessageContent: systemContent,
        },
      );

      // Process through standard chat service
      const standardRequest = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(modifiedChatRequest),
      });

      console.log(
        '[DEBUG] [URLAgent] Making request to standard chat service...',
      );
      const standardResponse = await this.standardChatService.handleRequest(
        standardRequest as NextRequest,
        providedSession,
        providedToken,
      );
      console.log(
        '[DEBUG] [URLAgent] Standard chat service response received:',
        {
          status: standardResponse.status,
          contentType: standardResponse.headers.get('Content-Type'),
        },
      );

      // If the response is streaming, return it as-is
      if (
        standardResponse.headers
          .get('Content-Type')
          ?.includes('text/event-stream')
      ) {
        return standardResponse;
      }

      // For non-streaming responses, enhance with URL metadata
      const responseText = await standardResponse.text();
      let enhancedData: any;

      try {
        enhancedData = JSON.parse(responseText);
      } catch {
        // If not JSON, wrap in standard format
        enhancedData = {
          success: true,
          data: {
            text: responseText,
          },
        };
      }

      // Add URL sources to the response
      if (enhancedData.data) {
        enhancedData.data.sources = contentMetadata;
        enhancedData.data.urlProcessingStats = summary;
      }

      return new Response(JSON.stringify(enhancedData), {
        headers: {
          'Content-Type': 'application/json',
          'X-Agent-Type': routingDecision.agentType,
          'X-URL-Processed': 'true',
        },
      });
    } catch (error) {
      console.error(
        '[ERROR] Failed to process structured content through standard chat:',
        error,
      );

      // Fallback to returning a basic response with the extracted content
      const fallbackResponse = {
        success: true,
        data: {
          text: `I extracted content from the following URLs:\n\n${contentMetadata
            .map((m) => `- ${m.source} (${m.title || 'No title'})`)
            .join(
              '\n',
            )}\n\nThe content has been retrieved but I encountered an error processing your request. Please try rephrasing your question.`,
          sources: contentMetadata,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        metadata: {
          version: '2.0',
          timestamp: new Date().toISOString(),
          agentType: routingDecision.agentType,
          fallback: true,
        },
      };

      return new Response(JSON.stringify(fallbackResponse), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  /**
   * Format streaming agent response for client
   */
  private formatStreamingResponse(
    stream: ReadableStream<string>,
    routingDecision: RoutingDecision,
  ): Response {
    return new StreamingTextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Agent-Type': routingDecision.agentType,
        'X-Agent-Confidence': routingDecision.confidence.toString(),
      },
    });
  }

  /**
   * Helper methods
   */

  /**
   * Optimize query for web search agents by analyzing conversation context
   */
  private async optimizeQueryForWebSearch(
    chatRequest: EnhancedChatRequest,
    routingDecision: RoutingDecision,
    currentQuery: string,
    userSession?: Session | null,
  ): Promise<string> {
    // Only optimize for web search agents
    if (routingDecision.agentType !== AgentType.WEB_SEARCH) {
      return currentQuery;
    }

    // Only optimize if we have conversation history (more than just the current message)
    if (chatRequest.messages.length <= 1) {
      return currentQuery;
    }

    try {
      const openaiForAnalysis = this.getValidOpenAIInstance();
      const modelIdForAnalysis = this.getValidModelId();

      // Ensure we have the required dependencies
      if (!openaiForAnalysis || !userSession?.user) {
        console.log(
          '[INFO] Skipping web search query optimization: missing OpenAI instance or user session',
        );
        return currentQuery;
      }

      console.log(
        '[INFO] Optimizing web search query with conversation context',
      );

      const optimizedResult = await generateOptimizedWebSearchQuery(
        openaiForAnalysis,
        chatRequest.messages,
        currentQuery,
        userSession.user,
        modelIdForAnalysis,
      );

      console.log('[INFO] Web search query optimized:', {
        originalQuery: currentQuery,
        optimizedQuery: optimizedResult.optimizedQuery,
        messageCount: chatRequest.messages.length,
      });

      return optimizedResult.optimizedQuery;
    } catch (error) {
      console.error(
        '[ERROR] Failed to optimize web search query, using original query:',
        error,
      );
      return currentQuery;
    }
  }

  private async parseRequest(req: NextRequest): Promise<EnhancedChatRequest> {
    const body = await req.json();
    return this.parseRequestFromBody(body);
  }

  private parseRequestFromBody(body: any): EnhancedChatRequest {
    return {
      ...body,
      conversationId: body.conversationId || `conv_${Date.now()}`,
      enableFallback: body.enableFallback !== false,
    };
  }

  private async extractUserContext(
    req: NextRequest,
    providedSession?: Session | null,
    providedToken?: JWT | null,
  ): Promise<UserContext> {
    // Extract user context from request headers, session, etc.
    // Prioritize headers first (for testing/admin purposes), then use provided session data
    let userId = req.headers.get('x-user-id') || 'anonymous';
    let userEmail = req.headers.get('x-user-email') || undefined;
    let userRole = req.headers.get('x-user-role') || 'user';

    // If no headers provided and we have session data, use that
    if (providedSession?.user && userId === 'anonymous') {
      userId =
        providedSession.user.id ||
        (providedSession.user as any).email ||
        'authenticated_user';
      userEmail = userEmail || (providedSession.user as any).email || undefined;
      userRole = userRole || (providedSession.user as any).role || 'user';
    }

    return {
      userId,
      email: userEmail,
      role: userRole,
      custom: {
        userAgent: req.headers.get('user-agent'),
        timestamp: new Date().toISOString(),
        sessionId: (providedToken as any)?.sub,
      },
    };
  }

  private extractMessageText(message: Message): string {
    if (typeof message.content === 'string') {
      return message.content;
    }

    if (Array.isArray(message.content)) {
      for (const contentItem of message.content) {
        if (contentItem.type === 'text') {
          return (contentItem as TextMessageContent).text || '';
        }
      }
    }

    return '';
  }

  private selectAgentType(intentAnalysis: any, flags: any): AgentType {
    console.log('[EnhancedChatService] Selecting agent type:', {
      recommendedAgent: intentAnalysis.recommendedAgent,
      confidence: intentAnalysis.confidence,
      flags: flags,
      agentFlagType: flags.agentType,
    });

    // Select agent based on intent analysis and available flags
    // Check if we're forced to use legacy (non-agent) mode
    if (flags.agentType === 'legacy') {
      console.log(
        '[EnhancedChatService] Forced to legacy mode, defaulting to WEB_SEARCH',
      );
      return AgentType.WEB_SEARCH;
    }

    // Use the recommended agent type from AI-powered intent analysis
    const selectedType =
      intentAnalysis.recommendedAgent || AgentType.WEB_SEARCH;

    console.log('[EnhancedChatService] Selected agent type:', selectedType);
    return selectedType;
  }

  private updateMetrics(usedAgents: boolean, responseTime: number): void {
    if (usedAgents) {
      const currentAvg = this.metrics.averageAgentResponseTime;
      const agentRequests = this.metrics.agentRequests;
      this.metrics.averageAgentResponseTime =
        (currentAvg * (agentRequests - 1) + responseTime) / agentRequests;
    } else {
      const currentAvg = this.metrics.averageLegacyResponseTime;
      const standardRequests = this.metrics.legacyRequests; // Will rename this metric later
      this.metrics.averageLegacyResponseTime =
        (currentAvg * (standardRequests - 1) + responseTime) / standardRequests;
    }
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      agentUsagePercentage:
        this.metrics.totalRequests > 0
          ? (this.metrics.agentRequests / this.metrics.totalRequests) * 100
          : 0,
      fallbackRate:
        this.metrics.totalRequests > 0
          ? (this.metrics.fallbackRequests / this.metrics.totalRequests) * 100
          : 0,
    };
  }

  /**
   * Health check
   */
  async getHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: Record<string, any>;
    metrics: any;
  }> {
    const components: Record<string, any> = {};
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Check feature flag service
    try {
      const ffHealth = this.featureFlagService.getHealthStatus();
      components.featureFlags = {
        status: ffHealth.isInitialized ? 'healthy' : 'unhealthy',
        details: ffHealth,
      };
      if (!ffHealth.isInitialized) overallStatus = 'degraded';
    } catch (error) {
      components.featureFlags = { status: 'unhealthy', error: String(error) };
      overallStatus = 'unhealthy';
    }

    // Check agent pooling service
    if (this.agentPoolingService) {
      try {
        const poolStats = this.agentPoolingService.getPoolStats();
        components.agentPooling = {
          status: poolStats.totalAgents > 0 ? 'healthy' : 'degraded',
          details: poolStats,
        };
        if (poolStats.totalAgents === 0) overallStatus = 'degraded';
      } catch (error) {
        components.agentPooling = { status: 'unhealthy', error: String(error) };
        overallStatus = 'unhealthy';
      }
    } else {
      components.agentPooling = { status: 'unavailable' };
    }

    return {
      status: overallStatus,
      components,
      metrics: this.getMetrics(),
    };
  }

  /**
   * Get a valid OpenAI instance for intent analysis
   */
  private getValidOpenAIInstance(): AzureOpenAI | undefined {
    // If we already have an instance, return it
    if (this.openaiInstance) {
      return this.openaiInstance;
    }

    // Try to create one on-demand if initialization failed
    try {
      console.log(
        '[INFO] Creating Azure OpenAI instance on-demand for intent analysis',
      );
      const azureADTokenProvider = getBearerTokenProvider(
        new DefaultAzureCredential(),
        'https://cognitiveservices.azure.com/.default',
      );

      return new AzureOpenAI({
        azureADTokenProvider,
        apiVersion: process.env.OPENAI_API_VERSION ?? '2025-03-01-preview',
      });
    } catch (error) {
      console.error(
        '[ERROR] Failed to create Azure OpenAI instance on-demand:',
        error,
      );
    }

    console.warn(
      '[WARN] No valid OpenAI instance available, intent analysis will use heuristic fallback',
    );
    return undefined;
  }

  /**
   * Get a valid model ID for intent analysis
   */
  private getValidModelId(): string {
    // Return the stored model ID if available
    if (this.modelId) {
      return this.modelId;
    }

    // Try to determine model ID from environment variables
    const modelId = 'gpt-4o-mini';

    console.log('[INFO] Using model ID for intent analysis:', modelId);
    return modelId;
  }

  /**
   * Initialize AI services for intent analysis
   */
  private initializeAIServices(modelId?: string): void {
    try {
      // Initialize Azure OpenAI using the same pattern as ChatService
      const azureADTokenProvider = getBearerTokenProvider(
        new DefaultAzureCredential(),
        'https://cognitiveservices.azure.com/.default',
      );

      this.openaiInstance = new AzureOpenAI({
        azureADTokenProvider,
        apiVersion: process.env.OPENAI_API_VERSION ?? '2025-03-01-preview',
      });

      this.modelId = modelId ?? 'gpt-4o-mini';
      console.log(
        '[INFO] Azure OpenAI initialized for intent analysis with Azure AD credentials, model:',
        this.modelId,
      );
    } catch (error) {
      console.error(
        '[ERROR] Failed to initialize Azure OpenAI with Azure AD credentials:',
        error,
      );
      // Ensure we have a fallback model ID even if initialization fails
      this.modelId = 'gpt-4o-mini';
      console.warn(
        '[WARN] Azure OpenAI initialization failed, intent analysis will use heuristic fallback only',
      );
      console.log(
        '[INFO] Using fallback model ID after initialization error:',
        this.modelId,
      );
    }
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    try {
      console.log('[INFO] Shutting down Enhanced Chat Service');

      // TODO: Re-enable when Azure Monitor Dashboard is implemented
      // Stop Azure Monitor metrics collection
      // azureMonitorDashboard.stopMetricsCollection();

      if (this.agentPoolingService) {
        await this.agentPoolingService.shutdown();
      }

      await AgentFactory.shutdown();
      await this.featureFlagService.close();

      console.log('[INFO] Enhanced Chat Service shutdown complete');
    } catch (error) {
      console.error(
        '[ERROR] Error during Enhanced Chat Service shutdown:',
        error,
      );
    }
  }
}

/**
 * Singleton instance
 */
let enhancedChatServiceInstance: EnhancedChatService | null = null;

/**
 * Get or create the enhanced chat service instance
 */
export function getEnhancedChatService(): EnhancedChatService {
  if (!enhancedChatServiceInstance) {
    enhancedChatServiceInstance = new EnhancedChatService();
    // Initialize the service asynchronously
    // Note: This is fire-and-forget to avoid blocking synchronous calls
    initializeEnhancedChatService().catch((error) => {
      console.error(
        '[ERROR] Failed to initialize Enhanced Chat Service:',
        error,
      );
    });
  }
  return enhancedChatServiceInstance;
}

/**
 * Initialize the enhanced chat service
 */
export async function initializeEnhancedChatService(): Promise<void> {
  const service = getEnhancedChatService();
  await service.initialize();
}

/**
 * Get enhanced chat service with initialization guarantee
 */
export async function getInitializedEnhancedChatService(): Promise<EnhancedChatService> {
  const service = getEnhancedChatService();
  if (!service.isServiceInitialized) {
    await service.initialize();
  }
  return service;
}
