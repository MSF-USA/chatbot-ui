import { Session } from 'next-auth';
import { NextRequest } from 'next/server';

import { AgentChatService } from '@/lib/services/chat';
import { AIFoundryAgentHandler } from '@/lib/services/chat/AIFoundryAgentHandler';
import { ChatLogger, ToneService } from '@/lib/services/shared';

import { sanitizeForLog } from '@/lib/utils/server/logSanitization';

import { ChatBody } from '@/types/chat';

import { auth } from '@/auth';

/**
 * POST /api/chat/agent
 *
 * Handles Azure AI Foundry Agent-based chat completions with Bing grounding.
 *
 * Request body:
 * - model: OpenAIModel - The model to use (must have agentId configured)
 * - messages: Message[] - The conversation messages
 * - temperature?: number - Temperature setting (optional)
 * - threadId?: string - Thread ID for continuing a conversation (optional)
 * - forcedAgentType?: string - Force a specific agent type (optional)
 * - botId?: string - Bot ID for logging purposes
 *
 * Returns:
 * - Streaming: text/plain with SSE-style streaming (includes citations and threadId metadata)
 */
export async function POST(req: NextRequest): Promise<Response> {
  try {
    // Authenticate
    const session: Session | null = await auth();
    if (!session) {
      throw new Error('Could not pull session!');
    }

    // Parse request
    const { model, messages, temperature, threadId, forcedAgentType, botId } =
      (await req.json()) as ChatBody;

    console.log('[POST /api/chat/agent] Request:', {
      modelId: model.id,
      messageCount: messages.length,
      threadId,
      forcedAgentType,
      botId,
    });

    // Validate model has agentId
    if (!model.agentId) {
      return new Response(
        JSON.stringify({
          error: 'Bad Request',
          message: `Model ${model.id} does not have an agentId configured`,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Initialize dependencies with dependency injection
    const logger = new ChatLogger(
      process.env.LOGS_INJESTION_ENDPOINT!,
      process.env.DATA_COLLECTION_RULE_ID!,
      process.env.STREAM_NAME!,
    );

    const toneService = new ToneService();
    const agentHandler = new AIFoundryAgentHandler(logger);

    // Create service instance with dependency injection
    const chatService = new AgentChatService(agentHandler, logger, toneService);

    // Handle chat
    return await chatService.handleChat({
      messages,
      model,
      user: session.user,
      temperature,
      threadId,
      forcedAgentType,
      botId,
    });
  } catch (error) {
    console.error('[POST /api/chat/agent] Error:', sanitizeForLog(error));

    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
