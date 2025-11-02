import { NextRequest } from 'next/server';

import { AudioChatService } from '@/lib/services/chat';
import { FileConversationHandler } from '@/lib/services/chat/FileConversationHandler';
import { ChatLogger } from '@/lib/services/shared';

import { MessageType } from '@/types/chat';
import { OpenAIModelID, OpenAIModels } from '@/types/openai';

import {
  createMockRequest,
  createMockSession,
  parseJsonResponse,
} from './helpers';

import { POST } from '@/app/api/chat/audio/route';
import { auth } from '@/auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Hoist mocks before imports
const mockAuth = vi.hoisted(() => vi.fn());
const mockAudioChatService = vi.hoisted(() => vi.fn());
const mockFileConversationHandler = vi.hoisted(() => vi.fn());
const mockChatLogger = vi.hoisted(() => vi.fn());

// Mock dependencies
vi.mock('@/auth', () => ({
  auth: mockAuth,
}));

vi.mock('@/lib/services/chat', () => ({
  AudioChatService: mockAudioChatService,
}));

vi.mock('@/lib/services/chat/FileConversationHandler', () => ({
  FileConversationHandler: mockFileConversationHandler,
}));

vi.mock('@/lib/services/shared', () => ({
  ChatLogger: mockChatLogger,
}));

/**
 * Tests for POST /api/chat/audio
 * Audio/video chat endpoint with Whisper transcription
 */
describe('/api/chat/audio', () => {
  const mockSession = createMockSession();

  const mockHandleChat = vi.fn();
  const mockHasAudioVideoFiles = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup auth mock
    mockAuth.mockResolvedValue(mockSession as any);

    // Setup service mocks as proper constructors
    mockChatLogger.mockImplementation(function (this: any) {
      return {};
    });

    mockFileConversationHandler.mockImplementation(function (this: any) {
      return {};
    });

    // Mock AudioChatService with handleChat and hasAudioVideoFiles methods
    mockAudioChatService.mockImplementation(function (this: any) {
      return {
        handleChat: mockHandleChat,
        hasAudioVideoFiles: mockHasAudioVideoFiles,
      };
    });

    // Default: messages contain audio/video files
    mockHasAudioVideoFiles.mockReturnValue(true);

    // Default successful response
    mockHandleChat.mockResolvedValue(
      new Response('Transcribed audio content', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      }),
    );
  });

  const createChatRequest = (options: {
    body?: any;
    url?: string;
  }): NextRequest => {
    const {
      body = {
        model: OpenAIModels[OpenAIModelID.GPT_5],
        messages: [
          {
            role: 'user',
            content: 'Transcribe this audio',
            messageType: MessageType.AUDIO,
            audioUrl: 'https://example.com/audio.mp3',
          },
        ],
      },
      url = 'http://localhost:3000/api/chat/audio',
    } = options;

    return createMockRequest({
      method: 'POST',
      url,
      body,
    });
  };

  describe('Authentication', () => {
    it('returns 500 when session is not found', async () => {
      mockAuth.mockResolvedValue(null);

      const request = createChatRequest({});
      const response = await POST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal Server Error');
      expect(data.message).toContain('Could not pull session');
    });

    it('allows authenticated requests with audio files', async () => {
      const request = createChatRequest({});
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockHandleChat).toHaveBeenCalled();
    });

    it('uses session user in chat service', async () => {
      const request = createChatRequest({});
      await POST(request);

      expect(mockHandleChat).toHaveBeenCalledWith(
        expect.objectContaining({
          user: mockSession.user,
        }),
      );
    });
  });

  describe('File Validation', () => {
    it('returns 400 when no audio/video files in messages', async () => {
      mockHasAudioVideoFiles.mockReturnValue(false);

      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5],
          messages: [
            {
              role: 'user',
              content: 'Text message without audio',
              messageType: MessageType.TEXT,
            },
          ],
        },
      });

      const response = await POST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Bad Request');
      expect(data.message).toBe('No audio/video files found in messages');
    });

    it('accepts messages with audio files', async () => {
      mockHasAudioVideoFiles.mockReturnValue(true);

      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5],
          messages: [
            {
              role: 'user',
              content: 'Audio message',
              messageType: MessageType.AUDIO,
              audioUrl: 'https://example.com/recording.wav',
            },
          ],
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockHasAudioVideoFiles).toHaveBeenCalledWith(expect.any(Array));
    });

    it('accepts messages with video files', async () => {
      mockHasAudioVideoFiles.mockReturnValue(true);

      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5],
          messages: [
            {
              role: 'user',
              content: 'Video message',
              messageType: MessageType.VIDEO,
              videoUrl: 'https://example.com/video.mp4',
            },
          ],
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockHasAudioVideoFiles).toHaveBeenCalledWith(expect.any(Array));
    });
  });

  describe('Request Parsing', () => {
    it('parses model and messages from request body', async () => {
      const model = OpenAIModels[OpenAIModelID.GPT_5];
      const messages = [
        {
          role: 'user' as const,
          content: 'Transcribe this',
          messageType: MessageType.AUDIO,
          audioUrl: 'https://example.com/audio.mp3',
        },
      ];

      const request = createChatRequest({
        body: { model, messages },
      });

      await POST(request);

      expect(mockHandleChat).toHaveBeenCalledWith(
        expect.objectContaining({
          model,
          messages,
        }),
      );
    });

    it('defaults stream to true when not provided', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5],
          messages: [
            {
              role: 'user',
              content: 'Audio',
              messageType: MessageType.AUDIO,
              audioUrl: 'https://example.com/audio.mp3',
            },
          ],
        },
      });

      await POST(request);

      expect(mockHandleChat).toHaveBeenCalledWith(
        expect.objectContaining({
          stream: true,
        }),
      );
    });

    it('respects stream: false when provided', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5],
          messages: [
            {
              role: 'user',
              content: 'Audio',
              messageType: MessageType.AUDIO,
              audioUrl: 'https://example.com/audio.mp3',
            },
          ],
          stream: false,
        },
      });

      await POST(request);

      expect(mockHandleChat).toHaveBeenCalledWith(
        expect.objectContaining({
          stream: false,
        }),
      );
    });

    it('parses optional botId for logging', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5],
          messages: [
            {
              role: 'user',
              content: 'Audio',
              messageType: MessageType.AUDIO,
              audioUrl: 'https://example.com/audio.mp3',
            },
          ],
          botId: 'audio-bot-123',
        },
      });

      await POST(request);

      expect(mockHandleChat).toHaveBeenCalledWith(
        expect.objectContaining({
          botId: 'audio-bot-123',
        }),
      );
    });
  });

  describe('Service Initialization', () => {
    it('creates ChatLogger', async () => {
      const request = createChatRequest({});
      await POST(request);

      expect(ChatLogger).toHaveBeenCalled();
    });

    it('creates FileConversationHandler with logger', async () => {
      const request = createChatRequest({});
      await POST(request);

      expect(FileConversationHandler).toHaveBeenCalled();
    });

    it('creates AudioChatService', async () => {
      const request = createChatRequest({});
      await POST(request);

      expect(AudioChatService).toHaveBeenCalled();
    });
  });

  describe('Response Handling', () => {
    it('returns streaming response from service', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode('Transcribed: Hello from the audio...'),
          );
          controller.close();
        },
      });

      mockHandleChat.mockResolvedValue(
        new Response(mockStream, {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        }),
      );

      const request = createChatRequest({});
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/plain');
    });

    it('returns non-streaming JSON response from service', async () => {
      mockHandleChat.mockResolvedValue(
        new Response(JSON.stringify({ text: 'Transcription complete' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5],
          messages: [
            {
              role: 'user',
              content: 'Audio',
              messageType: MessageType.AUDIO,
              audioUrl: 'https://example.com/audio.mp3',
            },
          ],
          stream: false,
        },
      });

      const response = await POST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(200);
      expect(data.text).toBe('Transcription complete');
    });
  });

  describe('Error Handling', () => {
    it('returns 500 on service error', async () => {
      mockHandleChat.mockRejectedValue(new Error('Transcription failed'));

      const request = createChatRequest({});
      const response = await POST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal Server Error');
      expect(data.message).toBe('Transcription failed');
    });

    it('handles authentication errors', async () => {
      mockAuth.mockRejectedValue(new Error('Auth failed'));

      const request = createChatRequest({});
      const response = await POST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal Server Error');
    });

    it('handles unknown errors gracefully', async () => {
      mockHandleChat.mockRejectedValue('String error');

      const request = createChatRequest({});
      const response = await POST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal Server Error');
      expect(data.message).toBe('Unknown error');
    });

    it('logs errors to console', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockHandleChat.mockRejectedValue(new Error('Test error'));

      const request = createChatRequest({});
      await POST(request);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[POST /api/chat/audio] Error:',
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Logging', () => {
    it('logs request details to console', async () => {
      const consoleLogSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5],
          messages: [
            {
              role: 'user',
              content: 'Audio',
              messageType: MessageType.AUDIO,
              audioUrl: 'https://example.com/audio.mp3',
            },
          ],
          botId: 'transcription-bot',
        },
      });

      await POST(request);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[POST /api/chat/audio] Request:',
        expect.objectContaining({
          modelId: OpenAIModels[OpenAIModelID.GPT_5].id,
          messageCount: 1,
          stream: true,
          botId: 'transcription-bot',
        }),
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('Integration Scenarios', () => {
    it('handles single audio file transcription', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5],
          messages: [
            {
              role: 'user',
              content: 'Please transcribe this meeting recording',
              messageType: MessageType.AUDIO,
              audioUrl: 'https://example.com/meeting.wav',
            },
          ],
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockHandleChat).toHaveBeenCalledWith({
        messages: expect.any(Array),
        model: OpenAIModels[OpenAIModelID.GPT_5],
        user: mockSession.user,
        stream: true,
        botId: undefined,
      });
    });

    it('handles video file transcription', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5],
          messages: [
            {
              role: 'user',
              content: 'Extract audio from this video',
              messageType: MessageType.VIDEO,
              videoUrl: 'https://example.com/presentation.mp4',
            },
          ],
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('handles multiple audio messages in conversation', async () => {
      const messages = [
        {
          role: 'user' as const,
          content: 'First recording',
          messageType: MessageType.AUDIO,
          audioUrl: 'https://example.com/audio1.mp3',
        },
        {
          role: 'assistant' as const,
          content: 'Transcription of first recording...',
          messageType: MessageType.TEXT,
        },
        {
          role: 'user' as const,
          content: 'Second recording',
          messageType: MessageType.AUDIO,
          audioUrl: 'https://example.com/audio2.mp3',
        },
      ];

      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5],
          messages,
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockHandleChat).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining(messages),
        }),
      );
    });

    it('handles complete audio flow with all parameters', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5],
          messages: [
            {
              role: 'user',
              content: 'Transcribe and summarize',
              messageType: MessageType.AUDIO,
              audioUrl: 'https://example.com/podcast.mp3',
            },
          ],
          stream: true,
          botId: 'podcast-transcription-bot',
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockHandleChat).toHaveBeenCalledWith({
        messages: expect.any(Array),
        model: OpenAIModels[OpenAIModelID.GPT_5],
        user: mockSession.user,
        stream: true,
        botId: 'podcast-transcription-bot',
      });
    });

    it('handles minimal request with only required parameters', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5],
          messages: [
            {
              role: 'user',
              content: 'Audio',
              messageType: MessageType.AUDIO,
              audioUrl: 'https://example.com/audio.mp3',
            },
          ],
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockHandleChat).toHaveBeenCalledWith({
        messages: expect.any(Array),
        model: OpenAIModels[OpenAIModelID.GPT_5],
        user: mockSession.user,
        stream: true,
        botId: undefined,
      });
    });
  });
});
