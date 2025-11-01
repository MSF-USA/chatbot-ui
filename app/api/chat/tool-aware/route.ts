import { Session } from 'next-auth';
import { NextRequest } from 'next/server';

import { AIFoundryAgentHandler } from '@/lib/services/chat/AIFoundryAgentHandler';
import { AgentChatService } from '@/lib/services/chat/AgentChatService';
import { ChatOrchestrator } from '@/lib/services/chat/ChatOrchestrator';
import { StandardChatService } from '@/lib/services/chat/StandardChatService';
import { ToolRouterService } from '@/lib/services/chat/ToolRouterService';
import { ToolRegistry, WebSearchTool } from '@/lib/services/chat/tools';
import { AzureMonitorLoggingService } from '@/lib/services/loggingService';
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
import { OpenAIModel, OpenAIModelID, OpenAIModels } from '@/types/openai';

import { auth } from '@/auth';
import {
  DefaultAzureCredential,
  getBearerTokenProvider,
} from '@azure/identity';
import { AzureOpenAI } from 'openai';
import OpenAI from 'openai';

/**
 * POST /api/chat/tool-aware
 *
 * Handles tool-aware chat with privacy-focused tool routing.
 * When minimizeAIFoundryUse is enabled:
 * - Uses ToolRouterService to determine if web search is needed
 * - Executes web search as a tool (only query sent to AI Foundry)
 * - Continues with StandardChatService using search results
 *
 * Request body extends ChatBody with:
 * - minimizeAIFoundryUse: boolean - Privacy toggle
 * - All standard ChatBody fields
 */
export async function POST(req: NextRequest): Promise<Response> {
  try {
    // Authenticate
    const session: Session | null = await auth();
    if (!session) {
      throw new Error('Could not pull session!');
    }

    // Parse request
    const body = (await req.json()) as ChatBody & {
      minimizeAIFoundryUse?: boolean;
    };
    const {
      model,
      messages,
      prompt,
      temperature,
      stream = true,
      reasoningEffort,
      verbosity,
      botId,
    } = body;

    // Get minimizeAIFoundryUse from request or default to false
    const minimizeAIFoundryUse = body.minimizeAIFoundryUse ?? false;

    console.log('[POST /api/chat/tool-aware] Request:', {
      modelId: model.id,
      messageCount: messages.length,
      minimizeAIFoundryUse,
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

    const azureMonitorLogger = new AzureMonitorLoggingService(
      process.env.LOGS_INJESTION_ENDPOINT!,
      process.env.DATA_COLLECTION_RULE_ID!,
      process.env.STREAM_NAME!,
    );

    const modelSelector = new ModelSelector();
    const toneService = new ToneService();
    const streamingService = new StreamingService();

    // Create service instances
    const standardChatService = new StandardChatService(
      azureOpenAIClient,
      openAIClient,
      logger,
      modelSelector,
      toneService,
      streamingService,
    );

    const agentHandler = new AIFoundryAgentHandler(azureMonitorLogger);
    const agentChatService = new AgentChatService(agentHandler, logger);

    // Use GPT-5-mini as the tool router model (fast, cheap, and intelligent)
    const routerModel = OpenAIModels[OpenAIModelID.GPT_5_MINI];
    const toolRouterService = new ToolRouterService(
      azureOpenAIClient,
      routerModel,
    );

    // Initialize tool registry and register available tools
    const toolRegistry = new ToolRegistry();
    const webSearchTool = new WebSearchTool(agentChatService);
    toolRegistry.register(webSearchTool);

    // Create orchestrator
    const orchestrator = new ChatOrchestrator(
      standardChatService,
      agentChatService,
      toolRouterService,
      toolRegistry,
    );

    // Get agent model for web search (use GPT-4.1 with agent capability)
    const agentModel = OpenAIModels[OpenAIModelID.GPT_4_1];

    // Handle tool-aware chat
    return await orchestrator.handleChat({
      messages,
      model,
      user: session.user,
      systemPrompt: prompt || DEFAULT_SYSTEM_PROMPT,
      temperature,
      stream,
      minimizeAIFoundryUse,
      agentModel,
      reasoningEffort,
      verbosity,
      botId,
    });
  } catch (error) {
    console.error('[POST /api/chat/tool-aware] Error:', error);

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
