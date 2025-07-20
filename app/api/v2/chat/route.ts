/**
 * Enhanced Chat API v2 Endpoint
 * 
 * Provides enhanced chat capabilities with Azure AI Agent routing,
 * streaming responses, comprehensive validation, and monitoring.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getServerSession } from 'next-auth/next';
import { JWT } from 'next-auth/jwt';

import { ChatBody, Message, MessageType, TextMessageContent } from '@/types/chat';
import { AgentType } from '@/types/agent';
import { 
  AgentExecutionApiRequest, 
  AgentExecutionApiResponse,
  IntentAnalysisApiRequest,
  IntentAnalysisApiResponse
} from '@/types/agentApi';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

import ChatService from '@/services/chatService';
import { getInitializedEnhancedChatService } from '@/services/enhancedChatService';
import { UserContext } from '@/services/simpleFeatureFlags';
import { AzureMonitorLoggingService } from '@/services/loggingService';
import { AGENT_ROUTING_ENABLED } from '@/utils/app/const';
import {Session, User} from "next-auth";

export const maxDuration: number = 300;

/**
 * Enhanced chat request interface for v2 API
 */
interface ChatV2Request extends ChatBody {
  conversationId?: string;
  userContext?: Partial<UserContext>;
  forceAgentType?: AgentType;
  forceStandardChat?: boolean;
  enableStreaming?: boolean;
  enableFallback?: boolean;
  metadata?: {
    clientVersion?: string;
    sessionId?: string;
    debugMode?: boolean;
  };
}

/**
 * Enhanced chat response interface for v2 API
 */
interface ChatV2Response {
  success: boolean;
  data?: {
    text?: string;
    agentType?: AgentType;
    confidence?: number;
    sources?: any[];
    processingTime?: number;
    usedFallback?: boolean;
    conversationId?: string;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
  metadata: {
    version: string;
    timestamp: string;
    requestId: string;
    flags?: Record<string, any>;
  };
}

/**
 * Extract user context from request
 */
const extractUserContext = async (req: NextRequest, session?: Session | null, token?: JWT | null): Promise<UserContext> => {
  try {
    // Use provided session/token or extract them if not provided
    const userSession = session ?? await getServerSession(authOptions as any);
    const userToken = token ?? await getToken({ req: req as any });

    let userId = 'anonymous';
    let userEmail: string | undefined;
    let userRole = 'user';

    if (userSession?.user) {
      userId = userSession.user.id || (userSession.user as User).email || 'authenticated_user';
      userEmail = (userSession.user as User).email || undefined;
      userRole = (userSession.user as any).role || 'user';
    }

    // Allow override from headers (for testing/admin purposes)
    const headerUserId = req.headers.get('x-user-id');
    const headerUserEmail = req.headers.get('x-user-email');
    const headerUserRole = req.headers.get('x-user-role');

    return {
      userId: headerUserId || userId,
      email: headerUserEmail || userEmail,
      role: headerUserRole || userRole,
      custom: {
        userAgent: req.headers.get('user-agent'),
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        timestamp: new Date().toISOString(),
        sessionId: userToken?.sub,
      },
    };
  } catch (error) {
    console.warn('[WARN] Failed to extract user context:', error);
    
    // Fallback to anonymous user
    return {
      userId: 'anonymous',
      role: 'user',
      custom: {
        userAgent: req.headers.get('user-agent'),
        timestamp: new Date().toISOString(),
      },
    };
  }
};

/**
 * Create error response
 */
const createErrorResponse = (
  code: string,
  message: string,
  details?: any,
  status: number = 400
): NextResponse<ChatV2Response> => {
  return NextResponse.json({
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
    },
    metadata: {
      version: '2.0',
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    },
  }, { status });
};

/**
 * Extract text content from a message
 */
const extractMessageText = (message: Message): string => {
  if (typeof message.content === 'string') {
    return message.content;
  }

  if (Array.isArray(message.content)) {
    for (const content of message.content) {
      if (content.type === 'text') {
        return (content as TextMessageContent).text;
      }
    }
    return '';
  }

  return '';
};

/**
 * Analyze user intent using the intent analysis API
 */
const analyzeIntent = async (message: string): Promise<IntentAnalysisApiResponse> => {
  const request: IntentAnalysisApiRequest = { message };

  const response = await fetch('/api/v2/agent/intent-analysis', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Intent analysis failed: ${response.statusText}`);
  }

  return await response.json();
};

/**
 * Execute agent workflow
 */
const executeAgentWorkflow = async (
  agentType: AgentType,
  query: string,
  model: { id: string; tokenLimit?: number }
): Promise<AgentExecutionApiResponse> => {
  const request: AgentExecutionApiRequest = {
    agentType,
    query,
    model,
    timeout: 30000,
  };

  const response = await fetch('/api/v2/agent/execute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Agent execution failed: ${response.statusText} - ${errorText}`);
  }

  return await response.json();
};

/**
 * Process agent result by creating enhanced prompt for standard chat
 */
const processAgentResult = (
  agentData: AgentExecutionApiResponse['data'],
  originalQuery: string
): string => {
  if (!agentData) {
    throw new Error('No agent data to process');
  }

  // Create an enhanced prompt that includes the agent's findings
  let enhancedPrompt = `Based on the following information retrieved by the ${agentData.agentType} agent, please provide a comprehensive response to the user's question.

User's original question: ${originalQuery}

Agent findings:
${agentData.content}`;

  // Add structured content if available
  if (agentData.structuredContent && agentData.structuredContent.items.length > 0) {
    enhancedPrompt += `\n\nAdditional context:`;
    agentData.structuredContent.items.forEach((item, index) => {
      enhancedPrompt += `\n\n[Source ${index + 1}: ${item.source}]\n${item.content}`;
    });
  }

  enhancedPrompt += `\n\nPlease synthesize this information and provide a helpful, accurate response to the user's question.`;

  // Add agent-specific instructions based on the agent type used
  if (agentData.agentType === AgentType.WEB_SEARCH) {
    enhancedPrompt += `\n\nAdditionally, when presenting your response, please include proper references and citations to the sources provided in the agent findings. Use numbered, markdown citations and provide a reference list at the end if multiple sources are cited.`;
  } else if (agentData.agentType === AgentType.LOCAL_KNOWLEDGE) {
    enhancedPrompt += `\n\nPlease respond directly to the user's original question using the provided information. Do not include additional commentary about the request, explanations about the information source, or meta-discussion about the response process. Focus solely on answering the user's question.`;
  } else if (agentData.agentType === AgentType.URL_PULL) {
    enhancedPrompt += `\n\nPlease respond directly to the user's original question using the provided information. If multiple urls are provided, please try to be clear which information relates to which url. If the article is in a different language from what the user is using, provide at least a translation of the title.`;
  }

  return enhancedPrompt;
};

/**
 * POST /api/v2/chat - Enhanced chat endpoint
 */
export async function POST(req: NextRequest): Promise<Response> {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const logger = AzureMonitorLoggingService.getInstance() ?? new AzureMonitorLoggingService();

  try {
    console.log('[INFO] Processing chat request v2:', { requestId });

    // Parse the request body once at the beginning
    const bodyData = await req.json() as ChatV2Request;

    // Extract session and token once at the beginning to avoid duplicate extraction
    const session: Session | null = await getServerSession(authOptions as any);
    const token = await getToken({ req: req as any });

    // Check if enhanced service should be used (but not if standard chat is forced)
    const useEnhancedService = !bodyData.forceStandardChat && 
                              (AGENT_ROUTING_ENABLED || req.headers.get('x-use-agents') === 'true');
    
    if (bodyData.forceStandardChat) {
      console.log('[INFO] Force standard chat requested, bypassing agent routing');
    }

    if (useEnhancedService) {
      console.log('[INFO] Using server-side agent workflow for v2 API');
      
      try {
        // Extract user context for enhanced features using pre-extracted session/token
        const userContext = await extractUserContext(req, session, token);

        // Log request
        await logger.logCustomMetric(
          'ChatV2RequestReceived',
          1,
          'count',
          {
            requestId,
            userId: userContext.userId,
            useEnhancedService: 'true',
          },
          { id: userContext.userId, email: userContext.email } as any
        );

        // Step 1: Analyze user intent
        const lastMessage = bodyData.messages[bodyData.messages.length - 1];
        const messageText = extractMessageText(lastMessage);
        
        console.log('[INFO] Analyzing user intent for:', messageText.substring(0, 100));
        const intentResult = await analyzeIntent(messageText);
        
        if (!intentResult.success || !intentResult.data) {
          console.log('[INFO] Intent analysis failed, falling back to standard chat');
          throw new Error('Intent analysis failed');
        }

        const agentType = intentResult.data.recommendedAgent;
        const confidence = intentResult.data.confidence;
        
        console.log('[INFO] Intent analysis result:', {
          agentType,
          confidence,
          analysisMethod: intentResult.data.analysisMethod
        });

        // Step 2: Check if we should use an agent (simplified server-side logic)
        const shouldUseAgent = agentType && 
                              confidence >= 0.5 && // Use simplified threshold
                              [AgentType.WEB_SEARCH, AgentType.LOCAL_KNOWLEDGE, AgentType.URL_PULL].includes(agentType);

        if (!shouldUseAgent) {
          console.log('[INFO] Agent not recommended, falling back to standard chat');
          throw new Error('Agent not recommended');
        }

        // Step 3: Execute agent workflow
        console.log(`[INFO] Executing ${agentType} agent`);
        const agentResult = await executeAgentWorkflow(
          agentType,
          messageText,
          { id: bodyData.model.id, tokenLimit: bodyData.model.tokenLimit }
        );

        if (!agentResult.success || !agentResult.data) {
          console.log('[INFO] Agent execution failed, falling back to standard chat');
          throw new Error('Agent execution failed');
        }

        // Step 4: Process agent result and create enhanced prompt
        console.log('[INFO] Processing agent result for standard chat synthesis');
        const enhancedPrompt = processAgentResult(agentResult.data, messageText);

        // Step 5: Create new conversation with enhanced prompt
        const enhancedMessage: Message = {
          role: 'user',
          content: [{ type: 'text', text: enhancedPrompt } as TextMessageContent],
          messageType: MessageType.TEXT,
        };

        const enhancedMessages = [...bodyData.messages.slice(0, -1), enhancedMessage];
        const enhancedBodyData = {
          ...bodyData,
          messages: enhancedMessages,
          forceStandardChat: true, // Force standard chat to prevent re-analysis
        };

        // Step 6: Process through standard chat service
        console.log('[INFO] Passing enhanced prompt through standard chat');
        const standardRequest = new Request(req.url, {
          method: 'POST',
          headers: req.headers,
          body: JSON.stringify(enhancedBodyData),
        });
        
        const chatService = new ChatService();
        const response = await chatService.handleRequest(standardRequest as NextRequest, session, token);
        
        // Check if this is a streaming response
        const contentType = response.headers.get('content-type');
        const isStreaming = contentType?.includes('text/event-stream') || contentType?.includes('text/plain');
        
        if (isStreaming) {
          // For streaming responses, pass through directly with agent metadata headers
          console.log('[INFO] Returning streaming response with agent metadata');
          
          const processingTime = Date.now() - startTime;
          await logger.logCustomMetric(
            'ChatV2RequestCompleted',
            processingTime,
            'milliseconds',
            {
              requestId,
              userId: userContext.userId,
              success: 'true',
              responseType: 'streaming',
              agentType,
              confidence,
            },
            { id: userContext.userId, email: userContext.email } as any
          );
          
          // Add v2 headers with agent metadata
          const enhancedHeaders = new Headers(response.headers);
          enhancedHeaders.set('X-API-Version', '2.0');
          enhancedHeaders.set('X-Request-ID', requestId);
          enhancedHeaders.set('X-Used-Agent', agentType);
          enhancedHeaders.set('X-Agent-Confidence', confidence.toString());
          
          return new Response(response.body, {
            status: response.status,
            headers: enhancedHeaders,
          });
        }
        
        // For non-streaming responses, wrap in v2 format with agent metadata
        const responseText = await response.text();
        let responseData;
        
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = { text: responseText };
        }

        const processingTime = Date.now() - startTime;

        // Log successful completion
        await logger.logCustomMetric(
          'ChatV2RequestCompleted',
          processingTime,
          'milliseconds',
          {
            requestId,
            userId: userContext.userId,
            success: 'true',
            agentType,
            confidence,
            usedFallback: 0,
          },
          { id: userContext.userId, email: userContext.email } as any
        );

        // Create enhanced v2 response format with agent metadata
        const v2Response: ChatV2Response = {
          success: true,
          data: {
            text: responseData.text || responseData.content || responseText,
            agentType,
            confidence,
            sources: agentResult.data.structuredContent?.items || [],
            processingTime,
            usedFallback: false,
            conversationId: responseData.conversationId,
          },
          metadata: {
            version: '2.0',
            timestamp: new Date().toISOString(),
            requestId,
            flags: { agentProcessing: true },
          },
        };

        return new Response(JSON.stringify(v2Response), {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            ...Object.fromEntries(response.headers.entries()),
          },
        });

      } catch (enhancedError) {
        console.error('[ERROR] Server-side agent workflow failed, falling back to standard chat:', enhancedError);
        
        // Log fallback
        await logger.logAgentRoutingMetrics(
          'fallback-used',
          'standard',
          false,
          Date.now() - startTime,
          enhancedError instanceof Error ? enhancedError.message : String(enhancedError),
          false
        );
        
        // Continue to standard implementation below
      }
    }

    // Standard chat implementation
    console.log('[INFO] Using standard chat service for v2 API');
    
    // Create new request with parsed body for standard chat service
    const standardRequest = new Request(req.url, {
      method: 'POST',
      headers: req.headers,
      body: JSON.stringify(bodyData),
    });
    
    const chatService = new ChatService();
    const response = await chatService.handleRequest(standardRequest as NextRequest, session, token);
    
    // Check if this is a streaming response from standard chat
    const contentType = response.headers.get('content-type');
    const isStreaming = contentType?.includes('text/event-stream') || contentType?.includes('text/plain');
    
    if (isStreaming) {
      // For streaming responses, pass through directly with v2 headers
      console.log('[INFO] Passing through streaming response from standard chat service');
      
      const enhancedHeaders = new Headers(response.headers);
      enhancedHeaders.set('X-API-Version', '2.0');
      enhancedHeaders.set('X-Request-ID', requestId);
      enhancedHeaders.set('X-Used-Enhanced-Service', 'false');
      
      return new Response(response.body, {
        status: response.status,
        headers: enhancedHeaders,
      });
    }
    
    // Wrap non-streaming standard response in v2 format if possible
    try {
      const responseText = await response.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { text: responseText };
      }

      const v2Response: ChatV2Response = {
        success: true,
        data: {
          text: responseData.text || responseData.content || responseText,
          agentType: undefined,
          confidence: undefined,
          sources: [],
          processingTime: Date.now() - startTime,
          usedFallback: false,
          conversationId: undefined,
        },
        metadata: {
          version: '2.0',
          timestamp: new Date().toISOString(),
          requestId,
        },
      };

      return new Response(JSON.stringify(v2Response), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(response.headers.entries()),
        },
      });
    } catch {
      // Return original response if wrapping fails
      return response;
    }

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    
    console.error('[ERROR] Chat v2 request failed:', error);

    // Log error
    await logger.logCustomMetric(
      'ChatV2RequestFailed',
      processingTime,
      'milliseconds',
      {
        requestId,
        error: error instanceof Error ? error.message : String(error),
        errorStack: error?.stack ?? '',
        statusCode: error instanceof Error ? (error as any).status : 500,
      }
    );

    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred while processing your request',
      error instanceof Error ? error.message : String(error),
      500
    );
  }
}

/**
 * GET /api/v2/chat - API information
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    name: 'Chat API v2',
    version: '2.0',
    description: 'Enhanced chat API with Azure AI Agent routing',
    features: [
      'Agent routing with feature flags',
      'Streaming responses',
      'Comprehensive validation',
      'Fallback mechanisms',
      'Performance monitoring',
      'User targeting',
    ],
    endpoints: {
      'POST /api/v2/chat': 'Send chat message with enhanced features',
      'GET /api/v2/chat': 'API information',
    },
    documentation: '/docs/api/v2/chat',
    timestamp: new Date().toISOString(),
  });
}
