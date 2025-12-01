import { Session } from 'next-auth';

import { getEnvVariable } from '@/utils/app/env';
import { getStructuredResponse } from '@/utils/server/structuredResponses';
import { isValidUrl } from '@/utils/server/url-validator';

import {
  FileMessageContent,
  ImageMessageContent,
  Message,
  TextMessageContent,
} from '@/types/chat';

import {
  DefaultAzureCredential,
  getBearerTokenProvider,
} from '@azure/identity';
import { AzureOpenAI } from 'openai';

/**
 * Fetches the base64 representation of an image from a message content
 * @param image - The image message content
 * @returns A promise that resolves to the base64 representation of the image
 */
export const fetchImageBase64FromMessageContent = async (
  image: ImageMessageContent,
): Promise<string> => {
  try {
    if (image?.image_url?.url) {
      const filename =
        image.image_url.url.split('/')[
          image.image_url.url.split('/').length - 1
        ];
      const page: Response = await fetch(
        `/api/v2/file/${filename}?filetype=image`,
      );
      const resp = await page.json();
      return resp.base64Url;
    } else {
      console.warn(
        `Couldn't find url in message content: ${JSON.stringify(image)}`,
      );
      return '';
    }
  } catch (error) {
    console.error('Error fetching the image:', error);
    return '';
  }
};

export type ImageGenerationResponse = {
  title?: string;
  fullTitle?: string;
  imageUrl: string;
};

export interface ImageGenerationOptions {
  /** Whether to generate a title for the image */
  generateTitle?: boolean;
  /** The number of images to generate (constrained by MAX_IMAGES_GENERATED) */
  n?: number;
  /** The size of the image to generate */
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  /** The style of the image to generate */
  style?: 'vivid' | 'natural';
  /** The model to use for image generation */
  model?: string;
  /** The deployment to use for image generation */
  deployment?: string;
}

/**
 * Service for generating images using Azure OpenAI
 */
export class ImageGenerationService {
  private apiVersion: string;
  private scope: string;
  private azureADTokenProvider: ReturnType<typeof getBearerTokenProvider>;
  private readonly MAX_IMAGES_GENERATED: number;

  /**
   * Creates a new instance of the ImageGenerationService
   */
  constructor() {
    this.apiVersion = '2025-03-01-preview';
    this.scope = 'https://cognitiveservices.azure.com/.default';
    this.azureADTokenProvider = getBearerTokenProvider(
      new DefaultAzureCredential(),
      this.scope,
    );

    // Get the maximum number of images that can be generated from environment variable
    // Default to 4 if not set
    this.MAX_IMAGES_GENERATED = parseInt(
      getEnvVariable('MAX_IMAGES_GENERATED', false, '4'),
      10,
    );
  }

  /**
   * Filters messages to only include TextMessageContent
   * @param messages - The messages to filter
   * @returns The filtered messages
   */
  private filterMessagesToTextOnly(messages: Message[]): Message[] {
    return messages.map((message) => {
      // Handle string content
      if (typeof message.content === 'string') {
        return message;
      }

      // Handle array content - filter to only include text content
      if (Array.isArray(message.content)) {
        const textContents = (
          message.content as (
            | TextMessageContent
            | FileMessageContent
            | ImageMessageContent
          )[]
        ).filter(
          (
            item: TextMessageContent | FileMessageContent | ImageMessageContent,
          ) => item.type === 'text',
        ) as TextMessageContent[];

        return {
          ...message,
          content:
            textContents.length > 0
              ? textContents
              : [{ type: 'text', text: '' }],
        };
      }

      // Handle object content - only include if it's text type
      if (typeof message.content === 'object' && message.content !== null) {
        if ((message.content as TextMessageContent).type === 'text') {
          return message;
        } else {
          // Replace non-text content with empty text
          return {
            ...message,
            content: { type: 'text', text: '' },
          };
        }
      }

      return message;
    });
  }

  /**
   * Generates a title and prompt for an image based on the conversation
   * @param openaiChat - The OpenAI client to use for generating the title and prompt
   * @param messages - The messages in the conversation
   * @param modelId - The model ID to use
   * @param user - The user session
   * @returns A promise that resolves to an object containing the title and prompt
   */
  private async generateTitleAndPrompt(
    openaiChat: AzureOpenAI,
    messages: Message[],
    modelId: string,
    user: Session['user'],
  ): Promise<{ title: string; prompt: string }> {
    // Create a system message for generating the title and prompt
    const systemMessage = {
      role: 'system',
      content: `You are an AI assistant that helps generate images. Based on the conversation, generate a concise title (less than 50 characters) and a detailed prompt for creating an image.
      The title should be descriptive but brief, capturing the main subject or theme of the desired image.
      The prompt should be detailed and specific, describing the visual elements, style, mood, and composition that would make an effective image based on the conversation.
      Focus on what the user is trying to visualize or create.`,
    };

    // Define the JSON schema for the structured response
    const jsonSchema = {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description:
            'A concise title for the image (less than 50 characters)',
        },
        prompt: {
          type: 'string',
          description:
            'A detailed prompt for generating the image based on the conversation',
        },
      },
      required: ['title', 'prompt'],
      additionalProperties: false,
    };

    // Filter messages to only include text content
    const filteredMessages = this.filterMessagesToTextOnly(messages);

    // Get structured response for title and prompt
    return await getStructuredResponse<{ title: string; prompt: string }>(
      openaiChat,
      // @ts-ignore
      [systemMessage, ...filteredMessages],
      modelId,
      user,
      jsonSchema,
      0.7, // temperature
      200, // maxTokens - moderate value since we need both title and prompt
    );
  }

  /**
   * Generates an image based on the conversation
   * @param messages - The messages in the conversation
   * @param user - The user session
   * @param modelId - The model ID to use for title generation
   * @param options - The options for image generation
   * @returns A promise that resolves to the generated image
   */
  public async generateImage(
    messages: Message[],
    user: Session['user'],
    modelId: string,
    options: ImageGenerationOptions = {},
  ): Promise<ImageGenerationResponse> {
    // Initialize OpenAI API client for structured response (if title generation is enabled)
    const openaiChat = options.generateTitle
      ? new AzureOpenAI({
          azureADTokenProvider: this.azureADTokenProvider,
          deployment: modelId,
          apiVersion: this.apiVersion,
        })
      : null;

    // Initialize OpenAI API client for image generation
    const openaiImage = new AzureOpenAI({
      azureADTokenProvider: this.azureADTokenProvider,
      deployment: options.deployment || 'dall-e-3', // Default to dall-e-3
      apiVersion: this.apiVersion,
    });

    // Set default options
    const imageOptions = {
      n: Math.min(options.n || 1, this.MAX_IMAGES_GENERATED), // Constrain by MAX_IMAGES_GENERATED
      size: options.size || '1024x1024',
      style: options.style || 'vivid',
      model: options.model || 'dall-e-3',
    };

    let prompt: string;
    let title: string | undefined;
    let fullTitle: string | undefined;

    // Generate title and prompt if title generation is enabled
    if (options.generateTitle) {
      const titleAndPrompt = await this.generateTitleAndPrompt(
        openaiChat!,
        messages,
        modelId,
        user,
      );

      prompt = titleAndPrompt.prompt;
      title = titleAndPrompt.title.slice(0, 49); // Ensuring title is less than 50 characters
      fullTitle = titleAndPrompt.title;
    } else {
      // Use the last user message as the prompt if no title generation
      const lastUserMessage = [...messages]
        .reverse()
        .find((m) => m.role === 'user');

      if (!lastUserMessage) {
        throw new Error('No user message found in the conversation');
      }

      // Extract text content from the last user message
      if (typeof lastUserMessage.content === 'string') {
        prompt = lastUserMessage.content;
      } else if (Array.isArray(lastUserMessage.content)) {
        const textContents = (
          lastUserMessage.content as (
            | TextMessageContent
            | FileMessageContent
            | ImageMessageContent
          )[]
        ).filter((item) => item.type === 'text') as TextMessageContent[];
        prompt = textContents.map((item) => item.text).join(' ');
      } else if (
        typeof lastUserMessage.content === 'object' &&
        lastUserMessage.content !== null &&
        (lastUserMessage.content as TextMessageContent).type === 'text'
      ) {
        prompt = (lastUserMessage.content as TextMessageContent).text;
      } else {
        throw new Error('No text content found in the last user message');
      }
    }

    // Generate the image using the prompt
    const imageResults = await openaiImage.images.generate({
      prompt,
      size: imageOptions.size,
      n: imageOptions.n,
      model: imageOptions.model,
      style: imageOptions.style as 'vivid' | 'natural',
    });

    // Get the image URL from the response
    const imageUrl = imageResults?.data?.[0]?.url || '';

    if (!imageUrl || !isValidUrl(imageUrl)) {
      throw new Error('Failed to generate image');
    }

    // Create the response object
    const response: ImageGenerationResponse = {
      imageUrl,
    };

    // Add title information if title generation was enabled
    if (options.generateTitle) {
      response.title = title;
      response.fullTitle = fullTitle;
    }

    return response;
  }
}
