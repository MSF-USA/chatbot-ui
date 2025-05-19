import { Session } from 'next-auth';

import {
  BaseLogEntry,
  FileLogEntry,
  LogEntry,
  MessageErrorLogEntry,
  MessageLogEntry,
  MessageSuccessLogEntry,
  SearchErrorLogEntry,
  SearchLogEntry,
} from '@/types/logging';

import { DefaultAzureCredential } from '@azure/identity';
import { LogsIngestionClient } from '@azure/monitor-ingestion';

export class AzureMonitorLoggingService {
  private client: LogsIngestionClient;
  private ruleId: string;
  private streamName: string;

  constructor(
    logsIngestionEndpoint: string,
    ruleId: string,
    streamName: string,
  ) {
    const credential = new DefaultAzureCredential();
    this.client = new LogsIngestionClient(logsIngestionEndpoint, credential);
    this.ruleId = ruleId;
    this.streamName = streamName;
  }

  private createBaseLogEntry(
    eventType: string,
    user?: Session['user'],
    botId?: string,
  ): BaseLogEntry {
    return {
      EventType: eventType,
      UserId: user?.id,
      UserJobTitle: user?.jobTitle,
      UserGivenName: user?.givenName,
      UserSurName: user?.surname,
      UserDepartment: user?.department,
      UserDisplayName: user?.displayName,
      UserEmail: user?.mail,
      UserCompanyName: user?.companyName,
      BotId: botId,
      Env: process.env.NEXT_PUBLIC_ENV,
    };
  }

  private createMessageLogEntry(
    eventType: string,
    modelId: string,
    messageCount: number,
    temperature: number,
    duration: number,
    user?: Session['user'],
    botId?: string,
  ): MessageLogEntry {
    return {
      ...this.createBaseLogEntry(eventType, user, botId),
      EventType: eventType,
      ModelUsed: modelId,
      MessageCount: messageCount,
      Temperature: temperature,
      Duration: duration,
      FileUpload: false,
      FileName: undefined,
      FileSize: undefined,
    };
  }

  private createFileLogEntry(
    eventType: FileLogEntry['EventType'],
    modelId: string,
    duration: number,
    status: 'success' | 'error',
    user?: Session['user'],
    botId?: string,
    filename?: string,
    fileSize?: number,
    chunkCount?: number,
    processedChunkCount?: number,
    failedChunkCount?: number,
    streamMode?: boolean,
  ): FileLogEntry {
    return {
      ...this.createBaseLogEntry(eventType, user, botId),
      EventType: eventType,
      ModelUsed: modelId,
      Duration: duration,
      FileUpload: true,
      FileName: filename,
      FileSize: fileSize,
      ChunkCount: chunkCount,
      ProcessedChunkCount: processedChunkCount,
      FailedChunkCount: failedChunkCount,
      StreamMode: streamMode,
      Status: status,
    };
  }

  async logChatCompletion(
    startTime: number,
    modelId: string,
    messageCount: number,
    temperature: number,
    user: Session['user'],
    botId?: string,
  ) {
    const duration = Date.now() - startTime;
    const successEntry: MessageSuccessLogEntry = {
      ...this.createMessageLogEntry(
        'ChatCompletion',
        modelId,
        messageCount,
        temperature,
        duration,
        user,
        botId,
      ),
      Status: 'success',
    };

    void this.log(successEntry);
  }

  async logError(
    startTime: number,
    error: any,
    modelId: string,
    messageCount: number,
    temperature: number,
    user: Session['user'],
    botId?: string,
  ) {
    const duration = Date.now() - startTime;
    const errorEntry: MessageErrorLogEntry = {
      ...this.createMessageLogEntry(
        'ChatCompletion',
        modelId,
        messageCount,
        temperature,
        duration,
        user,
        botId,
      ),
      Status: 'error',
      ErrorMessage: error instanceof Error ? error.message : 'Unknown error',
      ErrorStack: error instanceof Error ? error.stack : undefined,
      StatusCode: error instanceof Error ? (error as any).status : 500,
    };

    void this.log(errorEntry);
  }

  async logFileSuccess(
    startTime: number,
    modelId: string,
    user: Session['user'],
    filename?: string,
    fileSize?: number,
    botId?: string,
    eventTypeSuffix?: string,
    chunkCount?: number,
    processedChunkCount?: number,
    failedChunkCount?: number,
    streamMode?: boolean,
  ) {
    const duration = Date.now() - startTime;
    const successEntry: FileLogEntry = {
      ...this.createFileLogEntry(
        `FileOperationSuccess${
          eventTypeSuffix || ''
        }` as FileLogEntry['EventType'],
        modelId,
        duration,
        'success',
        user,
        botId,
        filename,
        fileSize,
        chunkCount,
        processedChunkCount,
        failedChunkCount,
        streamMode,
      ),
    };

    void this.log(successEntry);
  }

  async logFileError(
    startTime: number,
    error: any,
    modelId: string,
    user: Session['user'],
    filename?: string,
    fileSize?: number,
    botId?: string,
    eventTypeSuffix?: string,
  ) {
    const duration = Date.now() - startTime;
    const errorEntry: FileLogEntry = {
      ...this.createFileLogEntry(
        `FileOperationError${
          eventTypeSuffix || ''
        }` as FileLogEntry['EventType'],
        modelId,
        duration,
        'error',
        user,
        botId,
        filename,
        fileSize,
      ),
      ErrorMessage: error instanceof Error ? error.message : 'Unknown error',
      ErrorStack: error instanceof Error ? error.stack : undefined,
    };

    void this.log(errorEntry);
  }

  async logSearch(
    startTime: number,
    botId: string,
    resultCount: number,
    oldestDate?: string,
    newestDate?: string,
    user?: Session['user'],
  ) {
    const duration = Date.now() - startTime;
    const successEntry: SearchLogEntry = {
      ...this.createBaseLogEntry('Search', user, botId),
      Status: 'success',
      ResultCount: resultCount,
      OldestDate: oldestDate,
      NewestDate: newestDate,
      Duration: duration,
    };

    void this.log(successEntry);
  }

  async logSearchError(
    startTime: number,
    error: any,
    botId: string,
    user?: Session['user'],
  ) {
    const duration = Date.now() - startTime;
    const errorEntry: SearchErrorLogEntry = {
      ...this.createBaseLogEntry('Search', user, botId),
      EventType: 'Search',
      Status: 'error',
      Duration: duration,
      ErrorMessage: error instanceof Error ? error.message : 'Unknown error',
      ErrorStack: error instanceof Error ? error.stack : undefined,
    };

    void this.log(errorEntry);
  }

  private async log(data: LogEntry | FileLogEntry | SearchLogEntry) {
    try {
      const logEntry = {
        TimeGenerated: new Date().toISOString(),
        ...data,
      };
      console.log('Attempting to send log entry:', logEntry);
      console.log('Using Data Collection Rule ID:', this.ruleId);
      console.log('Using Stream Name:', this.streamName);

      void this.client.upload(this.ruleId, this.streamName, [logEntry]);
      console.log('Log entry sent successfully');
    } catch (error) {
      console.error('Error sending log entry:', error);
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
    }
  }
}
