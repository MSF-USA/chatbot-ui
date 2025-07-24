import { Session } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { JWT } from 'next-auth/jwt';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';

import { executeAgentRequest } from '@/services/agentFactory';

import {
  AgentConfig,
  AgentExecutionContext,
  AgentExecutionEnvironment,
  AgentType,
  CodeInterpreterAgentConfig,
  LocalKnowledgeAgentConfig,
  TranslationAgentConfig,
  UrlPullAgentConfig,
  WebSearchAgentConfig,
} from '@/types/agent';
import {
  AgentExecutionApiRequest,
  AgentExecutionApiResponse,
  DEFAULT_AGENT_CONFIGS,
  isSupportedAgentType,
} from '@/types/agentApi';
import { AccessLevel, UserRole } from '@/types/localKnowledge';
import { OpenAIModel } from '@/types/openai';

import { authOptions } from '@/pages/api/auth/[...nextauth]';

/**
 * Validate request body for agent execution
 */
function validateRequest(body: any): {
  isValid: boolean;
  errors: string[];
  data?: AgentExecutionApiRequest;
} {
  const errors: string[] = [];

  // Check required fields
  if (!body.agentType) {
    errors.push('agentType is required');
  } else if (!isSupportedAgentType(body.agentType)) {
    errors.push(
      `agentType must be one of: ${Object.values(AgentType).join(', ')}`,
    );
  }

  if (!body.query || typeof body.query !== 'string') {
    errors.push('query is required and must be a string');
  }

  if (body.query && body.query.length > 10000) {
    errors.push('query is too long (max 10,000 characters)');
  }

  // Validate conversation history
  if (body.conversationHistory && !Array.isArray(body.conversationHistory)) {
    errors.push('conversationHistory must be an array');
  }

  if (body.conversationHistory && body.conversationHistory.length > 10) {
    errors.push('conversationHistory is too long (max 10 messages)');
  }

  if (
    body.conversationHistory &&
    body.conversationHistory.some((msg: any) => typeof msg !== 'string')
  ) {
    errors.push('conversationHistory items must be strings');
  }

  // Validate optional fields
  if (body.model && typeof body.model !== 'object') {
    errors.push('model must be an object');
  }

  if (body.model?.id && typeof body.model.id !== 'string') {
    errors.push('model.id must be a string');
  }

  if (body.config && typeof body.config !== 'object') {
    errors.push('config must be an object');
  }

  if (body.timeout && (typeof body.timeout !== 'number' || body.timeout <= 0)) {
    errors.push('timeout must be a positive number');
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? (body as AgentExecutionApiRequest) : undefined,
  };
}

/**
 * Create agent configuration from API request
 */
function createAgentConfig(
  request: AgentExecutionApiRequest,
  session: Session,
):
  | AgentConfig
  | WebSearchAgentConfig
  | UrlPullAgentConfig
  | CodeInterpreterAgentConfig
  | LocalKnowledgeAgentConfig
  | TranslationAgentConfig {
  const defaultConfig = DEFAULT_AGENT_CONFIGS[request.agentType] || {};
  const userConfig = request.config || {};

  const config: AgentConfig = {
    id: `api-${request.agentType}-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`,
    name: `API ${request.agentType} Agent`,
    type: request.agentType,
    environment: getAgentEnvironment(request.agentType),
    modelId: request.model?.id || 'gpt-4o-mini',
    instructions: `Process the user query using ${request.agentType} agent capabilities`,
    tools: [],
    timeout: request.timeout || 300000, // 5 minutes default
    metadata: {
      apiRequest: true,
      userId: session.user?.id,
      requestTime: new Date().toISOString(),
    },
    parameters: {
      ...defaultConfig,
      ...userConfig,
    },
  };

  // Add agent-specific configuration
  switch (request.agentType) {
    case AgentType.WEB_SEARCH:
      return {
        ...config,
        webSearchConfig: {
          endpoint: process.env.AZURE_AI_FOUNDRY_ENDPOINT || '',
          apiKey: process.env.AZURE_GROUNDING_CONNECTION_ID || '',
          defaultMarket:
            userConfig.defaultMarket || defaultConfig.defaultMarket,
          defaultSafeSearch:
            userConfig.defaultSafeSearch || defaultConfig.defaultSafeSearch,
          maxResults: userConfig.maxResults || defaultConfig.maxResults,
          timeout: request.timeout || 30000,
          enableCaching:
            userConfig.enableCaching ?? defaultConfig.enableCaching,
          cacheTtl: userConfig.cacheTtl || defaultConfig.cacheTtl,
          retry: {
            maxAttempts: 3,
            baseDelay: 1000,
            maxDelay: 10000,
          },
        },
      };

    case AgentType.URL_PULL:
      return {
        ...config,
        urlPullConfig: {
          maxUrls: userConfig.maxUrls || defaultConfig.maxUrls,
          timeout: request.timeout || defaultConfig.processingTimeout,
          concurrencyLimit:
            userConfig.concurrencyLimit || defaultConfig.concurrencyLimit,
          enableCaching:
            userConfig.enableCaching ?? defaultConfig.enableCaching,
          cacheTtl: userConfig.cacheTtl || defaultConfig.cacheTtl,
        },
        maxUrls: userConfig.maxUrls || defaultConfig.maxUrls,
        processingTimeout: request.timeout || defaultConfig.processingTimeout,
        enableParallelProcessing:
          userConfig.enableParallelProcessing ??
          defaultConfig.enableParallelProcessing,
        concurrencyLimit:
          userConfig.concurrencyLimit || defaultConfig.concurrencyLimit,
        enableContentExtraction:
          userConfig.enableContentExtraction ??
          defaultConfig.enableContentExtraction,
        enableCaching: userConfig.enableCaching ?? defaultConfig.enableCaching,
        cacheTtl: userConfig.cacheTtl || defaultConfig.cacheTtl,
      };

    case AgentType.LOCAL_KNOWLEDGE:
      return {
        ...config,
        knowledgeBaseConfig: {
          name: 'Default Knowledge Base',
          basePath: '/knowledge',
          supportedFileTypes: ['pdf', 'txt', 'md', 'docx'],
          maxFileSize: 50, // MB
          indexingConfig: {
            enableFullText: true,
            enableVectorIndex: true,
            batchSize: 100,
            updateFrequency: 24, // hours
            extractEntities: true,
            supportedLanguages: ['en'],
          },
          searchConfig: {
            embeddingModel: 'text-embedding-ada-002',
            vectorDimension: 1536,
            similarityThreshold:
              userConfig.confidenceThreshold ||
              defaultConfig.confidenceThreshold ||
              0.7,
            maxResults: userConfig.maxResults || defaultConfig.maxResults || 10,
            enableHybridSearch:
              userConfig.enableHybridSearch ??
              defaultConfig.enableHybridSearch ??
              true,
            keywordWeight: 0.3,
            semanticWeight: 0.7,
            enableReRanking: true,
          },
          accessControl: {
            enableRBAC: false,
            defaultAccessLevel: AccessLevel.INTERNAL,
            enableDepartmentFiltering: false,
            adminRoles: [UserRole.ADMIN, UserRole.IT_ADMIN],
            guestLimitations: {
              maxResults: 5,
              allowedTypes: [],
            },
          },
          caching: {
            enableSearchCache:
              userConfig.enableCaching ?? defaultConfig.enableCaching ?? true,
            cacheTTL: userConfig.cacheTtl || defaultConfig.cacheTtl || 300,
            maxCacheSize: 1000,
            enableDocumentCache: true,
            enableVectorCache: true,
          },
          autoUpdate: {
            enabled: false,
            interval: 60, // minutes
            sources: [],
          },
        },
      };

    case AgentType.CODE_INTERPRETER:
      return {
        ...config,
        codeInterpreterConfig: {
          foundryEndpoint: process.env.AZURE_AI_FOUNDRY_ENDPOINT || '',
          projectId: process.env.AZURE_AI_PROJECT_ID || '',
          defaultTimeout: request.timeout || 30000,
          maxMemoryMb: 512,
          enableValidation: true,
          enableCaching:
            userConfig.enableCaching ?? defaultConfig.enableCaching ?? true,
          cacheTtl: userConfig.cacheTtl || defaultConfig.cacheTtl || 3600,
        },
      };

    case AgentType.TRANSLATION:
      return {
        ...config,
        defaultSourceLanguage:
          userConfig.defaultSourceLanguage || defaultConfig.defaultSourceLanguage || '',
        defaultTargetLanguage:
          userConfig.defaultTargetLanguage || defaultConfig.defaultTargetLanguage || 'en',
        enableLanguageDetection:
          userConfig.enableLanguageDetection ?? defaultConfig.enableLanguageDetection ?? true,
        enableCaching:
          userConfig.enableCaching ?? defaultConfig.enableCaching ?? true,
        cacheTtl: userConfig.cacheTtl || defaultConfig.cacheTtl || 3600,
        maxTextLength:
          userConfig.maxTextLength || defaultConfig.maxTextLength || 10000,
        temperature: userConfig.temperature || defaultConfig.temperature || 0.3,
      };

    default:
      return config;
  }
}

/**
 * Get appropriate execution environment for agent type
 */
function getAgentEnvironment(agentType: AgentType): AgentExecutionEnvironment {
  switch (agentType) {
    case AgentType.CODE_INTERPRETER:
      return AgentExecutionEnvironment.CODE;
    case AgentType.LOCAL_KNOWLEDGE:
      return AgentExecutionEnvironment.LOCAL;
    case AgentType.THIRD_PARTY:
      return AgentExecutionEnvironment.THIRD_PARTY;
    case AgentType.TRANSLATION:
      return AgentExecutionEnvironment.FOUNDRY;
    default:
      return AgentExecutionEnvironment.FOUNDRY;
  }
}

/**
 * POST /api/v2/agent/execute
 * Execute an agent and return direct output
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const startTime = new Date();

  try {
    // Parse request body
    let body: any;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_JSON',
            message: 'Invalid JSON in request body',
            details: error,
          },
          execution: {
            startTime: startTime.toISOString(),
            endTime: new Date().toISOString(),
            executionTime: Date.now() - startTime.getTime(),
            agentType: 'unknown' as any,
          },
        } as AgentExecutionApiResponse,
        { status: 400 },
      );
    }

    // Validate request
    const validation = validateRequest(body);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: validation.errors,
          },
          execution: {
            startTime: startTime.toISOString(),
            endTime: new Date().toISOString(),
            executionTime: Date.now() - startTime.getTime(),
            agentType: body.agentType || ('unknown' as any),
          },
        } as AgentExecutionApiResponse,
        { status: 400 },
      );
    }

    const request = validation.data!;

    // Get authentication
    const token = (await getToken({ req })) as JWT | null;
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          execution: {
            startTime: startTime.toISOString(),
            endTime: new Date().toISOString(),
            executionTime: Date.now() - startTime.getTime(),
            agentType: request.agentType,
          },
        } as AgentExecutionApiResponse,
        { status: 401 },
      );
    }

    const session = (await getServerSession(
      authOptions as any,
    )) as Session | null;
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SESSION_ERROR',
            message: 'Failed to get user session',
          },
          execution: {
            startTime: startTime.toISOString(),
            endTime: new Date().toISOString(),
            executionTime: Date.now() - startTime.getTime(),
            agentType: request.agentType,
          },
        } as AgentExecutionApiResponse,
        { status: 401 },
      );
    }

    // Create agent configuration
    const agentConfig = createAgentConfig(request, session);

    // Create execution context
    const context: AgentExecutionContext = {
      query: request.query,
      messages: [], // Empty for API usage
      conversationHistory: request.conversationHistory, // Include conversation history
      user: session.user,
      model: {
        id: request.model?.id || 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        maxLength: 128000,
        tokenLimit: request.model?.tokenLimit || 128000,
      } as OpenAIModel,
      locale: 'en-US',
      userConfig: request.config,
      context: {
        requestId: agentConfig.id,
        timestamp: startTime.toISOString(),
        userAgent: req.headers.get('user-agent') || '',
        ip:
          req.headers.get('x-forwarded-for') ||
          req.headers.get('x-real-ip') ||
          '',
      },
      correlationId: agentConfig.id,
    };

    // Execute agent request
    console.log(
      `[AgentAPI] Executing ${
        request.agentType
      } agent for query: ${request.query.substring(0, 100)}...`,
    );

    const result = await executeAgentRequest({
      agentType: request.agentType,
      context,
      config: agentConfig,
      timeout: request.timeout,
    });

    const endTime = new Date();
    const executionTime = endTime.getTime() - startTime.getTime();

    // Format successful response
    const response: AgentExecutionApiResponse = {
      success: true,
      data: {
        content: result.response.content,
        agentType: result.response.agentType,
        agentId: result.response.agentId,
        structuredContent: result.response.structuredContent,
        metadata: {
          processingTime: executionTime,
          confidence: result.response.metadata?.confidence || 0,
          agentMetadata: result.response.metadata?.agentMetadata,
        },
      },
      execution: {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        executionTime,
        agentType: request.agentType,
      },
    };

    console.log(
      `[AgentAPI] ${request.agentType} agent execution completed successfully in ${executionTime}ms`,
    );

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const endTime = new Date();
    const executionTime = endTime.getTime() - startTime.getTime();

    console.error('[AgentAPI] Agent execution failed:', error);

    const response: AgentExecutionApiResponse = {
      success: false,
      error: {
        code:
          error instanceof Error && error.name ? error.name : 'EXECUTION_ERROR',
        message:
          error instanceof Error ? error.message : 'Unknown error occurred',
        details: error,
      },
      execution: {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        executionTime,
        agentType: 'unknown' as any,
      },
    };

    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * GET /api/v2/agent/execute
 * Get supported agent types and their configurations
 */
export async function GET(): Promise<NextResponse> {
  try {
    const supportedAgents =
      Object.values(AgentType).filter(isSupportedAgentType);

    return NextResponse.json({
      success: true,
      data: {
        supportedAgentTypes: supportedAgents,
        defaultConfigs: DEFAULT_AGENT_CONFIGS,
        environments: Object.values(AgentExecutionEnvironment),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CONFIG_ERROR',
          message: 'Failed to get agent configuration',
          details: error,
        },
      },
      { status: 500 },
    );
  }
}
