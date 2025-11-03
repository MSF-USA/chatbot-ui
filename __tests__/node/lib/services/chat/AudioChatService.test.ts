import { AudioChatService } from '@/lib/services/chat/AudioChatService';
import { FileConversationHandler } from '@/lib/services/chat/FileConversationHandler';
import { ChatLogger } from '@/lib/services/shared';

import { FileMessageContent, Message, TextMessageContent } from '@/types/chat';
import { OpenAIModel, OpenAIModelID, OpenAIModels } from '@/types/openai';

import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('AudioChatService', () => {
  let service: AudioChatService;
  let mockFileHandler: FileConversationHandler;
  let mockLogger: ChatLogger;

  const testUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    displayName: 'Test User',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock logger
    mockLogger = {
      logChatCompletion: vi.fn().mockResolvedValue(undefined),
      logError: vi.fn().mockResolvedValue(undefined),
    } as any;

    // Create mock file handler
    mockFileHandler = {
      handleFileConversation: vi.fn(),
    } as any;

    // Create service instance
    service = new AudioChatService(mockFileHandler, mockLogger);
  });

  describe('handleChat', () => {
    it('should handle audio file chat request successfully (non-streaming)', async () => {
      const model = OpenAIModels[OpenAIModelID.GPT_5];
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Transcribe this audio',
            } as TextMessageContent,
            {
              type: 'file_url',
              url: 'audio-file-id',
              originalFilename: 'recording.mp3',
            } as FileMessageContent,
          ],
          messageType: undefined,
        },
      ];

      // Mock file handler response
      const mockResponse = new Response(
        JSON.stringify({ text: 'Transcription: Hello world' }),
        { headers: { 'Content-Type': 'application/json' } },
      );
      vi.mocked(mockFileHandler.handleFileConversation).mockResolvedValue(
        mockResponse,
      );

      // Execute
      const response = await service.handleChat({
        messages,
        model,
        user: testUser,
        stream: false,
      });

      // Verify file handler was called
      expect(mockFileHandler.handleFileConversation).toHaveBeenCalledWith(
        messages,
        model.id,
        testUser,
        undefined,
        false,
      );

      // Verify response
      expect(response).toBe(mockResponse);
    });

    it('should handle streaming audio request successfully', async () => {
      const model = OpenAIModels[OpenAIModelID.GPT_5];
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            {
              type: 'file_url',
              url: 'audio-file',
              originalFilename: 'meeting.mp3',
            } as FileMessageContent,
          ],
          messageType: undefined,
        },
      ];

      // Mock streaming response
      const mockStream = new ReadableStream();
      const mockResponse = new Response(mockStream, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
      vi.mocked(mockFileHandler.handleFileConversation).mockResolvedValue(
        mockResponse,
      );

      // Execute
      const response = await service.handleChat({
        messages,
        model,
        user: testUser,
        stream: true,
      });

      // Verify file handler was called with streaming
      expect(mockFileHandler.handleFileConversation).toHaveBeenCalledWith(
        messages,
        model.id,
        testUser,
        undefined,
        true,
      );

      // Verify response
      expect(response).toBe(mockResponse);
    });

    it('should use default stream value of true when not specified', async () => {
      const model = OpenAIModels[OpenAIModelID.GPT_5];
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            {
              type: 'file_url',
              url: 'file-id',
              originalFilename: 'audio.mp3',
            } as FileMessageContent,
          ],
          messageType: undefined,
        },
      ];

      // Mock response
      const mockResponse = new Response('Response', {
        headers: { 'Content-Type': 'text/plain' },
      });
      vi.mocked(mockFileHandler.handleFileConversation).mockResolvedValue(
        mockResponse,
      );

      // Execute without specifying stream
      await service.handleChat({
        messages,
        model,
        user: testUser,
        // stream not specified
      });

      // Verify default stream = true was used
      expect(mockFileHandler.handleFileConversation).toHaveBeenCalledWith(
        messages,
        model.id,
        testUser,
        undefined,
        true, // default
      );
    });

    it('should pass botId to file handler', async () => {
      const model = OpenAIModels[OpenAIModelID.GPT_5];
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            {
              type: 'file_url',
              url: 'file-id',
              originalFilename: 'audio.mp3',
            } as FileMessageContent,
          ],
          messageType: undefined,
        },
      ];
      const botId = 'bot-123';

      // Mock response
      const mockResponse = new Response('Response', {
        headers: { 'Content-Type': 'text/plain' },
      });
      vi.mocked(mockFileHandler.handleFileConversation).mockResolvedValue(
        mockResponse,
      );

      // Execute with botId
      await service.handleChat({
        messages,
        model,
        user: testUser,
        botId,
      });

      // Verify botId was passed
      expect(mockFileHandler.handleFileConversation).toHaveBeenCalledWith(
        messages,
        model.id,
        testUser,
        botId,
        true,
      );
    });

    it('should handle errors from file handler', async () => {
      const model = OpenAIModels[OpenAIModelID.GPT_5];
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            {
              type: 'file_url',
              url: 'file-id',
              originalFilename: 'audio.mp3',
            } as FileMessageContent,
          ],
          messageType: undefined,
        },
      ];
      const error = new Error('File handler failed');

      // Mock file handler to throw error
      vi.mocked(mockFileHandler.handleFileConversation).mockRejectedValue(
        error,
      );

      // Execute and expect error
      await expect(
        service.handleChat({
          messages,
          model,
          user: testUser,
        }),
      ).rejects.toThrow('File handler failed');

      // Verify error was logged
      expect(mockLogger.logError).toHaveBeenCalledWith(
        expect.any(Number),
        error,
        model.id,
        messages.length,
        1,
        testUser,
        undefined,
      );
    });
  });

  describe('hasAudioVideoFiles', () => {
    it('should return true for messages with MP3 files', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            {
              type: 'file_url',
              url: 'file-id',
              originalFilename: 'recording.mp3',
            } as FileMessageContent,
          ],
          messageType: undefined,
        },
      ];

      const result = service.hasAudioVideoFiles(messages);
      expect(result).toBe(true);
    });

    it('should return true for messages with MP4 files', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            {
              type: 'file_url',
              url: 'file-id',
              originalFilename: 'video.mp4',
            } as FileMessageContent,
          ],
          messageType: undefined,
        },
      ];

      const result = service.hasAudioVideoFiles(messages);
      expect(result).toBe(true);
    });

    it('should return true for messages with WAV files', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            {
              type: 'file_url',
              url: 'file-id',
              originalFilename: 'audio.wav',
            } as FileMessageContent,
          ],
          messageType: undefined,
        },
      ];

      const result = service.hasAudioVideoFiles(messages);
      expect(result).toBe(true);
    });

    it('should return true for messages with M4A files', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            {
              type: 'file_url',
              url: 'file-id',
              originalFilename: 'podcast.m4a',
            } as FileMessageContent,
          ],
          messageType: undefined,
        },
      ];

      const result = service.hasAudioVideoFiles(messages);
      expect(result).toBe(true);
    });

    it('should return true for messages with WEBM files', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            {
              type: 'file_url',
              url: 'file-id',
              originalFilename: 'recording.webm',
            } as FileMessageContent,
          ],
          messageType: undefined,
        },
      ];

      const result = service.hasAudioVideoFiles(messages);
      expect(result).toBe(true);
    });

    it('should return false for messages with non-audio files', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            {
              type: 'file_url',
              url: 'file-id',
              originalFilename: 'document.pdf',
            } as FileMessageContent,
          ],
          messageType: undefined,
        },
      ];

      const result = service.hasAudioVideoFiles(messages);
      expect(result).toBe(false);
    });

    it('should return false for text-only messages', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'Hello world',
          messageType: undefined,
        },
      ];

      const result = service.hasAudioVideoFiles(messages);
      expect(result).toBe(false);
    });

    it('should return false for empty messages', () => {
      const messages: Message[] = [];

      const result = service.hasAudioVideoFiles(messages);
      expect(result).toBe(false);
    });

    it('should handle case insensitive file extensions', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            {
              type: 'file_url',
              url: 'file-id',
              originalFilename: 'RECORDING.MP3',
            } as FileMessageContent,
          ],
          messageType: undefined,
        },
      ];

      const result = service.hasAudioVideoFiles(messages);
      expect(result).toBe(true);
    });

    it('should check multiple messages', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'Text message',
          messageType: undefined,
        },
        {
          role: 'assistant',
          content: 'Response',
          messageType: undefined,
        },
        {
          role: 'user',
          content: [
            {
              type: 'file_url',
              url: 'file-id',
              originalFilename: 'audio.mp3',
            } as FileMessageContent,
          ],
          messageType: undefined,
        },
      ];

      const result = service.hasAudioVideoFiles(messages);
      expect(result).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete audio transcription workflow', async () => {
      const model = OpenAIModels[OpenAIModelID.GPT_5];
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please transcribe this meeting',
            } as TextMessageContent,
            {
              type: 'file_url',
              url: 'meeting-file',
              originalFilename: 'team-meeting.mp3',
            } as FileMessageContent,
          ],
          messageType: undefined,
        },
      ];

      // Mock file handler response
      const mockResponse = new Response(
        JSON.stringify({
          text: 'Meeting transcript: The team discussed...',
        }),
        { headers: { 'Content-Type': 'application/json' } },
      );
      vi.mocked(mockFileHandler.handleFileConversation).mockResolvedValue(
        mockResponse,
      );

      // Execute
      const response = await service.handleChat({
        messages,
        model,
        user: testUser,
        stream: false,
      });

      // Verify complete workflow
      expect(mockFileHandler.handleFileConversation).toHaveBeenCalled();
      expect(response).toBe(mockResponse);
    });

    it('should handle video file processing', async () => {
      const model = OpenAIModels[OpenAIModelID.GPT_5];
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            {
              type: 'file_url',
              url: 'video-file',
              originalFilename: 'presentation.mp4',
            } as FileMessageContent,
          ],
          messageType: undefined,
        },
      ];

      // Mock file handler response
      const mockResponse = new Response('Video transcription...', {
        headers: { 'Content-Type': 'text/plain' },
      });
      vi.mocked(mockFileHandler.handleFileConversation).mockResolvedValue(
        mockResponse,
      );

      // Execute
      await service.handleChat({
        messages,
        model,
        user: testUser,
      });

      // Verify video was processed
      expect(mockFileHandler.handleFileConversation).toHaveBeenCalled();
    });

    it('should handle multiple audio files in conversation', async () => {
      const model = OpenAIModels[OpenAIModelID.GPT_5];
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            {
              type: 'file_url',
              url: 'audio1',
              originalFilename: 'part1.mp3',
            } as FileMessageContent,
          ],
          messageType: undefined,
        },
        {
          role: 'assistant',
          content: 'Transcribed part 1...',
          messageType: undefined,
        },
        {
          role: 'user',
          content: [
            {
              type: 'file_url',
              url: 'audio2',
              originalFilename: 'part2.mp3',
            } as FileMessageContent,
          ],
          messageType: undefined,
        },
      ];

      // Mock file handler response
      const mockResponse = new Response('Transcription...', {
        headers: { 'Content-Type': 'text/plain' },
      });
      vi.mocked(mockFileHandler.handleFileConversation).mockResolvedValue(
        mockResponse,
      );

      // Execute
      await service.handleChat({
        messages,
        model,
        user: testUser,
      });

      // Verify all messages were passed
      expect(mockFileHandler.handleFileConversation).toHaveBeenCalledWith(
        messages,
        model.id,
        testUser,
        undefined,
        true,
      );
    });
  });
});
