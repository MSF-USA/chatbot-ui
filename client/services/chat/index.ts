/**
 * Frontend chat services.
 *
 * Provides:
 * - ChatService: Main orchestrator (routes to specialized services)
 * - StandardChatService: Standard chat completions
 * - RAGChatService: RAG-augmented chat with knowledge bases
 * - AgentChatService: Agent-based chat with Bing grounding
 * - FileChatService: Document file chat with analysis
 * - AudioChatService: Audio/video file chat with transcription
 *
 * All services use the centralized ApiClient for HTTP requests.
 *
 * Usage:
 * ```ts
 * import { chatService } from '@/client/services/chat';
 *
 * const stream = await chatService.chat(model, messages, options);
 * ```
 *
 * Or use specialized services directly:
 * ```ts
 * import { standardChatService } from '@/client/services/chat';
 *
 * const stream = await standardChatService.chat(model, messages);
 * ```
 */

export { ChatService, chatService } from './ChatService';
export {
  StandardChatService,
  standardChatService,
} from './StandardChatService';
export { RAGChatService, ragChatService } from './RAGChatService';
export { AgentChatService, agentChatService } from './AgentChatService';
export { FileChatService, fileChatService } from './FileChatService';
export { AudioChatService, audioChatService } from './AudioChatService';
