import { Session } from 'next-auth';

import { DEFAULT_SYSTEM_PROMPT } from '@/lib/utils/app/const';

import {
  FileMessageContent,
  ImageMessageContent,
  Message,
  TextMessageContent,
} from '@/types/chat';
import { OpenAIModel } from '@/types/openai';

import { ChatCompletionParams, ModelHandler } from './ModelHandler';

import OpenAI, { AzureOpenAI } from 'openai';

/** Union of all possible message content types */
type MessageContent =
  | TextMessageContent
  | ImageMessageContent
  | FileMessageContent;

/**
 * Content types supported by Azure OpenAI API.
 * Note: 'file_url' is NOT supported - it's a custom type for internal file references.
 */
const AZURE_SUPPORTED_CONTENT_TYPES = [
  'text',
  'image_url',
  'input_audio',
  'refusal',
  'audio',
  'file',
];

/**
 * Handler for Azure OpenAI models (GPT-5, o3, GPT-4.1 non-agent).
 *
 * Features:
 * - Uses Azure OpenAI SDK
 * - Supports reasoning_effort parameter (GPT-5, o3)
 * - Supports verbosity parameter (GPT-5 only)
 * - Standard system message handling
 * - Automatically sanitizes unsupported content types (like file_url)
 */
export class AzureOpenAIHandler extends ModelHandler {
  private client: AzureOpenAI;

  constructor(client: AzureOpenAI) {
    super();
    this.client = client;
  }

  getClient(): AzureOpenAI {
    return this.client;
  }

  /**
   * Sanitizes messages to remove content types not supported by Azure OpenAI.
   * This is a defensive measure to prevent API errors if upstream processing
   * fails to convert custom content types like 'file_url'.
   *
   * @param messages - The messages to sanitize
   * @returns Messages with only Azure-supported content types
   */
  private sanitizeMessages(messages: Message[]): Message[] {
    return messages.map((message) => {
      // String content is always valid
      if (typeof message.content === 'string') {
        return message;
      }

      // Non-array content, pass through
      if (!Array.isArray(message.content)) {
        return message;
      }

      // Filter out unsupported content types
      const filteredContent = message.content.filter((c: MessageContent) =>
        AZURE_SUPPORTED_CONTENT_TYPES.includes(c.type),
      );

      // If all content was filtered out, add placeholder text
      if (filteredContent.length === 0) {
        return {
          ...message,
          content: '[Content could not be processed]',
        };
      }

      // If only one text item remains, convert to string for simplicity
      if (
        filteredContent.length === 1 &&
        filteredContent[0].type === 'text' &&
        'text' in filteredContent[0]
      ) {
        return {
          ...message,
          content: filteredContent[0].text,
        };
      }

      return {
        ...message,
        content: filteredContent,
      };
    });
  }

  prepareMessages(
    messages: Message[],
    systemPrompt: string | undefined,
    modelConfig: OpenAIModel,
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    // Sanitize messages to remove unsupported content types (like file_url)
    const sanitizedMessages = this.sanitizeMessages(messages);

    // Standard approach: system message at the beginning
    return [
      {
        role: 'system',
        content: systemPrompt || DEFAULT_SYSTEM_PROMPT,
      },
      ...(sanitizedMessages as OpenAI.Chat.Completions.ChatCompletionMessageParam[]),
    ];
  }

  buildRequestParams(
    modelId: string,
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    temperature: number,
    user: Session['user'],
    streamResponse: boolean,
    modelConfig: OpenAIModel,
    reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high',
    verbosity?: 'low' | 'medium' | 'high',
  ): ChatCompletionParams {
    const supportsTemperature = modelConfig?.supportsTemperature !== false;

    const params: any = {
      model: modelId,
      messages,
      user: JSON.stringify(user),
      stream: streamResponse,
      max_completion_tokens: modelConfig?.tokenLimit || 16384,
    };

    // Add temperature if supported
    if (supportsTemperature) {
      params.temperature = temperature;
    }

    // Add reasoning_effort if model supports it (GPT-5, o3)
    if (modelConfig?.supportsReasoningEffort && reasoningEffort) {
      params.reasoning_effort = reasoningEffort;
    }

    // Add verbosity if model supports it (GPT-5 models only)
    if (modelConfig?.supportsVerbosity && verbosity) {
      params.verbosity = verbosity;
    }

    return params as ChatCompletionParams;
  }
}
