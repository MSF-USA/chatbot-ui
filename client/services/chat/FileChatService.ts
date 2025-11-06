'use client';

import { Message } from '@/types/chat';
import { OpenAIModel } from '@/types/openai';

import { apiClient } from '../api';
import { ChatApiResponse, StandardChatApiRequest } from '../api/types';

/**
 * Frontend service for document file chat completions.
 *
 * Calls: POST /api/chat/file
 *
 * Handles:
 * - Document file chat requests (non-audio/video)
 * - File analysis and summarization
 * - Streaming responses
 * - Non-streaming responses
 */
export class FileChatService {
  /**
   * Sends a document file chat request and returns a streaming response.
   *
   * @param request - The file chat request
   * @returns ReadableStream for processing response chunks
   */
  public async sendStreamingChat(
    request: Omit<StandardChatApiRequest, 'stream'>,
  ): Promise<ReadableStream<Uint8Array>> {
    return apiClient.postStream('/api/chat/file', {
      ...request,
      stream: true,
    });
  }

  /**
   * Sends a document file chat request and returns a complete response.
   *
   * @param request - The file chat request
   * @returns The complete chat response
   */
  public async sendChat(
    request: Omit<StandardChatApiRequest, 'stream'>,
  ): Promise<ChatApiResponse> {
    return apiClient.post<ChatApiResponse>('/api/chat/file', {
      ...request,
      stream: false,
    });
  }

  /**
   * Convenience method for document file chat requests.
   *
   * @param model - The model to use
   * @param messages - The conversation messages (must contain document file)
   * @param options - Optional parameters
   * @returns ReadableStream for processing response chunks
   */
  public async chat(
    model: OpenAIModel,
    messages: Message[],
    options?: {
      botId?: string;
    },
  ): Promise<ReadableStream<Uint8Array>> {
    return this.sendStreamingChat({
      model,
      messages,
      ...options,
    });
  }

  /**
   * Checks if messages contain document files (non-audio/video).
   *
   * @param messages - The conversation messages
   * @returns true if document files detected, false otherwise
   */
  public hasDocumentFiles(messages: Message[]): boolean {
    const audioVideoExtensions = [
      '.mp3',
      '.mp4',
      '.mpeg',
      '.mpga',
      '.m4a',
      '.wav',
      '.webm',
    ];

    return messages.some((message) => {
      if (!Array.isArray(message.content)) return false;

      return message.content.some((content) => {
        if (content.type !== 'file_url') return false;

        const filename = content.originalFilename || content.url || '';
        if (!filename) {
          console.warn(
            '[FileChatService] No filename found for file_url content:',
            content,
          );
          return false;
        }

        const parts = filename.split('.');
        if (parts.length < 2) {
          console.warn(
            '[FileChatService] No extension found in filename:',
            filename,
          );
          return false;
        }

        const ext = '.' + parts.pop()?.toLowerCase();
        const isAudioVideo = audioVideoExtensions.includes(ext);

        console.log(
          `[FileChatService.hasDocumentFiles] File: "${filename}", ext: "${ext}", isAudioVideo: ${isAudioVideo}, result: ${!isAudioVideo}`,
        );

        // Return true if it's a file but NOT an audio/video file
        return !isAudioVideo;
      });
    });
  }
}

// Export singleton instance
export const fileChatService = new FileChatService();
