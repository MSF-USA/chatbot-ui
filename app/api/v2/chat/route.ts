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

import { ChatBody, Message } from '@/types/chat';
import { AgentType } from '@/types/agent';
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
 * POST /api/v2/chat - Enhanced chat endpoint
 */
export async function POST(req: NextRequest): Promise<Response> {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const logger = AzureMonitorLoggingService.getInstance() ?? new AzureMonitorLoggingService();

  try {
    console.log('[INFO] Processing chat request v2:', { requestId });

    // Parse the request body once at the beginning
    const bodyData = await req.json();

    // Extract session and token once at the beginning to avoid duplicate extraction
    const session: Session | null = await getServerSession(authOptions as any);
    const token = await getToken({ req: req as any });

    // Check if enhanced service should be used
    const useEnhancedService = AGENT_ROUTING_ENABLED || req.headers.get('x-use-agents') === 'true';

    if (useEnhancedService) {
      console.log('[INFO] Using Enhanced Chat Service for v2 API');
      
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
        
        // Get enhanced chat service with guaranteed initialization
        const enhancedChatService = await getInitializedEnhancedChatService();

        // Add user context headers
        const enhancedHeaders = new Headers(req.headers);
        enhancedHeaders.set('x-user-id', userContext.userId);
        enhancedHeaders.set('x-user-email', userContext.email || '');
        enhancedHeaders.set('x-user-role', userContext.role ?? '');
        enhancedHeaders.set('x-request-id', requestId);
        enhancedHeaders.set('content-type', 'application/json'); // Ensure content-type is set

        // Create enhanced request with parsed body
        const enhancedRequest = new Request(req.url, {
          method: 'POST',
          headers: enhancedHeaders,
          body: JSON.stringify(bodyData),
        });

        // Process with enhanced service, passing the parsed body to avoid double consumption
        const response = await enhancedChatService.handleRequest(enhancedRequest as any, session, token, bodyData);
        
        // Check if this is a streaming response
        const contentType = response.headers.get('content-type');
        const isStreaming = contentType?.includes('text/event-stream') || contentType?.includes('text/plain');
        
        if (isStreaming) {
          // For streaming responses, pass through directly with enhanced headers
          console.log('[INFO] Passing through streaming response from enhanced service');
          
          // Log completion for streaming (we can't get metadata easily)
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
            },
            { id: userContext.userId, email: userContext.email } as any
          );
          
          // Add v2 headers to streaming response
          const enhancedHeaders = new Headers(response.headers);
          enhancedHeaders.set('X-API-Version', '2.0');
          enhancedHeaders.set('X-Request-ID', requestId);
          
          return new Response(response.body, {
            status: response.status,
            headers: enhancedHeaders,
          });
        }
        
        // For non-streaming responses, process as JSON
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
            agentType: responseData.metadata?.agentType,
            usedFallback: responseData.metadata?.usedFallback || false,
          },
          { id: userContext.userId, email: userContext.email } as any
        );

        // Create enhanced v2 response format
        if (responseData.metadata) {
          const v2Response: ChatV2Response = {
            success: true,
            data: {
              text: responseData.text,
              agentType: responseData.metadata.agentType,
              confidence: responseData.metadata.confidence,
              sources: responseData.metadata.sources || [],
              processingTime,
              usedFallback: responseData.metadata.usedFallback || false,
              conversationId: responseData.metadata.conversationId,
            },
            metadata: {
              version: '2.0',
              timestamp: new Date().toISOString(),
              requestId,
              flags: responseData.metadata.flagsUsed,
            },
          };

          return new Response(JSON.stringify(v2Response), {
            status: response.status,
            headers: {
              'Content-Type': 'application/json',
              ...Object.fromEntries(response.headers.entries()),
            },
          });
        }

        // Fallback to original response format
        return response;

      } catch (enhancedError) {
        console.error('[ERROR] Enhanced chat service failed for v2, falling back to standard chat:', enhancedError);
        
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
