import { Session } from 'next-auth';

import { AzureMonitorLoggingService } from '@/services/loggingService';

import { DefaultAzureCredential } from '@azure/identity';
import { LogsIngestionClient } from '@azure/monitor-ingestion';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Azure Identity and Monitor Ingestion
vi.mock('@azure/identity', () => ({
  DefaultAzureCredential: vi.fn(),
}));

vi.mock('@azure/monitor-ingestion', () => ({
  LogsIngestionClient: vi.fn(),
}));

describe('AzureMonitorLoggingService', () => {
  let loggingService: AzureMonitorLoggingService;
  let mockClient: any;
  const originalEnv = process.env;

  const mockUser: Session['user'] = {
    id: 'test-user-id',
    givenName: 'Test',
    surname: 'User',
    displayName: 'Test User',
    jobTitle: 'Software Engineer',
    department: 'Engineering',
    mail: 'test.user@example.com',
    companyName: 'Test Company',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, NEXT_PUBLIC_ENV: 'test' };

    mockClient = {
      upload: vi.fn().mockResolvedValue(undefined),
    };

    (LogsIngestionClient as any).mockImplementation(() => mockClient);
    (DefaultAzureCredential as any).mockImplementation(() => ({}));

    loggingService = new AzureMonitorLoggingService(
      'test-endpoint',
      'test-rule-id',
      'test-stream',
    );

    // Mock console methods
    console.log = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('logChatCompletion', () => {
    it('should log successful chat completion', async () => {
      const startTime = Date.now() - 1000; // 1 second ago

      await loggingService.logChatCompletion(
        startTime,
        'test-model',
        5,
        0.7,
        mockUser,
        'test-bot',
        2,
      );

      expect(mockClient.upload).toHaveBeenCalledWith(
        'test-rule-id',
        'test-stream',
        [
          expect.objectContaining({
            EventType: 'ChatCompletion',
            Status: 'success',
            ModelUsed: 'test-model',
            MessageCount: 5,
            Temperature: 0.7,
            UserId: mockUser.id,
            BotId: 'test-bot',
            CitationsCount: 2,
            Duration: expect.any(Number),
          }),
        ],
      );
    });
  });

  describe('logError', () => {
    it('should log chat completion error', async () => {
      const startTime = Date.now() - 1000;
      const testError = new Error('Test error');
      testError.stack = 'Test stack trace';
      (testError as any).status = 400;

      await loggingService.logError(
        startTime,
        testError,
        'test-model',
        5,
        0.7,
        mockUser,
        'test-bot',
      );

      expect(mockClient.upload).toHaveBeenCalledWith(
        'test-rule-id',
        'test-stream',
        [
          expect.objectContaining({
            EventType: 'ChatCompletion',
            Status: 'error',
            ModelUsed: 'test-model',
            MessageCount: 5,
            Temperature: 0.7,
            UserId: mockUser.id,
            BotId: 'test-bot',
            ErrorMessage: 'Test error',
            ErrorStack: 'Test stack trace',
            StatusCode: 400,
            Duration: expect.any(Number),
          }),
        ],
      );
    });
  });

  describe('logFileError', () => {
    it('should log file error', async () => {
      const startTime = Date.now() - 1000;
      const testError = new Error('File error');
      testError.stack = 'File error stack trace';

      await loggingService.logFileError(
        startTime,
        testError,
        'test-model',
        mockUser,
        'test.pdf',
        1024,
        'test-bot',
      );

      expect(mockClient.upload).toHaveBeenCalledWith(
        'test-rule-id',
        'test-stream',
        [
          expect.objectContaining({
            EventType: 'FileConversationError',
            Status: 'error',
            ModelUsed: 'test-model',
            UserId: mockUser.id,
            BotId: 'test-bot',
            ErrorMessage: 'File error',
            ErrorStack: 'File error stack trace',
            FileUpload: true,
            FileName: 'test.pdf',
            FileSize: 1024,
            Duration: expect.any(Number),
          }),
        ],
      );
    });
  });

  describe('logSearch', () => {
    it('should log successful search', async () => {
      const startTime = Date.now() - 1000;

      await loggingService.logSearch(
        startTime,
        'test-bot',
        5,
        '2024-01-01',
        '2024-01-31',
        mockUser,
      );

      expect(mockClient.upload).toHaveBeenCalledWith(
        'test-rule-id',
        'test-stream',
        [
          expect.objectContaining({
            EventType: 'Search',
            Status: 'success',
            UserId: mockUser.id,
            BotId: 'test-bot',
            QueryText: 'test query',
            ResultCount: 5,
            OldestDate: '2024-01-01',
            NewestDate: '2024-01-31',
            Duration: expect.any(Number),
          }),
        ],
      );
    });
  });

  describe('logSearchError', () => {
    it('should log search error', async () => {
      const startTime = Date.now() - 1000;
      const testError = new Error('Search error');
      testError.stack = 'Search error stack trace';

      await loggingService.logSearchError(
        startTime,
        testError,
        'test-bot',
        'test query',
        mockUser,
      );

      expect(mockClient.upload).toHaveBeenCalledWith(
        'test-rule-id',
        'test-stream',
        [
          expect.objectContaining({
            EventType: 'Search',
            Status: 'error',
            UserId: mockUser.id,
            BotId: 'test-bot',
            QueryText: 'test query',
            ErrorMessage: 'Search error',
            ErrorStack: 'Search error stack trace',
            Duration: expect.any(Number),
          }),
        ],
      );
    });
  });

  describe('error handling', () => {
    it('should handle upload errors gracefully', async () => {
      mockClient.upload.mockRejectedValueOnce(new Error('Upload failed'));

      const startTime = Date.now() - 1000;
      await loggingService.logSearch(
        startTime,
        'test-bot',
        5,
        '2024-01-01',
        '2024-01-31',
        mockUser,
      );

      expect(console.error).toHaveBeenCalled();
      // Service should not throw error
      expect(mockClient.upload).toHaveBeenCalled();
    });

    it('should handle missing user properties', async () => {
      const partialUser = {
        id: 'test-user-id',
        // Missing other properties
      } as Session['user'];

      await loggingService.logSearch(
        Date.now(),
        'test-bot',
        5,
        undefined,
        undefined,
        partialUser,
      );

      expect(mockClient.upload).toHaveBeenCalledWith(
        'test-rule-id',
        'test-stream',
        [
          expect.objectContaining({
            UserId: 'test-user-id',
            // Other user properties should be undefined
            UserJobTitle: undefined,
            UserGivenName: undefined,
            UserSurName: undefined,
          }),
        ],
      );
    });
  });
});
