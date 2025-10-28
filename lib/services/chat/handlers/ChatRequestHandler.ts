import { ChatContext } from './ChatContext';

/**
 * Interface for all chat request handlers.
 * Implements Chain of Responsibility pattern.
 *
 * Each handler:
 * 1. Checks if it can handle the request (canHandle)
 * 2. Handles the request if it can (handle)
 * 3. Has an explicit priority for ordering (getPriority)
 */
export interface ChatRequestHandler {
  /**
   * Determines if this handler can process the given request.
   * @param context The chat context containing all request information
   * @returns true if this handler can process the request
   */
  canHandle(context: ChatContext): boolean;

  /**
   * Handles the chat request.
   * Only called if canHandle() returns true.
   * @param context The chat context containing all request information
   * @returns Promise resolving to the HTTP response
   */
  handle(context: ChatContext): Promise<Response>;

  /**
   * Returns the priority of this handler.
   * Lower numbers = higher priority (checked first)
   *
   * Priority guidelines:
   * 1-10: Critical handlers that must run first (e.g., audio/video)
   * 11-50: Feature handlers (e.g., agents, RAG)
   * 51-98: Model-specific handlers
   * 99: Default/fallback handler
   *
   * @returns The priority number
   */
  getPriority(): number;

  /**
   * Returns a descriptive name for this handler (for logging/debugging).
   * @returns The handler name
   */
  getName(): string;
}
