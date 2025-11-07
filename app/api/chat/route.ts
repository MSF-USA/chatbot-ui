import { NextRequest } from 'next/server';

import { AIFoundryAgentHandler } from '@/lib/services/chat/AIFoundryAgentHandler';
import { AgentChatService } from '@/lib/services/chat/AgentChatService';
import { FileProcessingService } from '@/lib/services/chat/FileProcessingService';
import { StandardChatService } from '@/lib/services/chat/StandardChatService';
import { ToolRouterService } from '@/lib/services/chat/ToolRouterService';
import { AgentEnricher } from '@/lib/services/chat/enrichers/AgentEnricher';
import { RAGEnricher } from '@/lib/services/chat/enrichers/RAGEnricher';
import { ToolRouterEnricher } from '@/lib/services/chat/enrichers/ToolRouterEnricher';
import { AgentChatHandler } from '@/lib/services/chat/handlers/AgentChatHandler';
import { StandardChatHandler } from '@/lib/services/chat/handlers/StandardChatHandler';
import { ChatPipeline, buildChatContext } from '@/lib/services/chat/pipeline';
import { FileProcessor } from '@/lib/services/chat/processors/FileProcessor';
import { ImageProcessor } from '@/lib/services/chat/processors/ImageProcessor';
import { AzureMonitorLoggingService } from '@/lib/services/loggingService';
import {
  ChatLogger,
  ModelSelector,
  StreamingService,
  ToneService,
} from '@/lib/services/shared';

import { OPENAI_API_VERSION } from '@/lib/utils/app/const';
import { sanitizeForLog } from '@/lib/utils/server/logSanitization';

import {
  DefaultAzureCredential,
  getBearerTokenProvider,
} from '@azure/identity';
import { AzureOpenAI } from 'openai';
import OpenAI from 'openai';

/**
 * POST /api/chat
 *
 * UNIFIED CHAT ENDPOINT
 *
 * Handles ALL types of chat requests through a composable pipeline:
 * - Text-only conversations
 * - Image conversations (vision models)
 * - File analysis (documents)
 * - Audio/video transcription
 * - Mixed content (files + images)
 * - RAG with knowledge bases
 * - Intelligent search (tool routing)
 * - AI Foundry agents
 *
 * ANY COMBINATION of the above is supported through composition.
 *
 * Request body (ChatBody):
 * - model: OpenAIModel - The model to use
 * - messages: Message[] - The conversation messages
 * - prompt?: string - System prompt (optional)
 * - temperature?: number - Temperature setting (optional)
 * - stream?: boolean - Whether to stream response (default: true)
 * - botId?: string - Bot/knowledge base ID for RAG (optional)
 * - searchMode?: SearchMode - Search mode for tool routing (optional)
 * - reasoningEffort?: string - For reasoning models (optional)
 * - verbosity?: string - Response verbosity (optional)
 * - threadId?: string - Thread ID for agents (optional)
 * - forcedAgentType?: string - Force specific agent type (optional)
 *
 * Pipeline Stages:
 * 1. Content Processing:
 *    - FileProcessor: Downloads, extracts, summarizes files
 *    - ImageProcessor: Validates images
 * 2. Feature Enrichment:
 *    - RAGEnricher: Adds knowledge base integration
 *    - ToolRouterEnricher: Adds intelligent search
 *    - AgentEnricher: Switches to agent execution
 * 3. Execution:
 *    - StandardChatHandler: Executes chat with OpenAI
 *
 * Returns:
 * - Streaming: text/plain with SSE-style streaming
 * - Non-streaming: application/json with { text: string }
 */
export async function POST(req: NextRequest): Promise<Response> {
  try {
    // 1. Build context through middleware
    console.log('[Unified Chat] Building context...');
    const context = await buildChatContext(req);

    console.log('[Unified Chat] Context built:', {
      model: context.modelId,
      contentTypes: Array.from(context.contentTypes),
      hasFiles: context.hasFiles,
      hasImages: context.hasImages,
      hasRAG: !!context.botId,
      hasSearch: !!context.searchMode,
      hasAgent: context.agentMode,
    });

    // 2. Initialize services
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

    const azureMonitorLogger = new AzureMonitorLoggingService(
      process.env.LOGS_INJESTION_ENDPOINT!,
      process.env.DATA_COLLECTION_RULE_ID!,
      process.env.STREAM_NAME!,
    );

    const modelSelector = new ModelSelector();
    const toneService = new ToneService();
    const streamingService = new StreamingService();

    const standardChatService = new StandardChatService(
      azureOpenAIClient,
      openAIClient,
      context.logger,
      modelSelector,
      toneService,
      streamingService,
    );

    const fileProcessingService = new FileProcessingService();

    // Initialize services for web search and agent execution
    const toolRouterService = new ToolRouterService(openAIClient);
    const agentChatService = new AgentChatService(azureMonitorLogger);
    const aiFoundryAgentHandler = new AIFoundryAgentHandler(azureMonitorLogger);

    // 3. Build pipeline
    console.log('[Unified Chat] Building pipeline...');
    const pipeline = new ChatPipeline([
      // Content processors
      new FileProcessor(fileProcessingService, azureMonitorLogger),
      new ImageProcessor(),

      // Feature enrichers
      new RAGEnricher(
        process.env.SEARCH_ENDPOINT!,
        process.env.SEARCH_INDEX!,
        process.env.SEARCH_ENDPOINT_API_KEY!,
      ),
      new ToolRouterEnricher(toolRouterService, agentChatService),
      new AgentEnricher(),

      // Execution handlers (AgentChatHandler runs first, StandardChatHandler as fallback)
      new AgentChatHandler(aiFoundryAgentHandler, azureMonitorLogger),
      new StandardChatHandler(standardChatService),
    ]);

    console.log('[Unified Chat] Pipeline stages:', pipeline.getStageNames());

    // 4. Execute pipeline
    console.log('[Unified Chat] Executing pipeline...');
    const result = await pipeline.execute(context);

    // 5. Check for errors
    if (result.errors && result.errors.length > 0) {
      console.error(
        '[Unified Chat] Pipeline completed with errors:',
        result.errors.map((e) => sanitizeForLog(e.message)),
      );

      // If no response was generated, return error
      if (!result.response) {
        return new Response(
          JSON.stringify({
            error: 'Internal Server Error',
            message: result.errors[0].message,
            details: result.errors.map((e) => e.message),
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }
    }

    // 6. Return response
    if (!result.response) {
      throw new Error('Pipeline did not generate a response');
    }

    console.log('[Unified Chat] Request completed successfully');
    console.log('[Unified Chat] Total time:', {
      duration: result.metrics?.endTime
        ? `${result.metrics.endTime - result.metrics.startTime}ms`
        : 'unknown',
    });

    return result.response;
  } catch (error) {
    console.error('[Unified Chat] Error:', sanitizeForLog(error));

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
