import { OpenAIModel } from '@/types/openai';

import { AnthropicFoundryHandler } from './AnthropicFoundryHandler';
import { AzureOpenAIHandler } from './AzureOpenAIHandler';
import { DeepSeekHandler } from './DeepSeekHandler';
import { ModelHandler } from './ModelHandler';
import { StandardOpenAIHandler } from './StandardOpenAIHandler';

import { AnthropicFoundry } from '@anthropic-ai/foundry-sdk';
import OpenAI, { AzureOpenAI } from 'openai';

/**
 * Factory for creating the appropriate ModelHandler based on model configuration.
 *
 * Selection logic:
 * 1. If model.sdk === 'anthropic-foundry' → AnthropicFoundryHandler (Claude models)
 * 2. If model.sdk === 'azure-openai' → AzureOpenAIHandler (GPT-5, o3, GPT-4.1)
 * 3. If model.avoidSystemPrompt === true → DeepSeekHandler (DeepSeek-R1, V3.1)
 * 4. Otherwise → StandardOpenAIHandler (Grok, Llama, future models)
 */
export class HandlerFactory {
  /**
   * Get the appropriate handler for the given model.
   */
  static getHandler(
    model: OpenAIModel | null | undefined,
    azureClient: AzureOpenAI,
    openAIClient: OpenAI,
  ): ModelHandler {
    // Validate model input
    if (!model) {
      throw new Error('Model configuration is required to create handler');
    }

    // Azure OpenAI models (GPT-5, o3, GPT-4.1 non-agent)
    if (model.sdk === 'azure-openai') {
      return new AzureOpenAIHandler(azureClient);
    }

    // DeepSeek models (special system prompt handling)
    if (model.avoidSystemPrompt === true) {
      return new DeepSeekHandler(openAIClient);
    }

    // Standard OpenAI API models (Grok, Llama, etc.)
    return new StandardOpenAIHandler(openAIClient);
  }

  /**
   * Get a descriptive name for debugging purposes.
   */
  static getHandlerName(model: OpenAIModel | null | undefined): string {
    if (!model) return 'Unknown';
    if (model.sdk === 'anthropic-foundry') return 'AnthropicFoundryHandler';
    if (model.sdk === 'azure-openai') return 'AzureOpenAIHandler';
    if (model.avoidSystemPrompt === true) return 'DeepSeekHandler';
    return 'StandardOpenAIHandler';
  }

  /**
   * Check if the model requires the Anthropic handler.
   * Used by StandardChatService to determine the code path.
   */
  static isAnthropicModel(model: OpenAIModel | null | undefined): boolean {
    return model?.sdk === 'anthropic-foundry';
  }

  /**
   * Get the Anthropic handler for Claude models.
   * Returns null if the model is not an Anthropic model or client is not configured.
   */
  static getAnthropicHandler(
    model: OpenAIModel | null | undefined,
    anthropicClient: AnthropicFoundry | undefined,
  ): AnthropicFoundryHandler | null {
    if (!model || model.sdk !== 'anthropic-foundry' || !anthropicClient) {
      return null;
    }
    return new AnthropicFoundryHandler(anthropicClient);
  }
}
