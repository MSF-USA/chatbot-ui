'use client';

import { Message } from '@/types/chat';
import { OpenAIModel } from '@/types/openai';

import { apiClient } from '../api';
import { AudioChatApiRequest, ChatApiResponse } from '../api/types';

/**
 * Frontend service for audio/video file chat completions with Whisper transcription.
 *
 * Calls: POST /api/chat/audio
 *
 * Handles:
 * - Audio/video file chat requests
 * - Whisper transcription
 * - Streaming responses
 * - Non-streaming responses
 */
export class AudioChatService {
  /**
   * Sends an audio/video chat request and returns a streaming response.
   *
   * @param request - The audio chat request
   * @returns ReadableStream for processing response chunks
   */
  public async sendStreamingChat(
    request: Omit<AudioChatApiRequest, 'stream'>,
  ): Promise<ReadableStream<Uint8Array>> {
    return apiClient.postStream('/api/chat/audio', {
      ...request,
      stream: true,
    });
  }

  /**
   * Sends an audio/video chat request and returns a complete response.
   *
   * @param request - The audio chat request
   * @returns The complete chat response
   */
  public async sendChat(
    request: Omit<AudioChatApiRequest, 'stream'>,
  ): Promise<ChatApiResponse> {
    return apiClient.post<ChatApiResponse>('/api/chat/audio', {
      ...request,
      stream: false,
    });
  }

  /**
   * Convenience method for audio/video chat requests.
   *
   * @param model - The model to use
   * @param messages - The conversation messages (must contain audio/video file)
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

// Export singleton instance
export const audioChatService = new AudioChatService();
