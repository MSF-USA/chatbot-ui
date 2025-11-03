import { Session } from 'next-auth';
import { NextRequest } from 'next/server';

import { AudioChatService } from '@/lib/services/chat';
import { FileConversationHandler } from '@/lib/services/chat/FileConversationHandler';
import { ChatLogger } from '@/lib/services/shared';

import { sanitizeForLog } from '@/lib/utils/server/logSanitization';

import { ChatBody } from '@/types/chat';

import { auth } from '@/auth';

/**
 * POST /api/chat/audio
 *
 * Handles audio/video file chat completions with Whisper transcription.
 *
 * Request body:
 * - model: OpenAIModel - The model to use
 * - messages: Message[] - The conversation messages (must contain audio/video file)
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

    console.log('[POST /api/chat/audio] Request:', {
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

    // Create service instance with dependency injection
    const chatService = new AudioChatService(fileHandler, logger);

    // Validate that messages contain audio/video files
    if (!chatService.hasAudioVideoFiles(messages)) {
      return new Response(
        JSON.stringify({
          error: 'Bad Request',
          message: 'No audio/video files found in messages',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Handle chat
    return await chatService.handleChat({
      messages,
      model,
      user: session.user,
      stream,
      botId,
    });
  } catch (error) {
    // codeql[js/log-injection] - User input sanitized with sanitizeForLog() which removes newlines and control characters
    console.error('[POST /api/chat/audio] Error:', sanitizeForLog(error));

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
