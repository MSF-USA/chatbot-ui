import { OpenAIModelID, AVAILABLE_MODELS, defaultModelID, fallbackModelID } from '@/types/openai';

/**
 * Get the list of available model IDs.
 * This is the centralized source of truth for which models are enabled in the application.
 *
 * @returns Array of available OpenAI model IDs
 */
export function getAvailableModels(): OpenAIModelID[] {
  return AVAILABLE_MODELS;
}

/**
 * Check if a model ID is available in the application.
 * Performs case-insensitive matching to handle different ID formats.
 *
 * @param modelId - The model ID to check
 * @returns true if the model is available, false otherwise
 */
export function isModelAvailable(modelId: string): boolean {
  const normalizedId = modelId.toLowerCase();
  return AVAILABLE_MODELS.some(
    (availableModel) => availableModel.toLowerCase() === normalizedId
  );
}

/**
 * Get the fallback chain for model selection.
 * Returns models in priority order: default → fallback → hardcoded gpt-4o.
 *
 * This ensures graceful degradation when a requested model is unavailable:
 * 1. Try the default model (defaultModelID)
 * 2. Try the fallback model (fallbackModelID)
 * 3. Try hardcoded gpt-4o as last resort
 *
 * @returns Array of model IDs in fallback priority order
 */
export function getModelFallbackChain(): OpenAIModelID[] {
  const chain: OpenAIModelID[] = [];

  // Add default model if it's different from others
  if (defaultModelID) {
    chain.push(defaultModelID);
  }

  // Add fallback model if it's different from default
  if (fallbackModelID && fallbackModelID !== defaultModelID) {
    chain.push(fallbackModelID);
  }

  // Add hardcoded gpt-4o as ultimate fallback if not already in chain
  if (defaultModelID !== OpenAIModelID.GPT_4o && fallbackModelID !== OpenAIModelID.GPT_4o) {
    chain.push(OpenAIModelID.GPT_4o);
  }

  return chain;
}

/**
 * Find the best available fallback model from the fallback chain.
 * Checks each model in the chain to see if it's available in the application.
 *
 * @returns The first available model from the fallback chain, or undefined if none available
 */
export function getBestAvailableFallback(): OpenAIModelID | undefined {
  const fallbackChain = getModelFallbackChain();

  for (const modelId of fallbackChain) {
    if (isModelAvailable(modelId)) {
      return modelId;
    }
  }

  return undefined;
}