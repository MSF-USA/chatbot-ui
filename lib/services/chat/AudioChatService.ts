import { Session } from 'next-auth';

import { Message } from '@/types/chat';
import { OpenAIModel } from '@/types/openai';

import { ChatLogger } from '../shared';
import { FileConversationHandler } from './FileConversationHandler';

/**
 * Request parameters for audio/video chat.
 */
export interface AudioChatRequest {
  messages: Message[];
  model: OpenAIModel;
  user: Session['user'];
  stream?: boolean;
  botId?: string;
}

/**
 * Service responsible for handling audio/video file chat completions.
 *
 * Handles:
 * - Audio/video file download from blob storage
 * - Whisper transcription
 * - Document analysis (if user provides additional instructions)
 * - Streaming and non-streaming responses
 * - Logging
 *
 * Uses dependency injection for all dependencies.
 */
export class AudioChatService {
  private fileHandler: FileConversationHandler;
  private logger: ChatLogger;

  constructor(fileHandler: FileConversationHandler, logger: ChatLogger) {
    this.fileHandler = fileHandler;
    this.logger = logger;
  }

  /**
   * Handles an audio/video chat request.
   *
   * @param request - The audio/video chat request parameters
   * @returns Response with streaming or JSON content
   */
  public async handleChat(request: AudioChatRequest): Promise<Response> {
    const startTime = Date.now();

    try {
      console.log(
        `[AudioChatService] Processing audio/video file conversation`,
      );

      const streamResponse = request.stream ?? true;

      // Delegate to file conversation handler
      // FileConversationHandler handles:
      // 1. File download from blob storage
      // 2. Audio/video detection
      // 3. Whisper transcription
      // 4. Optional document analysis if user provides instructions
      const response = await this.fileHandler.handleFileConversation(
        request.messages,
        request.model.id,
        request.user,
        request.botId,
        streamResponse,
      );

      // Log completion
      const duration = Date.now() - startTime;
      console.log(
        `[AudioChatService] Audio/video processing completed in ${duration}ms`,
      );

      return response;
    } catch (error) {
      // Log error
      await this.logger.logError(
        startTime,
        error,
        request.model.id,
        request.messages.length,
        1, // Default temperature for file operations
        request.user,
        request.botId,
      );

      throw error;
    }
  }

  /**
   * Checks if messages contain audio/video files.
   *
   * @param messages - The conversation messages
   * @returns true if audio/video detected, false otherwise
   */
  public hasAudioVideoFiles(messages: Message[]): boolean {
    return messages.some((message) => {
      if (!Array.isArray(message.content)) return false;

      return message.content.some((content) => {
        if (content.type !== 'file_url') return false;

        const filename = content.originalFilename || content.url;
        const audioVideoExtensions = [
          '.mp3',
          '.mp4',
          '.mpeg',
          '.mpga',
          '.m4a',
          '.wav',
          '.webm',
        ];
        const ext = '.' + filename.split('.').pop()?.toLowerCase();

        return audioVideoExtensions.includes(ext);
      });
    });
  }
}
