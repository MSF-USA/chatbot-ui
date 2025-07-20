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
  private static instance: AzureMonitorLoggingService | null = null;
  private client: LogsIngestionClient;
  private ruleId: string;
  private streamName: string;

  constructor(
    logsIngestionEndpoint: string = process.env.LOGS_INJESTION_ENDPOINT!,
    ruleId: string = process.env.DATA_COLLECTION_RULE_ID!,
    streamName: string = process.env.STREAM_NAME!,
  ) {
    const credential = new DefaultAzureCredential();
    this.client = new LogsIngestionClient(logsIngestionEndpoint, credential);
    this.ruleId = ruleId;
    this.streamName = streamName;
  }

  /**
   * Get singleton instance of the logging service
   */
  public static getInstance(): AzureMonitorLoggingService | null {
    if (!this.instance) {
      try {
        const logsIngestionEndpoint = process.env.LOGS_INJESTION_ENDPOINT;
        const ruleId = process.env.DATA_COLLECTION_RULE_ID;
        const streamName = process.env.STREAM_NAME;

        if (logsIngestionEndpoint && ruleId && streamName) {
          this.instance = new AzureMonitorLoggingService(
            logsIngestionEndpoint,
            ruleId,
            streamName
          );
          console.log('AzureMonitorLoggingService: Singleton instance created successfully');
        } else {
          console.warn('AzureMonitorLoggingService: Missing required environment variables for Azure Monitor Logging');
          console.warn('Set LOGS_INGESTION_ENDPOINT, DATA_COLLECTION_RULE_ID, and STREAM_NAME to enable logging');
          return null;
        }
      } catch (error) {
        console.error('AzureMonitorLoggingService: Failed to create singleton instance', error);
        return null;
      }
    }
    return this.instance;
  }

  /**
   * Reset singleton instance (useful for testing)
   */
  public static resetInstance(): void {
    this.instance = null;
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
    shouldAwait: boolean = false,
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

    if (shouldAwait) {
      await this.log(successEntry);
    } else {
      void this.log(successEntry);
    }
  }

  async logError(
    startTime: number,
    error: any,
    modelId: string,
    messageCount: number,
    temperature: number,
    user: Session['user'],
    botId?: string,
    shouldAwait: boolean = false,
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

    if (shouldAwait) {
      await this.log(errorEntry);
    } else {
      void this.log(errorEntry);
    }
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
    shouldAwait: boolean = false,
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

    if (shouldAwait) {
      await this.log(successEntry);
    } else {
      void this.log(successEntry);
    }
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
    shouldAwait: boolean = false,
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

    if (shouldAwait) {
      await this.log(errorEntry);
    } else {
      void this.log(errorEntry);
    }
  }

  async logSearch(
    startTime: number,
    botId: string,
    resultCount: number,
    oldestDate?: string,
    newestDate?: string,
    user?: Session['user'],
    shouldAwait: boolean = false,
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

    if (shouldAwait) {
      await this.log(successEntry);
    } else {
      void this.log(successEntry);
    }
  }

  async logSearchError(
    startTime: number,
    error: any,
    botId: string,
    user?: Session['user'],
    shouldAwait: boolean = false,
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

    if (shouldAwait) {
      await this.log(errorEntry);
    } else {
      void this.log(errorEntry);
    }
  }

  /**
   * Log agent execution (successful completion)
   */
  async logAgentExecution(
    startTime: number,
    agentId: string,
    agentType: string,
    modelId: string,
    user: Session['user'],
    botId?: string,
    correlationId?: string,
    shouldAwait: boolean = false,
  ) {
    const duration = Date.now() - startTime;
    const successEntry: MessageSuccessLogEntry = {
      ...this.createMessageLogEntry(
        'AgentExecution',
        modelId,
        1, // One agent execution
        0, // No temperature for agents
        duration,
        user,
        botId,
      ),
      Status: 'success',
    };

    // Add agent-specific metadata to the entry
    (successEntry as any).AgentId = agentId;
    (successEntry as any).AgentType = agentType;
    (successEntry as any).CorrelationId = correlationId;

    if (shouldAwait) {
      await this.log(successEntry);
    } else {
      void this.log(successEntry);
    }
  }

  /**
   * Log agent execution error
   */
  async logAgentError(
    startTime: number,
    error: any,
    agentId: string,
    agentType: string,
    modelId: string,
    user: Session['user'],
    botId?: string,
    correlationId?: string,
    shouldAwait: boolean = false,
  ) {
    const duration = Date.now() - startTime;
    const errorEntry: MessageErrorLogEntry = {
      ...this.createMessageLogEntry(
        'AgentExecution',
        modelId,
        1, // One agent execution
        0, // No temperature for agents
        duration,
        user,
        botId,
      ),
      Status: 'error',
      ErrorMessage: error instanceof Error ? error.message : 'Unknown error',
      ErrorStack: error instanceof Error ? error.stack : undefined,
      StatusCode: error instanceof Error ? (error as any).status : 500,
    };

    // Add agent-specific metadata to the entry
    (errorEntry as any).AgentId = agentId;
    (errorEntry as any).AgentType = agentType;
    (errorEntry as any).CorrelationId = correlationId;

    if (shouldAwait) {
      await this.log(errorEntry);
    } else {
      void this.log(errorEntry);
    }
  }

  /**
   * Log agent creation/instantiation
   */
  async logAgentCreation(
    startTime: number,
    agentId: string,
    agentType: string,
    modelId: string,
    user?: Session['user'],
    botId?: string,
    shouldAwait: boolean = false,
  ) {
    const duration = Date.now() - startTime;
    const creationEntry: MessageSuccessLogEntry = {
      ...this.createMessageLogEntry(
        'AgentCreation',
        modelId,
        0, // No messages for creation
        0, // No temperature for creation
        duration,
        user,
        botId,
      ),
      Status: 'success',
    };

    // Add agent-specific metadata to the entry
    (creationEntry as any).AgentId = agentId;
    (creationEntry as any).AgentType = agentType;

    if (shouldAwait) {
      await this.log(creationEntry);
    } else {
      void this.log(creationEntry);
    }
  }

  /**
   * Log agent health check
   */
  async logAgentHealth(
    startTime: number,
    agentId: string,
    agentType: string,
    healthy: boolean,
    user?: Session['user'],
    botId?: string,
    shouldAwait: boolean = false,
  ) {
    const duration = Date.now() - startTime;
    const healthEntry: MessageSuccessLogEntry = {
      ...this.createMessageLogEntry(
        'AgentHealthCheck',
        'system', // No specific model for health checks
        0, // No messages for health checks
        0, // No temperature for health checks
        duration,
        user,
        botId,
      ),
      Status: 'success',
    };

    // Add agent-specific metadata to the entry
    (healthEntry as any).AgentId = agentId;
    (healthEntry as any).AgentType = agentType;
    (healthEntry as any).Healthy = healthy;

    if (shouldAwait) {
      await this.log(healthEntry);
    } else {
      void this.log(healthEntry);
    }
  }

  /**
   * Log agent routing metrics for dashboards and monitoring
   */
  async logAgentRoutingMetrics(
    routingDecision: 'agent-selected' | 'fallback-used' | 'agent-failed',
    agentType: string,
    success: boolean,
    responseTime: number,
    fallbackReason?: string,
    featureFlagEnabled?: boolean,
    user?: Session['user'],
    botId?: string,
    shouldAwait: boolean = false,
  ) {
    const metricsEntry = {
      ...this.createBaseLogEntry('AgentRoutingMetrics', user, botId),
      EventType: 'AgentRoutingMetrics',
      RoutingDecision: routingDecision,
      AgentType: agentType,
      Success: success,
      ResponseTime: responseTime,
      FallbackReason: fallbackReason,
      FeatureFlagEnabled: featureFlagEnabled,
      Timestamp: new Date().toISOString(),
    };

    if (shouldAwait) {
      await this.log(metricsEntry as any);
    } else {
      void this.log(metricsEntry as any);
    }
  }

  /**
   * Log agent pool metrics for resource monitoring
   */
  async logAgentPoolMetrics(
    totalAgents: number,
    activeAgents: number,
    healthyAgents: number,
    degradedAgents: number,
    unhealthyAgents: number,
    poolUtilization: number,
    memoryUsage?: number,
    averageResponseTime?: number,
    botId?: string,
    shouldAwait: boolean = false,
  ) {
    const poolMetricsEntry = {
      ...this.createBaseLogEntry('AgentPoolMetrics', undefined, botId),
      EventType: 'AgentPoolMetrics',
      TotalAgents: totalAgents,
      ActiveAgents: activeAgents,
      HealthyAgents: healthyAgents,
      DegradedAgents: degradedAgents,
      UnhealthyAgents: unhealthyAgents,
      PoolUtilization: poolUtilization,
      MemoryUsage: memoryUsage,
      AverageResponseTime: averageResponseTime,
      Timestamp: new Date().toISOString(),
    };

    if (shouldAwait) {
      await this.log(poolMetricsEntry as any);
    } else {
      void this.log(poolMetricsEntry as any);
    }
  }

  /**
   * Log feature flag evaluation for monitoring flag usage
   */
  async logFeatureFlagEvaluation(
    flagName: string,
    flagValue: any,
    reason: string,
    context: Record<string, any>,
    evaluationTime: number,
    user?: Session['user'],
    shouldAwait: boolean = false,
  ) {
    const flagEntry = {
      ...this.createBaseLogEntry('FeatureFlagEvaluation', user),
      EventType: 'FeatureFlagEvaluation',
      FlagName: flagName,
      FlagValue: JSON.stringify(flagValue),
      EvaluationReason: reason,
      UserContext: JSON.stringify(context),
      EvaluationTime: evaluationTime,
      Timestamp: new Date().toISOString(),
    };

    if (shouldAwait) {
      await this.log(flagEntry as any);
    } else {
      void this.log(flagEntry as any);
    }
  }

  /**
   * Log system performance metrics for overall health monitoring
   */
  async logSystemPerformanceMetrics(
    totalRequests: number,
    successfulRequests: number,
    failedRequests: number,
    averageResponseTime: number,
    p95ResponseTime: number,
    agentUsagePercentage: number,
    fallbackRate: number,
    systemLoad?: number,
    memoryUsage?: number,
    shouldAwait: boolean = false,
  ) {
    const performanceEntry = {
      ...this.createBaseLogEntry('SystemPerformanceMetrics'),
      EventType: 'SystemPerformanceMetrics',
      TotalRequests: totalRequests,
      SuccessfulRequests: successfulRequests,
      FailedRequests: failedRequests,
      AverageResponseTime: averageResponseTime,
      P95ResponseTime: p95ResponseTime,
      AgentUsagePercentage: agentUsagePercentage,
      FallbackRate: fallbackRate,
      SystemLoad: systemLoad,
      MemoryUsage: memoryUsage,
      Timestamp: new Date().toISOString(),
    };

    if (shouldAwait) {
      await this.log(performanceEntry as any);
    } else {
      void this.log(performanceEntry as any);
    }
  }

  /**
   * Log user interaction patterns for analytics
   */
  async logUserInteractionPattern(
    interactionType: 'chat-start' | 'agent-request' | 'fallback-triggered' | 'feature-flag-change',
    agentType?: string,
    conversationLength?: number,
    sessionId?: string,
    user?: Session['user'],
    botId?: string,
    shouldAwait: boolean = false,
  ) {
    const interactionEntry = {
      ...this.createBaseLogEntry('UserInteractionPattern', user, botId),
      EventType: 'UserInteractionPattern',
      InteractionType: interactionType,
      AgentType: agentType,
      ConversationLength: conversationLength,
      SessionId: sessionId,
      Timestamp: new Date().toISOString(),
    };

    if (shouldAwait) {
      await this.log(interactionEntry as any);
    } else {
      void this.log(interactionEntry as any);
    }
  }

  /**
   * Log custom metrics with flexible schema for dashboard consumption
   */
  async logCustomMetric(
    metricName: string,
    metricValue: number,
    metricUnit: string,
    dimensions: Record<string, string | number>,
    user?: Session['user'],
    botId?: string,
    shouldAwait: boolean = false,
  ) {
    const customMetricEntry = {
      ...this.createBaseLogEntry('CustomMetric', user, botId),
      EventType: 'CustomMetric',
      MetricName: metricName,
      MetricValue: metricValue,
      MetricUnit: metricUnit,
      Dimensions: JSON.stringify(dimensions),
      Timestamp: new Date().toISOString(),
    };

    if (shouldAwait) {
      await this.log(customMetricEntry as any);
    } else {
      void this.log(customMetricEntry as any);
    }
  }

  /**
   * Batch log multiple metrics for performance
   */
  async logBatchMetrics(
    metrics: Array<{
      type: string;
      data: Record<string, any>;
    }>,
    shouldAwait: boolean = false,
  ) {
    const batchEntries = metrics.map((metric) => ({
      TimeGenerated: new Date().toISOString(),
      EventType: metric.type,
      ...metric.data,
    }));

    try {
      if (shouldAwait) {
        await this.client.upload(this.ruleId, this.streamName, batchEntries);
      } else {
        void this.client.upload(this.ruleId, this.streamName, batchEntries);
      }
    } catch (error) {
      console.error('Error batch uploading metrics:', error);
    }
  }

  /**
   * Get health status for the logging service itself
   */
  getHealthStatus() {
    try {
      const isConfigured = !!(
        process.env.LOGS_INJESTION_ENDPOINT &&
        process.env.DATA_COLLECTION_RULE_ID &&
        process.env.STREAM_NAME
      );

      return {
        status: isConfigured && this.client ? 'healthy' : 'degraded',
        isConfigured,
        hasClient: !!this.client,
        ruleId: this.ruleId ? this.ruleId.substring(0, 8) + '...' : 'not-set',
        streamName: this.streamName || 'not-set',
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        isConfigured: false,
        hasClient: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date().toISOString(),
      };
    }
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

      try {
        await this.client.upload(this.ruleId, this.streamName, [logEntry]);
        console.log('Log entry sent successfully');
      } catch (uploadError) {
        console.error('Error uploading log entry:', uploadError);
        if (uploadError instanceof Error) {
          console.error('Upload error name:', uploadError.name);
          console.error('Upload error message:', uploadError.message);
          console.error('Upload error stack:', uploadError.stack);
        }
      }
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
