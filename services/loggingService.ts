import { Session } from 'next-auth';

import {
  BaseLogEntry,
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

    await this.log(successEntry);
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

    await this.log(errorEntry);
  }

  async logFileError(
    startTime: number,
    error: any,
    modelId: string,
    user: Session['user'],
    filename?: string,
    fileSize?: number,
    botId?: string,
  ) {
    const duration = Date.now() - startTime;
    const errorEntry: MessageErrorLogEntry = {
      ...this.createMessageLogEntry(
        'FileConversationError',
        modelId,
        0,
        0,
        duration,
        user,
        botId,
      ),
      Status: 'error',
      ErrorMessage: error instanceof Error ? error.message : 'Unknown error',
      ErrorStack: error instanceof Error ? error.stack : undefined,
      FileUpload: true,
      FileName: filename,
      FileSize: fileSize,
    };

    await this.log(errorEntry);
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

    await this.log(successEntry);
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

    await this.log(errorEntry);
  }

  private async log(data: LogEntry) {
    try {
      const logEntry = {
        TimeGenerated: new Date().toISOString(),
        ...data,
      };
      console.log('Attempting to send log entry:', logEntry);
      console.log('Using Data Collection Rule ID:', this.ruleId);
      console.log('Using Stream Name:', this.streamName);

      await this.client.upload(this.ruleId, this.streamName, [logEntry]);
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
