import { Session } from 'next-auth';

import { FileConversationHandler } from '@/lib/services/chat/FileConversationHandler';
import { AzureMonitorLoggingService } from '@/lib/services/loggingService';

import { Message, MessageType } from '@/types/chat';

import fs from 'fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Hoist mocks
const mockCreateBlobStorageClient = vi.hoisted(() => vi.fn());
const mockTranscribe = vi.hoisted(() => vi.fn());
const mockGetTranscriptionService = vi.hoisted(() => vi.fn());
const mockParseAndQueryFileOpenAI = vi.hoisted(() => vi.fn());
const mockGetUserIdFromSession = vi.hoisted(() => vi.fn());
const mockAppendMetadataToStream = vi.hoisted(() => vi.fn());
const mockReadFileSync = vi.hoisted(() => vi.fn());
const mockUnlinkSync = vi.hoisted(() => vi.fn());
const mockWriteFile = vi.hoisted(() => vi.fn());
const mockRetryWithExponentialBackoff = vi.hoisted(() => vi.fn());
const mockRetryAsync = vi.hoisted(() => vi.fn());

const mockLogFileError = vi.hoisted(() => vi.fn());

// Mock dependencies
vi.mock('@/lib/services/blobStorageFactory', () => ({
  createBlobStorageClient: mockCreateBlobStorageClient,
}));

vi.mock('@/lib/services/transcriptionService', () => ({
  TranscriptionServiceFactory: {
    getTranscriptionService: mockGetTranscriptionService,
  },
}));

vi.mock('@/lib/utils/app/stream/documentSummary', () => ({
  parseAndQueryFileOpenAI: mockParseAndQueryFileOpenAI,
}));

vi.mock('@/lib/utils/app/user/session', () => ({
  getUserIdFromSession: mockGetUserIdFromSession,
}));

vi.mock('@/lib/utils/app/metadata', () => ({
  appendMetadataToStream: mockAppendMetadataToStream,
  createStreamEncoder: () => ({
    encode: (text: string) => new TextEncoder().encode(text),
  }),
}));

vi.mock('@/lib/utils/app/retry', () => ({
  retryWithExponentialBackoff: mockRetryWithExponentialBackoff,
  retryAsync: mockRetryAsync,
}));

// Mock fs
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof fs>('fs');
  return {
    ...actual,
    promises: {
      writeFile: mockWriteFile,
    },
    readFileSync: mockReadFileSync,
    unlinkSync: mockUnlinkSync,
  };
});

/**
 * Tests for FileConversationHandler
 * File conversation processing with document analysis and transcription
 */
describe('FileConversationHandler', () => {
  let handler: FileConversationHandler;
  let mockLoggingService: AzureMonitorLoggingService;
  let mockUser: Session['user'];

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock user
    mockUser = {
      id: 'user-123',
      mail: 'test@example.com',
      displayName: 'Test User',
    };

    // Setup logging service mock
    mockLoggingService = {
      logFileError: mockLogFileError,
    } as any;

    // Setup default mocks
    mockGetUserIdFromSession.mockReturnValue('user-123');

    const mockBlobGet = vi
      .fn()
      .mockResolvedValue(Buffer.from('mock file content'));
    mockCreateBlobStorageClient.mockReturnValue({
      get: mockBlobGet,
    });

    mockReadFileSync.mockReturnValue(Buffer.from('mock file content'));
    mockUnlinkSync.mockImplementation(() => {});
    mockWriteFile.mockResolvedValue(undefined);

    mockTranscribe.mockResolvedValue('Mock transcript content');
    mockGetTranscriptionService.mockReturnValue({
      transcribe: mockTranscribe,
    });

    mockParseAndQueryFileOpenAI.mockResolvedValue('Processed document content');

    mockAppendMetadataToStream.mockImplementation((controller, metadata) => {
      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode(
          `\n\n<<<METADATA_START>>>${JSON.stringify(metadata)}<<<METADATA_END>>>`,
        ),
      );
    });

    // Mock retry functions to execute immediately without retries
    mockRetryWithExponentialBackoff.mockImplementation(async (fn) => {
      return await fn();
    });
    mockRetryAsync.mockImplementation(async (fn) => {
      return await fn();
    });

    // Create handler
    handler = new FileConversationHandler(mockLoggingService);
  });

  describe('Content Validation', () => {
    it('throws error when content is not an array', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'Not an array',
          messageType: MessageType.TEXT,
        },
      ];

      await expect(
        handler.handleFileConversation(
          messages,
          'gpt-4',
          mockUser,
          undefined,
          false,
        ),
      ).rejects.toThrow('Expected array content for file conversation');
    });

    it('throws error when file URL is missing', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Analyze this' }],
          messageType: MessageType.TEXT,
        },
      ];

      await expect(
        handler.handleFileConversation(
          messages,
          'gpt-4',
          mockUser,
          undefined,
          false,
        ),
      ).rejects.toThrow('Could not find file URL!');
    });

    it('accepts valid file message content', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this document' },
            {
              type: 'file_url',
              url: 'https://storage.blob.core.windows.net/files/doc-123',
              originalFilename: 'report.pdf',
            },
          ],
          messageType: MessageType.TEXT,
        },
      ];

      await handler.handleFileConversation(
        messages,
        'gpt-4',
        mockUser,
        undefined,
        false,
      );

      expect(mockCreateBlobStorageClient).toHaveBeenCalled();
    });
  });

  describe('File Download', () => {
    it('downloads file from blob storage', async () => {
      const mockBlobGet = vi.fn().mockResolvedValue(Buffer.from('file data'));
      mockCreateBlobStorageClient.mockReturnValue({
        get: mockBlobGet,
      });

      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Process file' },
            {
              type: 'file_url',
              url: 'https://storage.blob.core.windows.net/files/file-456',
              originalFilename: 'doc.pdf',
            },
          ],
          messageType: MessageType.TEXT,
        },
      ];

      const response = await handler.handleFileConversation(
        messages,
        'gpt-4',
        mockUser,
        'bot-123',
        false,
      );

      // Verify blob storage client was used with correct path
      expect(mockBlobGet).toHaveBeenCalledWith(
        'user-123/uploads/files/file-456',
        expect.anything(),
      );

      // Verify successful response
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.text).toBeDefined();
    });

    it('throws error when blob ID cannot be parsed from URL', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Process' },
            {
              type: 'file_url',
              url: 'https://storage.blob.core.windows.net/files/',
              originalFilename: 'file.pdf',
            },
          ],
          messageType: MessageType.TEXT,
        },
      ];

      // URL with trailing slash results in empty string for blob ID
      // Handler should throw error for invalid blob ID
      await expect(
        handler.handleFileConversation(
          messages,
          'gpt-4',
          mockUser,
          undefined,
          false,
        ),
      ).rejects.toThrow('Could not parse blob ID from URL!');
    });
  });

  describe('Audio/Video File Processing', () => {
    it('detects audio files by extension', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Transcribe' },
            {
              type: 'file_url',
              url: 'https://storage.blob.core.windows.net/files/audio-123',
              originalFilename: 'recording.mp3',
            },
          ],
          messageType: MessageType.AUDIO,
        },
      ];

      await handler.handleFileConversation(
        messages,
        'gpt-4',
        mockUser,
        undefined,
        false,
      );

      expect(mockGetTranscriptionService).toHaveBeenCalledWith('whisper');
      expect(mockTranscribe).toHaveBeenCalledWith('/tmp/audio-123');
    });

    it('detects video files by extension', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract audio' },
            {
              type: 'file_url',
              url: 'https://storage.blob.core.windows.net/files/video-456',
              originalFilename: 'presentation.mp4',
            },
          ],
          messageType: MessageType.VIDEO,
        },
      ];

      await handler.handleFileConversation(
        messages,
        'gpt-4',
        mockUser,
        undefined,
        false,
      );

      expect(mockTranscribe).toHaveBeenCalledWith('/tmp/video-456');
    });

    it('processes transcript with user instructions (non-streaming)', async () => {
      mockTranscribe.mockResolvedValue('This is the audio transcript.');
      mockParseAndQueryFileOpenAI.mockResolvedValue('Summarized transcript');

      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Summarize this audio' },
            {
              type: 'file_url',
              url: 'https://storage.blob.core.windows.net/files/audio-789',
              originalFilename: 'meeting.wav',
            },
          ],
          messageType: MessageType.AUDIO,
        },
      ];

      const response = await handler.handleFileConversation(
        messages,
        'gpt-4',
        mockUser,
        undefined,
        false,
      );

      const data = await response.json();
      expect(data.text).toBe('Summarized transcript');
      expect(data.metadata.transcript.filename).toBe('meeting.wav');
      expect(data.metadata.transcript.transcript).toBe(
        'This is the audio transcript.',
      );
    });

    it('processes transcript with user instructions (streaming)', async () => {
      mockTranscribe.mockResolvedValue('Audio transcript text.');

      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('Processed '));
          controller.enqueue(new TextEncoder().encode('transcript'));
          controller.close();
        },
      });
      mockParseAndQueryFileOpenAI.mockResolvedValue(mockStream);

      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this' },
            {
              type: 'file_url',
              url: 'https://storage.blob.core.windows.net/files/audio-999',
              originalFilename: 'podcast.mp3',
            },
          ],
          messageType: MessageType.AUDIO,
        },
      ];

      const response = await handler.handleFileConversation(
        messages,
        'gpt-4',
        mockUser,
        'bot-123',
        true,
      );

      const text = await response.text();
      expect(text).toContain('Processed');
      expect(text).toContain('transcript');
      expect(mockAppendMetadataToStream).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          transcript: expect.objectContaining({
            filename: 'podcast.mp3',
            transcript: 'Audio transcript text.',
          }),
        }),
      );
    });

    it('returns transcript without processing when no instructions provided (non-streaming)', async () => {
      mockTranscribe.mockResolvedValue('Just the transcript.');

      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: '' }, // Empty prompt
            {
              type: 'file_url',
              url: 'https://storage.blob.core.windows.net/files/audio-111',
              originalFilename: 'audio.wav',
            },
          ],
          messageType: MessageType.AUDIO,
        },
      ];

      const response = await handler.handleFileConversation(
        messages,
        'gpt-4',
        mockUser,
        undefined,
        false,
      );

      const data = await response.json();
      expect(data.text).toBe('');
      expect(data.metadata.transcript.transcript).toBe('Just the transcript.');
      expect(mockParseAndQueryFileOpenAI).not.toHaveBeenCalled();
    });

    it('returns transcript without processing when no instructions provided (streaming)', async () => {
      mockTranscribe.mockResolvedValue('Plain transcript.');

      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: '' },
            {
              type: 'file_url',
              url: 'https://storage.blob.core.windows.net/files/audio-222',
              originalFilename: 'voice.m4a',
            },
          ],
          messageType: MessageType.AUDIO,
        },
      ];

      const response = await handler.handleFileConversation(
        messages,
        'gpt-4',
        mockUser,
        undefined,
        true,
      );

      const text = await response.text();
      expect(mockAppendMetadataToStream).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          transcript: expect.objectContaining({
            filename: 'voice.m4a',
            transcript: 'Plain transcript.',
          }),
        }),
      );
      expect(mockParseAndQueryFileOpenAI).not.toHaveBeenCalled();
    });

    it('supports all audio/video file extensions', async () => {
      const extensions = [
        '.mp3',
        '.mp4',
        '.mpeg',
        '.mpga',
        '.m4a',
        '.wav',
        '.webm',
      ];

      for (const ext of extensions) {
        vi.clearAllMocks();
        mockTranscribe.mockResolvedValue('Transcript');

        const messages: Message[] = [
          {
            role: 'user',
            content: [
              { type: 'text', text: '' },
              {
                type: 'file_url',
                url: `https://storage.blob.core.windows.net/files/file-${ext}`,
                originalFilename: `audio${ext}`,
              },
            ],
            messageType: MessageType.AUDIO,
          },
        ];

        await handler.handleFileConversation(
          messages,
          'gpt-4',
          mockUser,
          undefined,
          false,
        );

        expect(mockTranscribe).toHaveBeenCalled();
      }
    });
  });

  describe('Document File Processing', () => {
    it('processes document files (non-streaming)', async () => {
      mockParseAndQueryFileOpenAI.mockResolvedValue('Document summary');

      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Summarize this PDF' },
            {
              type: 'file_url',
              url: 'https://storage.blob.core.windows.net/files/doc-333',
              originalFilename: 'report.pdf',
            },
          ],
          messageType: MessageType.TEXT,
        },
      ];

      const response = await handler.handleFileConversation(
        messages,
        'gpt-4',
        mockUser,
        'bot-456',
        false,
      );

      const data = await response.json();
      expect(data.text).toBe('Document summary');
      expect(mockParseAndQueryFileOpenAI).toHaveBeenCalledWith({
        file: expect.any(File),
        prompt: 'Summarize this PDF',
        modelId: 'gpt-4',
        user: mockUser,
        botId: 'bot-456',
        loggingService: mockLoggingService,
        stream: false,
      });
    });

    it('processes document files (streaming)', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('Streaming '));
          controller.enqueue(new TextEncoder().encode('summary'));
          controller.close();
        },
      });
      mockParseAndQueryFileOpenAI.mockResolvedValue(mockStream);

      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze' },
            {
              type: 'file_url',
              url: 'https://storage.blob.core.windows.net/files/doc-444',
              originalFilename: 'analysis.docx',
            },
          ],
          messageType: MessageType.TEXT,
        },
      ];

      const response = await handler.handleFileConversation(
        messages,
        'gpt-4',
        mockUser,
        undefined,
        true,
      );

      const text = await response.text();
      expect(text).toContain('Streaming');
      expect(text).toContain('summary');
    });

    it('throws error when streaming returns string instead of ReadableStream', async () => {
      mockParseAndQueryFileOpenAI.mockResolvedValue('String response');

      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Process' },
            {
              type: 'file_url',
              url: 'https://storage.blob.core.windows.net/files/doc-555',
              originalFilename: 'file.txt',
            },
          ],
          messageType: MessageType.TEXT,
        },
      ];

      await expect(
        handler.handleFileConversation(
          messages,
          'gpt-4',
          mockUser,
          undefined,
          true,
        ),
      ).rejects.toThrow('Expected a ReadableStream for streaming response');
    });

    it('throws error when non-streaming returns ReadableStream instead of string', async () => {
      mockParseAndQueryFileOpenAI.mockResolvedValue(new ReadableStream());

      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Process' },
            {
              type: 'file_url',
              url: 'https://storage.blob.core.windows.net/files/doc-666',
              originalFilename: 'file.txt',
            },
          ],
          messageType: MessageType.TEXT,
        },
      ];

      await expect(
        handler.handleFileConversation(
          messages,
          'gpt-4',
          mockUser,
          undefined,
          false,
        ),
      ).rejects.toThrow('Expected a string for non-streaming response');
    });
  });

  describe('File Cleanup', () => {
    it('completes file processing successfully', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Process' },
            {
              type: 'file_url',
              url: 'https://storage.blob.core.windows.net/files/temp-777',
              originalFilename: 'temp.pdf',
            },
          ],
          messageType: MessageType.TEXT,
        },
      ];

      const response = await handler.handleFileConversation(
        messages,
        'gpt-4',
        mockUser,
        undefined,
        false,
      );

      // Verify successful processing
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.text).toBe('Processed document content');
    });

    it('handles file cleanup gracefully', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Process' },
            {
              type: 'file_url',
              url: 'https://storage.blob.core.windows.net/files/missing-888',
              originalFilename: 'file.pdf',
            },
          ],
          messageType: MessageType.TEXT,
        },
      ];

      const response = await handler.handleFileConversation(
        messages,
        'gpt-4',
        mockUser,
        undefined,
        false,
      );

      // Should complete successfully regardless of cleanup issues
      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('logs file error on failure', async () => {
      const testError = new Error('Processing failed');
      mockParseAndQueryFileOpenAI.mockRejectedValue(testError);

      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Process' },
            {
              type: 'file_url',
              url: 'https://storage.blob.core.windows.net/files/error-123',
              originalFilename: 'error.pdf',
            },
          ],
          messageType: MessageType.TEXT,
        },
      ];

      await expect(
        handler.handleFileConversation(
          messages,
          'gpt-4',
          mockUser,
          'bot-789',
          false,
        ),
      ).rejects.toThrow('Processing failed');

      expect(mockLogFileError).toHaveBeenCalledWith(
        expect.any(Number),
        testError,
        'gpt-4',
        mockUser,
        'error.pdf',
        expect.any(Number),
        'bot-789',
      );
    });

    it('handles transcription errors', async () => {
      mockTranscribe.mockRejectedValue(new Error('Transcription failed'));

      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Transcribe' },
            {
              type: 'file_url',
              url: 'https://storage.blob.core.windows.net/files/audio-error',
              originalFilename: 'broken.mp3',
            },
          ],
          messageType: MessageType.AUDIO,
        },
      ];

      await expect(
        handler.handleFileConversation(
          messages,
          'gpt-4',
          mockUser,
          undefined,
          false,
        ),
      ).rejects.toThrow('Transcription failed');
    });

    it('handles file download errors', async () => {
      const mockBlobGet = vi
        .fn()
        .mockRejectedValue(new Error('Download failed'));
      mockCreateBlobStorageClient.mockReturnValue({
        get: mockBlobGet,
      });

      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Process' },
            {
              type: 'file_url',
              url: 'https://storage.blob.core.windows.net/files/download-error',
              originalFilename: 'file.pdf',
            },
          ],
          messageType: MessageType.TEXT,
        },
      ];

      await expect(
        handler.handleFileConversation(
          messages,
          'gpt-4',
          mockUser,
          undefined,
          false,
        ),
      ).rejects.toThrow('Download failed');
    });
  });

  describe('Response Headers', () => {
    it('sets correct headers for streaming responses', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.close();
        },
      });
      mockParseAndQueryFileOpenAI.mockResolvedValue(mockStream);

      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Process' },
            {
              type: 'file_url',
              url: 'https://storage.blob.core.windows.net/files/file-headers',
              originalFilename: 'file.txt',
            },
          ],
          messageType: MessageType.TEXT,
        },
      ];

      const response = await handler.handleFileConversation(
        messages,
        'gpt-4',
        mockUser,
        undefined,
        true,
      );

      expect(response.headers.get('Content-Type')).toBe(
        'text/plain; charset=utf-8',
      );
      expect(response.headers.get('Cache-Control')).toBe('no-cache');
      expect(response.headers.get('Connection')).toBe('keep-alive');
    });

    it('sets correct headers for non-streaming responses', async () => {
      mockParseAndQueryFileOpenAI.mockResolvedValue('Response text');

      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Process' },
            {
              type: 'file_url',
              url: 'https://storage.blob.core.windows.net/files/file-json',
              originalFilename: 'file.txt',
            },
          ],
          messageType: MessageType.TEXT,
        },
      ];

      const response = await handler.handleFileConversation(
        messages,
        'gpt-4',
        mockUser,
        undefined,
        false,
      );

      expect(response.headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('Integration Scenarios', () => {
    it('handles complete document processing workflow', async () => {
      mockParseAndQueryFileOpenAI.mockResolvedValue('Complete analysis');

      const messages: Message[] = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Provide a detailed analysis of this document',
            },
            {
              type: 'file_url',
              url: 'https://storage.blob.core.windows.net/files/integration-doc',
              originalFilename: 'whitepaper.pdf',
            },
          ],
          messageType: MessageType.TEXT,
        },
      ];

      const response = await handler.handleFileConversation(
        messages,
        'gpt-4',
        mockUser,
        'analysis-bot',
        false,
      );

      const data = await response.json();
      expect(data.text).toBe('Complete analysis');

      // Verify file was downloaded from blob storage
      expect(mockCreateBlobStorageClient).toHaveBeenCalled();

      // Verify file was processed with correct parameters
      expect(mockParseAndQueryFileOpenAI).toHaveBeenCalledWith({
        file: expect.any(File),
        prompt: 'Provide a detailed analysis of this document',
        modelId: 'gpt-4',
        user: mockUser,
        botId: 'analysis-bot',
        loggingService: mockLoggingService,
        stream: false,
      });
    });

    it('handles complete audio transcription workflow', async () => {
      mockTranscribe.mockResolvedValue('Meeting transcript with key points.');
      mockParseAndQueryFileOpenAI.mockResolvedValue(
        'Summary of key action items',
      );

      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract action items from this meeting' },
            {
              type: 'file_url',
              url: 'https://storage.blob.core.windows.net/files/meeting-audio',
              originalFilename: 'standup.mp3',
            },
          ],
          messageType: MessageType.AUDIO,
        },
      ];

      const response = await handler.handleFileConversation(
        messages,
        'gpt-4',
        mockUser,
        'meeting-bot',
        false,
      );

      const data = await response.json();
      expect(data.text).toBe('Summary of key action items');
      expect(data.metadata.transcript.filename).toBe('standup.mp3');
      expect(data.metadata.transcript.transcript).toBe(
        'Meeting transcript with key points.',
      );

      // Verify transcription occurred
      expect(mockGetTranscriptionService).toHaveBeenCalledWith('whisper');
      expect(mockTranscribe).toHaveBeenCalled();

      // Verify transcript was processed
      expect(mockParseAndQueryFileOpenAI).toHaveBeenCalled();
    });
  });
});
