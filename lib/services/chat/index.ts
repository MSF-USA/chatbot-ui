/**
 * Specialized chat services.
 *
 * These services handle different types of chat completions:
 * - StandardChatService: Standard (non-RAG, non-agent) chat
 * - RAGChatService: RAG-augmented chat with knowledge bases
 * - AgentChatService: Agent-based chat with Bing grounding
 * - AudioChatService: Audio/video file chat with transcription
 *
 * All services use dependency injection and are designed for easy testing.
 */

export { StandardChatService } from './StandardChatService';
export { RAGChatService } from './RAGChatService';
export { AgentChatService } from './AgentChatService';
export { AudioChatService } from './AudioChatService';

export type { StandardChatRequest } from './StandardChatService';
export type { RAGChatRequest } from './RAGChatService';
export type { AgentChatRequest } from './AgentChatService';
export type { AudioChatRequest } from './AudioChatService';

// Re-export file handler for backward compatibility
export { FileConversationHandler } from './FileConversationHandler';
export { AIFoundryAgentHandler } from './AIFoundryAgentHandler';
