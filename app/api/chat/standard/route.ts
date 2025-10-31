import { Session } from 'next-auth';
import { NextRequest } from 'next/server';

import { StandardChatService } from '@/lib/services/chat';
import {
  ChatLogger,
  ModelSelector,
  StreamingService,
  ToneService,
} from '@/lib/services/shared';

import {
  DEFAULT_SYSTEM_PROMPT,
  OPENAI_API_VERSION,
} from '@/lib/utils/app/const';

import { ChatBody } from '@/types/chat';

import { auth } from '@/auth';
import {
  DefaultAzureCredential,
  getBearerTokenProvider,
} from '@azure/identity';
import { AzureOpenAI } from 'openai';
import OpenAI from 'openai';

/**
 * POST /api/chat/standard
 *
 * Handles standard (non-RAG, non-agent, non-audio) chat completions.
 *
 * Request body:
 * - model: OpenAIModel - The model to use
 * - messages: Message[] - The conversation messages
 * - prompt?: string - System prompt (optional, uses default if not provided)
 * - temperature?: number - Temperature setting (optional)
 * - stream?: boolean - Whether to stream response (default: true)
 * - reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high' - For reasoning models
 * - verbosity?: 'low' | 'medium' | 'high' - Response verbosity
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
      prompt,
      temperature,
      stream = true,
      reasoningEffort,
      verbosity,
      botId,
    } = (await req.json()) as ChatBody;

    console.log('[POST /api/chat/standard] Request:', {
      modelId: model.id,
      messageCount: messages.length,
      stream,
      botId,
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

    const openAIClient = new OpenAI({
      baseURL:
        process.env.AZURE_AI_FOUNDRY_OPENAI_ENDPOINT ||
        `${process.env.AZURE_AI_FOUNDRY_ENDPOINT?.replace('/api/projects/default', '')}/openai/v1/`,
      apiKey: process.env.OPENAI_API_KEY,
    });

    const logger = new ChatLogger(
      process.env.LOGS_INJESTION_ENDPOINT!,
      process.env.DATA_COLLECTION_RULE_ID!,
      process.env.STREAM_NAME!,
    );

    const modelSelector = new ModelSelector();
    const toneService = new ToneService();
    const streamingService = new StreamingService();

    // Create service instance with dependency injection
    const chatService = new StandardChatService(
      azureOpenAIClient,
      openAIClient,
      logger,
      modelSelector,
      toneService,
      streamingService,
    );

    // Handle chat
    return await chatService.handleChat({
      messages,
      model,
      user: session.user,
      systemPrompt: prompt || DEFAULT_SYSTEM_PROMPT,
      temperature,
      stream,
      reasoningEffort,
      verbosity,
      botId,
    });
  } catch (error) {
    console.error('[POST /api/chat/standard] Error:', error);

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
