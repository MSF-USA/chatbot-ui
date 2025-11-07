import { ErrorCode, PipelineError } from '@/lib/types/errors';
import { ChatBody, Message } from '@/types/chat';
import { OpenAIModel } from '@/types/openai';
import { SearchMode } from '@/types/searchMode';

import { z } from 'zod';

/**
 * Zod schema for message content blocks.
 * Uses a lenient schema to support various content formats.
 */
const MessageContentSchema = z.union([
  z.string().max(100000, 'Message content too long'),
  z.array(
    z.union([
      z.object({
        type: z.literal('text'),
        text: z.string().max(50000, 'Text content too long (max 50,000 chars)'),
      }),
      z.object({
        type: z.literal('image_url'),
        image_url: z.object({
          url: z.string().url('Invalid image URL'),
          detail: z.enum(['auto', 'low', 'high']).optional(),
        }),
      }),
      z.object({
        type: z.literal('file_url'),
        url: z.string().url('Invalid file URL'),
      }),
      z.object({
        type: z.literal('thinking'),
        thinking: z.string(),
      }),
    ]),
  ),
]);

/**
 * Zod schema for a single message.
 */
const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: MessageContentSchema,
  // messageType is optional metadata for frontend UI hints - not validated
  messageType: z.string().optional(),
});

/**
 * Zod schema for OpenAI model configuration.
 */
const OpenAIModelSchema = z.object({
  id: z.string().min(1, 'Model ID is required'),
  name: z.string().min(1, 'Model name is required'),
  maxLength: z.number().positive().optional(),
  tokenLimit: z.number().positive().optional(),
  // Agent-specific fields (for custom agents and built-in agents)
  isAgent: z.boolean().optional(),
  isCustomAgent: z.boolean().optional(),
  agentId: z.string().optional(),
  // Add other fields as needed but keep them optional
  // to avoid breaking existing code
}) as z.ZodType<OpenAIModel>;

/**
 * Zod schema for the main chat request body.
 */
const ChatBodySchema = z
  .object({
    model: OpenAIModelSchema,
    messages: z
      .array(MessageSchema)
      .min(1, 'At least one message is required')
      .max(100, 'Too many messages (max 100)'),
    prompt: z
      .string()
      .max(10000, 'System prompt too long (max 10,000 chars)')
      .optional(),
    temperature: z
      .number()
      .min(0, 'Temperature must be >= 0')
      .max(2, 'Temperature must be <= 2')
      .optional(),
    stream: z.boolean().optional().default(true),
    reasoningEffort: z.enum(['minimal', 'low', 'medium', 'high']).optional(),
    verbosity: z.enum(['low', 'medium', 'high']).optional(),
    botId: z.string().max(100, 'Bot ID too long').optional(),
    searchMode: z.nativeEnum(SearchMode).optional(),
    threadId: z.string().max(100, 'Thread ID too long').optional(),
    forcedAgentType: z.string().max(50, 'Agent type too long').optional(),
  })
  .strict(); // Reject unknown properties

/**
 * InputValidator validates and sanitizes incoming chat requests.
 *
 * Security features:
 * - Validates all input against schemas
 * - Prevents oversized requests
 * - Sanitizes URLs
 * - Rejects malformed data
 * - Prevents injection attacks
 */
export class InputValidator {
  /**
   * Validates a chat request body.
   *
   * @param body - The raw request body
   * @returns The validated and typed ChatBody
   * @throws PipelineError if validation fails
   */
  public validateChatRequest(body: unknown): ChatBody & {
    searchMode?: SearchMode;
    threadId?: string;
    forcedAgentType?: string;
  } {
    try {
      const result = ChatBodySchema.safeParse(body);

      if (!result.success) {
        const firstError = result.error.issues[0];
        const errorMessage = firstError
          ? `${firstError.path.join('.')}: ${firstError.message}`
          : 'Invalid request body';

        throw PipelineError.critical(
          ErrorCode.VALIDATION_FAILED,
          `Chat request validation failed: ${errorMessage}`,
          {
            validationErrors: result.error.issues,
          },
        );
      }

      // Cast to include key property (it's auto-generated in the actual request)
      return result.data as ChatBody & {
        searchMode?: SearchMode;
        threadId?: string;
        forcedAgentType?: string;
      };
    } catch (error) {
      if (error instanceof PipelineError) {
        throw error;
      }

      throw PipelineError.critical(
        ErrorCode.VALIDATION_FAILED,
        'Failed to validate chat request',
        {
          originalError: error instanceof Error ? error.message : String(error),
        },
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Validates that a file URL is from an allowed domain.
   * Prevents SSRF attacks.
   *
   * @param url - The file URL to validate
   * @returns true if valid, false otherwise
   */
  public isValidFileUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);

      // Only allow blob URLs from Azure Blob Storage
      const allowedHosts = [
        '.blob.core.windows.net',
        'localhost', // For local development
      ];

      const isAllowed = allowedHosts.some((host) =>
        parsedUrl.hostname.endsWith(host),
      );

      if (!isAllowed) {
        console.warn(
          `[InputValidator] Rejected file URL from unauthorized host: ${parsedUrl.hostname}`,
        );
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Sanitizes a string to prevent injection attacks.
   * Removes potentially dangerous characters.
   *
   * @param input - The string to sanitize
   * @param maxLength - Maximum allowed length
   * @returns Sanitized string
   */
  public sanitizeString(input: string, maxLength: number = 10000): string {
    // Trim and limit length
    let sanitized = input.trim().slice(0, maxLength);

    // Remove null bytes (potential injection vector)
    sanitized = sanitized.replace(/\0/g, '');

    return sanitized;
  }

  /**
   * Validates the total size of a request.
   * Prevents memory exhaustion attacks.
   *
   * Note: This limit is for the JSON request body only (messages + metadata).
   * Actual file/image/audio data is uploaded separately via /api/file/upload
   * which has its own 50MB limit. The chat endpoint only receives URLs.
   *
   * @param body - The request body
   * @param maxSize - Maximum allowed size in bytes (default: 10MB)
   * @returns true if size is acceptable
   */
  public validateRequestSize(
    body: unknown,
    maxSize: number = 10 * 1024 * 1024,
  ): boolean {
    try {
      const size = JSON.stringify(body).length;

      if (size > maxSize) {
        console.warn(
          `[InputValidator] Request size ${size} bytes exceeds maximum ${maxSize} bytes`,
        );
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }
}
