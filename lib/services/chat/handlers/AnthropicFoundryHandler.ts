import { Session } from 'next-auth';

import { DEFAULT_SYSTEM_PROMPT } from '@/lib/utils/app/const';

import { ImageMessageContent, Message, TextMessageContent } from '@/types/chat';
import { OpenAIModel } from '@/types/openai';

import { AnthropicFoundry } from '@anthropic-ai/foundry-sdk';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Handler for Anthropic Claude models via Azure AI Foundry.
 *
 * Key differences from OpenAI handlers:
 * - Uses client.messages.create() instead of chat.completions.create()
 * - System prompt is a separate parameter, not a message role
 * - Different streaming event format (text_delta vs delta.content)
 * - Messages only support 'user' and 'assistant' roles (no 'system')
 */
export class AnthropicFoundryHandler {
  private client: AnthropicFoundry;

  constructor(client: AnthropicFoundry) {
    this.client = client;
  }

  /**
   * Get the Anthropic Foundry client.
   */
  getClient(): AnthropicFoundry {
    return this.client;
  }

  /**
   * Convert OpenAI-style messages to Anthropic format.
   * Anthropic uses a separate system parameter and doesn't support 'system' role in messages.
   *
   * @param messages - Messages in OpenAI format
   * @param modelConfig - Model configuration (unused but kept for consistency with other handlers)
   * @returns Messages in Anthropic format
   */
  prepareMessages(
    messages: Message[],
    modelConfig: OpenAIModel,
  ): Anthropic.MessageParam[] {
    return messages
      .filter((msg) => msg.role !== 'system') // System is handled separately
      .map((msg): Anthropic.MessageParam => {
        // Handle string content
        if (typeof msg.content === 'string') {
          return {
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          };
        }

        // Handle array content (text + images)
        if (Array.isArray(msg.content)) {
          const contentBlocks: Anthropic.ContentBlockParam[] = [];

          for (const item of msg.content) {
            if (item.type === 'text' && 'text' in item) {
              contentBlocks.push({
                type: 'text',
                text: (item as TextMessageContent).text,
              });
            } else if (item.type === 'image_url' && 'image_url' in item) {
              // Convert base64 image URL to Anthropic format
              const url = (item as ImageMessageContent).image_url.url;
              if (url.startsWith('data:')) {
                const [header, data] = url.split(',');
                const mediaTypeMatch = header.match(/data:(.+);base64/);
                const mediaType = (mediaTypeMatch?.[1] ||
                  'image/jpeg') as Anthropic.Base64ImageSource['media_type'];
                contentBlocks.push({
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: mediaType,
                    data,
                  },
                });
              }
            }
          }

          return {
            role: msg.role as 'user' | 'assistant',
            content: contentBlocks,
          };
        }

        // Handle single TextMessageContent object
        if (
          typeof msg.content === 'object' &&
          'type' in msg.content &&
          msg.content.type === 'text'
        ) {
          return {
            role: msg.role as 'user' | 'assistant',
            content: (msg.content as TextMessageContent).text,
          };
        }

        // Fallback for unexpected content types
        return {
          role: msg.role as 'user' | 'assistant',
          content: String(msg.content),
        };
      });
  }

  /**
   * Build Anthropic request parameters for non-streaming requests.
   *
   * @param modelId - The model ID
   * @param messages - Prepared Anthropic messages
   * @param systemPrompt - System prompt (separate from messages in Anthropic API)
   * @param temperature - Temperature setting
   * @param user - User session info
   * @param modelConfig - Model configuration
   * @returns Anthropic MessageCreateParams for non-streaming
   */
  buildNonStreamingRequestParams(
    modelId: string,
    messages: Anthropic.MessageParam[],
    systemPrompt: string,
    temperature: number,
    user: Session['user'],
    modelConfig: OpenAIModel,
  ): Anthropic.MessageCreateParamsNonStreaming {
    const modelToUse = this.getModelIdForRequest(modelId, modelConfig);
    const supportsTemperature = modelConfig?.supportsTemperature !== false;

    const params: Anthropic.MessageCreateParamsNonStreaming = {
      model: modelToUse,
      messages,
      system: systemPrompt || DEFAULT_SYSTEM_PROMPT,
      max_tokens: modelConfig.tokenLimit,
      stream: false,
    };

    // Add temperature if supported
    if (supportsTemperature) {
      params.temperature = temperature;
    }

    // Add user metadata if available
    if (user?.email) {
      params.metadata = {
        user_id: user.email,
      };
    }

    return params;
  }

  /**
   * Build Anthropic request parameters for streaming requests.
   *
   * @param modelId - The model ID
   * @param messages - Prepared Anthropic messages
   * @param systemPrompt - System prompt (separate from messages in Anthropic API)
   * @param temperature - Temperature setting
   * @param user - User session info
   * @param modelConfig - Model configuration
   * @returns Anthropic MessageCreateParams for streaming
   */
  buildStreamingRequestParams(
    modelId: string,
    messages: Anthropic.MessageParam[],
    systemPrompt: string,
    temperature: number,
    user: Session['user'],
    modelConfig: OpenAIModel,
  ): Anthropic.MessageCreateParamsStreaming {
    const modelToUse = this.getModelIdForRequest(modelId, modelConfig);
    const supportsTemperature = modelConfig?.supportsTemperature !== false;

    const params: Anthropic.MessageCreateParamsStreaming = {
      model: modelToUse,
      messages,
      system: systemPrompt || DEFAULT_SYSTEM_PROMPT,
      max_tokens: modelConfig.tokenLimit,
      stream: true,
    };

    // Add temperature if supported
    if (supportsTemperature) {
      params.temperature = temperature;
    }

    // Add user metadata if available
    if (user?.email) {
      params.metadata = {
        user_id: user.email,
      };
    }

    return params;
  }

  /**
   * Execute a non-streaming chat completion request.
   *
   * @param requestParams - The request parameters
   * @returns The message response
   */
  async executeRequest(
    requestParams: Anthropic.MessageCreateParamsNonStreaming,
  ): Promise<Anthropic.Message> {
    return await this.client.messages.create(requestParams);
  }

  /**
   * Execute a streaming chat completion request.
   *
   * @param requestParams - The request parameters
   * @returns An async iterable of message stream events
   */
  async executeStreamingRequest(
    requestParams: Anthropic.MessageCreateParamsStreaming,
  ): Promise<AsyncIterable<Anthropic.RawMessageStreamEvent>> {
    const stream = await this.client.messages.create(requestParams);
    return stream as AsyncIterable<Anthropic.RawMessageStreamEvent>;
  }

  /**
   * Get the model ID to use in the API request.
   * Some models use deployment names instead of model IDs.
   *
   * @param modelId - The original model ID
   * @param modelConfig - The model configuration
   * @returns The model ID to use in the request
   */
  getModelIdForRequest(modelId: string, modelConfig: OpenAIModel): string {
    return modelConfig?.deploymentName || modelId;
  }

  /**
   * Extract text content from a non-streaming Anthropic response.
   *
   * @param message - The Anthropic message response
   * @returns The extracted text content
   */
  extractTextContent(message: Anthropic.Message): string {
    return message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');
  }

  /**
   * Extract thinking content from a non-streaming Anthropic response (if extended thinking is enabled).
   *
   * @param message - The Anthropic message response
   * @returns The extracted thinking content, or undefined if not present
   */
  extractThinkingContent(message: Anthropic.Message): string | undefined {
    const thinkingBlocks = message.content.filter(
      (block): block is Anthropic.ThinkingBlock => block.type === 'thinking',
    );

    if (thinkingBlocks.length === 0) {
      return undefined;
    }

    return thinkingBlocks.map((block) => block.thinking).join('\n');
  }
}
