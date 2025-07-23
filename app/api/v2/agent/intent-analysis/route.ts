import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import { AzureOpenAI } from 'openai';
import {
  DefaultAzureCredential,
  getBearerTokenProvider,
} from '@azure/identity';

import {
  IntentAnalysisApiRequest,
  IntentAnalysisApiResponse,
} from '@/types/agentApi';
import { getIntentAnalysisService } from '@/services/intentAnalysis';
import { IntentAnalysisContext } from '@/types/intentAnalysis';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import {OpenAIModelID} from "@/types/openai";

// OpenAI instance for AI-powered intent analysis
let openaiInstance: AzureOpenAI | null = null;

/**
 * Get or initialize the OpenAI instance for AI classification
 */
function getOpenAIInstance(): AzureOpenAI | null {
  if (!openaiInstance) {
    try {
      const azureADTokenProvider = getBearerTokenProvider(
        new DefaultAzureCredential(),
        'https://cognitiveservices.azure.com/.default',
      );

      openaiInstance = new AzureOpenAI({
        azureADTokenProvider,
        apiVersion: process.env.OPENAI_API_VERSION ?? '2025-03-01-preview',
      });
      
      console.log('[IntentAnalysisAPI] OpenAI instance initialized successfully');
    } catch (error) {
      console.warn('[IntentAnalysisAPI] Failed to initialize OpenAI instance:', error);
      openaiInstance = null;
    }
  }
  return openaiInstance;
}

/**
 * Build intent analysis context from API request
 */
function buildIntentAnalysisContext(
  request: IntentAnalysisApiRequest,
  session: Session | null
): IntentAnalysisContext {
  return {
    query: request.message,
    conversationHistory: request.conversationHistory || [],
    locale: request.locale || 'en',
    userPreferences: {
      preferredAgents: undefined,
      disabledAgents: undefined,
      languagePreference: request.locale || 'en'
    },
    additionalContext: {
      timestamp: new Date().toISOString(),
      userAgent: request.userAgent || '',
      messageLength: request.message.length,
    },
    timestamp: new Date(),
    sessionInfo: {
      sessionId: session?.user?.id || 'anonymous',
      userId: session?.user?.id || 'anonymous',
      previousInteractions: request.conversationHistory?.length || 0
    }
  };
}

/**
 * Validate request body for intent analysis
 */
function validateRequest(body: any): {
  isValid: boolean;
  errors: string[];
  data?: IntentAnalysisApiRequest;
} {
  const errors: string[] = [];

  // Check required fields
  if (!body.message || typeof body.message !== 'string') {
    errors.push('message is required and must be a string');
  }

  if (body.message && body.message.length === 0) {
    errors.push('message cannot be empty');
  }

  if (body.message && body.message.length > 5000) {
    errors.push('message is too long (max 5,000 characters)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? body as IntentAnalysisApiRequest : undefined,
  };
}

/**
 * Check if message has question patterns
 */
function hasQuestionPattern(message: string): boolean {
  const questionIndicators = [
    '?', 'how', 'what', 'when', 'where', 'why', 'who', 'which',
    'can you', 'could you', 'would you', 'do you', 'is it', 'are there'
  ];

  const lowerMessage = message.toLowerCase();
  return questionIndicators.some(indicator => lowerMessage.includes(indicator));
}

/**
 * Check if message has urgency patterns
 */
function hasUrgencyPattern(message: string): boolean {
  const urgencyIndicators = [
    'urgent', 'asap', 'quickly', 'fast', 'immediate', 'now', 'right now',
    'emergency', 'critical', 'deadline', 'soon'
  ];

  const lowerMessage = message.toLowerCase();
  return urgencyIndicators.some(indicator => lowerMessage.includes(indicator));
}

/**
 * POST /api/v2/agent/intent-analysis
 * Analyze user message intent and provide agent routing suggestions
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
          },
        } as IntentAnalysisApiResponse,
        { status: 400 }
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
          },
        } as IntentAnalysisApiResponse,
        { status: 400 }
      );
    }

    const request = validation.data!;

    // Get authentication (optional for intent analysis, but recommended)
    const token = (await getToken({ req })) as JWT | null;
    const session = token ? (await getServerSession(authOptions as any)) as Session | null : null;

    // Log request (optional authentication)
    console.log('[IntentAnalysisAPI] Analyzing intent for message: %s...', request.message.substring(0, 100), {
      userId: session?.user?.id || 'anonymous',
      messageLength: request.message.length,
    });

    // Get intent analysis service
    const service = getIntentAnalysisService();

    // Build intent analysis context
    const context = buildIntentAnalysisContext(request, session);
    
    // Get OpenAI instance for AI classification (if available)
    const openai = getOpenAIInstance();
    const modelId = OpenAIModelID.GPT_4o_mini; // Default model for intent analysis
    
    console.log('[IntentAnalysisAPI] Starting intent analysis with context:', {
      queryLength: context.query.length,
      hasConversationHistory: context.conversationHistory.length > 0,
      locale: context.locale,
      hasOpenAI: !!openai,
      hasUser: !!session?.user
    });

    // Perform intent analysis with comprehensive service
    const analysisResult = await service.analyzeIntent(
      context,
      openai || undefined,
      modelId,
      session?.user
    );

    const endTime = new Date();
    const executionTime = endTime.getTime() - startTime.getTime();

    // Add additional metadata
    const hasQuestion = hasQuestionPattern(request.message);
    const hasUrgency = hasUrgencyPattern(request.message);

    // Format successful response
    const response: IntentAnalysisApiResponse = {
      success: true,
      data: {
        recommendedAgent: analysisResult.recommendedAgent,
        confidence: analysisResult.confidence,
        alternatives: analysisResult.alternatives,
        parameters: analysisResult.parameters,
        reasoning: analysisResult.reasoning,
        analysisMethod: analysisResult.analysisMethod,
        processingTime: analysisResult.processingTime,
        locale: analysisResult.locale,
        metadata: {
          hasQuestion,
          hasUrgency,
          messageLength: request.message.length,
          aiClassificationUsed: analysisResult.analysisMethod === 'ai' || analysisResult.analysisMethod === 'hybrid',
          fallbackReason: analysisResult.analysisMethod === 'heuristic' ? 'AI classification unavailable or failed' : undefined,
        },
      },
      execution: {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        executionTime,
      },
    };

    console.log(`[IntentAnalysisAPI] Intent analysis completed successfully in ${executionTime}ms`, {
      recommendedAgent: analysisResult.recommendedAgent,
      confidence: analysisResult.confidence,
      analysisMethod: analysisResult.analysisMethod,
      alternativesCount: analysisResult.alternatives.length,
      processingTime: analysisResult.processingTime,
    });

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    const endTime = new Date();
    const executionTime = endTime.getTime() - startTime.getTime();

    console.error('[IntentAnalysisAPI] Intent analysis failed:', error);

    const response: IntentAnalysisApiResponse = {
      success: false,
      error: {
        code: error instanceof Error && error.name ? error.name : 'ANALYSIS_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred during intent analysis',
        details: error,
      },
      execution: {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        executionTime,
      },
    };

    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * GET /api/v2/agent/intent-analysis
 * Get intent analysis service health and capabilities
 */
export async function GET(): Promise<NextResponse> {
  try {
    const service = getIntentAnalysisService();
    const metrics = service.getMetrics();
    const openai = getOpenAIInstance();

    return NextResponse.json({
      success: true,
      data: {
        service: 'ComprehensiveIntentAnalysisService',
        status: 'healthy',
        capabilities: {
          aiClassification: !!openai,
          heuristicFallback: true,
          multiLanguageSupport: true,
          caching: true,
          confidenceScoring: true,
          parameterExtraction: true,
        },
        supportedAgentTypes: [
          'WEB_SEARCH',
          'CODE_INTERPRETER',
          'LOCAL_KNOWLEDGE',
          'URL_PULL',
          'STANDARD_CHAT',
          'FOUNDRY',
          'THIRD_PARTY',
        ],
        analysisFeatures: [
          'ai-powered-classification',
          'heuristic-pattern-matching',
          'confidence-scoring',
          'parameter-extraction',
          'multi-language-support',
          'caching',
          'performance-metrics',
          'alternative-suggestions',
        ],
        supportedLocales: [
          'en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh'
        ],
        metrics: {
          totalAnalyses: metrics.totalAnalyses,
          successfulAIClassifications: metrics.successfulAIClassifications,
          heuristicFallbacks: metrics.heuristicFallbacks,
          averageProcessingTime: metrics.averageProcessingTime,
          cacheHitRate: metrics.cacheHitRate,
          errorRate: metrics.errorRate,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVICE_ERROR',
          message: 'Failed to get intent analysis service status',
          details: error,
        },
      },
      { status: 500 }
    );
  }
}