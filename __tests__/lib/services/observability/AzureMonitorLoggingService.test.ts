/**
 * Tests for AzureMonitorLoggingService
 *
 * Tests the singleton logging service for Azure Monitor log ingestion.
 * Includes tests for:
 * - Singleton pattern
 * - Graceful degradation (console fallback)
 * - All log event types
 * - Fire-and-forget behavior
 */
import { Session } from 'next-auth';

// Import after mocks are set up
import {
  AzureMonitorLoggingService,
  getAzureMonitorLogger,
} from '@/lib/services/observability/AzureMonitorLoggingService';

import { LogEventType } from '@/lib/types/logging';

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the Azure SDK modules
vi.mock('@azure/identity', () => ({
  DefaultAzureCredential: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@azure/monitor-ingestion', () => ({
  LogsIngestionClient: vi.fn().mockImplementation(() => ({
    upload: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock the environment
vi.mock('@/config/environment', () => ({
  env: {
    LOGS_INJESTION_ENDPOINT: undefined,
    DATA_COLLECTION_RULE_ID: undefined,
    STREAM_NAME: 'Custom-ChatBotLogs_CL',
    NEXT_PUBLIC_ENV: 'localhost',
  },
}));

describe('AzureMonitorLoggingService', () => {
  const mockUser: Session['user'] = {
    id: 'user-123',
    email: 'test@example.com',
    mail: 'test@example.com',
    givenName: 'Test',
    surname: 'User',
    displayName: 'Test User',
    jobTitle: 'Engineer',
    department: 'Engineering',
    companyName: 'TestCorp',
    name: 'Test User',
  };

  beforeEach(() => {
    // Reset singleton between tests
    AzureMonitorLoggingService.resetInstance();
    vi.clearAllMocks();
  });

  describe('singleton pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = AzureMonitorLoggingService.getInstance();
      const instance2 = AzureMonitorLoggingService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should return the same instance via helper function', () => {
      const instance1 = getAzureMonitorLogger();
      const instance2 = getAzureMonitorLogger();
      expect(instance1).toBe(instance2);
    });

    it('should return a new instance after reset', () => {
      const instance1 = AzureMonitorLoggingService.getInstance();
      AzureMonitorLoggingService.resetInstance();
      const instance2 = AzureMonitorLoggingService.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('graceful degradation', () => {
    it('should not be connected when env vars are missing', () => {
      const logger = AzureMonitorLoggingService.getInstance();
      expect(logger.isConnected()).toBe(false);
    });

    it('should log to console when Azure is unavailable', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = AzureMonitorLoggingService.getInstance();

      await logger.logChatCompletion(
        {
          user: mockUser,
          model: 'gpt-4',
          messageCount: 5,
          temperature: 0.7,
          duration: 1500,
          hasFiles: false,
          hasImages: false,
          hasRAG: false,
        },
        true,
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AzureMonitorLog]'),
        expect.any(String),
      );
      consoleSpy.mockRestore();
    });
  });

  describe('logChatCompletion', () => {
    it('should create log entry with correct fields', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = AzureMonitorLoggingService.getInstance();

      await logger.logChatCompletion(
        {
          user: mockUser,
          model: 'gpt-4',
          messageCount: 5,
          temperature: 0.7,
          duration: 1500,
          hasFiles: true,
          hasImages: true,
          hasRAG: true,
          botId: 'bot-123',
          promptTokens: 100,
          completionTokens: 200,
          totalTokens: 300,
          reasoningEffort: 'high',
        },
        true,
      );

      const logCall = consoleSpy.mock.calls.find(
        (call) =>
          typeof call[0] === 'string' && call[0].includes('ChatCompletion'),
      );
      expect(logCall).toBeDefined();

      const loggedEntry = JSON.parse(logCall![1]);
      expect(loggedEntry.EventType).toBe(LogEventType.ChatCompletion);
      expect(loggedEntry.UserId).toBe('user-123');
      expect(loggedEntry.UserEmail).toBe('test@example.com');
      expect(loggedEntry.ModelUsed).toBe('gpt-4');
      expect(loggedEntry.HasFiles).toBe(true);
      expect(loggedEntry.HasImages).toBe(true);
      expect(loggedEntry.HasRAG).toBe(true);
      expect(loggedEntry.Duration).toBe(1500);
      expect(loggedEntry.PromptTokens).toBe(100);
      expect(loggedEntry.CompletionTokens).toBe(200);
      expect(loggedEntry.TotalTokens).toBe(300);

      consoleSpy.mockRestore();
    });

    it('should include all user context fields in log entry', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = AzureMonitorLoggingService.getInstance();

      await logger.logChatCompletion(
        {
          user: mockUser,
          model: 'gpt-4',
          messageCount: 1,
          duration: 100,
          hasFiles: false,
          hasImages: false,
          hasRAG: false,
        },
        true,
      );

      const logCall = consoleSpy.mock.calls.find(
        (call) =>
          typeof call[0] === 'string' && call[0].includes('ChatCompletion'),
      );
      expect(logCall).toBeDefined();

      const loggedEntry = JSON.parse(logCall![1]);
      // Verify all user context fields including new ones
      expect(loggedEntry.UserId).toBe('user-123');
      expect(loggedEntry.UserEmail).toBe('test@example.com');
      expect(loggedEntry.UserGivenName).toBe('Test');
      expect(loggedEntry.UserSurName).toBe('User');
      expect(loggedEntry.UserDisplayName).toBe('Test User');
      expect(loggedEntry.UserJobTitle).toBe('Engineer');
      expect(loggedEntry.UserDepartment).toBe('Engineering');
      expect(loggedEntry.UserCompanyName).toBe('TestCorp');

      consoleSpy.mockRestore();
    });
  });

  describe('logError', () => {
    it('should create error log entry with correct fields', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = AzureMonitorLoggingService.getInstance();

      await logger.logError(
        {
          user: mockUser,
          errorCode: 'TEST_ERROR',
          errorMessage: 'Something went wrong',
          stackTrace: 'Error: Something went wrong\n    at test.ts:1:1',
          operation: 'chat',
          model: 'gpt-4',
        },
        true,
      );

      const logCall = consoleSpy.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('Error'),
      );
      expect(logCall).toBeDefined();

      const loggedEntry = JSON.parse(logCall![1]);
      expect(loggedEntry.EventType).toBe(LogEventType.Error);
      expect(loggedEntry.ErrorCode).toBe('TEST_ERROR');
      expect(loggedEntry.ErrorMessage).toBe('Something went wrong');
      expect(loggedEntry.Operation).toBe('chat');

      consoleSpy.mockRestore();
    });

    it('should handle missing user gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = AzureMonitorLoggingService.getInstance();

      await logger.logError(
        {
          errorCode: 'ANONYMOUS_ERROR',
          errorMessage: 'Error without user',
        },
        true,
      );

      const logCall = consoleSpy.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('Error'),
      );
      expect(logCall).toBeDefined();

      const loggedEntry = JSON.parse(logCall![1]);
      expect(loggedEntry.UserId).toBe('unknown');
      expect(loggedEntry.UserEmail).toBe('unknown');

      consoleSpy.mockRestore();
    });
  });

  describe('logFileSuccess', () => {
    it('should create file success log entry', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = AzureMonitorLoggingService.getInstance();

      await logger.logFileSuccess(
        {
          user: mockUser,
          filename: 'document.pdf',
          fileSize: 1024000,
          fileType: 'application/pdf',
          chunkCount: 5,
          duration: 500,
        },
        true,
      );

      const logCall = consoleSpy.mock.calls.find(
        (call) =>
          typeof call[0] === 'string' && call[0].includes('FileSuccess'),
      );
      expect(logCall).toBeDefined();

      const loggedEntry = JSON.parse(logCall![1]);
      expect(loggedEntry.EventType).toBe(LogEventType.FileSuccess);
      expect(loggedEntry.Filename).toBe('document.pdf');
      expect(loggedEntry.FileSize).toBe(1024000);
      expect(loggedEntry.FileType).toBe('application/pdf');
      expect(loggedEntry.ChunkCount).toBe(5);

      consoleSpy.mockRestore();
    });
  });

  describe('logFileError', () => {
    it('should create file error log entry', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = AzureMonitorLoggingService.getInstance();

      await logger.logFileError(
        {
          user: mockUser,
          filename: 'corrupted.pdf',
          fileSize: 500,
          fileType: 'application/pdf',
          errorCode: 'INVALID_FORMAT',
          errorMessage: 'File is corrupted',
        },
        true,
      );

      const logCall = consoleSpy.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('FileError'),
      );
      expect(logCall).toBeDefined();

      const loggedEntry = JSON.parse(logCall![1]);
      expect(loggedEntry.EventType).toBe(LogEventType.FileError);
      expect(loggedEntry.ErrorCode).toBe('INVALID_FORMAT');

      consoleSpy.mockRestore();
    });
  });

  describe('logSearch', () => {
    it('should create search log entry', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = AzureMonitorLoggingService.getInstance();

      await logger.logSearch(
        {
          user: mockUser,
          query: 'How to configure settings?',
          resultCount: 10,
          searchType: 'semantic',
          indexName: 'knowledge-base',
          duration: 200,
          botId: 'bot-123',
        },
        true,
      );

      const logCall = consoleSpy.mock.calls.find(
        (call) =>
          typeof call[0] === 'string' &&
          call[0].includes('[AzureMonitorLog] Search'),
      );
      expect(logCall).toBeDefined();

      const loggedEntry = JSON.parse(logCall![1]);
      expect(loggedEntry.EventType).toBe(LogEventType.Search);
      expect(loggedEntry.Query).toBe('How to configure settings?');
      expect(loggedEntry.ResultCount).toBe(10);
      expect(loggedEntry.SearchType).toBe('semantic');
      expect(loggedEntry.IndexName).toBe('knowledge-base');

      consoleSpy.mockRestore();
    });

    it('should truncate long queries', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = AzureMonitorLoggingService.getInstance();

      const longQuery = 'a'.repeat(1000);
      await logger.logSearch(
        {
          user: mockUser,
          query: longQuery,
          resultCount: 5,
        },
        true,
      );

      const logCall = consoleSpy.mock.calls.find(
        (call) =>
          typeof call[0] === 'string' &&
          call[0].includes('[AzureMonitorLog] Search'),
      );
      const loggedEntry = JSON.parse(logCall![1]);
      expect(loggedEntry.Query.length).toBe(500);

      consoleSpy.mockRestore();
    });
  });

  describe('logAgentExecution', () => {
    it('should create agent execution log entry', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = AzureMonitorLoggingService.getInstance();

      await logger.logAgentExecution(
        {
          user: mockUser,
          agentId: 'agent-123',
          agentType: 'bing_grounding',
          threadId: 'thread-456',
          toolsUsed: ['search', 'calculator'],
          turnCount: 3,
          duration: 5000,
          model: 'gpt-4',
          botId: 'bot-789',
        },
        true,
      );

      const logCall = consoleSpy.mock.calls.find(
        (call) =>
          typeof call[0] === 'string' && call[0].includes('AgentExecution'),
      );
      expect(logCall).toBeDefined();

      const loggedEntry = JSON.parse(logCall![1]);
      expect(loggedEntry.EventType).toBe(LogEventType.AgentExecution);
      expect(loggedEntry.AgentId).toBe('agent-123');
      expect(loggedEntry.AgentType).toBe('bing_grounding');
      expect(loggedEntry.ThreadId).toBe('thread-456');
      expect(loggedEntry.ToolsUsed).toEqual(['search', 'calculator']);
      expect(loggedEntry.TurnCount).toBe(3);

      consoleSpy.mockRestore();
    });
  });

  describe('logAgentError', () => {
    it('should create agent error log entry', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = AzureMonitorLoggingService.getInstance();

      await logger.logAgentError(
        {
          user: mockUser,
          agentId: 'agent-123',
          agentType: 'bing_grounding',
          threadId: 'thread-456',
          errorCode: 'AGENT_TIMEOUT',
          errorMessage: 'Agent execution timed out',
          model: 'gpt-4',
        },
        true,
      );

      const logCall = consoleSpy.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('AgentError'),
      );
      expect(logCall).toBeDefined();

      const loggedEntry = JSON.parse(logCall![1]);
      expect(loggedEntry.EventType).toBe(LogEventType.AgentError);
      expect(loggedEntry.ErrorCode).toBe('AGENT_TIMEOUT');

      consoleSpy.mockRestore();
    });
  });

  describe('logTranscriptionSuccess', () => {
    it('should create transcription success log entry', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = AzureMonitorLoggingService.getInstance();

      await logger.logTranscriptionSuccess(
        {
          user: mockUser,
          filename: 'meeting.mp3',
          fileSize: 10000000,
          transcriptionType: 'whisper',
          audioDuration: 3600,
          language: 'en',
          duration: 30000,
        },
        true,
      );

      const logCall = consoleSpy.mock.calls.find(
        (call) =>
          typeof call[0] === 'string' &&
          call[0].includes('TranscriptionSuccess'),
      );
      expect(logCall).toBeDefined();

      const loggedEntry = JSON.parse(logCall![1]);
      expect(loggedEntry.EventType).toBe(LogEventType.TranscriptionSuccess);
      expect(loggedEntry.Filename).toBe('meeting.mp3');
      expect(loggedEntry.FileSize).toBe(10000000);
      expect(loggedEntry.TranscriptionType).toBe('whisper');
      expect(loggedEntry.AudioDuration).toBe(3600);
      expect(loggedEntry.Language).toBe('en');

      consoleSpy.mockRestore();
    });
  });

  describe('logTranscriptionError', () => {
    it('should create transcription error log entry', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = AzureMonitorLoggingService.getInstance();

      await logger.logTranscriptionError(
        {
          user: mockUser,
          filename: 'corrupted.wav',
          fileSize: 5000000,
          transcriptionType: 'whisper',
          errorCode: 'INVALID_AUDIO',
          errorMessage: 'Audio file is corrupted',
        },
        true,
      );

      const logCall = consoleSpy.mock.calls.find(
        (call) =>
          typeof call[0] === 'string' && call[0].includes('TranscriptionError'),
      );
      expect(logCall).toBeDefined();

      const loggedEntry = JSON.parse(logCall![1]);
      expect(loggedEntry.EventType).toBe(LogEventType.TranscriptionError);
      expect(loggedEntry.ErrorCode).toBe('INVALID_AUDIO');

      consoleSpy.mockRestore();
    });
  });

  describe('logCustomMetric', () => {
    it('should create custom metric log entry', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = AzureMonitorLoggingService.getInstance();

      await logger.logCustomMetric(
        {
          user: mockUser,
          metricName: 'tokens_per_second',
          metricValue: 150.5,
          metricUnit: 'tokens/s',
          tags: { model: 'gpt-4', tier: 'premium' },
        },
        true,
      );

      const logCall = consoleSpy.mock.calls.find(
        (call) =>
          typeof call[0] === 'string' && call[0].includes('CustomMetric'),
      );
      expect(logCall).toBeDefined();

      const loggedEntry = JSON.parse(logCall![1]);
      expect(loggedEntry.EventType).toBe(LogEventType.CustomMetric);
      expect(loggedEntry.MetricName).toBe('tokens_per_second');
      expect(loggedEntry.MetricValue).toBe(150.5);
      expect(loggedEntry.MetricUnit).toBe('tokens/s');
      expect(loggedEntry.Tags).toEqual({ model: 'gpt-4', tier: 'premium' });

      consoleSpy.mockRestore();
    });
  });

  describe('logBatch', () => {
    it('should log multiple entries at once', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = AzureMonitorLoggingService.getInstance();

      await logger.logBatch(
        [
          {
            Timestamp: new Date().toISOString(),
            EventType: LogEventType.ChatCompletion,
            UserId: 'user-1',
            UserEmail: 'user1@test.com',
            Env: 'localhost',
            HasFiles: false,
            HasImages: false,
            HasRAG: false,
          },
          {
            Timestamp: new Date().toISOString(),
            EventType: LogEventType.ChatCompletion,
            UserId: 'user-2',
            UserEmail: 'user2@test.com',
            Env: 'localhost',
            HasFiles: true,
            HasImages: false,
            HasRAG: true,
          },
        ],
        true,
      );

      // Should have logged both entries
      const logCalls = consoleSpy.mock.calls.filter(
        (call) =>
          typeof call[0] === 'string' && call[0].includes('ChatCompletion'),
      );
      expect(logCalls.length).toBe(2);

      consoleSpy.mockRestore();
    });
  });

  describe('logTTSSuccess', () => {
    it('should create TTS success log entry', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = AzureMonitorLoggingService.getInstance();

      await logger.logTTSSuccess(
        {
          user: mockUser,
          textLength: 500,
          targetLanguage: 'en-US',
          voiceName: 'en-US-JennyNeural',
          audioFormat: 'Audio24Khz48KBitRateMonoMp3',
          duration: 2000,
        },
        true,
      );

      const logCall = consoleSpy.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('TTSSuccess'),
      );
      expect(logCall).toBeDefined();

      const loggedEntry = JSON.parse(logCall![1]);
      expect(loggedEntry.EventType).toBe(LogEventType.TTSSuccess);
      expect(loggedEntry.TextLength).toBe(500);
      expect(loggedEntry.TargetLanguage).toBe('en-US');
      expect(loggedEntry.VoiceName).toBe('en-US-JennyNeural');
      expect(loggedEntry.AudioFormat).toBe('Audio24Khz48KBitRateMonoMp3');
      expect(loggedEntry.Duration).toBe(2000);

      consoleSpy.mockRestore();
    });
  });

  describe('logTTSError', () => {
    it('should create TTS error log entry', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = AzureMonitorLoggingService.getInstance();

      await logger.logTTSError(
        {
          user: mockUser,
          textLength: 100,
          targetLanguage: 'en-US',
          voiceName: 'en-US-JennyNeural',
          errorCode: 'TTS_SYNTHESIS_FAILED',
          errorMessage: 'Voice synthesis failed',
        },
        true,
      );

      const logCall = consoleSpy.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('TTSError'),
      );
      expect(logCall).toBeDefined();

      const loggedEntry = JSON.parse(logCall![1]);
      expect(loggedEntry.EventType).toBe(LogEventType.TTSError);
      expect(loggedEntry.ErrorCode).toBe('TTS_SYNTHESIS_FAILED');
      expect(loggedEntry.ErrorMessage).toBe('Voice synthesis failed');

      consoleSpy.mockRestore();
    });
  });

  describe('logTranslationSuccess', () => {
    it('should create translation success log entry', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = AzureMonitorLoggingService.getInstance();

      await logger.logTranslationSuccess(
        {
          user: mockUser,
          sourceLanguage: 'en',
          targetLanguage: 'es',
          contentLength: 1000,
          isDocumentTranslation: false,
          duration: 3000,
        },
        true,
      );

      const logCall = consoleSpy.mock.calls.find(
        (call) =>
          typeof call[0] === 'string' && call[0].includes('TranslationSuccess'),
      );
      expect(logCall).toBeDefined();

      const loggedEntry = JSON.parse(logCall![1]);
      expect(loggedEntry.EventType).toBe(LogEventType.TranslationSuccess);
      expect(loggedEntry.SourceLanguage).toBe('en');
      expect(loggedEntry.TargetLanguage).toBe('es');
      expect(loggedEntry.ContentLength).toBe(1000);
      expect(loggedEntry.IsDocumentTranslation).toBe(false);
      expect(loggedEntry.Duration).toBe(3000);

      consoleSpy.mockRestore();
    });

    it('should create document translation success log entry', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = AzureMonitorLoggingService.getInstance();

      await logger.logTranslationSuccess(
        {
          user: mockUser,
          targetLanguage: 'fr',
          contentLength: 50000,
          isDocumentTranslation: true,
          duration: 15000,
        },
        true,
      );

      const logCall = consoleSpy.mock.calls.find(
        (call) =>
          typeof call[0] === 'string' && call[0].includes('TranslationSuccess'),
      );
      const loggedEntry = JSON.parse(logCall![1]);
      expect(loggedEntry.IsDocumentTranslation).toBe(true);

      consoleSpy.mockRestore();
    });
  });

  describe('logTranslationError', () => {
    it('should create translation error log entry', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = AzureMonitorLoggingService.getInstance();

      await logger.logTranslationError(
        {
          user: mockUser,
          targetLanguage: 'de',
          isDocumentTranslation: true,
          errorCode: 'TRANSLATION_FAILED',
          errorMessage: 'Service unavailable',
        },
        true,
      );

      const logCall = consoleSpy.mock.calls.find(
        (call) =>
          typeof call[0] === 'string' && call[0].includes('TranslationError'),
      );
      expect(logCall).toBeDefined();

      const loggedEntry = JSON.parse(logCall![1]);
      expect(loggedEntry.EventType).toBe(LogEventType.TranslationError);
      expect(loggedEntry.ErrorCode).toBe('TRANSLATION_FAILED');
      expect(loggedEntry.IsDocumentTranslation).toBe(true);

      consoleSpy.mockRestore();
    });
  });

  describe('logDocumentExportSuccess', () => {
    it('should create document export success log entry', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = AzureMonitorLoggingService.getInstance();

      await logger.logDocumentExportSuccess(
        {
          user: mockUser,
          format: 'docx',
          contentLength: 25000,
          messageCount: 15,
          duration: 1500,
        },
        true,
      );

      const logCall = consoleSpy.mock.calls.find(
        (call) =>
          typeof call[0] === 'string' &&
          call[0].includes('DocumentExportSuccess'),
      );
      expect(logCall).toBeDefined();

      const loggedEntry = JSON.parse(logCall![1]);
      expect(loggedEntry.EventType).toBe(LogEventType.DocumentExportSuccess);
      expect(loggedEntry.Format).toBe('docx');
      expect(loggedEntry.ContentLength).toBe(25000);
      expect(loggedEntry.MessageCount).toBe(15);
      expect(loggedEntry.Duration).toBe(1500);

      consoleSpy.mockRestore();
    });
  });

  describe('logDocumentExportError', () => {
    it('should create document export error log entry', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = AzureMonitorLoggingService.getInstance();

      await logger.logDocumentExportError(
        {
          user: mockUser,
          format: 'docx',
          contentLength: 10000,
          errorCode: 'DOCX_CONVERSION_ERROR',
          errorMessage: 'Failed to generate document',
        },
        true,
      );

      const logCall = consoleSpy.mock.calls.find(
        (call) =>
          typeof call[0] === 'string' &&
          call[0].includes('DocumentExportError'),
      );
      expect(logCall).toBeDefined();

      const loggedEntry = JSON.parse(logCall![1]);
      expect(loggedEntry.EventType).toBe(LogEventType.DocumentExportError);
      expect(loggedEntry.ErrorCode).toBe('DOCX_CONVERSION_ERROR');
      expect(loggedEntry.Format).toBe('docx');

      consoleSpy.mockRestore();
    });
  });

  describe('logToneAnalysisSuccess', () => {
    it('should create tone analysis success log entry', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = AzureMonitorLoggingService.getInstance();

      await logger.logToneAnalysisSuccess(
        {
          user: mockUser,
          inputLength: 5000,
          toneName: 'Professional',
          tagCount: 4,
          duration: 8000,
        },
        true,
      );

      const logCall = consoleSpy.mock.calls.find(
        (call) =>
          typeof call[0] === 'string' &&
          call[0].includes('ToneAnalysisSuccess'),
      );
      expect(logCall).toBeDefined();

      const loggedEntry = JSON.parse(logCall![1]);
      expect(loggedEntry.EventType).toBe(LogEventType.ToneAnalysisSuccess);
      expect(loggedEntry.InputLength).toBe(5000);
      expect(loggedEntry.ToneName).toBe('Professional');
      expect(loggedEntry.TagCount).toBe(4);
      expect(loggedEntry.Duration).toBe(8000);

      consoleSpy.mockRestore();
    });
  });

  describe('logToneAnalysisError', () => {
    it('should create tone analysis error log entry', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = AzureMonitorLoggingService.getInstance();

      await logger.logToneAnalysisError(
        {
          user: mockUser,
          inputLength: 2000,
          errorCode: 'TONE_ANALYSIS_ERROR',
          errorMessage: 'AI refused to analyze',
        },
        true,
      );

      const logCall = consoleSpy.mock.calls.find(
        (call) =>
          typeof call[0] === 'string' && call[0].includes('ToneAnalysisError'),
      );
      expect(logCall).toBeDefined();

      const loggedEntry = JSON.parse(logCall![1]);
      expect(loggedEntry.EventType).toBe(LogEventType.ToneAnalysisError);
      expect(loggedEntry.ErrorCode).toBe('TONE_ANALYSIS_ERROR');
      expect(loggedEntry.InputLength).toBe(2000);

      consoleSpy.mockRestore();
    });
  });

  describe('logFileRetrievalSuccess', () => {
    it('should create file retrieval success log entry', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = AzureMonitorLoggingService.getInstance();

      await logger.logFileRetrievalSuccess(
        {
          user: mockUser,
          fileId: 'abc123def456',
          fileType: 'image',
          duration: 300,
        },
        true,
      );

      const logCall = consoleSpy.mock.calls.find(
        (call) =>
          typeof call[0] === 'string' &&
          call[0].includes('FileRetrievalSuccess'),
      );
      expect(logCall).toBeDefined();

      const loggedEntry = JSON.parse(logCall![1]);
      expect(loggedEntry.EventType).toBe(LogEventType.FileRetrievalSuccess);
      expect(loggedEntry.FileId).toBe('abc123def456');
      expect(loggedEntry.FileType).toBe('image');
      expect(loggedEntry.Duration).toBe(300);

      consoleSpy.mockRestore();
    });
  });

  describe('logFileRetrievalError', () => {
    it('should create file retrieval error log entry', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = AzureMonitorLoggingService.getInstance();

      await logger.logFileRetrievalError(
        {
          user: mockUser,
          fileId: 'xyz789',
          fileType: 'file',
          errorCode: 'FILE_NOT_FOUND',
          errorMessage: 'The requested file does not exist',
        },
        true,
      );

      const logCall = consoleSpy.mock.calls.find(
        (call) =>
          typeof call[0] === 'string' && call[0].includes('FileRetrievalError'),
      );
      expect(logCall).toBeDefined();

      const loggedEntry = JSON.parse(logCall![1]);
      expect(loggedEntry.EventType).toBe(LogEventType.FileRetrievalError);
      expect(loggedEntry.ErrorCode).toBe('FILE_NOT_FOUND');
      expect(loggedEntry.FileId).toBe('xyz789');
      expect(loggedEntry.FileType).toBe('file');

      consoleSpy.mockRestore();
    });
  });

  describe('fire-and-forget behavior', () => {
    it('should return a Promise that can be voided for non-blocking calls', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = AzureMonitorLoggingService.getInstance();

      // The method returns a Promise (can be awaited or voided)
      const result = logger.logChatCompletion({
        user: mockUser,
        model: 'gpt-4',
        messageCount: 1,
        duration: 100,
        hasFiles: false,
        hasImages: false,
        hasRAG: false,
      });

      // Verify it returns a Promise (fire-and-forget pattern)
      // Callers can use `void` to fire-and-forget without awaiting
      expect(result).toBeInstanceOf(Promise);

      // Wait for completion to avoid test warnings about open handles
      await result;

      consoleSpy.mockRestore();
    });
  });
});
