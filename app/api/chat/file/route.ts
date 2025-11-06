import { Session } from 'next-auth';
import { NextRequest } from 'next/server';

import { FileConversationHandler } from '@/lib/services/chat/FileConversationHandler';
import { ChatLogger } from '@/lib/services/shared';

import { sanitizeForLog } from '@/lib/utils/server/logSanitization';

import { ChatBody } from '@/types/chat';

import { auth } from '@/auth';

/**
 * POST /api/chat/file
 *
 * Handles document file chat completions (non-audio/video files).
 *
 * Request body:
 * - model: OpenAIModel - The model to use
 * - messages: Message[] - The conversation messages (must contain document file)
 * - stream?: boolean - Whether to stream response (default: true)
 * - botId?: string - Bot ID for logging purposes
 *
 * Returns:
 * - Streaming: text/plain with SSE-style streaming
 * - Non-streaming: application/json with { text: string }
 */
export async function POST(req: NextRequest): Promise<Response> {
  try {
    // Authenticate
    const session: Session | null = await auth();
    if (!session) {
      throw new Error('Could not pull session!');
    }

    // Parse request
    const {
      model,
      messages,
      stream = true,
      botId,
    } = (await req.json()) as ChatBody;

    console.log('[POST /api/chat/file] Request:', {
      modelId: model.id,
      messageCount: messages.length,
      stream,
      botId,
    });

    // Initialize dependencies with dependency injection
    const logger = new ChatLogger(
      process.env.LOGS_INJESTION_ENDPOINT!,
      process.env.DATA_COLLECTION_RULE_ID!,
      process.env.STREAM_NAME!,
    );

    const fileHandler = new FileConversationHandler(logger);

    // Handle file conversation
    return await fileHandler.handleFileConversation(
      messages,
      model.id,
      session.user,
      botId,
      stream,
    );
  } catch (error) {
    console.error('[POST /api/chat/file] Error:', sanitizeForLog(error));

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
