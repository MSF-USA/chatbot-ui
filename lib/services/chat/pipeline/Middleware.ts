import { Session } from 'next-auth';
import { NextRequest } from 'next/server';

import { ChatLogger, ModelSelector } from '@/lib/services/shared';

import { DEFAULT_SYSTEM_PROMPT } from '@/lib/utils/app/const';
import { getMessageContentTypes } from '@/lib/utils/server/chat';

import { ChatBody } from '@/types/chat';
import { SearchMode } from '@/types/searchMode';

import { ChatContext } from './ChatContext';

import { auth } from '@/auth';

/**
 * Middleware function that processes a request and returns partial ChatContext.
 */
export type Middleware = (req: NextRequest) => Promise<Partial<ChatContext>>;

/**
 * Applies a chain of middleware functions to build the initial ChatContext.
 *
 * @param req - The incoming NextRequest
 * @param middlewares - Array of middleware functions
 * @returns The constructed ChatContext
 */
export async function applyMiddleware(
  req: NextRequest,
  middlewares: Middleware[],
): Promise<ChatContext> {
  let context: Partial<ChatContext> = {};

  for (const middleware of middlewares) {
    const partial = await middleware(req);
    context = { ...context, ...partial };
  }

  // Validate required fields
  if (!context.session)
    throw new Error('Authentication middleware did not set session');
  if (!context.logger) throw new Error('Logging middleware did not set logger');
  if (!context.model)
    throw new Error('Request parsing middleware did not set model');
  if (!context.messages)
    throw new Error('Request parsing middleware did not set messages');

  return context as ChatContext;
}

/**
 * Authentication middleware.
 * Validates the user session and adds it to context.
 */
export const authMiddleware: Middleware = async (req) => {
  const session: Session | null = await auth();

  if (!session) {
    throw new Error('Unauthorized: No valid session found');
  }

  return {
    session,
    user: session.user,
  };
};

/**
 * Logging middleware.
 * Creates a logger instance and adds it to context.
 */
export const loggingMiddleware: Middleware = async (req) => {
  const logger = new ChatLogger(
    process.env.LOGS_INJESTION_ENDPOINT!,
    process.env.DATA_COLLECTION_RULE_ID!,
    process.env.STREAM_NAME!,
  );

  return { logger };
};

/**
 * Rate limiting middleware.
 * Checks if the user has exceeded their rate limit.
 *
 * TODO: Implement actual rate limiting logic
 */
export const rateLimitMiddleware: Middleware = async (req) => {
  // TODO: Implement rate limiting
  // For now, just a placeholder
  return {};
};

/**
 * Request parsing middleware.
 * Parses the request body and validates it.
 */
export const requestParsingMiddleware: Middleware = async (req) => {
  try {
    const body = (await req.json()) as ChatBody & {
      searchMode?: SearchMode;
      threadId?: string;
      forcedAgentType?: string;
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
      searchMode,
      threadId,
      forcedAgentType,
    } = body;

    // Validate required fields
    if (!model) {
      throw new Error('Bad Request: model is required');
    }
    if (!messages || messages.length === 0) {
      throw new Error('Bad Request: messages are required');
    }

    return {
      model,
      messages,
      systemPrompt: prompt || DEFAULT_SYSTEM_PROMPT,
      temperature,
      stream,
      reasoningEffort,
      verbosity,
      botId,
      searchMode,
      threadId,
      forcedAgentType,
      agentMode: searchMode === SearchMode.AGENT,
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Bad Request: Invalid JSON in request body');
    }
    throw error;
  }
};

/**
 * Content analysis middleware.
 * Analyzes the messages to determine what types of content are present.
 */
export const contentAnalysisMiddleware: Middleware = async (req) => {
  // This middleware needs access to messages from previous middleware
  // We'll need to make this a factory that accepts the current context
  return {};
};

/**
 * Factory for content analysis middleware that needs access to parsed messages.
 */
export const createContentAnalysisMiddleware = (
  context: Partial<ChatContext>,
): Partial<ChatContext> => {
  if (!context.messages) {
    throw new Error('Messages must be parsed before content analysis');
  }

  const lastMessage = context.messages[context.messages.length - 1];
  const contentTypes = getMessageContentTypes(lastMessage.content);

  return {
    contentTypes,
    hasFiles: contentTypes.has('file'),
    hasImages: contentTypes.has('image'),
    hasAudio: contentTypes.has('file'), // TODO: Distinguish audio from files
  };
};

/**
 * Factory for model selection middleware that needs access to model and messages.
 */
export const createModelSelectionMiddleware = (
  context: Partial<ChatContext>,
): Partial<ChatContext> => {
  if (!context.model || !context.messages) {
    throw new Error('Model and messages must be parsed before model selection');
  }

  const modelSelector = new ModelSelector();
  const { modelId, modelConfig } = modelSelector.selectModel(
    context.model,
    context.messages,
  );

  return {
    modelSelector,
    modelId,
    model: modelConfig,
  };
};

/**
 * Builds the initial ChatContext from a NextRequest.
 * Applies all standard middleware and returns a fully initialized context.
 */
export async function buildChatContext(req: NextRequest): Promise<ChatContext> {
  // Apply initial middleware
  let context = await applyMiddleware(req, [
    authMiddleware,
    loggingMiddleware,
    rateLimitMiddleware,
    requestParsingMiddleware,
  ]);

  // Apply middleware that depends on previous middleware
  context = {
    ...context,
    ...createContentAnalysisMiddleware(context),
  };

  context = {
    ...context,
    ...createModelSelectionMiddleware(context),
  };

  // Initialize metrics
  context.metrics = {
    startTime: Date.now(),
    stageTimings: new Map(),
  };

  console.log('[Middleware] ChatContext built:', {
    modelId: context.modelId,
    messageCount: context.messages.length,
    contentTypes: Array.from(context.contentTypes),
    hasFiles: context.hasFiles,
    hasImages: context.hasImages,
    hasAudio: context.hasAudio,
    botId: context.botId,
    searchMode: context.searchMode,
    agentMode: context.agentMode,
  });

  return context;
}
