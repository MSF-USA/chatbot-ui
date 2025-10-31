import { Session } from 'next-auth';
import { NextRequest } from 'next/server';

import { RAGChatService } from '@/lib/services/chat';
import { RAGService } from '@/lib/services/ragService';
import { ChatLogger } from '@/lib/services/shared';

import { OPENAI_API_VERSION } from '@/lib/utils/app/const';

import { bots } from '@/types/bots';
import { ChatBody } from '@/types/chat';

import { auth } from '@/auth';
import {
  DefaultAzureCredential,
  getBearerTokenProvider,
} from '@azure/identity';
import { AzureOpenAI } from 'openai';

/**
 * POST /api/chat/rag
 *
 * Handles RAG (Retrieval Augmented Generation) chat completions with knowledge bases.
 *
 * Request body:
 * - model: OpenAIModel - The model to use
 * - messages: Message[] - The conversation messages
 * - botId: string - The bot/knowledge base ID (REQUIRED)
 * - stream?: boolean - Whether to stream response (default: true)
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
      botId,
      stream = true,
    } = (await req.json()) as ChatBody;

    // Validate botId is present
    if (!botId) {
      return new Response(
        JSON.stringify({
          error: 'Bad Request',
          message: 'botId is required for RAG chat',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    console.log('[POST /api/chat/rag] Request:', {
      modelId: model.id,
      messageCount: messages.length,
      botId,
      stream,
    });

    // Initialize dependencies with dependency injection
    const azureADTokenProvider = getBearerTokenProvider(
      new DefaultAzureCredential(),
      'https://cognitiveservices.azure.com/.default',
    );

    const azureOpenAIClient = new AzureOpenAI({
      azureADTokenProvider,
      apiVersion: OPENAI_API_VERSION,
    });

    const logger = new ChatLogger(
      process.env.LOGS_INJESTION_ENDPOINT!,
      process.env.DATA_COLLECTION_RULE_ID!,
      process.env.STREAM_NAME!,
    );

    const ragService = new RAGService(
      process.env.SEARCH_ENDPOINT!,
      process.env.SEARCH_INDEX!,
      process.env.SEARCH_ENDPOINT_API_KEY!,
      logger,
      azureOpenAIClient,
    );

    // Create service instance with dependency injection
    const chatService = new RAGChatService(
      ragService,
      logger,
      azureOpenAIClient,
    );

    // Handle chat
    return await chatService.handleChat({
      messages,
      model,
      user: session.user,
      botId,
      bots,
      stream,
    });
  } catch (error) {
    console.error('[POST /api/chat/rag] Error:', error);

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
