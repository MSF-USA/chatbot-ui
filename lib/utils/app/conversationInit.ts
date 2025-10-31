import { Conversation } from '@/types/chat';
import { OpenAIModel } from '@/types/openai';

import { v4 as uuidv4 } from 'uuid';

/**
 * Creates a default conversation with proper model configuration
 *
 * @param models - Available models array
 * @param defaultModelId - ID of the default model to use (optional)
 * @param systemPrompt - System prompt to initialize with
 * @param temperature - Temperature setting for the conversation
 * @returns A new conversation object
 *
 * @example
 * const conversation = createDefaultConversation(
 *   models,
 *   'gpt-4o',
 *   'You are a helpful assistant',
 *   0.5
 * );
 */
export const createDefaultConversation = (
  models: OpenAIModel[],
  defaultModelId: string | undefined,
  systemPrompt: string,
  temperature: number,
): Conversation => {
  const defaultModel = models.find((m) => m.id === defaultModelId) || models[0];

  // Set default mode configuration
  const modelWithDefaults = {
    ...defaultModel,
    azureAgentMode: false, // Azure Agent Mode OFF by default (privacy-first)
    searchModeEnabled: true, // Search Mode ON by default
    ...(defaultModel.agentId && { agentId: defaultModel.agentId }),
  };

  return {
    id: uuidv4(),
    name: 'New Conversation',
    messages: [],
    model: modelWithDefaults,
    prompt: systemPrompt || '',
    temperature: temperature || 0.5,
    folderId: null,
  };
};

/**
 * Checks if conversation initialization should proceed
 * Validates that all required data is loaded
 *
 * @param isLoaded - Whether conversations are loaded from storage
 * @param hasModels - Whether models are available
 * @returns True if initialization can proceed
 */
export const canInitializeConversation = (
  isLoaded: boolean,
  hasModels: boolean,
): boolean => {
  return isLoaded && hasModels;
};

/**
 * Determines if a new default conversation should be created
 *
 * @param conversations - Current conversations array
 * @returns True if a default conversation should be created
 */
export const shouldCreateDefaultConversation = (
  conversations: Conversation[],
): boolean => {
  return conversations.length === 0;
};
